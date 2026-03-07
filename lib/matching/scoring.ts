import type { LeadAnswer, ClinicProfile, MatchScoreBreakdown, ScoreCategoryBreakdown, MatchFacts } from "./contract"
import { calculateHaversineDistance } from "@/lib/utils/geo"
import {
  WEIGHT_CONFIG,
  Q4_PRIORITY_TAG_MAP,
  Q5_BLOCKER_TAG_MAP,
  Q8_COST_TAG_MAP,
  Q10_ANXIETY_TAG_MAP,
  COST_PRICE_TIER_MAP,
  DIRECTORY_LISTING_WEIGHTS,
  DIRECTORY_LISTING_MAX_RADIUS,
  DIRECTORY_LISTING_MULTIPLIER,
} from "./tag-schema"

/**
 * Score a clinic against a lead with full breakdown
 * Uses canonical TAG_* keys from tag-schema.ts
 */
export function scoreClinic(lead: LeadAnswer, clinic: ClinicProfile): MatchScoreBreakdown {
  const categories: ScoreCategoryBreakdown[] = []
  let totalScore = 0
  let maxPossible = 0

  // 1. Treatment Match (REQUIRED - hard filter)
  const treatmentScore = scoreTreatmentMatch(lead, clinic, WEIGHT_CONFIG.treatment)
  categories.push(treatmentScore)
  totalScore += treatmentScore.points
  maxPossible += treatmentScore.maxPoints

  // 2. Distance
  let distanceMiles: number | undefined
  if (lead.latitude && lead.longitude && clinic.latitude && clinic.longitude) {
    distanceMiles = calculateHaversineDistance(lead.latitude, lead.longitude, clinic.latitude, clinic.longitude)
    const distanceScore = scoreDistance(lead, clinic, distanceMiles, WEIGHT_CONFIG.distance)
    categories.push(distanceScore)
    totalScore += distanceScore.points
    maxPossible += distanceScore.maxPoints
  }

  // 3. Q4: Priorities Match (decision_values → TAG_* keys)
  if (lead.priorities && lead.priorities.length > 0) {
    const prioritiesScore = scorePriorities(lead, clinic, WEIGHT_CONFIG.priorities)
    categories.push(prioritiesScore)
    totalScore += prioritiesScore.points
    maxPossible += prioritiesScore.maxPoints
  } else {
    console.log(`[scoring] Skipped priorities for clinic ${clinic.name}: lead has no priorities`)
  }

  // 4. Q5: Blocker support scoring (positive bonus for supportive clinics)
  const blockerCodes = lead.blockerCodes || (lead.blockerCode ? [lead.blockerCode] : [])
  if (blockerCodes.length > 0 && !blockerCodes.includes("NO_CONCERN")) {
    const blockerScore = scoreBlockerSupport(lead, clinic, blockerCodes, 10)
    categories.push(blockerScore)
    totalScore += blockerScore.points
    maxPossible += blockerScore.maxPoints
  }

  // 5. Q10: Anxiety Accommodation (anxiety_level → TAG_* keys)
  // Check for anxious levels (not_anxious = no scoring needed)
  if (lead.anxietyLevel && lead.anxietyLevel !== "comfortable" && lead.anxietyLevel !== "not_anxious") {
    const anxietyScore = scoreAnxiety(lead, clinic, WEIGHT_CONFIG.anxiety)
    categories.push(anxietyScore)
    totalScore += anxietyScore.points
    maxPossible += anxietyScore.maxPoints
  } else {
    console.log(`[scoring] Skipped anxiety for clinic ${clinic.name}: level="${lead.anxietyLevel || "not set"}"`)
  }

  // 6. Q8: Cost Approach Match (cost_approach → TAG_* keys)
  if (lead.costApproach && lead.costApproach !== "unspecified") {
    const costScore = scoreCostApproach(lead, clinic, WEIGHT_CONFIG.cost)
    categories.push(costScore)
    totalScore += costScore.points
    maxPossible += costScore.maxPoints
  } else {
    console.log(`[scoring] Skipped cost for clinic ${clinic.name}: approach="${lead.costApproach || "not set"}"`)
  }

  // 7. Availability Match (preferred_times + urgency)
  if (lead.preferred_times && lead.preferred_times.length > 0) {
    const availabilityScore = scoreAvailability(lead, clinic, WEIGHT_CONFIG.availability)
    categories.push(availabilityScore)
    totalScore += availabilityScore.points
    maxPossible += availabilityScore.maxPoints
  } else {
    console.log(`[scoring] Skipped availability for clinic ${clinic.name}: no preferred_times`)
  }

  // Complex case penalty: -15 if patient selected WORRIED_COMPLEX and clinic lacks TAG_COMPLEX_CASES_WELCOME
  let complexCasePenalty = 0
  if (blockerCodes.includes("WORRIED_COMPLEX") && !clinic.filterKeys.includes("TAG_COMPLEX_CASES_WELCOME")) {
    complexCasePenalty = 15
    totalScore = Math.max(0, totalScore - complexCasePenalty)
  }

  // Sedation penalty: -15 if patient is very anxious (likely needs sedation) and clinic doesn't offer it
  let sedationPenalty = 0
  if (lead.anxietyLevel === "very_anxious" && !clinic.filterKeys.includes("TAG_SEDATION_AVAILABLE")) {
    sedationPenalty = 15
    totalScore = Math.max(0, totalScore - sedationPenalty)
  }

  // Calculate contribution weights for each category
  categories.forEach((cat) => {
    cat.weight = totalScore > 0 ? cat.points / totalScore : 0
  })

  const percent = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0

  return {
    totalScore,
    maxPossible,
    percent,
    categories,
    distanceMiles,
    complexCasePenalty,
    sedationPenalty,
  }
}

// Treatment taxonomy: canonical treatment → known aliases
// Used for matching instead of raw substring matching to avoid false positives
const TREATMENT_ALIASES: Record<string, string[]> = {
  "invisalign / clear aligners": ["invisalign", "clear aligners", "aligners", "clear aligner", "orthodontic"],
  "teeth whitening": ["whitening", "teeth whitening", "tooth whitening", "bleaching"],
  "composite bonding": ["bonding", "composite bonding", "composite", "dental bonding"],
  "veneers": ["veneers", "veneer", "porcelain veneers", "porcelain veneer"],
  "dental implants": ["implants", "dental implants", "implant", "dental implant"],
  // All General Dentistry sub-options match against the "General Dentistry" clinic tag
  "check-ups": ["check-up", "checkup", "check up", "clean", "hygiene", "general dentistry", "routine", "preventative"],
  "crowns": ["crown", "crowns", "general dentistry"],
  "dental hygienist": ["dental hygienist", "hygienist", "hygiene", "clean", "general dentistry"],
  "dentures": ["dentures", "denture", "general dentistry"],
  "extractions": ["extraction", "extractions", "general dentistry"],
  "fillings": ["filling", "fillings", "general dentistry"],
  "emergency dental issue (pain, swelling, broken tooth)": ["emergency", "urgent", "pain", "swelling", "broken tooth", "toothache", "abscess"],
}

function getCanonicalAliases(treatmentInput: string): string[] {
  const lower = treatmentInput.toLowerCase()
  // Try exact match first
  if (TREATMENT_ALIASES[lower]) return TREATMENT_ALIASES[lower]
  // Try finding the canonical entry that contains this treatment
  for (const [canonical, aliases] of Object.entries(TREATMENT_ALIASES)) {
    if (canonical.includes(lower) || lower.includes(canonical)) return aliases
    if (aliases.some(a => lower.includes(a) || a.includes(lower))) return aliases
  }
  // Fallback: split into terms for legacy compatibility
  return lower.split(/[\s\/,&]+/).filter(term => term.length > 2).map(term => term.trim())
}

function scoreTreatmentMatch(lead: LeadAnswer, clinic: ClinicProfile, maxPoints: number): ScoreCategoryBreakdown {
  const aliases = getCanonicalAliases(lead.treatment)

  // Check if any alias matches clinic offerings
  const hasMatch =
    // Check clinic treatments against canonical aliases
    clinic.treatments.some((t) => {
      const clinicTreatment = t.toLowerCase()
      return aliases.some(alias => clinicTreatment.includes(alias))
    }) ||
    // Also check tags
    clinic.tags.some((t) => {
      const tagLower = t.toLowerCase()
      return aliases.some(alias => tagLower.includes(alias))
    })

  return {
    category: "treatment",
    points: hasMatch ? maxPoints : 0,
    maxPoints,
    weight: 0,
    facts: {
      leadTreatment: lead.treatment,
      treatmentAliases: aliases,
      clinicOffersTreatment: hasMatch,
      clinicTreatments: clinic.treatments,
    },
  }
}

/**
 * Distance thresholds (miles) — the radius at which a clinic's distance score reaches 0%.
 * Scoring uses smooth linear decay: 100% at 0 miles, 0% at maxRadius.
 *
 *   NEAR_HOME_WORK: ~20 min walk / short bus ride in London
 *   TRAVEL_A_BIT:   ~30 min tube/bus across a few zones
 *   TRAVEL_FURTHER: Willing to cross London for the right clinic
 *   DEFAULT:        Fallback when no preference is specified
 */
const DISTANCE_THRESHOLDS = {
  NEAR_HOME_WORK: 5,
  TRAVEL_A_BIT: 12,
  TRAVEL_FURTHER: 25,
  DEFAULT: 10,
} as const

function scoreDistance(
  lead: LeadAnswer,
  clinic: ClinicProfile,
  distanceMiles: number,
  maxPoints: number,
): ScoreCategoryBreakdown {
  // Smooth linear decay: 100% at 0mi, 0% at maxRadius
  // No cliff edges — score decreases proportionally with distance

  const pref = lead.locationPreference?.toLowerCase()

  let maxRadius: number
  if (pref === "near_home" || pref === "near_home_work") {
    maxRadius = DISTANCE_THRESHOLDS.NEAR_HOME_WORK
  } else if (pref === "travel_bit" || pref === "travel_a_bit") {
    maxRadius = DISTANCE_THRESHOLDS.TRAVEL_A_BIT
  } else if (pref === "travel_further") {
    maxRadius = DISTANCE_THRESHOLDS.TRAVEL_FURTHER
  } else {
    maxRadius = DISTANCE_THRESHOLDS.DEFAULT
  }

  const ratio = Math.max(0, 1 - distanceMiles / maxRadius)
  const points = Math.round(maxPoints * ratio)

  return {
    category: "distance",
    points,
    maxPoints,
    weight: 0,
    facts: {
      distanceMiles,
      locationPreference: lead.locationPreference,
      maxRadius,
    },
  }
}

function scorePriorities(lead: LeadAnswer, clinic: ClinicProfile, maxPoints: number): ScoreCategoryBreakdown {
  const matchedPriorities: string[] = []
  const matchedTags: string[] = []

  for (const priority of lead.priorities) {
    const tagKey = Q4_PRIORITY_TAG_MAP[priority]
    if (tagKey && clinic.filterKeys.includes(tagKey)) {
      matchedPriorities.push(priority)
      matchedTags.push(tagKey)
    }
  }

  const totalPriorities = lead.priorities.length
  const matchCount = matchedPriorities.length
  let points = 0

  // Simple tiered scoring based on how many priorities match
  if (totalPriorities === 0) {
    points = 0
  } else if (matchCount === totalPriorities) {
    points = maxPoints // All priorities matched = 100%
  } else if (matchCount >= totalPriorities * 0.75) {
    points = Math.round(maxPoints * 0.85) // 75%+ matched = 85%
  } else if (matchCount >= totalPriorities * 0.5) {
    points = Math.round(maxPoints * 0.6) // 50%+ matched = 60%
  } else if (matchCount >= 1) {
    points = Math.round(maxPoints * 0.3) // At least 1 matched = 30%
  } else {
    points = 0 // None matched = 0%
  }

  return {
    category: "priorities",
    points,
    maxPoints,
    weight: 0,
    facts: {
      leadPriorities: lead.priorities,
      matchedPriorities,
      matchedTags,
      matchCount,
    },
  }
}

function scoreAnxiety(lead: LeadAnswer, clinic: ClinicProfile, maxPoints: number): ScoreCategoryBreakdown {
  const anxietyLevel = lead.anxietyLevel || ""
  const matchedTags: string[] = []
  let points = 0

  // Check what anxiety support the clinic offers
  const hasSedation = clinic.filterKeys.includes("TAG_SEDATION_AVAILABLE")
  const hasAnxietyFriendly = 
    clinic.filterKeys.includes("TAG_OK_WITH_ANXIOUS_PATIENTS") || 
    clinic.filterKeys.includes("TAG_ANXIETY_FRIENDLY") ||
    clinic.filterKeys.includes("TAG_CALM_REASSURING")
  
  // Score based on patient's anxiety level and clinic's support
  if (anxietyLevel === "very_anxious" || anxietyLevel === "quite_anxious") {
    // Patient needs strong anxiety support (serious tier)
    if (hasSedation) {
      points = maxPoints // Sedation available = 100%
      matchedTags.push("TAG_SEDATION_AVAILABLE")
    } else if (hasAnxietyFriendly) {
      points = Math.round(maxPoints * 0.5) // Anxiety-friendly but no sedation = 50%
      matchedTags.push("TAG_OK_WITH_ANXIOUS_PATIENTS")
    } else {
      points = 0 // No anxiety support = 0%
    }
  } else if (anxietyLevel === "slightly_anxious" || anxietyLevel === "a_bit_nervous" || anxietyLevel === "somewhat_anxious") {
    // Patient moderately anxious (mid tier)
    if (hasAnxietyFriendly || hasSedation) {
      points = maxPoints // Any anxiety support = 100%
      matchedTags.push(hasSedation ? "TAG_SEDATION_AVAILABLE" : "TAG_OK_WITH_ANXIOUS_PATIENTS")
    } else {
      points = Math.round(maxPoints * 0.4) // No explicit support but might be okay = 40%
    }
  } else {
    // Unknown/legacy anxiety value - mild scoring
    if (hasAnxietyFriendly) {
      points = maxPoints
      matchedTags.push("TAG_OK_WITH_ANXIOUS_PATIENTS")
    } else {
      points = Math.round(maxPoints * 0.6) // Not critical for mild anxiety
    }
  }

  return {
    category: "anxiety",
    points,
    maxPoints,
    weight: 0,
    facts: {
      anxietyLevel,
      hasSedation,
      hasAnxietySupport: hasAnxietyFriendly,
      matchedTags,
    },
  }
}

function scoreAvailability(lead: LeadAnswer, clinic: ClinicProfile, maxPoints: number): ScoreCategoryBreakdown {
  const preferredTimes = lead.preferred_times || [] // ["morning", "afternoon"]
  const hasAvailabilityData = !!(clinic.available_hours && clinic.available_days)
  const clinicHours = clinic.available_hours || ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
  const clinicDays = clinic.available_days || ["mon", "tue", "wed", "thu", "fri"]
  const urgency = lead.timingPreference || "flexible"
  const acceptsSameDay = clinic.accepts_same_day ?? false
  const acceptsUrgent = clinic.accepts_urgent ?? false

  // Map clinic hours to time slot categories
  // Morning: 9-12, Afternoon: 13-17
  const morningHours = ["09:00", "10:00", "11:00", "12:00"]
  const afternoonHours = ["13:00", "14:00", "15:00", "16:00", "17:00"]

  const clinicHasMorning = morningHours.some(h => clinicHours.includes(h))
  const clinicHasAfternoon = afternoonHours.some(h => clinicHours.includes(h))
  const clinicHasWeekend = clinicDays.some(d => d === "sat" || d === "saturday" || d === "sun" || d === "sunday")

  // Detect if this is an emergency treatment
  const treatmentLower = lead.treatment.toLowerCase()
  const isEmergency = treatmentLower.includes("emergency") || treatmentLower.includes("pain") || treatmentLower.includes("swelling") || treatmentLower.includes("broken")

  let points = 0
  const matchedTimeSlots: string[] = []

  // Check which preferred time slots the clinic can accommodate
  for (const pref of preferredTimes) {
    if (pref === "morning" && clinicHasMorning) {
      matchedTimeSlots.push("morning")
    }
    if (pref === "afternoon" && clinicHasAfternoon) {
      matchedTimeSlots.push("afternoon")
    }
    if (pref === "weekend" && clinicHasWeekend) {
      matchedTimeSlots.push("weekend")
    }
  }

  const totalPreferred = preferredTimes.length
  const matchCount = matchedTimeSlots.length

  // Emergency path: if patient needs emergency, weight accepts_urgent heavily
  if (isEmergency) {
    // Emergency scoring: 60% emergency readiness, 40% time slot matching
    const emergencyWeight = 0.6
    const slotWeight = 0.4

    if (acceptsUrgent) {
      points += Math.round(maxPoints * emergencyWeight) // Full emergency bonus
    } else if (acceptsSameDay) {
      points += Math.round(maxPoints * emergencyWeight * 0.5) // Same-day = partial emergency support
    }
    // else: 0 emergency points — clinic doesn't accept emergency patients

    // Time slot matching for emergency
    if (totalPreferred > 0 && matchCount > 0) {
      points += Math.round(maxPoints * slotWeight * (matchCount / totalPreferred))
    } else if (clinicDays.length >= 5) {
      points += Math.round(maxPoints * slotWeight * 0.7)
    }
  } else {
    // Normal (non-emergency) path
    // Base score from time slot matching (70% of availability points)
    const slotWeight = 0.7
    if (totalPreferred > 0) {
      if (matchCount === totalPreferred) {
        points += Math.round(maxPoints * slotWeight) // All slots match = 70%
      } else if (matchCount >= 1) {
        // Partial match - proportional score
        points += Math.round(maxPoints * slotWeight * (matchCount / totalPreferred))
      }
    } else {
      // Patient didn't specify preference - give full slot score if clinic has good availability
      if (clinicHasMorning && clinicHasAfternoon && clinicDays.length >= 5) {
        points += Math.round(maxPoints * slotWeight)
      } else if (clinicDays.length >= 3) {
        points += Math.round(maxPoints * slotWeight * 0.7)
      }
    }

    // Urgency bonus (30% of availability points)
    const urgencyWeight = 0.3

    if (urgency === "asap" || urgency === "1_week" || urgency === "within_week") {
      // Patient needs urgent/soon appointment
      if (acceptsSameDay || acceptsUrgent) {
        points += Math.round(maxPoints * urgencyWeight) // Full urgency bonus
      } else if (clinicDays.length >= 5) {
        // Clinic open most days, still decent for urgent
        points += Math.round(maxPoints * urgencyWeight * 0.5)
      }
    } else {
      // Patient is flexible - give partial bonus
      points += Math.round(maxPoints * urgencyWeight * 0.5)
    }
  }

  // If clinic has no real availability data, cap at 50% — don't reward assumed defaults
  if (!hasAvailabilityData) {
    points = Math.min(points, Math.round(maxPoints * 0.5))
  }

  return {
    category: "availability",
    points: Math.min(points, maxPoints), // Cap at max
    maxPoints,
    weight: 0,
    facts: {
      preferredTimes,
      clinicDays,
      clinicHours,
      matchedTimeSlots,
      matchCount,
      urgency,
      acceptsSameDay,
      acceptsUrgent,
      weekendAvailable: clinicHasWeekend,
      hasAvailabilityData,
    },
  }
}

function scoreCostApproach(lead: LeadAnswer, clinic: ClinicProfile, maxPoints: number): ScoreCategoryBreakdown {
  const costApproach = lead.costApproach || ""
  const tagKey = Q8_COST_TAG_MAP[costApproach]
  const clinicPriceRange = clinic.priceRange || null
  let points = 0
  let matchedTag: string | null = null
  let priceTierMatch: "full" | "partial" | "excluded" | "unknown" = "unknown"

  // Split points: ~50% price tier match, ~50% communication TAG match
  // Note: rounding may give tierPoints one extra point (e.g. 8/7 for 15), but sum always equals maxPoints
  const tierPoints = Math.round(maxPoints * 0.5)
  const tagPoints = maxPoints - tierPoints

  // --- Layer 1: Price tier match ---
  // Hard filter for extremes: premium patient never sees budget, budget patient never sees premium
  const tierConfig = COST_PRICE_TIER_MAP[costApproach]
  if (tierConfig && clinicPriceRange) {
    if (tierConfig.excluded.includes(clinicPriceRange)) {
      // Hard exclusion — clinic's price tier is incompatible with patient's mindset
      priceTierMatch = "excluded"
      // 0 points for tier, effectively penalises this clinic heavily
    } else if (tierConfig.full.includes(clinicPriceRange)) {
      priceTierMatch = "full"
      points += tierPoints // Full tier points
    } else if (tierConfig.partial.includes(clinicPriceRange)) {
      priceTierMatch = "partial"
      points += Math.round(tierPoints * 0.5) // Half tier points
    }
  } else if (!clinicPriceRange) {
    // Clinic has no price_range set — give benefit of the doubt
    priceTierMatch = "unknown"
    points += Math.round(tierPoints * 0.5)
  } else {
    // Patient has no cost approach or legacy value without tier config — neutral
    priceTierMatch = "unknown"
    points += Math.round(tierPoints * 0.5)
  }

  // --- Layer 2: Communication TAG match ---
  // Skip TAG scoring entirely if price tier is excluded (hard exclusion)
  if (priceTierMatch === "excluded") {
    // Hard exclusion: clinic's price tier is incompatible — no TAG bonus
    // Total cost points stay at 0
  } else if (tagKey && clinic.filterKeys.includes(tagKey)) {
    // Direct match: clinic has the exact cost communication tag the patient needs
    points += tagPoints
    matchedTag = tagKey
  } else if (tagKey) {
    // No direct match, but check for related cost support
    const hasSomeCostSupport =
      clinic.filterKeys.includes("TAG_QUALITY_OUTCOME_FOCUSED") ||
      clinic.filterKeys.includes("TAG_CLEAR_PRICING_UPFRONT") ||
      clinic.filterKeys.includes("TAG_MONTHLY_PAYMENTS_PREFERRED") ||
      clinic.filterKeys.includes("TAG_FINANCE_AVAILABLE") ||
      clinic.filterKeys.includes("TAG_STRICT_BUDGET_SUPPORTIVE") ||
      clinic.filterKeys.includes("TAG_FLEXIBLE_BUDGET_OK") ||
      clinic.filterKeys.includes("TAG_DISCUSS_OPTIONS_BEFORE_COST")

    if (hasSomeCostSupport) {
      points += Math.round(tagPoints * 0.4) // Partial credit for related cost support
    }
  }

  return {
    category: "cost",
    points,
    maxPoints,
    weight: 0,
    facts: {
      patientApproach: costApproach,
      matchedTag,
      hasCostMatch: points > 0,
      priceTierMatch,
      clinicPriceRange,
    },
  }
}

/**
 * Score blocker support: positive bonus when clinic has tags matching patient's hesitations
 * NOT_WORTH_COST → TAG_GOOD_FOR_COST_CONCERNS (+8)
 * BAD_EXPERIENCE → TAG_BAD_EXPERIENCE_SUPPORTIVE (+8)
 * UNSURE_OPTION → TAG_OPTION_CLARITY_SUPPORT (+5)
 * NEED_MORE_TIME → TAG_DECISION_SUPPORTIVE (+5)
 * WORRIED_COMPLEX is handled as a penalty separately (existing behavior)
 */
function scoreBlockerSupport(
  lead: LeadAnswer,
  clinic: ClinicProfile,
  blockerCodes: string[],
  maxPoints: number,
): ScoreCategoryBreakdown {
  const matchedTags: string[] = []
  let points = 0

  // Points per blocker type (higher for more impactful blockers)
  const BLOCKER_POINTS: Record<string, number> = {
    NOT_WORTH_COST: 8,
    BAD_EXPERIENCE: 8,
    UNSURE_OPTION: 5,
    NEED_MORE_TIME: 5,
  }

  for (const code of blockerCodes) {
    if (code === "WORRIED_COMPLEX" || code === "NO_CONCERN") continue // Handled separately

    const tagKey = Q5_BLOCKER_TAG_MAP[code]
    if (tagKey && clinic.filterKeys.includes(tagKey)) {
      matchedTags.push(tagKey)
      points += BLOCKER_POINTS[code] || 5
    }
  }

  // Cap at maxPoints
  points = Math.min(points, maxPoints)

  return {
    category: "blockers",
    points,
    maxPoints,
    weight: 0,
    facts: {
      patientBlockers: blockerCodes,
      matchedTags,
      matchCount: matchedTags.length,
      hasBlockerSupport: matchedTags.length > 0,
    },
  }
}

/**
 * Detect treatment category from the treatment string
 */
function detectTreatmentCategory(treatment: string): "cosmetic" | "restorative" | "checkup" | "emergency" {
  const lower = treatment.toLowerCase()
  if (lower.includes("emergency") || lower.includes("pain") || lower.includes("swelling") || lower.includes("broken")) {
    return "emergency"
  }
  if (lower.includes("check-up") || lower.includes("checkup") || lower.includes("check up") || lower.includes("general") || lower.includes("clean") || lower.includes("hygien")) {
    return "checkup"
  }
  // Restorative treatments (implants, crowns, root canal, fillings, extractions, dentures, bridges)
  if (lower.includes("implant") || lower.includes("crown") || lower.includes("root canal") || lower.includes("filling") || lower.includes("extraction") || lower.includes("denture") || lower.includes("bridge") || lower.includes("wisdom")) {
    return "restorative"
  }
  // Cosmetic: whitening, bonding, veneers, invisalign, orthodontics
  return "cosmetic"
}

/**
 * Build MATCH_FACTS from lead and clinic - this is the ONLY input to reasons engine
 * Extracts structured facts, never passes raw answers
 */
export function buildMatchFacts(lead: LeadAnswer, clinic: ClinicProfile, breakdown: MatchScoreBreakdown): MatchFacts {
  const treatmentCategory = detectTreatmentCategory(lead.treatment)
  const isEmergency = treatmentCategory === "emergency"

  // Extract category data from breakdown
  const treatmentCat = breakdown.categories.find((c) => c.category === "treatment")
  const prioritiesCat = breakdown.categories.find((c) => c.category === "priorities")
  const costCat = breakdown.categories.find((c) => c.category === "cost")
  const anxietyCat = breakdown.categories.find((c) => c.category === "anxiety")
  const availabilityCat = breakdown.categories.find((c) => c.category === "availability")

  // Check ALL blocker types against clinic tags (used for reasons and blocker scoring)
  const patientBlockerCodes = lead.blockerCodes || (lead.blockerCode ? [lead.blockerCode] : [])
  const blockerMatchedTags: string[] = []
  const blockersCat = breakdown.categories.find((c) => c.category === "blockers")
  if (blockersCat?.facts?.matchedTags) {
    blockerMatchedTags.push(...(blockersCat.facts.matchedTags as string[]))
  }
  // Also check WORRIED_COMPLEX (handled as penalty, not in blocker scoring category)
  if (patientBlockerCodes.includes("WORRIED_COMPLEX") && clinic.filterKeys.includes("TAG_COMPLEX_CASES_WELCOME")) {
    if (!blockerMatchedTags.includes("TAG_COMPLEX_CASES_WELCOME")) {
      blockerMatchedTags.push("TAG_COMPLEX_CASES_WELCOME")
    }
  }

  return {
    clinicId: clinic.id,
    clinicName: clinic.name,
    isEmergency,

    treatmentMatch: {
      requested: lead.treatment,
      clinicOffers: treatmentCat?.facts?.clinicOffersTreatment ?? false,
      matchedTreatments: (treatmentCat?.facts?.clinicTreatments as string[]) || [],
      treatmentCategory,
    },

    priorities: {
      patientPriorities: lead.priorities || [],
      matchedTags: (prioritiesCat?.facts?.matchedTags as string[]) || [],
      matchCount: (prioritiesCat?.facts?.matchCount as number) || 0,
    },

    blockers: {
      patientBlockers: patientBlockerCodes,
      matchedTags: blockerMatchedTags,
      hasMatch: blockerMatchedTags.length > 0,
    },

    cost: {
      patientApproach: lead.costApproach || null,
      matchedTag: (costCat?.facts?.matchedTag as string) || null,
      hasMatch: (costCat?.facts?.hasCostMatch as boolean) || false,
      priceTierMatch: (costCat?.facts?.priceTierMatch as "full" | "partial" | "excluded" | "unknown") || "unknown",
      clinicPriceRange: (costCat?.facts?.clinicPriceRange as string) || null,
    },

    anxiety: {
      patientLevel: lead.anxietyLevel || null,
      needsSedation: lead.anxietyLevel === "very_anxious",
      hasSedation: (anxietyCat?.facts?.hasSedation as boolean) || false,
      hasAnxietySupport: (anxietyCat?.facts?.hasAnxietySupport as boolean) || false,
      matchedTags: (anxietyCat?.facts?.matchedTags as string[]) || [],
    },

    availability: {
      preferredTimes: (availabilityCat?.facts?.preferredTimes as string[]) || [],
      clinicDays: (availabilityCat?.facts?.clinicDays as string[]) || [],
      clinicHours: (availabilityCat?.facts?.clinicHours as string[]) || [],
      matchedTimeSlots: (availabilityCat?.facts?.matchedTimeSlots as string[]) || [],
      urgency: lead.timingPreference || null,
      acceptsSameDay: (availabilityCat?.facts?.acceptsSameDay as boolean) ?? false,
      acceptsUrgent: (availabilityCat?.facts?.acceptsUrgent as boolean) ?? false,
      weekendAvailable: (availabilityCat?.facts?.weekendAvailable as boolean) ?? false,
    },

    scoreBreakdown: {
      treatment: treatmentCat?.points || 0,
      priorities: prioritiesCat?.points || 0,
      blockers: blockersCat?.points || 0,
      cost: costCat?.points || 0,
      anxiety: anxietyCat?.points || 0,
      availability: availabilityCat?.points || 0,
      total: breakdown.totalScore,
      maxPossible: breakdown.maxPossible,
      percent: breakdown.percent,
      complexCasePenalty: breakdown.complexCasePenalty || 0,
      sedationPenalty: breakdown.sedationPenalty || 0,
    },

    clinicTags: clinic.filterKeys,
    clinicRating: clinic.rating,
  }
}

// =============================================================================
// Hard Filters
// =============================================================================

/**
 * Hard filter: exclude clinics with no pricing data when patient wants clear pricing.
 * Triggered when patient selects "Clear pricing before treatment" (Q4 priority)
 * or a cost approach that maps to TAG_CLEAR_PRICING_UPFRONT (e.g. comfort_range).
 *
 * A clinic passes the filter if it has:
 *  - a priceRange set (budget/mid/premium), OR
 *  - the TAG_CLEAR_PRICING_UPFRONT tag (explicitly verified for clear pricing)
 *
 * Returns true if the clinic should be EXCLUDED.
 */
export function isExcludedByClearPricingFilter(lead: LeadAnswer, clinic: ClinicProfile): boolean {
  // Check if patient selected any Q4 priority that maps to TAG_CLEAR_PRICING_UPFRONT
  const priorityWantsClearPricing = (lead.priorities || []).some(p => {
    const tag = Q4_PRIORITY_TAG_MAP[p]
    return tag === "TAG_CLEAR_PRICING_UPFRONT"
  })

  // Check if patient's Q8 cost approach maps to TAG_CLEAR_PRICING_UPFRONT
  const costWantsClearPricing = lead.costApproach
    ? Q8_COST_TAG_MAP[lead.costApproach] === "TAG_CLEAR_PRICING_UPFRONT"
    : false

  if (!priorityWantsClearPricing && !costWantsClearPricing) return false

  // Clinic has pricing data — passes filter
  if (clinic.priceRange) return false

  // Clinic has clear pricing tag — passes filter (explicitly verified)
  if (clinic.filterKeys.includes("TAG_CLEAR_PRICING_UPFRONT")) return false

  // Patient wants clear pricing but clinic has no pricing data and no clear pricing tag
  return true
}

// =============================================================================
// Directory Listing Scoring
// Simple scoring for unverified clinics without tag data.
// Uses only universally-available signals: distance, reviews, treatment text, completeness.
// =============================================================================

/**
 * Score a directory listing (unverified clinic without tags) against a lead.
 * Returns a MatchScoreBreakdown on the same 0-100 scale as scoreClinic().
 *
 * Weights: distance(40), reviews(30), treatment(20), completeness(10) = 100
 */
export function scoreDirectoryListing(lead: LeadAnswer, clinic: ClinicProfile): MatchScoreBreakdown {
  const categories: ScoreCategoryBreakdown[] = []
  let totalScore = 0
  const maxPossible = 100

  // 1. Distance (40 points) — quadratic decay over DIRECTORY_LISTING_MAX_RADIUS
  //    Quadratic curve penalises farther clinics more aggressively:
  //    2 mi → 75%, 5 mi → 44%, 8 mi → 22%, 10 mi → 11%, 15 mi → 0%
  let distanceMiles: number | undefined
  if (lead.latitude && lead.longitude && clinic.latitude && clinic.longitude) {
    distanceMiles = calculateHaversineDistance(lead.latitude, lead.longitude, clinic.latitude, clinic.longitude)
    const linearRatio = Math.max(0, 1 - distanceMiles / DIRECTORY_LISTING_MAX_RADIUS)
    const ratio = linearRatio * linearRatio // quadratic decay
    const distPoints = Math.round(DIRECTORY_LISTING_WEIGHTS.distance * ratio)
    categories.push({
      category: "distance",
      points: distPoints,
      maxPoints: DIRECTORY_LISTING_WEIGHTS.distance,
      weight: 0,
      facts: { distanceMiles, maxRadius: DIRECTORY_LISTING_MAX_RADIUS },
    })
    totalScore += distPoints
  } else {
    // No coords — 0 distance points
    categories.push({
      category: "distance",
      points: 0,
      maxPoints: DIRECTORY_LISTING_WEIGHTS.distance,
      weight: 0,
      facts: { distanceMiles: undefined, maxRadius: DIRECTORY_LISTING_MAX_RADIUS },
    })
  }

  // 2. Reviews (30 points) — 60% rating, 40% review count (log scale)
  const ratingMax = Math.round(DIRECTORY_LISTING_WEIGHTS.reviews * 0.6)
  const countMax = DIRECTORY_LISTING_WEIGHTS.reviews - ratingMax

  // Stricter rating scale: map 0-5 stars onto 0-18 pts with steeper curve
  // Below 3.0 → near-zero, 3.5 → ~30%, 4.0 → ~56%, 4.5 → ~80%, 5.0 → 100%
  const ratingRatio = clinic.rating ? Math.max(0, (clinic.rating - 2.5) / 2.5) : 0
  const ratingPoints = Math.round(ratingMax * Math.min(ratingRatio * ratingRatio, 1))
  // Log scale for review count: 1→~0%, 10→~33%, 100→~67%, 1000+=100%
  const countPoints = clinic.reviewCount > 0
    ? Math.round(countMax * Math.min(Math.log10(clinic.reviewCount) / Math.log10(1000), 1))
    : 0
  const reviewPoints = ratingPoints + countPoints

  categories.push({
    category: "reviews",
    points: reviewPoints,
    maxPoints: DIRECTORY_LISTING_WEIGHTS.reviews,
    weight: 0,
    facts: {
      rating: clinic.rating,
      reviewCount: clinic.reviewCount,
      ratingPoints,
      countPoints,
    },
  })
  totalScore += reviewPoints

  // 3. Treatment match (20 points) — text match using canonical aliases
  const aliases = getCanonicalAliases(lead.treatment)
  const hasTreatmentMatch =
    clinic.treatments.some((t) => {
      const lower = t.toLowerCase()
      return aliases.some(alias => lower.includes(alias))
    }) ||
    clinic.tags.some((t) => {
      const lower = t.toLowerCase()
      return aliases.some(alias => lower.includes(alias))
    })

  const treatmentPoints = hasTreatmentMatch ? DIRECTORY_LISTING_WEIGHTS.treatment : 0
  categories.push({
    category: "treatment",
    points: treatmentPoints,
    maxPoints: DIRECTORY_LISTING_WEIGHTS.treatment,
    weight: 0,
    facts: {
      leadTreatment: lead.treatment,
      clinicOffersTreatment: hasTreatmentMatch,
      clinicTreatments: clinic.treatments,
    },
  })
  totalScore += treatmentPoints

  // 4. Profile completeness (10 points) — 2 pts each for 5 signals
  let completenessPoints = 0
  if (clinic.latitude && clinic.longitude) completenessPoints += 2
  if (clinic.rating) completenessPoints += 2
  if (clinic.reviewCount > 0) completenessPoints += 2
  if (clinic.treatments.length > 0) completenessPoints += 2
  if (clinic.opening_hours) completenessPoints += 2

  categories.push({
    category: "completeness",
    points: completenessPoints,
    maxPoints: DIRECTORY_LISTING_WEIGHTS.completeness,
    weight: 0,
    facts: {
      hasCoords: !!(clinic.latitude && clinic.longitude),
      hasRating: !!clinic.rating,
      hasReviews: clinic.reviewCount > 0,
      hasTreatments: clinic.treatments.length > 0,
      hasOpeningHours: !!clinic.opening_hours,
    },
  })
  totalScore += completenessPoints

  // Calculate contribution weights
  categories.forEach((cat) => {
    cat.weight = totalScore > 0 ? cat.points / totalScore : 0
  })

  const rawPercent = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0
  const percent = Math.round(rawPercent * DIRECTORY_LISTING_MULTIPLIER)

  return {
    totalScore,
    maxPossible,
    percent,
    categories,
    distanceMiles,
  }
}

/*
 * ============================================================================
 * DO NOT MODIFY MATCHING LOGIC WITHOUT UPDATING:
 * - tag-schema.ts - canonical tag definitions
 * - contract.ts - MatchFacts interface
 * - reasons-engine.ts - reason generation logic
 * - scoring.ts (this file) - scoring algorithm
 * - __tests__/reasons-determinism.test.ts - automated validation
 *
 * Scoring MUST only output MatchFacts.
 * NEVER pass raw lead answers to reasons engine.
 * ============================================================================
 */
