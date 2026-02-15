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
// Centralized weight config (sum = 110; blockers only scored when patient has concerns, effective sum varies)
// =============================================================================
export const WEIGHT_CONFIG = {
  treatment: 15, // Must-have: clinic offers requested treatment
  distance: 25, // Geographic proximity (NEVER used for reasons)
  priorities: 20, // Q4 priority tag matches
  blockers: 10, // Q5 blocker support bonus (+ separate -15 complex case penalty)
  anxiety: 10, // Q10 anxiety accommodation
  cost: 15, // Q8 cost: price tier match + communication TAG match
  availability: 15, // Appointment time slot compatibility
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
    "Matched because this team has extensive experience in {treatment}.",
    "Selected for their depth of experience in {treatment}.",
  ],

  TAG_FLEXIBLE_APPOINTMENTS: [
    "Matched because they provide late afternoon or weekend availability.",
    "Offers flexible scheduling including evenings and weekends.",
    "A good fit for patients who need appointments outside standard hours.",
  ],

  TAG_CLEAR_PRICING_UPFRONT: [
    "This clinic provides transparent treatment plans with clear costs.",
    "Matched because they discuss costs openly before treatment begins.",
    "Selected for their upfront approach to pricing and treatment plans.",
  ],

  TAG_CALM_REASSURING: [
    "Matched because they focus on supportive, patient-centred care.",
    "A good fit for patients who value reassurance and clear communication.",
    "Selected for their warm, calming approach to dental care.",
  ],

  TAG_STRONG_REPUTATION_REVIEWS: [
    "This clinic has consistently strong reviews from patients.",
    "Matched because of their excellent patient feedback and ratings.",
    "Selected for their trusted reputation in the community.",
  ],

  TAG_CONTINUITY_OF_CARE: [
    "Matched because they prioritise seeing the same dentist each visit.",
    "A good fit for patients who want to build a long-term relationship with their dentist.",
    "Selected for their focus on continuity and ongoing patient relationships.",
  ],

  // Legacy priority tags (backwards compat)
  TAG_CLEAR_EXPLANATIONS: [
    "Matched because they explain treatment options in plain, simple language.",
    "Selected for their focus on clear, jargon-free communication.",
    "A good fit for patients who value thorough explanations.",
  ],
  TAG_LISTENED_TO_RESPECTED: [
    "Matched for their collaborative, patient-led approach to care.",
    "A good fit for patients who want to feel heard and respected.",
    "Selected because they take time to listen to patient concerns.",
  ],

  // ─── HESITATION-BASED REASONS (Q5 Blockers) ────────────────────────────────
  // Only shown if the patient actually selected this hesitation AND clinic has the tag

  TAG_GOOD_FOR_COST_CONCERNS: [
    "A good fit if cost is an important factor in your decision.",
    "Matched because they help patients understand the value of treatment.",
    "Selected for their supportive approach to discussing costs.",
  ],

  TAG_DECISION_SUPPORTIVE: [
    "A good fit if you'd like space and support to make a confident decision.",
    "Matched because they give patients time to consider their options.",
    "Selected for their patient, no-pressure approach to decision-making.",
  ],

  TAG_OPTION_CLARITY_SUPPORT: [
    "Matched because they clearly explain different treatment paths available.",
    "A good fit for patients who want to explore and compare options.",
    "Selected for their thorough approach to presenting treatment choices.",
  ],

  TAG_COMPLEX_CASES_WELCOME: [
    "Matched with a team experienced in handling more complex cases.",
    "A good fit for patients who want reassurance around complexity.",
    "Selected because they regularly manage complex treatment plans.",
  ],

  TAG_BAD_EXPERIENCE_SUPPORTIVE: [
    "Matched with a team experienced in helping patients rebuild dental confidence.",
    "A good fit for patients who want extra care and understanding from their dentist.",
    "Selected for their gentle approach with patients who've had difficult past experiences.",
  ],

  TAG_RIGHT_FIT_FOCUSED: [
    "Matched because they focus on finding the right treatment for each patient.",
    "A good match for patients who value a personalised approach.",
    "Selected for their focus on tailoring care to individual needs.",
  ],

  // Legacy blocker tags
  TAG_FINANCE_AVAILABLE: [
    "Offers finance options to help manage treatment costs.",
    "A good fit if spreading the cost over time matters to you.",
    "Matched because they provide payment plan options for treatment.",
  ],
  TAG_ANXIETY_FRIENDLY: [
    "A good fit for patients who appreciate a gentle, reassuring approach.",
    "Selected for their experience in supporting anxious patients.",
    "Matched because they create a comfortable environment for nervous patients.",
  ],

  // ─── COST APPROACH REASONS (Q8) ────────────────────────────────────────────
  TAG_QUALITY_OUTCOME_FOCUSED: [
    "Matched because they focus on delivering the best possible outcome.",
    "Selected for their emphasis on quality and long-term results.",
    "A good fit for patients who prioritise outcome over cost.",
  ],
  TAG_DISCUSS_OPTIONS_BEFORE_COST: [
    "Selected because they present options with clear reasoning before discussing cost.",
    "A good fit for patients who want to understand their options first.",
    "Matched because they take a consultative approach to treatment planning.",
  ],
  TAG_MONTHLY_PAYMENTS_PREFERRED: [
    "Offers monthly payment options to make treatment more accessible.",
    "Matched because they help patients spread the cost of treatment.",
    "A good fit for patients looking for manageable payment plans.",
  ],
  TAG_FLEXIBLE_BUDGET_OK: [
    "A good fit for patients who have a rough budget but value flexibility.",
    "Matched because they work with patients on flexible cost arrangements.",
    "Selected for their adaptable approach to treatment pricing.",
  ],
  TAG_STRICT_BUDGET_SUPPORTIVE: [
    "Matched because they work within clear budget constraints.",
    "A good fit for patients who need full transparency around costs upfront.",
    "Selected for their experience in planning treatment within set budgets.",
  ],

  // ─── ANXIETY REASONS (Q10) ─────────────────────────────────────────────────
  TAG_OK_WITH_ANXIOUS_PATIENTS: [
    "Experienced in supporting patients who feel nervous about dental visits.",
    "Provides a calm, reassuring approach for anxious patients.",
    "A good fit for patients who need extra support and patience.",
  ],
  TAG_SEDATION_AVAILABLE: [
    "Offers sedation options for patients who need extra comfort.",
    "Matched because they provide sedation for anxious or nervous patients.",
    "A good fit for patients who may benefit from sedation during treatment.",
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
  ],
  checkup: [
    "Well suited for ongoing general dental care.",
    "A good match for preventative and routine care.",
  ],
  emergency: [
    "Experienced in handling urgent dental concerns.",
    "Accepts emergency appointments.",
  ],
}

// =============================================================================
// Emergency-specific reason templates
// =============================================================================
export const EMERGENCY_REASON_TEMPLATES = {
  availability: [
    "Available within your preferred timeframe.",
    "Able to see urgent patients.",
    "Offers appointments aligned with your urgency.",
  ],
  distance: [
    "Conveniently located near you.",
    "Within your preferred travel distance.",
  ],
  capability: [
    "Experienced in handling urgent dental concerns.",
    "Accepts emergency appointments.",
  ],
  anxiety: [
    "Experienced in supporting nervous patients.",
    "Provides a calm approach for urgent visits.",
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
export const FALLBACK_REASONS: Array<{
  key: string
  text: string
  priority: number
}> = [
  {
    key: "FALLBACK_CONVENIENT_LOCATION",
    text: "Conveniently located near you.",
    priority: 1,
  },
  {
    key: "FALLBACK_TRAVEL_DISTANCE",
    text: "Within your preferred travel distance.",
    priority: 2,
  },
  {
    key: "FALLBACK_AVAILABILITY",
    text: "Offers appointments aligned with your availability.",
    priority: 3,
  },
  {
    key: "FALLBACK_SCHEDULE_FIT",
    text: "Open during hours that suit your schedule.",
    priority: 4,
  },
  {
    key: "FALLBACK_WELL_REVIEWED",
    text: "Well-reviewed by other patients in your area.",
    priority: 5,
  },
  {
    key: "FALLBACK_PATIENT_COMFORT",
    text: "A clinic focused on patient comfort and care.",
    priority: 6,
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
