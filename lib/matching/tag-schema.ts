/*
 * ============================================================================
 * DO NOT MODIFY MATCHING LOGIC WITHOUT UPDATING:
 * - tag-schema.ts (this file) - canonical tag definitions
 * - contract.ts - MatchFacts interface
 * - reasons-engine.ts - reason generation logic
 * - scoring.ts - scoring algorithm
 * - __tests__/reasons-determinism.test.ts - automated validation
 *
 * Any changes to tags, weights, or mappings MUST be reviewed for:
 * 1. Database migration to update clinic_filters table
 * 2. Intake form alignment
 * 3. Reason template updates
 * 4. Explanation version bump
 * ============================================================================
 */

// Canonical match tags aligned to 11Q intake form
// This is the single source of truth for all tag-to-form mappings
// IMPORTANT: These TAG_* keys must match exactly what's in clinic_filters table

export const FORM_VERSION = "v6_blocker_multiselect_2026-02-14"

// =============================================================================
// Q4: "What matters most when choosing a clinic?" (7 options, multi-select, max 3)
// Form values → TAG_* keys
// MUST match DECISION_VALUE_OPTIONS in intake-form-config.ts exactly
// =============================================================================
export const Q4_PRIORITY_TAG_MAP: Record<string, string> = {
  // v5 FINAL options (LOCKED):
  "Specialist-level experience": "TAG_SPECIALIST_LEVEL_EXPERIENCE",
  "Flexible appointments (late afternoons or weekends)": "TAG_FLEXIBLE_APPOINTMENTS",
  "Clear pricing before treatment": "TAG_CLEAR_PRICING_UPFRONT",
  "A calm, reassuring environment": "TAG_CALM_REASSURING",
  "Strong reputation and reviews": "TAG_STRONG_REPUTATION_REVIEWS",
  "Seeing the same dentist and building long-term trust": "TAG_CONTINUITY_OF_CARE",
  // Legacy v4 options (backwards compatibility):
  "A calm and reassuring approach": "TAG_CALM_REASSURING",
  "Clear pricing with no surprises": "TAG_CLEAR_PRICING_UPFRONT",
  "Flexible appointment times (evenings / weekends)": "TAG_FLEXIBLE_APPOINTMENTS",
  "Strong reviews and reputation": "TAG_STRONG_REPUTATION_REVIEWS",
  "Specialist experience in my treatment": "TAG_SPECIALIST_LEVEL_EXPERIENCE",
  "Finance or payment plan options": "TAG_FINANCE_AVAILABLE",
  "A modern, well-equipped clinic": "TAG_CLEAR_EXPLANATIONS",
  // Legacy v3 options (backwards compatibility):
  "Clear explanations before treatment": "TAG_CLEAR_EXPLANATIONS",
  "Feeling listened to and respected": "TAG_LISTENED_TO_RESPECTED",
  "Calm and reassuring approach": "TAG_CALM_REASSURING",
  "Flexible appointments (late / weekends)": "TAG_FLEXIBLE_APPOINTMENTS",
  "Specialist-level experience (when needed)": "TAG_SPECIALIST_LEVEL_EXPERIENCE",
  "Reputation and online reviews": "TAG_STRONG_REPUTATION_REVIEWS",
}

// =============================================================================
// Q5: "Concerns / blockers" (6 options, multi-select max 2)
// Affects scoring: bonus points (0-10) when clinic has tags matching patient hesitations
// Also: WORRIED_COMPLEX triggers a -15 penalty if clinic lacks TAG_COMPLEX_CASES_WELCOME
// Form blocker codes → TAG_* keys (1:1 mapping)
// =============================================================================
export const Q5_BLOCKER_TAG_MAP: Record<string, string> = {
  // v6 blocker codes (multi-select max 2):
  NOT_WORTH_COST: "TAG_GOOD_FOR_COST_CONCERNS",
  NEED_MORE_TIME: "TAG_DECISION_SUPPORTIVE",
  UNSURE_OPTION: "TAG_OPTION_CLARITY_SUPPORT",
  WORRIED_COMPLEX: "TAG_COMPLEX_CASES_WELCOME",
  BAD_EXPERIENCE: "TAG_BAD_EXPERIENCE_SUPPORTIVE",
  NO_CONCERN: "TAG_RIGHT_FIT_FOCUSED",
  // Legacy v4 blocker codes (backwards compatibility):
  COST_CONCERNS: "TAG_GOOD_FOR_COST_CONCERNS",
  UNSURE_OPTIONS: "TAG_OPTION_CLARITY_SUPPORT",
  NERVOUS_ANXIOUS: "TAG_ANXIETY_FRIENDLY",
  TIME_DECIDE: "TAG_DECISION_SUPPORTIVE",
  FIND_RIGHT_FIT: "TAG_RIGHT_FIT_FOCUSED",
  // Legacy v3 blocker codes (backwards compatibility):
  MONTHLY_PAYMENTS: "TAG_FINANCE_AVAILABLE",
  NEED_TIME_DECIDE: "TAG_DECISION_SUPPORTIVE",
  COMPLEX_CASE: "TAG_COMPLEX_CASES_WELCOME",
}

// =============================================================================
// Q8: "How would you prefer to approach the cost of treatment?" (4 options, single-select)
// Form values → TAG_* keys
// MUST match COST_APPROACH_OPTIONS values in intake-form-config.ts exactly
// =============================================================================
export const Q8_COST_TAG_MAP: Record<string, string> = {
  // v5 cost approach values (LOCKED):
  best_outcome: "TAG_QUALITY_OUTCOME_FOCUSED",
  understand_value: "TAG_DISCUSS_OPTIONS_BEFORE_COST",
  comfort_range: "TAG_CLEAR_PRICING_UPFRONT",
  strict_budget: "TAG_STRICT_BUDGET_SUPPORTIVE",
  // Legacy v4 cost approach values (backwards compatibility):
  options_first: "TAG_DISCUSS_OPTIONS_BEFORE_COST",
  upfront_pricing: "TAG_CLEAR_PRICING_UPFRONT",
  finance_preferred: "TAG_MONTHLY_PAYMENTS_PREFERRED",
  // Legacy v3 cost approach values (backwards compatibility):
  options_then_cost: "TAG_DISCUSS_OPTIONS_BEFORE_COST",
  payments_preferred: "TAG_MONTHLY_PAYMENTS_PREFERRED",
  rough_range_flexible: "TAG_FLEXIBLE_BUDGET_OK",
}

// =============================================================================
// Q8: Cost approach → Clinic price_range compatibility
// Used for price tier scoring (hard filter for extremes, soft score otherwise)
// premium patient → never see budget clinics, budget patient → never see premium clinics
// =============================================================================
export const COST_PRICE_TIER_MAP: Record<string, { full: string[]; partial: string[]; excluded: string[] }> = {
  best_outcome:    { full: ["premium"],      partial: ["mid"],            excluded: ["budget"] },
  understand_value:{ full: ["premium", "mid"], partial: ["budget"],       excluded: [] },
  comfort_range:   { full: ["mid", "budget"], partial: ["premium"],       excluded: [] },
  strict_budget:   { full: ["budget"],        partial: ["mid"],           excluded: ["premium"] },
  // Legacy values
  options_first:   { full: ["premium", "mid"], partial: ["budget"],       excluded: [] },
  upfront_pricing: { full: ["mid", "budget"], partial: ["premium"],       excluded: [] },
  finance_preferred:{ full: ["mid", "budget"], partial: ["premium"],      excluded: [] },
}

// =============================================================================
// Q10: Anxiety level → TAG_* keys
// MUST match ANXIETY_LEVEL_OPTIONS values in intake-form-config.ts exactly
// =============================================================================
export const Q10_ANXIETY_TAG_MAP: Record<string, string> = {
  // Exact form option values from ANXIETY_LEVEL_OPTIONS → canonical TAG_* keys
  // comfortable: no tag needed (not anxious)
  slightly_anxious: "TAG_OK_WITH_ANXIOUS_PATIENTS",
  quite_anxious: "TAG_OK_WITH_ANXIOUS_PATIENTS",
  very_anxious: "TAG_OK_WITH_ANXIOUS_PATIENTS",
  // Legacy values (backwards compatibility):
  moderately_anxious: "TAG_OK_WITH_ANXIOUS_PATIENTS",
  slightly_nervous: "TAG_OK_WITH_ANXIOUS_PATIENTS",
}

// =============================================================================
// Centralized weight config (sum = 100)
// =============================================================================
export const WEIGHT_CONFIG = {
  treatment: 15, // Must-have: clinic offers requested treatment
  distance: 25, // Geographic proximity (NEVER used for reasons)
  priorities: 20, // Q4 priority tag matches
  blockers: 10, // Q5 blocker support (+ separate -15 complex case penalty)
  anxiety: 10, // Q10 anxiety accommodation
  cost: 15, // Q8 cost: price tier match + communication TAG match
  availability: 5, // Appointment time slot compatibility
} as const

export const CANONICAL_TAG_KEYS: string[] = [
  // Q4 Priority tags
  ...Object.values(Q4_PRIORITY_TAG_MAP),
  // Q5 Blocker tags
  ...Object.values(Q5_BLOCKER_TAG_MAP),
  // Q8 Cost tags
  ...Object.values(Q8_COST_TAG_MAP),
  // Q10 Anxiety tags
  ...Object.values(Q10_ANXIETY_TAG_MAP),
]

// =============================================================================
// Reason templates: TAG_* key → human-readable bullet variants
// Used for "Why we matched you" section (NEVER includes distance)
// Multiple variants per tag — engine picks one to avoid repetition across clinics
// =============================================================================
export const REASON_TEMPLATES: Record<string, string[]> = {
  // ─── PRIORITY-BASED REASONS (Q4) ───────────────────────────────────────────
  // Only shown if the patient actually selected this priority
  // IMPORTANT: Every tag MUST have unique template text — no two tags may share identical strings

  TAG_SPECIALIST_LEVEL_EXPERIENCE: [
    "This clinic has strong clinical expertise in {treatment}.",
    "Their team brings extensive hands-on experience in {treatment}.",
    "Known for specialist-level skill in {treatment} cases.",
    "Recommended for their advanced training and results in {treatment}.",
    "A highly experienced team when it comes to {treatment}.",
  ],

  TAG_FLEXIBLE_APPOINTMENTS: [
    "Offers flexible scheduling including evenings and weekends.",
    "Appointment times that work around your schedule, including late slots.",
    "Evening and weekend availability to suit busy lifestyles.",
    "Flexible booking options beyond standard working hours.",
    "Appointments available outside the usual 9-to-5 window.",
  ],

  TAG_CLEAR_PRICING_UPFRONT: [
    "This clinic provides transparent treatment plans with clear costs.",
    "You'll know exactly what to expect before any treatment begins.",
    "Upfront pricing with no hidden surprises along the way.",
    "Known for laying out costs clearly before starting work.",
    "Full cost transparency so you can plan with confidence.",
  ],

  TAG_CALM_REASSURING: [
    "Their team creates a calm, supportive atmosphere throughout your visit.",
    "Known for putting patients at ease with a warm, gentle approach.",
    "A reassuring environment for patients who value extra care.",
    "The team takes time to ensure you feel comfortable and relaxed.",
    "A patient-centred practice that prioritises your comfort.",
  ],

  TAG_STRONG_REPUTATION_REVIEWS: [
    "Consistently praised by patients for quality of care.",
    "Strong patient reviews highlight their professional, caring approach.",
    "A trusted name with an excellent track record of patient satisfaction.",
    "Highly rated by patients who appreciate thorough, attentive care.",
    "Their reputation speaks for itself — patients keep coming back.",
  ],

  TAG_CONTINUITY_OF_CARE: [
    "You'll see the same dentist each visit, building genuine trust over time.",
    "Focused on long-term patient relationships rather than one-off visits.",
    "Continuity is a priority — your dentist knows your history and preferences.",
    "Build a lasting relationship with a dentist who truly knows your case.",
    "They value ongoing care, so you won't be passed between different dentists.",
  ],

  // Legacy priority tags (backwards compat)
  TAG_CLEAR_EXPLANATIONS: [
    "Takes time to explain treatment options in plain, simple language.",
    "No jargon — they make sure you fully understand every step.",
    "Known for clear, patient-friendly communication about procedures.",
    "You'll leave each appointment understanding exactly what's happening.",
  ],
  TAG_LISTENED_TO_RESPECTED: [
    "Their team makes time to listen and genuinely respond to your concerns.",
    "A collaborative approach where your voice guides the treatment plan.",
    "Patients feel heard and respected throughout their care journey.",
    "They prioritise your input and never rush important conversations.",
  ],

  // ─── HESITATION-BASED REASONS (Q5 Blockers) ────────────────────────────────
  // Only shown if the patient actually selected this hesitation AND clinic has the tag

  TAG_GOOD_FOR_COST_CONCERNS: [
    "Helps patients understand the value behind each treatment option.",
    "Supportive if cost is an important factor in your decision.",
    "They discuss value and outcomes, not just price, so you feel confident.",
    "Known for helping patients find the right balance between cost and care.",
    "Open conversations about cost so there are no surprises.",
  ],

  TAG_DECISION_SUPPORTIVE: [
    "Happy to give you the time and space to decide at your own pace.",
    "No pressure — they support patients who need time to think things through.",
    "A patient approach that lets you weigh your options without rushing.",
    "They understand that big decisions deserve careful thought.",
    "Supportive of patients who want to take things step by step.",
  ],

  TAG_OPTION_CLARITY_SUPPORT: [
    "Clearly explains different treatment paths so you can compare.",
    "Walks you through all available options before any decision is made.",
    "Known for presenting choices in a clear, easy-to-understand way.",
    "Helps you see the full picture before committing to a treatment plan.",
    "You'll understand the pros and cons of each option before choosing.",
  ],

  TAG_COMPLEX_CASES_WELCOME: [
    "Experienced in managing more complex dental cases with confidence.",
    "Their team regularly handles complex treatment plans successfully.",
    "Well-equipped to take on cases that require extra clinical expertise.",
    "Comfortable working with patients whose needs are more involved.",
    "A reassuring choice if your treatment feels complicated or uncertain.",
  ],

  TAG_BAD_EXPERIENCE_SUPPORTIVE: [
    "Skilled at helping patients rebuild trust after a difficult dental experience.",
    "A gentle, understanding team for patients who've had a rough time before.",
    "Extra care and patience for those who need to restore their dental confidence.",
    "They specialise in making previous bad experiences a thing of the past.",
    "Understanding and supportive if past dental visits have been stressful.",
  ],

  TAG_RIGHT_FIT_FOCUSED: [
    "Focused on finding the right treatment for your individual situation.",
    "Takes a personalised approach rather than a one-size-fits-all solution.",
    "They tailor their recommendations to what actually suits you best.",
    "Your care plan is built around your needs, not a standard template.",
  ],

  // Legacy blocker tags
  TAG_FINANCE_AVAILABLE: [
    "Offers finance options to help spread the cost of treatment.",
    "Payment plans available so treatment fits comfortably into your budget.",
    "Flexible finance means you don't have to delay the care you need.",
    "Monthly payment options to make treatment more accessible.",
  ],
  TAG_ANXIETY_FRIENDLY: [
    "Extra support and patience for patients who feel nervous.",
    "A gentle approach designed to ease dental anxiety from the start.",
    "Their team understands what it's like to feel anxious about dental care.",
    "Calming techniques and a reassuring manner for nervous patients.",
  ],

  // ─── COST APPROACH REASONS (Q8) ────────────────────────────────────────────
  TAG_QUALITY_OUTCOME_FOCUSED: [
    "Focused on delivering the best possible long-term outcome.",
    "Quality and durability are the top priorities in every treatment plan.",
    "They invest in getting the result right, not just getting it done.",
    "An outcome-first approach that values lasting results.",
    "Recommended if achieving the best result matters most to you.",
  ],
  TAG_DISCUSS_OPTIONS_BEFORE_COST: [
    "Options are presented on their merits before any discussion of cost.",
    "A consultative approach where treatment choices come first, costs second.",
    "They want you to understand your options fully before money enters the conversation.",
    "Cost is discussed openly, but only after you understand what's recommended.",
  ],
  TAG_MONTHLY_PAYMENTS_PREFERRED: [
    "Monthly payment plans help make treatment affordable over time.",
    "Spreading costs is easy with their structured payment options.",
    "No need to pay everything upfront — manageable monthly instalments available.",
    "Their finance plans are designed to reduce the financial barrier to care.",
  ],
  TAG_FLEXIBLE_BUDGET_OK: [
    "Happy to work with a rough budget range and adjust from there.",
    "Flexible on pricing — they'll find options that respect your budget.",
    "An adaptable approach to cost that doesn't lock you into rigid pricing.",
    "They understand budgets aren't always fixed and work with you on it.",
  ],
  TAG_STRICT_BUDGET_SUPPORTIVE: [
    "Experienced in planning effective treatment within a set budget.",
    "They'll work within your stated budget without compromising on care.",
    "Full transparency on what's achievable at your price point.",
    "No scope creep — your budget ceiling is respected from the outset.",
    "They specialise in making the most of every pound in your budget.",
  ],

  // ─── ANXIETY REASONS (Q10) ─────────────────────────────────────────────────
  TAG_OK_WITH_ANXIOUS_PATIENTS: [
    "Their team is experienced in helping patients who feel nervous.",
    "A calm, reassuring approach specifically for anxious patients.",
    "Extra time and patience built into appointments for nervous visitors.",
    "They understand dental anxiety and adapt their care accordingly.",
    "A welcoming environment that helps anxious patients feel safe.",
  ],
  TAG_SEDATION_AVAILABLE: [
    "Sedation options available for patients who need extra comfort.",
    "Conscious sedation offered to help you feel relaxed during treatment.",
    "If anxiety is significant, their sedation options can help you through.",
    "Sedation is available so treatment doesn't have to feel overwhelming.",
    "Provides sedation for patients who benefit from additional relaxation.",
  ],
}

// =============================================================================
// Treatment-based reason templates (used by reasons engine based on category)
// =============================================================================
export const TREATMENT_REASON_TEMPLATES: Record<string, string[]> = {
  cosmetic: [
    "Experienced in cosmetic treatments like {treatment}.",
    "Strong portfolio in {treatment}.",
    "A focused match for your chosen treatment.",
    "Specialises in cosmetic dentistry including {treatment}.",
    "Their cosmetic work in {treatment} is well-regarded.",
  ],
  checkup: [
    "Well suited for ongoing general dental care.",
    "A solid match for preventative and routine care.",
    "Focused on keeping your oral health on track long-term.",
    "Ideal for regular check-ups and professional cleaning.",
  ],
  emergency: [
    "Experienced in handling urgent dental concerns.",
    "Accepts emergency appointments.",
    "Equipped to deal with sudden dental issues promptly.",
    "Ready to help when dental emergencies arise.",
  ],
}

// =============================================================================
// Emergency-specific reason templates
// =============================================================================
// IMPORTANT: Must NOT contain distance words (mile, km, near, close to, nearby, within)
export const EMERGENCY_REASON_TEMPLATES = {
  availability: [
    "Able to see urgent patients quickly.",
    "Offers appointments aligned with your urgency.",
    "Can accommodate emergency visits at short notice.",
    "Prioritises urgent cases in their schedule.",
    "Ready to accommodate emergency visits.",
  ],
  capability: [
    "Experienced in handling urgent dental concerns.",
    "Accepts emergency appointments.",
    "Equipped to manage urgent dental issues effectively.",
    "Has the facilities to treat emergency cases.",
  ],
  anxiety: [
    "Experienced in supporting nervous patients during urgent visits.",
    "Provides a calm, reassuring approach for urgent care.",
    "Gentle approach to help ease anxiety during emergency treatment.",
    "Extra care and patience even during time-sensitive appointments.",
    "Their team stays calm and supportive when you need it most.",
  ],
}

// =============================================================================
// Profile Highlights (display-only, do NOT affect matching)
// =============================================================================
export const PROFILE_HIGHLIGHT_TAGS = [
  "HIGHLIGHT_NO_UPSELLING",
  "HIGHLIGHT_DIGITAL_PLANNING_PREVIEW",
  "HIGHLIGHT_AFTERCARE_STRONG",
  "HIGHLIGHT_TIME_CONSCIOUS_APPTS",
  "HIGHLIGHT_STAGED_TREATMENT_PLANS",
  "HIGHLIGHT_CONSERVATIVE_APPROACH",
  "HIGHLIGHT_LONG_TERM_DURABILITY",
  "HIGHLIGHT_FAMILY_FRIENDLY",
  "HIGHLIGHT_MODERN_EQUIPMENT",
]

// =============================================================================
// FALLBACK_REASON templates (used when fewer than 3 strong facts exist)
// These are tagged as FALLBACK, not AI-generated
// Priority: lower number = used first
// =============================================================================
// Logistics-only fallback reasons — ONLY appear when not enough other reasons exist
// IMPORTANT: Must NOT contain distance words (mile, km, near, close to, nearby, within)
export const FALLBACK_REASONS: Array<{
  key: string
  text: string
  priority: number
}> = [
  {
    key: "FALLBACK_AVAILABILITY",
    text: "Offers appointments aligned with your availability.",
    priority: 1,
  },
  {
    key: "FALLBACK_SCHEDULE_FIT",
    text: "Open during hours that suit your schedule.",
    priority: 2,
  },
  {
    key: "FALLBACK_WELL_REVIEWED",
    text: "Well-reviewed by other patients.",
    priority: 3,
  },
  {
    key: "FALLBACK_PATIENT_COMFORT",
    text: "A clinic focused on patient comfort and care.",
    priority: 4,
  },
  {
    key: "FALLBACK_WELCOMING_TEAM",
    text: "Known for a welcoming and friendly team.",
    priority: 5,
  },
  {
    key: "FALLBACK_TRUSTED_PRACTICE",
    text: "A trusted practice with a strong track record.",
    priority: 6,
  },
  {
    key: "FALLBACK_EASY_ACCESS",
    text: "Easy access with good parking or transport options.",
    priority: 7,
  },
  {
    key: "FALLBACK_MODERN_FACILITIES",
    text: "Equipped with modern dental technology and facilities.",
    priority: 8,
  },
  {
    key: "FALLBACK_FLEXIBLE_REBOOKING",
    text: "Offers flexible rebooking and cancellation policies.",
    priority: 9,
  },
  {
    key: "FALLBACK_FAMILY_FRIENDLY",
    text: "Welcoming to patients of all ages, including families.",
    priority: 10,
  },
]

// =============================================================================
// Banned generic phrases (reasons engine MUST reject these)
// =============================================================================
export const BANNED_GENERIC_PHRASES = [
  "Accepts patients",
  "Matches your needs",
  "Good option for you",
  "A good choice",
  "Recommended for you",
  "Suitable clinic",
]

// =============================================================================
// Tag Categories for Admin UI
// =============================================================================
export type TagCategory = 
  | "q4_priorities"
  | "q5_blockers" 
  | "q8_cost"
  | "q10_anxiety"
  | "profile"
  | "clinic_features"
  | "unknown"

export const TAG_CATEGORIES: Record<TagCategory, { label: string; color: string }> = {
  q4_priorities: { label: "Patient Priorities", color: "blue" },
  q5_blockers: { label: "Blocker Support", color: "orange" },
  q8_cost: { label: "Cost Approach", color: "green" },
  q10_anxiety: { label: "Anxiety Support", color: "purple" },
  profile: { label: "Profile Highlights", color: "gray" },
  clinic_features: { label: "Clinic Features", color: "teal" },
  unknown: { label: "Other", color: "gray" },
}

// Map tag keys to their categories
export const TAG_TO_CATEGORY: Record<string, TagCategory> = {
  // Q4 Priority tags
  TAG_CLEAR_EXPLANATIONS: "q4_priorities",
  TAG_LISTENED_TO_RESPECTED: "q4_priorities",
  TAG_CALM_REASSURING: "q4_priorities",
  TAG_CLEAR_PRICING_UPFRONT: "q4_priorities",
  TAG_FLEXIBLE_APPOINTMENTS: "q4_priorities",
  TAG_SPECIALIST_LEVEL_EXPERIENCE: "q4_priorities",
  TAG_STRONG_REPUTATION_REVIEWS: "q4_priorities",
  TAG_CONTINUITY_OF_CARE: "q4_priorities",

  // Q5 Blocker tags
  TAG_GOOD_FOR_COST_CONCERNS: "q5_blockers",
  TAG_FINANCE_AVAILABLE: "q5_blockers",
  TAG_DECISION_SUPPORTIVE: "q5_blockers",
  TAG_OPTION_CLARITY_SUPPORT: "q5_blockers",
  TAG_ANXIETY_FRIENDLY: "q5_blockers",
  TAG_COMPLEX_CASES_WELCOME: "q5_blockers",
  TAG_BAD_EXPERIENCE_SUPPORTIVE: "q5_blockers",
  TAG_RIGHT_FIT_FOCUSED: "q5_blockers",

  // Q8 Cost tags
  TAG_QUALITY_OUTCOME_FOCUSED: "q8_cost",
  TAG_DISCUSS_OPTIONS_BEFORE_COST: "q8_cost",
  TAG_MONTHLY_PAYMENTS_PREFERRED: "q8_cost",
  TAG_FLEXIBLE_BUDGET_OK: "q8_cost",
  TAG_STRICT_BUDGET_SUPPORTIVE: "q8_cost",

  // Q10 Anxiety tags
  TAG_OK_WITH_ANXIOUS_PATIENTS: "q10_anxiety",
  TAG_SEDATION_AVAILABLE: "q10_anxiety",

  // Profile highlights
  HIGHLIGHT_NO_UPSELLING: "profile",
  HIGHLIGHT_DIGITAL_PLANNING_PREVIEW: "profile",
  HIGHLIGHT_AFTERCARE_STRONG: "profile",
  HIGHLIGHT_TIME_CONSCIOUS_APPTS: "profile",
  HIGHLIGHT_STAGED_TREATMENT_PLANS: "profile",
  HIGHLIGHT_CONSERVATIVE_APPROACH: "profile",
  HIGHLIGHT_LONG_TERM_DURABILITY: "profile",
  HIGHLIGHT_FAMILY_FRIENDLY: "profile",
  HIGHLIGHT_MODERN_EQUIPMENT: "profile",
}

export function getTagCategory(tagKey: string): TagCategory {
  return TAG_TO_CATEGORY[tagKey] || "unknown"
}

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Get all matching tags a patient needs based on their form answers
 */
export function getPatientMatchTags(lead: {
  decision_values?: string[]
  anxiety_level?: string
  cost_approach?: string
  blocker_codes?: string[]
}): string[] {
  const tags: string[] = []

  // Q4: Priorities (max 3)
  if (lead.decision_values?.length) {
    for (const value of lead.decision_values) {
      const tag = Q4_PRIORITY_TAG_MAP[value]
      if (tag) tags.push(tag)
    }
  }

  // Q5: Blockers (can have multiple)
  if (lead.blocker_codes?.length) {
    for (const code of lead.blocker_codes) {
      const tag = Q5_BLOCKER_TAG_MAP[code]
      if (tag) tags.push(tag)
    }
  }

  // Q8: Cost approach (single)
  if (lead.cost_approach) {
    const tag = Q8_COST_TAG_MAP[lead.cost_approach]
    if (tag) tags.push(tag)
  }

  // Q10: Anxiety (single)
  if (lead.anxiety_level && lead.anxiety_level !== "not-anxious" && lead.anxiety_level !== "comfortable") {
    const tag = Q10_ANXIETY_TAG_MAP[lead.anxiety_level]
    if (tag) tags.push(tag)
  }

  // Return unique tags
  return [...new Set(tags)]
}

/**
 * Check if a tag is a matching tag (affects scoring) vs display-only
 */
export function isMatchingTag(tagKey: string): boolean {
  return tagKey.startsWith("TAG_")
}

/**
 * Check if a tag is a profile highlight (display-only)
 */
export function isProfileHighlight(tagKey: string): boolean {
  return tagKey.startsWith("HIGHLIGHT_")
}

/**
 * Get admin-friendly category label for a tag
 */
export function getTagCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    q4_priorities: "Q4: What matters most",
    q5_blockers: "Q5: Concerns / blockers",
    q8_cost: "Q8: Cost approach",
    q10_anxiety: "Q10: Anxiety level",
    profile: "Profile Highlights (display only)",
  }
  return labels[category] || category
}
