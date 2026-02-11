/**
 * Question → Feature Mapping
 * This defines how form answers translate to scoring weights
 */

export interface FeatureWeight {
  category: string
  baseWeight: number
  description: string
}

/**
 * Map location preference to distance weight multiplier
 */
export function getDistanceMultiplier(locationPreference?: string | null): number {
  switch (locationPreference) {
    case "near_home":
    case "NEAR_HOME_WORK":
      return 1.5 // Boost distance importance
    case "travel_bit":
    case "TRAVEL_A_BIT":
      return 1.0 // Normal
    case "travel_further":
    case "TRAVEL_FAR":
      return 0.5 // Reduce distance importance
    default:
      return 1.0
  }
}

/**
 * Get radius in miles based on location preference
 * Updated radius values: 1.5 / 5 / 15 miles
 */
export function getRadiusMiles(locationPreference?: string | null): number {
  switch (locationPreference) {
    case "near_home":
    case "near_home_work":
    case "NEAR_HOME_WORK":
      return 1.5 // Within 1.5 miles
    case "travel_bit":
    case "travel_a_bit":
    case "TRAVEL_A_BIT":
      return 5 // Up to 5 miles
    case "travel_further":
    case "TRAVEL_FAR":
      return 15 // 5+ miles (we use 15 as max practical radius)
    default:
      return 5
  }
}

/**
 * Map anxiety level to relevant filter keys
 */
export function getAnxietyFilterKeys(anxietyLevel?: string | null): string[] {
  switch (anxietyLevel) {
    case "very_anxious":
    case "VERY_ANXIOUS":
      return ["sedation", "calm", "gentle", "anxious_friendly", "reassuring", "nervous_patients"]
    case "quite_anxious":
    case "QUITE_ANXIOUS":
      return ["calm", "reassuring", "anxious_friendly", "gentle", "nervous_patients"]
    case "slightly_anxious":
    case "SLIGHTLY_ANXIOUS":
      return ["calm", "reassuring", "gentle"]
    default:
      return []
  }
}

/**
 * Map budget blocker to relevant filter keys
 */
export function getBudgetFilterKeys(budgetRange?: string | null): string[] {
  if (!budgetRange || budgetRange === "unspecified") return []

  if (budgetRange.includes("low") || budgetRange.includes("budget")) {
    return ["clear_pricing", "transparent_pricing", "finance_options", "payment_plans", "value_focused"]
  }

  if (budgetRange.includes("not-sure") || budgetRange.includes("unsure")) {
    return ["clear_pricing", "transparent_pricing", "no_pressure", "clear_expectation"]
  }

  return []
}

/**
 * Map conversion blocker codes to relevant clinic filter keys
 */
export function getBlockerFilterKeys(blockerCode?: string | null): string[] {
  if (!blockerCode) return []

  const code = blockerCode.toUpperCase()

  switch (code) {
    case "MONTHLY_PAYMENTS":
    case "COST_BUDGET":
    case "COST / BUDGET WORRIES":
      return ["finance_options", "payment_plans", "finance_available", "clear_pricing", "transparent_pricing"]
    case "FEAR_ANXIETY":
    case "FEAR OR ANXIETY ABOUT DENTAL WORK":
      return ["calm", "gentle", "reassuring", "anxious_friendly", "sedation", "nervous_patients"]
    case "COMPLEXITY_WORRY":
    case "NOT SURE WHO TO TRUST":
      return ["complexity_ready", "multidisciplinary", "specialist", "experienced"]
    case "RIGHT_OPTION":
    case "PAST BAD EXPERIENCES":
      return ["strong_communication", "clear_expectation", "no_pressure", "patient_focused"]
    case "TIME_CONSTRAINTS":
    case "TIME / SCHEDULING CONSTRAINTS":
      return ["flexible_scheduling", "quick_response", "efficient", "speed_priority"]
    default:
      return []
  }
}

/**
 * Get priority filter keys from selected priorities
 */
export function getPriorityFilterKeys(priorities: string[]): string[] {
  return priorities.map((p) => p.toLowerCase().replace(/\s+/g, "_"))
}

/**
 * Map cost approach to relevant filter keys
 */
export function getCostApproachFilterKeys(costApproach?: string | null): string[] {
  switch (costApproach) {
    case "COMPARE_VALUE":
      return ["transparent_pricing", "clear_pricing", "value_focused"]
    case "FLEXIBLE_FINANCE":
      return ["finance_options", "payment_plans", "finance_available"]
    case "STRICT_BUDGET":
      return ["clear_pricing", "transparent_pricing", "upfront_costs"]
    default:
      return []
  }
}
