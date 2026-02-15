import type { MatchFacts, MatchReason, MatchReasonsDebug } from "./contract"
import { EXPLANATION_SCHEMA_VERSION } from "./contract"
import {
  REASON_TEMPLATES,
  TREATMENT_REASON_TEMPLATES,
  EMERGENCY_REASON_TEMPLATES,
  FALLBACK_REASONS,
  BANNED_GENERIC_PHRASES,
} from "./tag-schema"

const IS_PRODUCTION = process.env.NODE_ENV === "production"

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
  TREATMENT_CHECKUP: "GROUP_TREATMENT_FIT",

  // Priorities (patient values)
  TAG_SPECIALIST_LEVEL_EXPERIENCE: "GROUP_PRIORITIES",
  TAG_CLEAR_EXPLANATIONS: "GROUP_PRIORITIES",
  TAG_LISTENED_TO_RESPECTED: "GROUP_PRIORITIES",
  TAG_CALM_REASSURING: "GROUP_PRIORITIES",
  TAG_CLEAR_PRICING_UPFRONT: "GROUP_PRIORITIES",
  TAG_FLEXIBLE_APPOINTMENTS: "GROUP_PRIORITIES",
  TAG_CONTINUITY_OF_CARE: "GROUP_PRIORITIES",

  // Reputation
  TAG_STRONG_REPUTATION_REVIEWS: "GROUP_REPUTATION",

  // Blockers (hesitations)
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
  FALLBACK_CONVENIENT_LOCATION: "GROUP_GENERIC_FALLBACK",
  FALLBACK_TRAVEL_DISTANCE: "GROUP_GENERIC_FALLBACK",
  FALLBACK_AVAILABILITY: "GROUP_GENERIC_FALLBACK",
}

// Priority order for group selection (ensures diversity)
// Treatment → Priorities → Hesitations → Logistics (fallback only)
const GROUP_PRIORITY: ReasonGroup[] = [
  "GROUP_TREATMENT_FIT",
  "GROUP_PRIORITIES",
  "GROUP_BLOCKERS",
  "GROUP_ANXIETY_SUPPORT",
  "GROUP_REPUTATION",
  "GROUP_COST_APPROACH",
  "GROUP_GENERIC_FALLBACK",
]

/**
 * Get a reason template variant for a tag
 * REASON_TEMPLATES now stores string[] per tag — pick one using offset for determinism
 */
function getReasonTemplate(tagKey: string, offset = 0): string | undefined {
  const variants = REASON_TEMPLATES[tagKey]
  if (!variants || variants.length === 0) return undefined
  const index = offset % variants.length
  return variants[index]
}

/**
 * Check if two reason texts have semantic overlap (>60% word match)
 */
function hasSemanticOverlap(text1: string, text2: string): boolean {
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim()

  const norm1 = normalize(text1)
  const norm2 = normalize(text2)

  // Exact match
  if (norm1 === norm2) return true

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

function safeWeight(value: number | undefined, total: number | undefined, defaultValue: number): number {
  if (!total || total === 0) return defaultValue
  if (!value || typeof value !== "number") return defaultValue
  const weight = value / total
  if (!isFinite(weight)) return defaultValue
  return weight
}

// ─── EMERGENCY PATH ──────────────────────────────────────────────────────────
// Short. Calm. Efficient. Only 2 reasons.
// Priority: Availability → Distance → Emergency capability → Anxiety (if selected)

function buildEmergencyReasons(facts: MatchFacts, fallbackOffset = 0): MatchReason[] {
  const clinicId = facts.clinicId || "unknown"
  const selectedReasons: MatchReason[] = []
  const usedTexts: string[] = []

  const pickVariant = (variants: string[], offset: number) => {
    return variants[(fallbackOffset + offset) % variants.length]
  }

  // 1. Availability (almost always first)
  const availVariants = EMERGENCY_REASON_TEMPLATES.availability
  const availText = pickVariant(availVariants, 0)
  selectedReasons.push({
    key: `emergency_avail_${clinicId}`,
    text: availText,
    category: "treatment",
    weight: 0.5,
    tagKey: "EMERGENCY_AVAILABILITY",
  })
  usedTexts.push(availText)

  // 2. Distance (second priority)
  const distVariants = EMERGENCY_REASON_TEMPLATES.distance
  const distText = pickVariant(distVariants, 1)
  if (!hasSemanticOverlap(distText, usedTexts[0])) {
    selectedReasons.push({
      key: `emergency_dist_${clinicId}`,
      text: distText,
      category: "treatment",
      weight: 0.3,
      tagKey: "EMERGENCY_DISTANCE",
    })
    usedTexts.push(distText)
  }

  // 3. If we need a second reason still, try capability
  if (selectedReasons.length < 2) {
    const capVariants = EMERGENCY_REASON_TEMPLATES.capability
    const capText = pickVariant(capVariants, 2)
    if (!usedTexts.some((t) => hasSemanticOverlap(t, capText))) {
      selectedReasons.push({
        key: `emergency_cap_${clinicId}`,
        text: capText,
        category: "treatment",
        weight: 0.2,
        tagKey: "EMERGENCY_CAPABILITY",
      })
      usedTexts.push(capText)
    }
  }

  // 4. If patient is anxious and we still need a second, add anxiety
  const patientAnxious =
    facts.anxiety?.patientLevel &&
    facts.anxiety.patientLevel !== "comfortable" &&
    facts.anxiety.patientLevel !== "not_anxious"

  if (selectedReasons.length < 2 && patientAnxious) {
    const anxVariants = EMERGENCY_REASON_TEMPLATES.anxiety
    const anxText = pickVariant(anxVariants, 3)
    if (!usedTexts.some((t) => hasSemanticOverlap(t, anxText))) {
      selectedReasons.push({
        key: `emergency_anx_${clinicId}`,
        text: anxText,
        category: "anxiety",
        weight: 0.15,
        tagKey: "EMERGENCY_ANXIETY",
      })
    }
  }

  // Ensure we have exactly 2
  while (selectedReasons.length < 2) {
    const capVariants = EMERGENCY_REASON_TEMPLATES.capability
    const idx = selectedReasons.length
    const text = capVariants[idx % capVariants.length]
    if (!usedTexts.some((t) => hasSemanticOverlap(t, text))) {
      selectedReasons.push({
        key: `emergency_fill_${clinicId}_${idx}`,
        text,
        category: "treatment",
        weight: 0.1,
        tagKey: "EMERGENCY_CAPABILITY",
      })
      usedTexts.push(text)
    } else {
      // Absolute fallback
      selectedReasons.push({
        key: `emergency_fb_${clinicId}_${idx}`,
        text: "Accepts emergency appointments.",
        category: "treatment",
        weight: 0.1,
        tagKey: "EMERGENCY_CAPABILITY",
      })
      break
    }
  }

  return selectedReasons.slice(0, 2)
}

// ─── PLANNING PATH ───────────────────────────────────────────────────────────
// Max 3 reasons. Patient-driven: only show reasons for what the patient selected.
// Priority: Treatment → Priorities → Hesitations → Logistics (fallback only)

function buildPlanningReasons(facts: MatchFacts, deprioritizeTreatment = false, fallbackOffset = 0): MatchReason[] {
  const clinicId = facts.clinicId || "unknown"
  const treatmentCategory = facts.treatmentMatch?.treatmentCategory || "cosmetic"

  const candidates: Array<{
    reason: MatchReason
    group: ReasonGroup
    priority: number
  }> = []

  // 1. Treatment match candidate — different text for cosmetic vs checkup
  if (facts.treatmentMatch?.clinicOffers && !deprioritizeTreatment) {
    const rawTreatment = facts.treatmentMatch.requested || "your requested treatment"
    // Clean up multi-treatment: "Invisalign / Clear Aligners, Teeth Whitening" → "Invisalign / Clear Aligners and more"
    const treatmentParts = rawTreatment.split(",").map((t) => t.trim()).filter(Boolean)
    const treatmentName = treatmentParts.length > 1 ? `${treatmentParts[0]} and more` : rawTreatment
    const templates = TREATMENT_REASON_TEMPLATES[treatmentCategory] || TREATMENT_REASON_TEMPLATES.cosmetic
    const templateText = templates[fallbackOffset % templates.length].replace(/{treatment}/g, treatmentName)
    const tagKey = treatmentCategory === "checkup" ? "TREATMENT_CHECKUP" : "TREATMENT_MATCH"

    candidates.push({
      reason: {
        key: `treatment_${clinicId}`,
        text: templateText,
        category: "treatment",
        weight: safeWeight(facts.scoreBreakdown?.treatment, facts.scoreBreakdown?.total, 0.3),
        tagKey,
      },
      group: "GROUP_TREATMENT_FIT",
      priority: deprioritizeTreatment ? 99 : 0,
    })
  }

  // 2. Priority tag candidates — ONLY tags the patient selected on Q4 AND clinic has
  const priorityTags = facts.priorities?.matchedTags || []
  for (let i = 0; i < priorityTags.length; i++) {
    const tag = priorityTags[i]
    let template = getReasonTemplate(tag, fallbackOffset + i)
    if (template) {
      // Substitute {treatment} in specialist experience template
      if (tag === "TAG_SPECIALIST_LEVEL_EXPERIENCE" && facts.treatmentMatch?.requested) {
        const rawTx = facts.treatmentMatch.requested
        const txParts = rawTx.split(",").map((t) => t.trim()).filter(Boolean)
        const txDisplay = txParts.length > 1 ? `${txParts[0]} and more` : rawTx
        template = template.replace(/{treatment}/g, txDisplay)
      }
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

  // 3. Blocker/hesitation candidates — ONLY blockers the patient selected AND clinic has the tag
  const blockerTags = facts.blockers?.matchedTags || []
  for (let i = 0; i < blockerTags.length; i++) {
    const tag = blockerTags[i]
    const template = getReasonTemplate(tag, fallbackOffset + i)
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

  // 4. Anxiety support — only if patient selected an anxiety level
  const anxietyTags = facts.anxiety?.matchedTags || []
  for (let i = 0; i < anxietyTags.length; i++) {
    const tag = anxietyTags[i]
    const template = getReasonTemplate(tag, fallbackOffset + i)
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
        priority: 3,
      })
    }
  }

  // 5. Cost tag — only if patient selected a cost approach
  const costTag = facts.cost?.matchedTag
  if (costTag) {
    const template = getReasonTemplate(costTag, fallbackOffset)
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
        priority: 4,
      })
    }
  }

  // NOTE: No "extra clinic tags" loop — we only show reasons for things the patient chose

  // ─── Selection with diversity ───
  // Rotate which groups are used based on clinic position (fallbackOffset)
  // Treatment is always pinned first; remaining groups rotate so each clinic
  // draws from different category combinations (e.g. 0: priorities+blockers,
  // 1: priorities+anxiety, 2: blockers+anxiety)
  const nonTreatmentGroups: ReasonGroup[] = GROUP_PRIORITY.filter(
    (g) => g !== "GROUP_TREATMENT_FIT" && g !== "GROUP_GENERIC_FALLBACK",
  )
  // Rotate: shift by fallbackOffset so each clinic position starts at a different group
  const rotatedGroups: ReasonGroup[] = [
    "GROUP_TREATMENT_FIT" as ReasonGroup,
    ...nonTreatmentGroups.slice(fallbackOffset % nonTreatmentGroups.length),
    ...nonTreatmentGroups.slice(0, fallbackOffset % nonTreatmentGroups.length),
  ]

  const selectedReasons: MatchReason[] = []
  const usedGroups = new Set<ReasonGroup>()
  const usedTexts: string[] = []

  candidates.sort((a, b) => a.priority - b.priority)

  // First pass: pick best from each group in rotated order (diversity across categories)
  for (const targetGroup of rotatedGroups) {
    if (selectedReasons.length >= 3) break
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

  // Fill with logistics fallbacks if needed (ONLY as last resort)
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

  return selectedReasons.slice(0, 3)
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Build match reasons — delegates to emergency or planning path
 * Emergency: exactly 2 reasons (short, practical)
 * Planning: exactly 3 reasons (patient-driven, emotional)
 */
export function buildMatchReasons(facts: MatchFacts, deprioritizeTreatment = false, fallbackOffset = 0): MatchReason[] {
  if (!facts || typeof facts !== "object") {
    console.error("[buildMatchReasons] Invalid facts input:", facts)
    return getSafeFallbackReasons("unknown", fallbackOffset, false)
  }

  const clinicId = facts.clinicId || "unknown"
  const isEmergency = facts.isEmergency === true

  // For emergency, we don't require matching tags — availability/distance matter more
  if (!isEmergency) {
    const clinicTags = facts.clinicTags || []
    const matchingTagCount = clinicTags.filter((t) => t && t.startsWith("TAG_")).length
    if (matchingTagCount === 0) {
      console.warn(`[buildMatchReasons] Clinic ${clinicId} has 0 matching tags - returning fallback reasons`)
      return getSafeFallbackReasons(clinicId, fallbackOffset, false)
    }
  }

  let reasons: MatchReason[]

  if (isEmergency) {
    reasons = buildEmergencyReasons(facts, fallbackOffset)
  } else {
    reasons = buildPlanningReasons(facts, deprioritizeTreatment, fallbackOffset)
  }

  // Validate and sanitize
  const expectedCount = isEmergency ? 2 : 3
  const validatedReasons = validateAndSanitizeReasons(reasons, clinicId, fallbackOffset, expectedCount)

  // Final invariant check
  const validationResult = validateReasonInvariants(validatedReasons, clinicId, isEmergency)
  if (!validationResult.valid) {
    if (IS_PRODUCTION) {
      console.error(`[REASON_INVARIANT_VIOLATION] ${validationResult.error}`)
      return getSafeFallbackReasons(clinicId, fallbackOffset, isEmergency)
    } else {
      console.error(`[REASON_INVARIANT_VIOLATION] ${validationResult.error}`)
      // In dev, still return fallbacks rather than crashing
      return getSafeFallbackReasons(clinicId, fallbackOffset, isEmergency)
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

// ─── VALIDATION ──────────────────────────────────────────────────────────────

function validateAndSanitizeReasons(
  reasons: MatchReason[],
  clinicId: string,
  fallbackOffset = 0,
  expectedCount = 3,
): MatchReason[] {
  const validReasons: MatchReason[] = []

  for (const reason of reasons) {
    if (!reason) continue
    if (!reason.text || typeof reason.text !== "string" || reason.text.trim() === "") continue

    const isBanned = BANNED_GENERIC_PHRASES.some((phrase) => reason.text.toLowerCase().includes(phrase.toLowerCase()))
    if (isBanned) continue

    const hasValidTag =
      reason.tagKey &&
      (reason.tagKey.startsWith("TAG_") ||
        reason.tagKey.startsWith("FALLBACK_") ||
        reason.tagKey.startsWith("EMERGENCY_") ||
        reason.tagKey === "TREATMENT_MATCH" ||
        reason.tagKey === "TREATMENT_CHECKUP")
    if (!hasValidTag) continue

    validReasons.push(reason)
  }

  // Pad with fallbacks if needed
  while (validReasons.length < expectedCount) {
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
      validReasons.push({
        key: `fallback_safe_${clinicId}_${validReasons.length}`,
        text: "Offers appointments aligned with your availability.",
        category: "trust",
        weight: 0.05,
        tagKey: "FALLBACK_AVAILABILITY",
        isFallback: true,
      })
    }
  }

  return validReasons.slice(0, expectedCount)
}

function validateReasonInvariants(
  reasons: MatchReason[],
  clinicId: string,
  isEmergency = false,
): { valid: boolean; error?: string } {
  const expectedCount = isEmergency ? 2 : 3

  if (reasons.length !== expectedCount) {
    return {
      valid: false,
      error: `Expected ${expectedCount} reasons for clinic ${clinicId}, got ${reasons.length}`,
    }
  }

  const emptyReason = reasons.find((r) => !r.text || typeof r.text !== "string" || r.text.trim() === "")
  if (emptyReason) {
    return {
      valid: false,
      error: `Empty reason text for clinic ${clinicId}, tagKey: ${emptyReason.tagKey}`,
    }
  }

  const invalidTagReason = reasons.find(
    (r) =>
      !r.tagKey ||
      !(
        r.tagKey.startsWith("TAG_") ||
        r.tagKey.startsWith("FALLBACK_") ||
        r.tagKey.startsWith("EMERGENCY_") ||
        r.tagKey === "TREATMENT_MATCH" ||
        r.tagKey === "TREATMENT_CHECKUP"
      ),
  )
  if (invalidTagReason) {
    return {
      valid: false,
      error: `Invalid tagKey "${invalidTagReason.tagKey}" for clinic ${clinicId}`,
    }
  }

  return { valid: true }
}

function getSafeFallbackReasons(clinicId: string, offset = 0, isEmergency = false): MatchReason[] {
  const count = isEmergency ? 2 : 3

  if (isEmergency) {
    return [
      {
        key: `emergency_fb_avail_${clinicId}`,
        text: "Able to see urgent patients.",
        category: "treatment" as const,
        weight: 0.5,
        tagKey: "EMERGENCY_AVAILABILITY",
        isFallback: true,
      },
      {
        key: `emergency_fb_dist_${clinicId}`,
        text: "Conveniently located near you.",
        category: "treatment" as const,
        weight: 0.3,
        tagKey: "EMERGENCY_DISTANCE",
        isFallback: true,
      },
    ]
  }

  const result: MatchReason[] = []
  for (let i = 0; i < count; i++) {
    const fallbackIndex = (offset + i) % FALLBACK_REASONS.length
    const fallback = FALLBACK_REASONS[fallbackIndex]
    result.push({
      key: `fallback_${fallback?.key || "SAFE"}_${clinicId}_${i}`,
      text: fallback?.text || "Offers appointments aligned with your availability.",
      category: "trust" as const,
      weight: 0.05,
      tagKey: fallback?.key || "FALLBACK_AVAILABILITY",
      isFallback: true,
    })
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

  const primaryReasonKeys = validMatches.map((cm) => cm.reasons?.[0]?.tagKey).filter((k): k is string => !!k)
  const uniquePrimaryReasons = [...new Set(primaryReasonKeys)]

  const reasonSets = validMatches.map((cm) => {
    const tagKeys = (cm.reasons || []).map((r) => r?.tagKey || "NONE").sort()
    return tagKeys.join(",")
  })
  const uniqueReasonSets = new Set(reasonSets)

  if (uniqueReasonSets.size >= Math.min(2, validMatches.length)) {
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
