/**
 * Tag validation utilities for clinic matching
 * Step 2: Enforce minimum viable tags per clinic
 */

// Required tag categories for a clinic to be matchable
export const Q4_TAGS = [
  "TAG_CLEAR_EXPLANATIONS",
  "TAG_LISTENED_TO_RESPECTED",
  "TAG_CALM_REASSURING",
  "TAG_CLEAR_PRICING_UPFRONT",
  "TAG_FLEXIBLE_APPOINTMENTS",
  "TAG_SPECIALIST_LEVEL_EXPERIENCE",
  "TAG_STRONG_REPUTATION_REVIEWS",
]

export const Q5_TAGS = [
  "TAG_GOOD_FOR_COST_CONCERNS",
  "TAG_FINANCE_AVAILABLE",
  "TAG_DECISION_SUPPORTIVE",
  "TAG_OPTION_CLARITY_SUPPORT",
  "TAG_ANXIETY_FRIENDLY",
  "TAG_COMPLEX_CASES_WELCOME",
  "TAG_RIGHT_FIT_FOCUSED",
]

export const Q8_TAGS = [
  "TAG_DISCUSS_OPTIONS_BEFORE_COST",
  "TAG_MONTHLY_PAYMENTS_PREFERRED",
  "TAG_FLEXIBLE_BUDGET_OK",
  "TAG_STRICT_BUDGET_SUPPORTIVE",
]

export const Q10_TAGS = ["TAG_OK_WITH_ANXIOUS_PATIENTS", "TAG_SEDATION_AVAILABLE"]

// Starter tags for newly approved clinics
export const STARTER_TAGS = [
  "TAG_RIGHT_FIT_FOCUSED",
  "TAG_CLEAR_EXPLANATIONS",
  "TAG_DISCUSS_OPTIONS_BEFORE_COST",
  "TAG_OK_WITH_ANXIOUS_PATIENTS",
]

export type MatchableStatus = "NOT_MATCHABLE" | "WEAK" | "OK"

export interface TagValidationResult {
  status: MatchableStatus
  matchingTagCount: number
  missingCategories: string[]
  hasQ4: boolean
  hasQ8: boolean
  hasQ10: boolean
  hasTreatments: boolean
  canSave: boolean
  warnings: string[]
}

/**
 * Validate clinic tags and determine matchability status
 * Required categories:
 * - Must have >= 1 Q4 priority tag
 * - Must have >= 1 Q8 cost approach tag
 * - Must have >= 1 Q10 anxiety tag (if offering certain treatments)
 * - Must have >= 1 treatment
 *
 * Thresholds:
 * - NOT_MATCHABLE: missing any required category OR matchingTagCount < 3
 * - WEAK: has required categories but matchingTagCount < 6
 * - OK: required categories present AND matchingTagCount >= 6
 */
export function validateClinicTags(
  tags: string[],
  treatments: string[],
  requireAnxietyTag = true,
): TagValidationResult {
  const hasQ4 = tags.some((tag) => Q4_TAGS.includes(tag))
  const hasQ8 = tags.some((tag) => Q8_TAGS.includes(tag))
  const hasQ10 = tags.some((tag) => Q10_TAGS.includes(tag))
  const hasTreatments = treatments.length > 0

  // Count matching tags (exclude HIGHLIGHT_ prefix)
  const matchingTagCount = tags.filter((tag) => tag.startsWith("TAG_") && !tag.startsWith("HIGHLIGHT_")).length

  const missingCategories: string[] = []
  const warnings: string[] = []

  if (!hasQ4) {
    missingCategories.push("Q4 (What matters most)")
    warnings.push("Missing Q4 priority tag - patients won't see why this clinic fits their values")
  }
  if (!hasQ8) {
    missingCategories.push("Q8 (Cost approach)")
    warnings.push("Missing Q8 cost tag - patients won't know how you discuss pricing")
  }
  if (requireAnxietyTag && !hasQ10) {
    missingCategories.push("Q10 (Anxiety support)")
    warnings.push("Missing Q10 anxiety tag - anxious patients won't be matched")
  }
  if (!hasTreatments) {
    missingCategories.push("Treatment capabilities")
    warnings.push("No treatments specified - clinic cannot be matched to any patients")
  }

  // Determine status
  let status: MatchableStatus = "OK"

  if (!hasTreatments || matchingTagCount < 3 || missingCategories.length > 1) {
    status = "NOT_MATCHABLE"
  } else if (matchingTagCount < 6 || missingCategories.length > 0) {
    status = "WEAK"
  }

  // Can save if not NOT_MATCHABLE
  const canSave = status !== "NOT_MATCHABLE"

  return {
    status,
    matchingTagCount,
    missingCategories,
    hasQ4,
    hasQ8,
    hasQ10,
    hasTreatments,
    canSave,
    warnings,
  }
}

/**
 * Get status badge color
 */
export function getStatusColor(status: MatchableStatus): string {
  switch (status) {
    case "NOT_MATCHABLE":
      return "destructive"
    case "WEAK":
      return "warning"
    case "OK":
      return "success"
  }
}

/**
 * Get status description
 */
export function getStatusDescription(status: MatchableStatus): string {
  switch (status) {
    case "NOT_MATCHABLE":
      return "Cannot be matched to patients - missing critical tags"
    case "WEAK":
      return "Can be matched but with limited precision - add more tags for better matches"
    case "OK":
      return "Ready for matching with good tag coverage"
  }
}
