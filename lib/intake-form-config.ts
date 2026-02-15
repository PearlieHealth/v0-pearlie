/**
 * CENTRALIZED INTAKE FORM CONFIGURATION
 * 
 * This file is the single source of truth for all intake form options, labels, and values.
 * When the form changes, update this file and all consuming components will automatically update:
 * - Intake form (app/intake/page.tsx)
 * - Admin analytics components
 * - Email templates
 * - Leads table
 * 
 * IMPORTANT: When adding/removing/renaming options, update both the constant array
 * and the corresponding labels/display maps below.
 */

// =============================================================================
// FORM VERSION - Update when making breaking changes
// =============================================================================
export const FORM_VERSION = "v4_emergency_flow_2026-02-08"
export const SCHEMA_VERSION = 4

// =============================================================================
// TREATMENTS (Q1)
// =============================================================================
export const TREATMENT_OPTIONS = [
  "Invisalign / Clear Aligners",
  "Teeth Whitening",
  "Composite Bonding",
  "Veneers",
  "Dental Implants",
  "Crowns or Bridges",
  "General Check-up & Clean",
  "Emergency dental issue (pain, swelling, broken tooth)",
] as const

export type Treatment = (typeof TREATMENT_OPTIONS)[number]

export const EMERGENCY_TREATMENT = "Emergency dental issue (pain, swelling, broken tooth)" as const

// =============================================================================
// LOCATION PREFERENCE (Q3 - Planning only)
// =============================================================================
export const LOCATION_PREFERENCE_OPTIONS = [
  { value: "near_home_work", label: "Close to home or work", hint: "Within 1.5 miles" },
  { value: "travel_a_bit", label: "Willing to travel a bit", hint: "Up to 5 miles" },
  { value: "travel_further", label: "Happy to travel further for the right clinic", hint: "5+ miles" },
] as const

export const LOCATION_PREFERENCE_LABELS: Record<string, string> = {
  near_home_work: "Close to home or work",
  travel_a_bit: "Willing to travel a bit",
  travel_further: "Happy to travel further for the right clinic",
}

// =============================================================================
// DECISION VALUES / CLINIC PRIORITIES (Q4 - Planning only, pick up to 2)
// =============================================================================
export const DECISION_VALUE_OPTIONS = [
  "Specialist-level experience",
  "Flexible appointments (late afternoons or weekends)",
  "Clear pricing before treatment",
  "A calm, reassuring environment",
  "Strong reputation and reviews",
  "Seeing the same dentist and building long-term trust",
] as const

export type DecisionValue = (typeof DECISION_VALUE_OPTIONS)[number]

// Short labels for badges/compact display
export const DECISION_VALUE_SHORT_LABELS: Record<string, string> = {
  "Specialist-level experience": "Specialist Experience",
  "Flexible appointments (late afternoons or weekends)": "Flexible Hours",
  "Clear pricing before treatment": "Clear Pricing",
  "A calm, reassuring environment": "Calm Environment",
  "Strong reputation and reviews": "Good Reviews",
  "Seeing the same dentist and building long-term trust": "Continuity of Care",
}

// =============================================================================
// ANXIETY LEVEL (Q5 Planning / Q4 Emergency)
// =============================================================================
export const ANXIETY_LEVEL_OPTIONS = [
  { value: "comfortable", label: "I'm comfortable with dental visits" },
  { value: "slightly_anxious", label: "A little nervous, but I manage" },
  { value: "quite_anxious", label: "Quite anxious — I'd appreciate a gentle approach" },
  { value: "very_anxious", label: "Very anxious — I may need sedation or extra support" },
] as const

export const ANXIETY_LEVEL_LABELS: Record<string, string> = {
  comfortable: "I'm comfortable with dental visits",
  slightly_anxious: "A little nervous, but I manage",
  quite_anxious: "Quite anxious — I'd appreciate a gentle approach",
  very_anxious: "Very anxious — I may need sedation or extra support",
}

export const ANXIETY_LEVEL_SHORT_LABELS: Record<string, string> = {
  comfortable: "Comfortable",
  slightly_anxious: "Slightly Nervous",
  quite_anxious: "Quite Anxious",
  very_anxious: "Very Anxious",
}

// =============================================================================
// CONVERSION BLOCKERS / BIGGEST CONCERN (Q6 - Planning only, single select)
// =============================================================================
export const BLOCKER_OPTIONS = [
  { code: "NOT_WORTH_COST", label: "I'm not sure it's worth the cost" },
  { code: "NEED_MORE_TIME", label: "I need more time to decide" },
  { code: "UNSURE_OPTION", label: "I'm not sure which option is right for me" },
  { code: "WORRIED_COMPLEX", label: "I'm worried it might be more complex than I expect" },
  { code: "NO_CONCERN", label: "Nothing in particular - I just want the right clinic" },
] as const

export type BlockerCode = (typeof BLOCKER_OPTIONS)[number]["code"]

export const BLOCKER_LABELS: Record<string, string> = Object.fromEntries(
  BLOCKER_OPTIONS.map((o) => [o.code, o.label])
)

export const BLOCKER_SHORT_LABELS: Record<string, string> = {
  NOT_WORTH_COST: "Cost Concern",
  NEED_MORE_TIME: "Needs Time",
  UNSURE_OPTION: "Unsure Options",
  WORRIED_COMPLEX: "Complexity Worry",
  NO_CONCERN: "No Concern",
}

// =============================================================================
// PREFERRED TIMES (Q7 Planning / Q5 Emergency)
// =============================================================================
export const PREFERRED_TIME_OPTIONS = [
  { value: "morning", label: "Morning", time: "Before 12pm" },
  { value: "afternoon", label: "Afternoon", time: "12pm - 5pm" },
  { value: "weekend", label: "Weekends", time: "Saturday / Sunday" },
] as const

// =============================================================================
// TIMING / READINESS (Q8 - Planning only)
// =============================================================================
export const TIMING_OPTIONS = [
  { value: "asap", label: "As soon as possible" },
  { value: "within_week", label: "Within a week" },
  { value: "few_weeks", label: "Within a few weeks" },
  { value: "exploring", label: "Just exploring for now" },
] as const

export const TIMING_LABELS: Record<string, string> = {
  asap: "As soon as possible",
  within_week: "Within a week",
  few_weeks: "Within a few weeks",
  exploring: "Just exploring for now",
}

export const TIMING_SHORT_LABELS: Record<string, string> = {
  asap: "ASAP",
  within_week: "Within a Week",
  few_weeks: "Few Weeks",
  exploring: "Exploring",
}

// =============================================================================
// COST APPROACH (Q9 - Planning only)
// =============================================================================
export const COST_APPROACH_OPTIONS = [
  { value: "options_first", label: "I want to explore my options before thinking about cost" },
  { value: "upfront_pricing", label: "I'd like to know rough pricing upfront" },
  { value: "finance_preferred", label: "I'd prefer to spread the cost with a payment plan" },
  { value: "strict_budget", label: "I have a fixed budget I need to stay within" },
] as const

export const COST_APPROACH_LABELS: Record<string, string> = {
  options_first: "Wants to explore options before thinking about cost",
  upfront_pricing: "Would like to know rough pricing upfront",
  finance_preferred: "Prefers to spread cost with a payment plan",
  strict_budget: "Has a fixed budget",
}

export const COST_APPROACH_SHORT_LABELS: Record<string, string> = {
  options_first: "Options First",
  upfront_pricing: "Upfront Pricing",
  finance_preferred: "Wants Finance",
  strict_budget: "Strict Budget",
}

// =============================================================================
// URGENCY OPTIONS (Q3 - Emergency only)
// =============================================================================
export const URGENCY_OPTIONS = [
  { value: "today", label: "Today if possible" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "next_few_days", label: "Within the next few days" },
] as const

export const URGENCY_LABELS: Record<string, string> = {
  today: "Today if possible",
  tomorrow: "Tomorrow",
  next_few_days: "Within the next few days",
}

// =============================================================================
// MONTHLY PAYMENT OPTIONS (Q9A - Planning only, conditional on Q9 option 3)
// =============================================================================
export const MONTHLY_PAYMENT_OPTIONS = [
  { value: "under_50", label: "Under \u00a350/month" },
  { value: "50_100", label: "\u00a350 - \u00a3100/month" },
  { value: "100_200", label: "\u00a3100 - \u00a3200/month" },
  { value: "over_200", label: "Over \u00a3200/month" },
  { value: "not_sure", label: "Not sure yet" },
] as const

// =============================================================================
// BUDGET HANDLING OPTIONS (Q9B - Planning only, conditional on Q9 option 4)
// =============================================================================
export const BUDGET_HANDLING_OPTIONS = [
  { value: "discuss_with_clinic", label: "I'd rather discuss it directly with the clinic" },
  { value: "enter_amount", label: "I'd like to enter my budget" },
] as const

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get human-readable label for any form field value
 */
export function getLabel(
  fieldType: "timing" | "cost" | "location" | "anxiety" | "blocker" | "value" | "urgency",
  value: string,
  short = false
): string {
  switch (fieldType) {
    case "timing":
      return short ? (TIMING_SHORT_LABELS[value] || value) : (TIMING_LABELS[value] || value)
    case "cost":
      return short ? (COST_APPROACH_SHORT_LABELS[value] || value) : (COST_APPROACH_LABELS[value] || value)
    case "location":
      return LOCATION_PREFERENCE_LABELS[value] || value
    case "anxiety":
      return short ? (ANXIETY_LEVEL_SHORT_LABELS[value] || value) : (ANXIETY_LEVEL_LABELS[value] || value)
    case "blocker":
      return short ? (BLOCKER_SHORT_LABELS[value] || value) : (BLOCKER_LABELS[value] || value)
    case "value":
      return short ? (DECISION_VALUE_SHORT_LABELS[value] || value) : value
    case "urgency":
      return URGENCY_LABELS[value] || value
    default:
      return value
  }
}

// =============================================================================
// LEGACY VALUE MIGRATION MAPS
// Maps old form version values to current v4 equivalents.
// When old leads exist in the database with outdated field values,
// these maps ensure analytics always aggregate into the correct v4 buckets.
// =============================================================================

const LEGACY_ANXIETY_MAP: Record<string, string> = {
  not_anxious: "comfortable",
  a_bit_nervous: "slightly_anxious",
  somewhat_anxious: "quite_anxious",
  "prefer-sedation": "very_anxious",
}

const LEGACY_COST_MAP: Record<string, string> = {
  monthly_payments: "finance_preferred",
  spread_cost: "finance_preferred",
  want_clarity: "upfront_pricing",
  flexible: "options_first",
  budget_conscious: "strict_budget",
}

const LEGACY_TIMING_MAP: Record<string, string> = {
  this_week: "within_week",
  "1_week": "within_week",
  this_month: "few_weeks",
  next_few_months: "exploring",
}

const LEGACY_BLOCKER_MAP: Record<string, string> = {
  COST_CONCERNS: "NOT_WORTH_COST",
  UNSURE_OPTIONS: "UNSURE_OPTION",
  TIME_DECIDE: "NEED_MORE_TIME",
  FIND_RIGHT_FIT: "NO_CONCERN",
}

const LEGACY_LOCATION_MAP: Record<string, string> = {
  near_home: "near_home_work",
  travel_bit: "travel_a_bit",
}

// Valid v4 values (used to drop truly unknown values)
const VALID_ANXIETY = new Set(ANXIETY_LEVEL_OPTIONS.map(o => o.value))
const VALID_COST = new Set(COST_APPROACH_OPTIONS.map(o => o.value))
const VALID_TIMING = new Set(TIMING_OPTIONS.map(o => o.value))
const VALID_BLOCKER = new Set(BLOCKER_OPTIONS.map(o => o.code))
const VALID_LOCATION = new Set(LOCATION_PREFERENCE_OPTIONS.map(o => o.value))
const VALID_URGENCY = new Set(URGENCY_OPTIONS.map(o => o.value))

/**
 * Normalize a field value: migrate legacy → v4, drop unknown
 */
function normalizeValue(
  value: string | null | undefined,
  legacyMap: Record<string, string>,
  validSet: Set<string>,
): string | null {
  if (!value) return null
  if (validSet.has(value)) return value
  if (legacyMap[value]) return legacyMap[value]
  return null // Unknown value — drop it
}

/**
 * Parse raw_answers JSON and extract normalized values.
 * Legacy values from older form versions are migrated to v4 equivalents.
 * Truly unknown values are dropped (returned as null).
 */
export function parseRawAnswers(rawAnswers: Record<string, any> | null | undefined) {
  if (!rawAnswers) return null

  // Normalize blocker codes: migrate legacy codes, drop unknowns
  const rawBlockerCodes: string[] = rawAnswers.blocker || []
  const normalizedBlockerCodes = rawBlockerCodes
    .map((code: string) => normalizeValue(code, LEGACY_BLOCKER_MAP, VALID_BLOCKER))
    .filter((code): code is string => code !== null)

  return {
    treatments: rawAnswers.treatments_selected || [],
    isEmergency: rawAnswers.is_emergency || false,
    urgency: normalizeValue(rawAnswers.urgency, {}, VALID_URGENCY),
    postcode: rawAnswers.postcode || "",
    locationPreference: normalizeValue(rawAnswers.location_preference, LEGACY_LOCATION_MAP, VALID_LOCATION),
    decisionValues: rawAnswers.values || [],
    blockerCodes: normalizedBlockerCodes,
    blockerLabels: rawAnswers.blocker_labels || [],
    timing: normalizeValue(rawAnswers.timing, LEGACY_TIMING_MAP, VALID_TIMING),
    costApproach: normalizeValue(rawAnswers.cost_approach, LEGACY_COST_MAP, VALID_COST),
    strictBudgetMode: rawAnswers.strict_budget_mode || null,
    strictBudgetAmount: rawAnswers.strict_budget_amount || null,
    monthlyPaymentRange: rawAnswers.monthly_payment_range || null,
    anxietyLevel: normalizeValue(rawAnswers.anxiety_level, LEGACY_ANXIETY_MAP, VALID_ANXIETY),
    preferredTimes: rawAnswers.preferred_times || [],
    firstName: rawAnswers.first_name || "",
    lastName: rawAnswers.last_name || "",
    email: rawAnswers.email || null,
    phone: rawAnswers.phone || null,
    formVersion: rawAnswers.form_version || null,
    submittedAt: rawAnswers.submitted_at || null,
  }
}

/**
 * Get all possible values for a field (useful for analytics aggregation)
 */
export function getAllOptionsForField(fieldType: "timing" | "cost" | "location" | "anxiety" | "blocker" | "value" | "urgency"): string[] {
  switch (fieldType) {
    case "timing":
      return TIMING_OPTIONS.map(o => o.value)
    case "cost":
      return COST_APPROACH_OPTIONS.map(o => o.value)
    case "location":
      return LOCATION_PREFERENCE_OPTIONS.map(o => o.value)
    case "anxiety":
      return ANXIETY_LEVEL_OPTIONS.map(o => o.value)
    case "blocker":
      return BLOCKER_OPTIONS.map(o => o.code)
    case "value":
      return [...DECISION_VALUE_OPTIONS]
    case "urgency":
      return URGENCY_OPTIONS.map(o => o.value)
    default:
      return []
  }
}
