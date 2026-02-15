import type { LeadAnswer, ClinicProfile, MatchScoreBreakdown, ScoreCategoryBreakdown, MatchFacts } from "./contract"
import { getDistanceMultiplier } from "./features"
import {
  WEIGHT_CONFIG,
  Q4_PRIORITY_TAG_MAP,
  Q8_COST_TAG_MAP,
  Q10_ANXIETY_TAG_MAP,
  COST_PRICE_TIER_MAP,
} from "./tag-schema"

/**
 * Calculate distance using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

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
    distanceMiles = calculateDistance(lead.latitude, lead.longitude, clinic.latitude, clinic.longitude)
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

  // 4. Q5: Blockers — informational only (no scoring)
  // Complex case penalty applied after all scoring below

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
  const blockerCodes = lead.blockerCodes || (lead.blockerCode ? [lead.blockerCode] : [])
  let complexCasePenalty = 0
  if (blockerCodes.includes("WORRIED_COMPLEX") && !clinic.filterKeys.includes("TAG_COMPLEX_CASES_WELCOME")) {
    complexCasePenalty = 15
    totalScore = Math.max(0, totalScore - complexCasePenalty)
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
  }
}

function scoreTreatmentMatch(lead: LeadAnswer, clinic: ClinicProfile, maxPoints: number): ScoreCategoryBreakdown {
  const treatmentLower = lead.treatment.toLowerCase()
  
  // Extract key treatment terms from lead's treatment (e.g., "Invisalign / Aligners" -> ["invisalign", "aligners"])
  const treatmentTerms = treatmentLower
    .split(/[\s\/,&]+/)
    .filter(term => term.length > 2)
    .map(term => term.trim())
  
  // Check if any treatment term matches clinic offerings
  const hasMatch =
    // Check if clinic treatment contains any of the lead's treatment terms
    clinic.treatments.some((t) => {
      const clinicTreatment = t.toLowerCase()
      return treatmentTerms.some(term => clinicTreatment.includes(term))
    }) ||
    // Check if lead treatment is fully contained in clinic treatment
    clinic.treatments.some((t) => t.toLowerCase().includes(treatmentLower)) ||
    // Also check tags
    clinic.tags.some((t) => {
      const tagLower = t.toLowerCase()
      return treatmentTerms.some(term => tagLower.includes(term)) || tagLower.includes(treatmentLower)
    })

  return {
    category: "treatment",
    points: hasMatch ? maxPoints : 0,
    maxPoints,
    weight: 0,
    facts: {
      leadTreatment: lead.treatment,
      treatmentTerms,
      clinicOffersTreatment: hasMatch,
      clinicTreatments: clinic.treatments,
    },
  }
}

function scoreDistance(
  lead: LeadAnswer,
  clinic: ClinicProfile,
  distanceMiles: number,
  maxPoints: number,
): ScoreCategoryBreakdown {
  // Simple scoring: closer = higher score
  // Patient's preference determines the "ideal" range and how much to weight distance
  
  const pref = lead.locationPreference?.toLowerCase()
  let points = 0
  
  if (pref === "near_home" || pref === "near_home_work") {
    // Patient wants very close - score heavily based on proximity
    if (distanceMiles <= 1) {
      points = maxPoints // Full points for under 1 mile
    } else if (distanceMiles <= 2) {
      points = Math.round(maxPoints * 0.8) // 80% for 1-2 miles
    } else if (distanceMiles <= 3) {
      points = Math.round(maxPoints * 0.5) // 50% for 2-3 miles
    } else if (distanceMiles <= 5) {
      points = Math.round(maxPoints * 0.25) // 25% for 3-5 miles
    } else {
      points = 0 // Too far for "near home" preference
    }
  } else if (pref === "travel_bit" || pref === "travel_a_bit") {
    // Patient willing to travel a bit - more flexible
    if (distanceMiles <= 2) {
      points = maxPoints // Full points
    } else if (distanceMiles <= 5) {
      points = Math.round(maxPoints * 0.75) // 75%
    } else if (distanceMiles <= 10) {
      points = Math.round(maxPoints * 0.4) // 40%
    } else {
      points = Math.round(maxPoints * 0.1) // 10% for far
    }
  } else if (pref === "travel_further") {
    // Patient happy to travel - distance matters less
    if (distanceMiles <= 5) {
      points = maxPoints // Full points
    } else if (distanceMiles <= 15) {
      points = Math.round(maxPoints * 0.7) // 70%
    } else {
      points = Math.round(maxPoints * 0.4) // 40% even for far
    }
  } else {
    // No preference - moderate scoring
    if (distanceMiles <= 3) {
      points = maxPoints
    } else if (distanceMiles <= 7) {
      points = Math.round(maxPoints * 0.6)
    } else {
      points = Math.round(maxPoints * 0.2)
    }
  }

  return {
    category: "distance",
    points,
    maxPoints,
    weight: 0,
    facts: {
      distanceMiles,
      locationPreference: lead.locationPreference,
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
  if (anxietyLevel === "prefer-sedation" || anxietyLevel === "very_anxious" || anxietyLevel === "quite_anxious") {
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
        points += maxPoints * slotWeight // All slots match = 70%
      } else if (matchCount >= 1) {
        // Partial match - proportional score
        points += Math.round(maxPoints * slotWeight * (matchCount / totalPreferred))
      }
    } else {
      // Patient didn't specify preference - give full slot score if clinic has good availability
      if (clinicHasMorning && clinicHasAfternoon && clinicDays.length >= 5) {
        points += maxPoints * slotWeight
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

  // Split points: 50% price tier match, 50% communication TAG match
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
 * Detect treatment category from the treatment string
 */
function detectTreatmentCategory(treatment: string): "cosmetic" | "checkup" | "emergency" {
  const lower = treatment.toLowerCase()
  if (lower.includes("emergency") || lower.includes("pain") || lower.includes("swelling") || lower.includes("broken")) {
    return "emergency"
  }
  if (lower.includes("check-up") || lower.includes("checkup") || lower.includes("check up") || lower.includes("general") || lower.includes("clean")) {
    return "checkup"
  }
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

  // Blockers are informational only — manually check for complex case match (used for reasons)
  const patientBlockerCodes = lead.blockerCodes || (lead.blockerCode ? [lead.blockerCode] : [])
  const blockerMatchedTags: string[] = []
  if (patientBlockerCodes.includes("WORRIED_COMPLEX") && clinic.filterKeys.includes("TAG_COMPLEX_CASES_WELCOME")) {
    blockerMatchedTags.push("TAG_COMPLEX_CASES_WELCOME")
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
      needsSedation: lead.anxietyLevel === "prefer-sedation",
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
      blockers: 0, // Informational only — no scoring
      cost: costCat?.points || 0,
      anxiety: anxietyCat?.points || 0,
      availability: availabilityCat?.points || 0,
      total: breakdown.totalScore,
      maxPossible: breakdown.maxPossible,
      percent: breakdown.percent,
      complexCasePenalty: breakdown.complexCasePenalty || 0,
    },

    clinicTags: clinic.filterKeys,
    clinicRating: clinic.rating,
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
