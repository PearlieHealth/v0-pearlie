import type { MatchFacts, MatchReason, MatchReasonsDebug } from "./contract"
import { EXPLANATION_SCHEMA_VERSION } from "./contract"
import { REASON_TEMPLATES, FALLBACK_REASONS, BANNED_GENERIC_PHRASES } from "./tag-schema"

const IS_PRODUCTION = process.env.NODE_ENV === "production"

// Custom template overrides (loaded from database at runtime)
// These take precedence over REASON_TEMPLATES from tag-schema.ts
let customTemplateOverrides: Record<string, string[]> = {}

/**
 * Set custom template overrides from database
 * Call this when loading the matching config from the DB
 */
export function setCustomTemplateOverrides(overrides: Record<string, string[]>) {
  customTemplateOverrides = overrides || {}
}

/**
 * Get the reason template for a tag, checking custom overrides first
 * Returns a random variation if multiple templates exist
 */
function getReasonTemplate(tagKey: string): string | undefined {
  // Check custom overrides first
  const customVariations = customTemplateOverrides[tagKey]
  if (customVariations && customVariations.length > 0) {
    // Return random variation for diversity
    return customVariations[Math.floor(Math.random() * customVariations.length)]
  }
  
  // Fall back to static templates
  return REASON_TEMPLATES[tagKey]
}

// Each reason belongs to exactly one group to prevent semantic overlap
type ReasonGroup =
  | "GROUP_TREATMENT_FIT"
  | "GROUP_PRIORITIES"
  | "GROUP_BLOCKERS"
  | "GROUP_COST_APPROACH"
  | "GROUP_ANXIETY_SUPPORT"
  | "GROUP_REPUTATION"
  | "GROUP_GENERIC_FALLBACK"

// Map each tag to its semantic group
const TAG_TO_GROUP: Record<string, ReasonGroup> = {
  // Treatment fit
  TREATMENT_MATCH: "GROUP_TREATMENT_FIT",
  TAG_SPECIALIST_LEVEL_EXPERIENCE: "GROUP_TREATMENT_FIT", // Same semantic meaning as treatment

  // Priorities (patient values)
  TAG_CLEAR_EXPLANATIONS: "GROUP_PRIORITIES",
  TAG_LISTENED_TO_RESPECTED: "GROUP_PRIORITIES",
  TAG_CALM_REASSURING: "GROUP_PRIORITIES",
  TAG_CLEAR_PRICING_UPFRONT: "GROUP_PRIORITIES",
  TAG_FLEXIBLE_APPOINTMENTS: "GROUP_PRIORITIES",

  // Reputation
  TAG_STRONG_REPUTATION_REVIEWS: "GROUP_REPUTATION",

  // Blockers (informational — only TAG_COMPLEX_CASES_WELCOME generates reasons)
  TAG_GOOD_FOR_COST_CONCERNS: "GROUP_BLOCKERS",
  TAG_FINANCE_AVAILABLE: "GROUP_BLOCKERS",
  TAG_DECISION_SUPPORTIVE: "GROUP_BLOCKERS",
  TAG_OPTION_CLARITY_SUPPORT: "GROUP_BLOCKERS",
  TAG_COMPLEX_CASES_WELCOME: "GROUP_BLOCKERS",
  TAG_BAD_EXPERIENCE_SUPPORTIVE: "GROUP_BLOCKERS",
  TAG_RIGHT_FIT_FOCUSED: "GROUP_BLOCKERS",

  // Anxiety support
  TAG_ANXIETY_FRIENDLY: "GROUP_ANXIETY_SUPPORT",
  TAG_OK_WITH_ANXIOUS_PATIENTS: "GROUP_ANXIETY_SUPPORT",
  TAG_SEDATION_AVAILABLE: "GROUP_ANXIETY_SUPPORT",

  // Cost approach
  TAG_QUALITY_OUTCOME_FOCUSED: "GROUP_COST_APPROACH",
  TAG_DISCUSS_OPTIONS_BEFORE_COST: "GROUP_COST_APPROACH",
  TAG_MONTHLY_PAYMENTS_PREFERRED: "GROUP_COST_APPROACH",
  TAG_FLEXIBLE_BUDGET_OK: "GROUP_COST_APPROACH",
  TAG_STRICT_BUDGET_SUPPORTIVE: "GROUP_COST_APPROACH",

  // Fallbacks
  FALLBACK_CLINIC_COMPARED: "GROUP_GENERIC_FALLBACK",
  FALLBACK_CLEAR_EXPLANATIONS: "GROUP_GENERIC_FALLBACK",
  FALLBACK_SUITABLE_PREFERENCES: "GROUP_GENERIC_FALLBACK",
}

// Priority order for group selection (ensures diversity)
const GROUP_PRIORITY: ReasonGroup[] = [
  "GROUP_TREATMENT_FIT",
  "GROUP_PRIORITIES",
  "GROUP_BLOCKERS",
  "GROUP_COST_APPROACH",
  "GROUP_ANXIETY_SUPPORT",
  "GROUP_REPUTATION",
  "GROUP_GENERIC_FALLBACK",
]

const EXPERIENCE_WORDS = ["experienced", "experience", "expertise", "skilled", "trained"]

/**
 * Check if two reason texts have semantic overlap
 */
function hasSemanticOverlap(text1: string, text2: string): boolean {
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim()

  const norm1 = normalize(text1)
  const norm2 = normalize(text2)

  // Check if both contain experience-related words
  const hasExperience1 = EXPERIENCE_WORDS.some((word) => norm1.includes(word))
  const hasExperience2 = EXPERIENCE_WORDS.some((word) => norm2.includes(word))

  if (hasExperience1 && hasExperience2) {
    return true
  }

  // Check for very similar phrases (>60% word overlap)
  const words1 = new Set(norm1.split(/\s+/))
  const words2 = new Set(norm2.split(/\s+/))
  const intersection = [...words1].filter((w) => words2.has(w) && w.length > 3)
  const overlapRatio = intersection.length / Math.min(words1.size, words2.size)

  return overlapRatio > 0.6
}

/**
 * Get the reason group for a tag
 */
function getReasonGroup(tagKey: string): ReasonGroup {
  return TAG_TO_GROUP[tagKey] || "GROUP_GENERIC_FALLBACK"
}

/**
 * Build EXACTLY 3 match reasons with semantic de-duplication
 * - Ensures reasons come from at least 2 different groups when possible
 * - Never has two reasons with "experience/experienced" language
 * - Priority: Treatment fit → Priorities → Blockers → Cost → Anxiety → Reputation
 */
export function buildMatchReasons(facts: MatchFacts, deprioritizeTreatment = false, fallbackOffset = 0): MatchReason[] {
  if (!facts || typeof facts !== "object") {
    console.error("[buildMatchReasons] Invalid facts input:", facts)
    return getEmergencyFallbackReasons("unknown", fallbackOffset)
  }

  const clinicTags = facts.clinicTags || []
  const matchingTagCount = clinicTags.filter((t) => t && t.startsWith("TAG_")).length
  if (matchingTagCount === 0) {
    console.warn(
      `[buildMatchReasons] Clinic ${facts.clinicId} has 0 matching tags - should have been filtered upstream`,
    )
    return []
  }

  const clinicId = facts.clinicId || "unknown"

  const candidates: Array<{
    reason: MatchReason
    group: ReasonGroup
    priority: number
  }> = []

  // Add treatment match candidate
  if (facts.treatmentMatch?.clinicOffers && !deprioritizeTreatment) {
    const treatmentName = facts.treatmentMatch.requested || "your requested"
    candidates.push({
      reason: {
        key: `treatment_${clinicId}`,
        text: `Experienced with ${treatmentName} treatment`,
        category: "treatment",
        weight: safeWeight(facts.scoreBreakdown?.treatment, facts.scoreBreakdown?.total, 0.3),
        tagKey: "TREATMENT_MATCH",
      },
      group: "GROUP_TREATMENT_FIT",
      priority: deprioritizeTreatment ? 99 : 0,
    })
  }

  // Add priority tag candidates
  const priorityTags = facts.priorities?.matchedTags || []
  for (const tag of priorityTags) {
    const template = getReasonTemplate(tag)
    if (template) {
      candidates.push({
        reason: {
          key: `priority_${tag}_${clinicId}`,
          text: template,
          category: "priorities",
          weight: safeWeight(facts.scoreBreakdown?.priorities, facts.scoreBreakdown?.total, 0.2),
          tagKey: tag,
        },
        group: getReasonGroup(tag),
        priority: 1,
      })
    }
  }

  // Add blocker tag candidates
  const blockerTags = facts.blockers?.matchedTags || []
  for (const tag of blockerTags) {
    const template = getReasonTemplate(tag)
    if (template) {
      candidates.push({
        reason: {
          key: `blocker_${tag}_${clinicId}`,
          text: template,
          category: "blockers",
          weight: safeWeight(facts.scoreBreakdown?.blockers, facts.scoreBreakdown?.total, 0.15),
          tagKey: tag,
        },
        group: getReasonGroup(tag),
        priority: 2,
      })
    }
  }

  // Add cost tag candidate
  const costTag = facts.cost?.matchedTag
  if (costTag) {
    const template = getReasonTemplate(costTag)
    if (template) {
      candidates.push({
        reason: {
          key: `cost_${costTag}_${clinicId}`,
          text: template,
          category: "cost",
          weight: safeWeight(facts.scoreBreakdown?.cost, facts.scoreBreakdown?.total, 0.05),
          tagKey: costTag,
        },
        group: "GROUP_COST_APPROACH",
        priority: 3,
      })
    }
  }

  // Add anxiety tag candidates
  const anxietyTags = facts.anxiety?.matchedTags || []
  for (const tag of anxietyTags) {
    const template = getReasonTemplate(tag)
    if (template) {
      candidates.push({
        reason: {
          key: `anxiety_${tag}_${clinicId}`,
          text: template,
          category: "anxiety",
          weight: safeWeight(facts.scoreBreakdown?.anxiety, facts.scoreBreakdown?.total, 0.1),
          tagKey: tag,
        },
        group: "GROUP_ANXIETY_SUPPORT",
        priority: 4,
      })
    }
  }

  // Add extra clinic tag candidates
  for (const tag of clinicTags) {
    if (!tag || !tag.startsWith("TAG_")) continue
    // Skip if already added
    if (candidates.some((c) => c.reason.tagKey === tag)) continue

    const template = getReasonTemplate(tag)
    if (template) {
      candidates.push({
        reason: {
          key: `extra_${tag}_${clinicId}`,
          text: template,
          category: "priorities",
          weight: 0.1,
          tagKey: tag,
        },
        group: getReasonGroup(tag),
        priority: 5,
      })
    }
  }

  const selectedReasons: MatchReason[] = []
  const usedGroups = new Set<ReasonGroup>()
  const usedTexts: string[] = []

  // Sort candidates by priority
  candidates.sort((a, b) => a.priority - b.priority)

  // First pass: pick best from each group (diversity)
  for (const targetGroup of GROUP_PRIORITY) {
    if (selectedReasons.length >= 3) break
    if (targetGroup === "GROUP_GENERIC_FALLBACK") continue // Save fallbacks for last
    if (usedGroups.has(targetGroup)) continue

    const groupCandidates = candidates.filter(
      (c) => c.group === targetGroup && !usedTexts.some((t) => hasSemanticOverlap(t, c.reason.text)),
    )

    if (groupCandidates.length > 0) {
      const best = groupCandidates[0]
      selectedReasons.push(best.reason)
      usedGroups.add(best.group)
      usedTexts.push(best.reason.text)
    }
  }

  // Second pass: fill remaining slots with any unused candidates
  for (const candidate of candidates) {
    if (selectedReasons.length >= 3) break
    if (selectedReasons.some((r) => r.tagKey === candidate.reason.tagKey)) continue
    if (usedTexts.some((t) => hasSemanticOverlap(t, candidate.reason.text))) continue

    selectedReasons.push(candidate.reason)
    usedGroups.add(candidate.group)
    usedTexts.push(candidate.reason.text)
  }

  // Fill with fallbacks if needed
  const fallbacksNeeded = 3 - selectedReasons.length
  if (fallbacksNeeded > 0) {
    const availableFallbacks = [...FALLBACK_REASONS].filter(
      (f) => !usedTexts.some((t) => hasSemanticOverlap(t, f.text)),
    )

    for (let i = 0; i < fallbacksNeeded; i++) {
      const fallbackIndex = (fallbackOffset + i) % Math.max(availableFallbacks.length, FALLBACK_REASONS.length)
      const fallback = availableFallbacks[fallbackIndex] || FALLBACK_REASONS[fallbackIndex % FALLBACK_REASONS.length]

      selectedReasons.push({
        key: `${fallback.key}_${clinicId}_${i}`,
        text: fallback.text,
        category: "trust",
        weight: 0.05,
        tagKey: fallback.key,
        isFallback: true,
      })
    }
  }

  // Validate and sanitize
  const validatedReasons = validateAndSanitizeReasons(selectedReasons.slice(0, 3), clinicId, fallbackOffset)

  // Final invariant check
  const validationResult = validateReasonInvariants(validatedReasons, clinicId)
  if (!validationResult.valid) {
    if (IS_PRODUCTION) {
      console.error(`[REASON_INVARIANT_VIOLATION] ${validationResult.error}`)
      return getEmergencyFallbackReasons(clinicId, fallbackOffset)
    } else {
      throw new Error(`[REASON_INVARIANT_VIOLATION] ${validationResult.error}`)
    }
  }

  return validatedReasons
}

export function buildMatchReasonsDebug(facts: MatchFacts, reasons: MatchReason[]): MatchReasonsDebug {
  return {
    primaryReasonKey: reasons[0]?.tagKey || "NONE",
    reasonKeys: reasons.map((r) => r.tagKey || "UNKNOWN"),
    matchedTagsByCategory: {
      treatment: facts.treatmentMatch?.clinicOffers ? ["TREATMENT_MATCH"] : [],
      priorities: facts.priorities?.matchedTags || [],
      blockers: facts.blockers?.matchedTags || [],
      cost: facts.cost?.matchedTag ? [facts.cost.matchedTag] : [],
      anxiety: facts.anxiety?.matchedTags || [],
    },
    fallbacksUsed: reasons.filter((r) => r.isFallback).length,
  }
}

function safeWeight(value: number | undefined, total: number | undefined, defaultValue: number): number {
  if (!total || total === 0) return defaultValue
  if (!value || typeof value !== "number") return defaultValue
  const weight = value / total
  if (!isFinite(weight)) return defaultValue
  return weight
}

function validateAndSanitizeReasons(reasons: MatchReason[], clinicId: string, fallbackOffset = 0): MatchReason[] {
  const validReasons: MatchReason[] = []

  for (const reason of reasons) {
    if (!reason) continue
    if (!reason.text || typeof reason.text !== "string" || reason.text.trim() === "") continue

    const isBanned = BANNED_GENERIC_PHRASES.some((phrase) => reason.text.toLowerCase().includes(phrase.toLowerCase()))
    if (isBanned) continue

    const hasValidTag =
      reason.tagKey &&
      (reason.tagKey.startsWith("TAG_") || reason.tagKey.startsWith("FALLBACK_") || reason.tagKey === "TREATMENT_MATCH")
    if (!hasValidTag) continue

    validReasons.push(reason)
  }

  while (validReasons.length < 3) {
    const fallbackIndex = (fallbackOffset + validReasons.length) % FALLBACK_REASONS.length
    const fallback = FALLBACK_REASONS[fallbackIndex]
    if (fallback) {
      validReasons.push({
        key: `${fallback.key}_${clinicId}_pad_${validReasons.length}`,
        text: fallback.text,
        category: "trust",
        weight: 0.05,
        tagKey: fallback.key,
        isFallback: true,
      })
    } else {
      const emergencyFallback = FALLBACK_REASONS[0]
      validReasons.push({
        key: `emergency_${clinicId}_${validReasons.length}`,
        text: emergencyFallback?.text || "Trusted dental practice",
        category: "trust",
        weight: 0.05,
        tagKey: emergencyFallback?.key || "FALLBACK_TRUSTED",
        isFallback: true,
      })
    }
  }

  return validReasons.slice(0, 3)
}

function validateReasonInvariants(reasons: MatchReason[], clinicId: string): { valid: boolean; error?: string } {
  if (reasons.length !== 3) {
    return {
      valid: false,
      error: `Expected exactly 3 reasons for clinic ${clinicId}, got ${reasons.length}`,
    }
  }

  const keys = reasons.map((r) => r.tagKey)
  const uniqueKeys = new Set(keys)
  if (uniqueKeys.size !== keys.length) {
    return {
      valid: false,
      error: `Duplicate reason keys for clinic ${clinicId}: ${keys.join(", ")}`,
    }
  }

  const hasDistanceReason = reasons.some((r) => r.category === "distance" || r.tagKey?.includes("DISTANCE"))
  if (hasDistanceReason) {
    return {
      valid: false,
      error: `Distance-based reason found for clinic ${clinicId} (forbidden)`,
    }
  }

  const invalidTagReason = reasons.find(
    (r) =>
      !r.tagKey || !(r.tagKey.startsWith("TAG_") || r.tagKey.startsWith("FALLBACK_") || r.tagKey === "TREATMENT_MATCH"),
  )
  if (invalidTagReason) {
    return {
      valid: false,
      error: `Invalid tagKey "${invalidTagReason.tagKey}" for clinic ${clinicId}`,
    }
  }

  const emptyReason = reasons.find((r) => !r.text || typeof r.text !== "string" || r.text.trim() === "")
  if (emptyReason) {
    return {
      valid: false,
      error: `Empty reason text for clinic ${clinicId}, tagKey: ${emptyReason.tagKey}`,
    }
  }

  for (let i = 0; i < reasons.length; i++) {
    for (let j = i + 1; j < reasons.length; j++) {
      if (hasSemanticOverlap(reasons[i].text, reasons[j].text)) {
        return {
          valid: false,
          error: `Semantic overlap detected between reasons "${reasons[i].text}" and "${reasons[j].text}" for clinic ${clinicId}`,
        }
      }
    }
  }

  return { valid: true }
}

function getEmergencyFallbackReasons(clinicId: string, offset = 0): MatchReason[] {
  const safeFallbacks = FALLBACK_REASONS.slice(0, 6).map((fallback, index) => ({
    key: `emergency_${fallback?.key || "FALLBACK"}_${clinicId}_${index}`,
    text: fallback?.text || "Trusted dental practice",
    category: "trust" as const,
    weight: 0.05,
    tagKey: fallback?.key || "FALLBACK_TRUSTED",
    isFallback: true,
  }))

  const result: MatchReason[] = []
  for (let i = 0; i < 3; i++) {
    const fallbackIndex = (offset + i) % safeFallbacks.length
    result.push(safeFallbacks[fallbackIndex])
  }

  return result
}

export function validateUniqueReasons(
  clinicMatches: Array<{ clinicId: string; reasons: MatchReason[]; debug?: MatchReasonsDebug }>,
): {
  valid: boolean
  warning?: string
  uniquePrimaryReasons: string[]
} {
  const validMatches = clinicMatches.filter((cm) => cm.reasons && cm.reasons.length > 0)

  if (validMatches.length <= 1) {
    return { valid: true, uniquePrimaryReasons: [] }
  }

  const reasonSets = validMatches.map((cm) => {
    const tagKeys = (cm.reasons || []).map((r) => r?.tagKey || "NONE").sort()
    return tagKeys.join(",")
  })
  const uniqueReasonSets = new Set(reasonSets)

  const nonTreatmentReasonSets = validMatches.map((cm) => {
    const tagKeys = (cm.reasons || [])
      .filter((r) => r?.tagKey !== "TREATMENT_MATCH")
      .map((r) => r?.tagKey || "NONE")
      .sort()
    return tagKeys.join(",")
  })
  const uniqueNonTreatmentSets = new Set(nonTreatmentReasonSets)

  const primaryReasonKeys = validMatches.map((cm) => cm.reasons?.[0]?.tagKey).filter(Boolean)
  const uniquePrimaryReasons = [...new Set(primaryReasonKeys)]

  if (uniqueReasonSets.size >= Math.min(2, validMatches.length)) {
    return { valid: true, uniquePrimaryReasons }
  }

  if (uniqueNonTreatmentSets.size >= Math.min(2, validMatches.length)) {
    return { valid: true, uniquePrimaryReasons }
  }

  return {
    valid: true,
    warning: `${validMatches.length} clinics have similar reason sets. This may indicate limited tag differentiation.`,
    uniquePrimaryReasons,
  }
}

export function getExplanationVersion(): string {
  return EXPLANATION_SCHEMA_VERSION
}
