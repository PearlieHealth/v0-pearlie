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
export const FORM_VERSION = "v7_reorder_2026-03-07"
export const SCHEMA_VERSION = 7

// =============================================================================
// SERVICE REGION — Change here when expanding beyond London
// =============================================================================
export const SUPPORTED_REGION = "London"
export const REGION_NOT_AVAILABLE_MESSAGE = `We're currently only serving patients in ${SUPPORTED_REGION}`

// =============================================================================
// TREATMENTS (Q1)
// =============================================================================
export const TREATMENT_OPTIONS = [
  "Invisalign / Clear Aligners",
  "Teeth Whitening",
  "Composite Bonding",
  "Veneers",
  "Dental Implants",
  "General Check-up & Clean",
  "Emergency dental issue (pain, swelling, broken tooth)",
] as const

export type Treatment = (typeof TREATMENT_OPTIONS)[number]

export const EMERGENCY_TREATMENT = "Emergency dental issue (pain, swelling, broken tooth)" as const

// =============================================================================
// LOCATION PREFERENCE / TRAVEL DISTANCE (time-based)
// =============================================================================
export const LOCATION_PREFERENCE_OPTIONS = [
  { value: "near_home_work", label: "Just a short trip", hint: "Up to 15 minutes" },
  { value: "travel_a_bit", label: "Happy to travel a bit", hint: "Up to 30 minutes" },
  { value: "travel_further", label: "I'll travel for the right clinic", hint: "30+ minutes" },
] as const

export const LOCATION_PREFERENCE_LABELS: Record<string, string> = {
  near_home_work: "Just a short trip",
  travel_a_bit: "Happy to travel a bit",
  travel_further: "I'll travel for the right clinic",
}

// =============================================================================
// DECISION VALUES / CLINIC PRIORITIES (Q4 - Planning only, pick up to 2)
// =============================================================================
export const DECISION_VALUE_OPTIONS = [
  "They're highly skilled and experienced",
  "Flexible hours — evenings or weekends",
  "Clear pricing before I commit",
  "A calm, relaxed environment",
  "Strong reputation and reviews",
  "Seeing the same dentist every time",
  "Just find me someone great",
] as const

export type DecisionValue = (typeof DECISION_VALUE_OPTIONS)[number]

// Short labels for badges/compact display
export const DECISION_VALUE_SHORT_LABELS: Record<string, string> = {
  "They're highly skilled and experienced": "Specialist Experience",
  "Flexible hours — evenings or weekends": "Flexible Hours",
  "Clear pricing before I commit": "Clear Pricing",
  "A calm, relaxed environment": "Calm Environment",
  "Strong reputation and reviews": "Good Reviews",
  "Seeing the same dentist every time": "Continuity of Care",
  "Just find me someone great": "Someone Great",
}

// =============================================================================
// ANXIETY LEVEL (Q5 Planning / Q4 Emergency)
// =============================================================================
export const ANXIETY_LEVEL_OPTIONS = [
  { value: "comfortable", label: "I'm comfortable, no issues" },
  { value: "slightly_anxious", label: "A little nervous, but I get through it" },
  { value: "quite_anxious", label: "Quite anxious, a gentle approach really helps" },
  { value: "very_anxious", label: "Very anxious, I might need sedation or extra help" },
] as const

export const ANXIETY_LEVEL_LABELS: Record<string, string> = {
  comfortable: "I'm comfortable, no issues",
  slightly_anxious: "A little nervous, but I get through it",
  quite_anxious: "Quite anxious, a gentle approach really helps",
  very_anxious: "Very anxious, I might need sedation or extra help",
}

export const ANXIETY_LEVEL_SHORT_LABELS: Record<string, string> = {
  comfortable: "Comfortable",
  slightly_anxious: "Slightly Nervous",
  quite_anxious: "Quite Anxious",
  very_anxious: "Very Anxious",
}

// =============================================================================
// CONVERSION BLOCKERS / CONCERNS (Q5 - Planning only, multi-select max 2)
// Informational only — does NOT affect scoring (except WORRIED_COMPLEX penalty)
// =============================================================================
export const BLOCKER_OPTIONS = [
  { code: "NOT_WORTH_COST", label: "I'm not sure how much this will cost" },
  { code: "NEED_MORE_TIME", label: "I want to take my time before deciding anything" },
  { code: "UNSURE_OPTION", label: "I don't know which treatment I actually need" },
  { code: "WORRIED_COMPLEX", label: "I'm worried it might be more complicated than I expect" },
  { code: "BAD_EXPERIENCE", label: "I've had a bad dental experience before" },
  { code: "EMBARRASSED", label: "I feel embarrassed about my teeth" },
  { code: "NO_CONCERN", label: "Nothing — I just want to find the right clinic" },
] as const

export type BlockerCode = (typeof BLOCKER_OPTIONS)[number]["code"]

export const BLOCKER_LABELS: Record<string, string> = Object.fromEntries(
  BLOCKER_OPTIONS.map((o) => [o.code, o.label])
)

export const BLOCKER_SHORT_LABELS: Record<string, string> = {
  NOT_WORTH_COST: "Cost Unsure",
  NEED_MORE_TIME: "Needs Time",
  UNSURE_OPTION: "Unsure Options",
  WORRIED_COMPLEX: "Complexity Concern",
  BAD_EXPERIENCE: "Past Bad Experience",
  EMBARRASSED: "Embarrassed",
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
// Question: "How do you usually think about investing in dental treatment?"
// =============================================================================
export const COST_APPROACH_OPTIONS = [
  { value: "best_outcome", label: "I want the best result and I'm willing to invest in it" },
  { value: "understand_value", label: "I want to understand my options and what makes them worth it" },
  { value: "comfort_range", label: "I have a rough budget in mind but I'm open if it makes sense" },
  { value: "strict_budget", label: "I have a strict budget I need to stay within" },
] as const

export const COST_APPROACH_LABELS: Record<string, string> = {
  best_outcome: "Looking for the best result and long-term outcome",
  understand_value: "Wants to understand options and why one might be worth more",
  comfort_range: "Has a rough range but flexible if plan makes sense",
  strict_budget: "Has a strict budget",
  // Legacy v4 values (backwards compatibility)
  options_first: "Wants to explore options before thinking about cost",
  upfront_pricing: "Would like to know rough pricing upfront",
  finance_preferred: "Prefers to spread cost with a payment plan",
}

export const COST_APPROACH_SHORT_LABELS: Record<string, string> = {
  best_outcome: "Best Outcome",
  understand_value: "Understand Value",
  comfort_range: "Flexible Range",
  strict_budget: "Strict Budget",
  // Legacy v4 values (backwards compatibility)
  options_first: "Options First",
  upfront_pricing: "Upfront Pricing",
  finance_preferred: "Wants Finance",
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
// MONTHLY PAYMENT OPTIONS (Q9A - Planning only, conditional on "comfort_range")
// Question: "Would spreading the cost into monthly payments make treatment easier for you?"
// Informational only — does NOT affect scoring
// =============================================================================
export const MONTHLY_PAYMENT_OPTIONS = [
  { value: "yes", label: "Yes, that would make it easier" },
  { value: "no", label: "No, that's not important for me" },
] as const

// =============================================================================
// BUDGET HANDLING OPTIONS (Q9B - Planning only, conditional on "strict_budget")
// Question: "How would you prefer to handle costs with the clinic?"
// Informational only — does NOT affect scoring
// =============================================================================
export const BUDGET_HANDLING_OPTIONS = [
  { value: "discuss_with_clinic", label: "I'd prefer to discuss costs directly with the clinic" },
  { value: "share_range", label: "I can share a rough budget range" },
] as const

// =============================================================================
// COMFORT PREFERENCES (Conditional — only for anxious patients)
// =============================================================================
export const COMFORT_PREFERENCE_OPTIONS = [
  { value: "pause_break", label: "Being able to pause or signal for a break" },
  { value: "explains_everything", label: "A dentist who explains everything as they go" },
  { value: "sedation_available", label: "Sedation options available" },
  { value: "music_headphones", label: "Music or headphones during treatment" },
  { value: "dimmed_lighting", label: "Softer or dimmed lighting" },
  { value: "shorter_first_visit", label: "A shorter first visit to ease in gently" },
  { value: "nervous_experience", label: "Someone who's worked with nervous patients a lot" },
] as const

// =============================================================================
// SOCIAL PROOF MESSAGES (displayed on travel distance step)
// =============================================================================
export const SOCIAL_PROOF_MESSAGES = [
  "Emma from SW6 found her match 9 minutes ago",
  "James from E1 was matched with a clinic today",
  "Priya from N4 just completed her match",
  "Over 40 patients matched this week",
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

/**
 * Safely coerce a value to an array.
 * Old form versions sometimes stored arrays as single strings.
 */
function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value
  if (typeof value === "string" && value) return [value]
  return []
}

/**
 * Parse raw_answers JSON and extract normalized values
 */
export function parseRawAnswers(rawAnswers: Record<string, any> | null | undefined) {
  if (!rawAnswers || typeof rawAnswers !== "object") return null

  return {
    treatments: toArray(rawAnswers.treatments_selected),
    isEmergency: rawAnswers.is_emergency || false,
    urgency: rawAnswers.urgency || null,
    postcode: rawAnswers.postcode || "",
    locationPreference: rawAnswers.location_preference || null,
    decisionValues: toArray(rawAnswers.values),
    blockerCodes: toArray(rawAnswers.blocker),
    blockerLabels: toArray(rawAnswers.blocker_labels),
    timing: rawAnswers.timing || null,
    costApproach: rawAnswers.cost_approach || null,
    strictBudgetMode: rawAnswers.strict_budget_mode || null,
    strictBudgetAmount: rawAnswers.strict_budget_amount || null,
    monthlyPaymentRange: rawAnswers.monthly_payment_range || null,
    anxietyLevel: rawAnswers.anxiety_level || null,
    preferredTimes: toArray(rawAnswers.preferred_times),
    firstName: rawAnswers.first_name || "",
    lastName: rawAnswers.last_name || "",
    email: rawAnswers.email || null,
    phone: rawAnswers.phone || null,
    formVersion: rawAnswers.form_version || null,
    submittedAt: rawAnswers.submitted_at || null,
  }
}

/**
 * Extract treatments from a lead, preferring raw_answers.treatments_selected (array)
 * over the treatment_interest column (comma-joined string that breaks on treatments
 * containing commas, e.g. "Emergency dental issue (pain, swelling, broken tooth)").
 */
export function getTreatmentsFromLead(lead: { raw_answers?: Record<string, any> | null; treatment_interest?: string | null } | null | undefined): string[] {
  if (!lead) return []

  // Prefer the structured array from raw_answers
  const parsed = parseRawAnswers(lead.raw_answers)
  if (parsed?.treatments && parsed.treatments.length > 0) {
    return parsed.treatments
  }

  // Fallback: match treatment_interest against known options
  const interest = lead.treatment_interest?.trim()
  if (!interest) return []

  // Try to match known treatments from TREATMENT_OPTIONS
  const matched: string[] = []
  let remaining = interest

  for (const option of TREATMENT_OPTIONS) {
    if (remaining.includes(option)) {
      matched.push(option)
      remaining = remaining.replace(option, "")
    }
  }

  // If we found known treatments, use them
  if (matched.length > 0) return matched

  // Last resort: return the whole string as one treatment
  return [interest]
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
