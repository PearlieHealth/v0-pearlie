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
  // General Dentistry sub-options
  "Check-ups",
  "Crowns",
  "Dental Hygienist",
  "Dentures",
  "Extractions",
  "Fillings",
] as const

export type Treatment = (typeof TREATMENT_OPTIONS)[number]

export const EMERGENCY_TREATMENT = "Emergency dental issue (pain, swelling, broken tooth)" as const

// =============================================================================
// TREATMENT CATEGORIES (for step 8 category tabs UI)
// =============================================================================
export type TreatmentCategory = "general" | "cosmetic" | "emergency"

export interface TreatmentInfo {
  name: string
  value: string
  description: string
  whatToExpect: string[]
  duration: string
  recovery: string
  benefits: string[]
}

export interface TreatmentCategoryConfig {
  id: TreatmentCategory
  label: string
  treatments: TreatmentInfo[]
}

export const TREATMENT_CATEGORIES: TreatmentCategoryConfig[] = [
  {
    id: "general",
    label: "General Dentistry",
    treatments: [
      {
        name: "Check-ups",
        value: "Check-ups",
        description: "A thorough examination of your teeth, gums, and mouth. It's the foundation of preventive care and helps catch problems early.",
        whatToExpect: [
          "Visual examination of teeth, gums, and soft tissues",
          "X-rays if needed to check for hidden issues",
          "Assessment of existing fillings, crowns, or other work",
          "Discussion of any concerns or symptoms",
          "Personalised advice and a treatment plan if needed",
        ],
        duration: "15-30 minutes, single appointment",
        recovery: "No recovery needed — completely non-invasive",
        benefits: ["Early detection of decay or gum disease", "Peace of mind", "Preventive care"],
      },
      {
        name: "Crowns",
        value: "Crowns",
        description: "A custom-made cap placed over a damaged tooth to restore its shape, strength, and appearance. Protects and strengthens weakened teeth.",
        whatToExpect: [
          "Initial consultation and X-rays",
          "Tooth preparation and reshaping",
          "Impressions or digital scan taken",
          "Temporary crown fitted while permanent one is made",
          "Final crown cemented in place at follow-up visit",
        ],
        duration: "2 appointments over 1-2 weeks",
        recovery: "Mild sensitivity for a few days; normal eating within 24 hours",
        benefits: ["Restores damaged teeth", "Natural appearance", "Long-lasting protection"],
      },
      {
        name: "Dental Hygienist",
        value: "Dental Hygienist",
        description: "A professional clean to remove plaque and tartar build-up that regular brushing can't reach. Essential for maintaining healthy gums.",
        whatToExpect: [
          "Assessment of gum health",
          "Scaling to remove tartar above and below the gumline",
          "Polishing to remove surface stains",
          "Personalised oral hygiene advice",
          "Recommendations for follow-up if needed",
        ],
        duration: "30-45 minutes, single appointment",
        recovery: "No recovery needed; gums may feel sensitive for a day",
        benefits: ["Prevents gum disease", "Fresher breath", "Brighter smile"],
      },
      {
        name: "Dentures",
        value: "Dentures",
        description: "Custom-made removable replacements for missing teeth. Modern dentures look natural and restore your ability to eat and speak comfortably.",
        whatToExpect: [
          "Initial consultation and impressions",
          "Try-in appointment to check fit and appearance",
          "Final denture fitting and adjustments",
          "Follow-up appointments for fine-tuning",
          "Advice on care and maintenance",
        ],
        duration: "Multiple appointments over 3-6 weeks",
        recovery: "Adjustment period of a few weeks; follow-up visits as needed",
        benefits: ["Restores smile and confidence", "Improves eating and speech", "Affordable tooth replacement"],
      },
      {
        name: "Extractions",
        value: "Extractions",
        description: "Safe removal of a tooth that is severely damaged, decayed, or causing problems. Performed under local anaesthetic for comfort.",
        whatToExpect: [
          "X-ray to assess the tooth and surrounding bone",
          "Local anaesthetic to numb the area",
          "Gentle loosening and removal of the tooth",
          "Gauze placed to control bleeding",
          "Aftercare instructions for healing",
        ],
        duration: "20-40 minutes, single appointment",
        recovery: "1-3 days rest; soft foods recommended; full healing in 1-2 weeks",
        benefits: ["Relieves pain", "Prevents infection spreading", "Makes room for future treatment"],
      },
      {
        name: "Fillings",
        value: "Fillings",
        description: "Repair for teeth damaged by decay. Modern tooth-coloured fillings blend seamlessly with your natural teeth.",
        whatToExpect: [
          "Local anaesthetic to numb the area",
          "Removal of decayed tooth material",
          "Cleaning and preparation of the cavity",
          "Filling material placed and shaped",
          "Polishing for a smooth, natural finish",
        ],
        duration: "20-40 minutes per filling",
        recovery: "Numbness wears off in 1-2 hours; normal eating same day",
        benefits: ["Stops decay progressing", "Restores tooth function", "Natural appearance"],
      },
      {
        name: "Dental Implants",
        value: "Dental Implants",
        description: "A permanent replacement for missing teeth. A titanium post is placed in the jawbone and topped with a natural-looking crown.",
        whatToExpect: [
          "Initial consultation with X-rays and 3D scans",
          "Implant placement under local anaesthetic",
          "Healing period for the implant to fuse with the bone",
          "Abutment and crown fitted at follow-up appointments",
          "Final adjustments for comfort and appearance",
        ],
        duration: "3-6 months total (multiple appointments)",
        recovery: "A few days rest after surgery; full healing over 3-6 months",
        benefits: ["Permanent solution", "Looks and feels like a natural tooth", "Preserves jawbone health"],
      },
    ],
  },
  {
    id: "cosmetic",
    label: "Cosmetic",
    treatments: [
      {
        name: "Teeth Whitening",
        value: "Teeth Whitening",
        description: "Professional whitening to brighten your smile by several shades. Safer and more effective than over-the-counter products.",
        whatToExpect: [
          "Consultation to assess suitability",
          "Custom trays made from impressions of your teeth",
          "Professional-grade whitening gel provided",
          "At-home treatment over 1-2 weeks (or in-chair option)",
          "Follow-up to check results",
        ],
        duration: "1-2 weeks at home, or 1 hour in-chair",
        recovery: "Temporary sensitivity for 1-2 days; avoid staining foods",
        benefits: ["Noticeably whiter smile", "Boosts confidence", "Safe and supervised"],
      },
      {
        name: "Composite Bonding",
        value: "Composite Bonding",
        description: "A tooth-coloured resin applied to repair chips, gaps, or discolouration. A minimally invasive way to improve your smile.",
        whatToExpect: [
          "Shade matching to your natural teeth",
          "Light roughening of tooth surface",
          "Application and shaping of composite resin",
          "Hardening with special light",
          "Final polishing for natural appearance",
        ],
        duration: "30-60 minutes per tooth, single appointment",
        recovery: "No recovery needed; normal activities immediately",
        benefits: ["Quick results", "Preserves natural tooth", "Cost-effective"],
      },
      {
        name: "Veneers",
        value: "Veneers",
        description: "Thin porcelain or composite shells bonded to the front of teeth to transform their appearance. Ideal for a complete smile makeover.",
        whatToExpect: [
          "Consultation and smile design planning",
          "Minimal tooth preparation (thin layer removed)",
          "Impressions or digital scan taken",
          "Temporary veneers while permanent ones are crafted",
          "Final veneers bonded in place",
        ],
        duration: "2-3 appointments over 2-3 weeks",
        recovery: "Mild sensitivity for a few days; avoid hard foods initially",
        benefits: ["Dramatic smile transformation", "Stain-resistant", "Long-lasting results"],
      },
      {
        name: "Invisalign / Clear Aligners",
        value: "Invisalign / Clear Aligners",
        description: "Nearly invisible removable aligners that gradually straighten your teeth. A discreet alternative to traditional braces.",
        whatToExpect: [
          "3D scan and treatment plan creation",
          "Custom aligners made for each stage",
          "Wear aligners 20-22 hours per day",
          "Switch to new aligners every 1-2 weeks",
          "Regular check-ups to monitor progress",
        ],
        duration: "3-18 months depending on complexity",
        recovery: "No recovery; mild pressure when switching aligners",
        benefits: ["Nearly invisible", "Removable for eating", "Comfortable to wear"],
      },
    ],
  },
  {
    id: "emergency",
    label: "Emergency",
    treatments: [
      {
        name: "Emergency / Same-Day",
        value: EMERGENCY_TREATMENT,
        description: "Urgent dental care for pain, swelling, broken teeth, or other dental emergencies. We'll fast-track you to a clinic that can see you quickly.",
        whatToExpect: [
          "Rapid assessment of your emergency",
          "Pain relief and stabilisation",
          "X-rays to diagnose the issue",
          "Immediate treatment where possible",
          "Follow-up plan for any further treatment needed",
        ],
        duration: "Same-day appointment; treatment time varies",
        recovery: "Depends on the emergency; your dentist will advise",
        benefits: ["Fast-tracked appointment", "Pain relief", "Expert emergency care"],
      },
    ],
  },
]

// =============================================================================
// GENERAL DENTISTRY TREATMENTS — map sub-options to the "General Dentistry" clinic tag
// =============================================================================
export const GENERAL_DENTISTRY_TREATMENTS = [
  "Check-ups",
  "Crowns",
  "Dental Hygienist",
  "Dentures",
  "Extractions",
  "Fillings",
  // Legacy values
  "Check up and/or hygiene clean",
]

/**
 * Returns true if the patient's treatment selection falls under General Dentistry.
 */
export function isGeneralDentistryTreatment(treatment: string): boolean {
  return GENERAL_DENTISTRY_TREATMENTS.some(
    (t) => t.toLowerCase() === treatment.toLowerCase()
  )
}

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
    comfortPreferences: toArray(rawAnswers.comfort_preferences),
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
