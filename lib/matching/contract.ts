/*
 * ============================================================================
 * DO NOT MODIFY MATCHING LOGIC WITHOUT UPDATING:
 * - tag-schema.ts - canonical tag definitions
 * - contract.ts (this file) - MatchFacts interface
 * - reasons-engine.ts - reason generation logic
 * - scoring.ts - scoring algorithm
 * - __tests__/reasons-determinism.test.ts - automated validation
 *
 * MatchFacts is the ONLY input to the reasons engine.
 * Reasons engine MUST NEVER read raw_answers directly.
 * ============================================================================
 */

export const MATCHING_CONTRACT_VERSION = "v1_locked"
export const EXPLANATION_SCHEMA_VERSION = "v1_locked"

/**
 * Canonical lead answer shape - normalized and validated
 * This is the single source of truth for what a lead contains
 */
export interface LeadAnswer {
  id: string
  treatment: string
  postcode: string
  latitude?: number
  longitude?: number
  city?: string
  locationPreference?: "near_home" | "travel_bit" | "travel_further" | null
  priorities: string[] // Maps from decision_values in DB
  anxietyLevel?: "comfortable" | "slightly_anxious" | "quite_anxious" | "very_anxious" | null
  budgetRange?: string | null
  costApproach?: "COMPARE_VALUE" | "FLEXIBLE_FINANCE" | "STRICT_BUDGET" | "PREFER_DISCUSS" | null
  strictBudgetMax?: number | string | null
  timingPreference?: string | null
  preferred_times?: string[] // Morning, afternoon, weekends
  email: string
  phone?: string | null
  schemaVersion: number
  conversionBlocker?: string | null
  blockerCode?: string | null // Stable code for matching
  blockerCodes?: string[] // Array of blocker codes (max 3)
  outcomePriority?: string | null
  outcomePriorityKey?: string | null
}

/**
 * Canonical clinic profile shape - normalized and validated
 * This is the single source of truth for what a clinic contains
 */
export interface ClinicProfile {
  id: string
  name: string
  postcode: string
  latitude?: number
  longitude?: number
  priceRange?: string | null
  financeAvailable: boolean
  verified: boolean
  rating?: number
  reviewCount: number
  treatments: string[]
  tags: string[]
  filterKeys: string[]
  available_days?: string[] // Mon, Tue, Wed, Thu, Fri, Sat, Sun
  available_hours?: string[] // 09:00, 10:00, 11:00, etc.
  accepts_same_day?: boolean // Can accept same-day appointments
}

/**
 * Score breakdown per category with max points and contribution
 */
export interface ScoreCategoryBreakdown {
  category: string
  points: number
  maxPoints: number
  weight: number // Contribution to total (0-1)
  facts: Record<string, any> // Structured facts used for this category
}

/**
 * Complete match score breakdown for a clinic
 */
export interface MatchScoreBreakdown {
  totalScore: number
  maxPossible: number
  percent: number
  categories: ScoreCategoryBreakdown[]
  distanceMiles?: number
}

/**
 * Display-ready match reason
 */
export interface MatchReason {
  key: string // Unique key for deduplication
  text: string // Display text
  category: "treatment" | "distance" | "priorities" | "blockers" | "anxiety" | "cost" | "budget" | "trust"
  weight: number // How important this reason is (0-1)
  tagKey?: string // The TAG_* key this reason maps to (for validation)
  isFallback?: boolean // True if this is a fallback reason
}

/**
 * Debug info interface for match reasons
 */
export interface MatchReasonsDebug {
  primaryReasonKey: string
  reasonKeys: string[]
  matchedTagsByCategory: {
    treatment: string[]
    priorities: string[]
    blockers: string[]
    cost: string[]
    anxiety: string[]
  }
  fallbacksUsed: number
}

/**
 * MATCH_FACTS: Structured facts output by scoring engine
 * This is the ONLY input to reasons-engine.ts
 * Never pass raw answers to the reasons engine
 */
export interface MatchFacts {
  clinicId: string
  clinicName: string

  // Treatment match
  treatmentMatch: {
    requested: string
    clinicOffers: boolean
    matchedTreatments: string[]
  }

  // Q4: Priorities (what patient values most)
  priorities: {
    patientPriorities: string[] // Raw form values
    matchedTags: string[] // TAG_* keys that matched
    matchCount: number
  }

  // Q5: Blockers
  blockers: {
    patientBlockers: string[] // Blocker codes
    matchedTags: string[] // TAG_* keys that matched
    hasMatch: boolean
  }

  // Q8: Cost approach (two-layer: price tier + communication TAG)
  cost: {
    patientApproach: string | null
    matchedTag: string | null
    hasMatch: boolean
    priceTierMatch: "full" | "partial" | "excluded" | "unknown"
    clinicPriceRange: string | null
  }

  // Q10: Anxiety support
  anxiety: {
    patientLevel: string | null
    needsSedation: boolean
    hasSedation: boolean
    hasAnxietySupport: boolean
    matchedTags: string[]
  }

  // Availability match
  availability: {
    preferredTimes: string[] // Morning, afternoon from patient
    clinicDays: string[] // Mon, tue, wed, etc.
    clinicHours: string[] // 09:00, 10:00, etc.
    matchedTimeSlots: string[] // Which preferred times clinic covers
    urgency: string | null
    acceptsSameDay: boolean
  }

  // Score breakdown (for weight calculation)
  scoreBreakdown: {
    treatment: number
    priorities: number
    blockers: number
    cost: number
    anxiety: number
    availability: number
    total: number
    maxPossible: number
    percent: number
  }

  // All clinic tags for fallback selection
  clinicTags: string[]

  // Clinic metadata for fallback reasons
  clinicRating?: number
}

/**
 * Fallback reason definition
 */
export interface FallbackReason {
  key: string
  text: string
  priority: number // Lower = higher priority
}

/**
 * Complete match result for a clinic
 */
export interface ClinicMatch {
  clinicId: string
  clinicName: string
  score: MatchScoreBreakdown
  reasons: MatchReason[]
  tier: "excellent" | "strong" | "good" | "possible"
  explanationVersion: string
  matchFacts?: MatchFacts // Optional: include for debugging
  reasonsDebug?: MatchReasonsDebug // Optional: include for debugging match reasons
}
