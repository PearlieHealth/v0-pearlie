/**
 * Unified Matching Engine
 * Single source of truth for all matching operations
 * Used by both production /api/leads and admin /api/admin/test-match
 */

import type { LeadAnswer, ClinicProfile, MatchScoreBreakdown, MatchReason, ClinicMatch } from "./contract"
import { EXPLANATION_SCHEMA_VERSION } from "./contract"
import { normalizeLead, normalizeClinic } from "./normalize"
import { scoreClinic, buildMatchFacts } from "./scoring"
import { buildMatchReasons, getExplanationVersion, buildMatchReasonsDebug } from "./reasons-engine"
import { createClient } from "@/lib/supabase/server"
import { isClinicMatchable, getMatchingTagCount, getLiveClinicFilter, MIN_MATCHING_TAGS } from "./clinic-status"

export interface TestLeadInput {
  // Treatment(s) - support both old single and new multi format
  treatment?: string
  treatments?: string[]
  postcode: string
  latitude?: number
  longitude?: number
  // Location preference - support both old and new formats
  locationPreference?: "near_home" | "travel_bit" | "travel_further" | "near_home_work" | "travel_a_bit" | null
  // Decision values (what matters most) - new format from intake form
  decisionValues?: string[]
  // Priorities - old format (codes), mapped internally
  priorities?: string[]
  // Anxiety level - support both old and new formats
  anxietyLevel?: "comfortable" | "slightly_anxious" | "quite_anxious" | "very_anxious" | "not_anxious" | "moderately_anxious" | null
  // Budget - old format
  budgetRange?: string | null
  // Cost approach - new format from intake form
  costApproach?: string | null
  strictBudgetMode?: string | null
  strictBudgetAmount?: number | null
  timingPreference?: string | null
  preferred_times?: string[] // Morning, afternoon, weekends
  // Blockers - support both old single and new multi format
  conversionBlocker?: string | null
  conversionBlockerCodes?: string[]
  blockerCodes?: string[] // Alias for conversionBlockerCodes
}

export interface RankingOptions {
  topN?: number
  londonOnly?: boolean
  pinnedClinicId?: string
  includeUnverified?: boolean // If false (default), only verified clinics appear. If true, includes non-verified (for "Load more").
}

export interface RankedClinic {
  clinic: ClinicProfile
  score: MatchScoreBreakdown
  reasons: MatchReason[]
  tier: "excellent" | "strong" | "good" | "possible"
  isPinned?: boolean
  explanationVersion: string // Added explanation version tracking
  debug: {
    distanceMiles?: number
    treatmentMatch: boolean
    priorityTagsMatched: string[]
    anxietyMatched: boolean
    budgetMatched: boolean
    rawScore: number
    percent: number
    categories: Array<{
      category: string
      points: number
      maxPoints: number
      weight: number
    }>
    reasonsDebug?: {
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
    isDirectoryListing?: boolean // True if clinic has no tags, shown as directory entry only
  }
}

export interface MatchingResult {
  rankedClinics: RankedClinic[]
  totalClinicsEvaluated: number
  contractVersion: string
  timestamp: string
}

/**
 * Build a normalized lead profile from raw form input
 * Applies defaults and validation for null-safety
 * Handles both old format (treatment, priorities, conversionBlocker) 
 * and new format (treatments, decisionValues, conversionBlockerCodes)
 */
export function buildLeadProfile(input: TestLeadInput): LeadAnswer {
  // Normalize treatment - use treatments array if provided, fallback to single treatment
  const treatments = input.treatments || (input.treatment ? [input.treatment] : [])
  const treatment = treatments[0] || ""
  
  // Normalize location preference - map new values to old format for scoring
  let locationPreference = input.locationPreference
  if (locationPreference === "near_home_work") locationPreference = "near_home"
  if (locationPreference === "travel_a_bit") locationPreference = "travel_bit"
  
  // Normalize priorities - use decisionValues if provided (new format), otherwise priorities (old format)
  // decisionValues are full text strings, priorities are codes - both work in scoring
  const priorities = input.decisionValues?.length 
    ? input.decisionValues 
    : (Array.isArray(input.priorities) ? input.priorities : [])
  
  // Normalize anxiety level - map values to scoring format
  let anxietyLevel = input.anxietyLevel
  if (anxietyLevel === "not_anxious") anxietyLevel = "comfortable"
  if (anxietyLevel === "moderately_anxious") anxietyLevel = "quite_anxious"
  // "quite_anxious" is now a first-class value in v4, no mapping needed
  
  // Normalize cost approach to budget range
  let budgetRange = input.budgetRange || "unspecified"
  if (input.costApproach) {
    // Map costApproach to budgetRange for scoring compatibility (v3 + v4 values)
    const costMap: Record<string, string> = {
      // v4 values:
      "options_first": "unspecified",
      "upfront_pricing": "unspecified",
      "finance_preferred": "finance_preferred",
      "strict_budget": "strict_budget",
      // v3 legacy values:
      "options_then_cost": "unspecified",
      "payments_preferred": "finance_preferred",
      "rough_range_flexible": "flexible",
    }
    budgetRange = costMap[input.costApproach] || input.costApproach
  }
  
  // Normalize conversion blocker - use array if provided
  const blockers = input.blockerCodes || input.conversionBlockerCodes || (input.conversionBlocker ? [input.conversionBlocker] : [])
  const conversionBlocker = blockers[0] || null
  
  return {
    id: "test-" + Date.now(),
    treatment,
    postcode: input.postcode || "",
    latitude: input.latitude,
    longitude: input.longitude,
    city: undefined,
    locationPreference: locationPreference as any,
    priorities,
    anxietyLevel: anxietyLevel as any,
    budgetRange,
    costApproach: input.costApproach || null,
    strictBudgetMax: input.strictBudgetAmount || null,
    timingPreference: input.timingPreference || "flexible",
    preferred_times: input.preferred_times || [],
    email: "",
    phone: null,
    schemaVersion: 1,
    conversionBlocker,
    blockerCodes: blockers,
    blockerCode: conversionBlocker, // For scoring compatibility
    outcomePriority: null,
    outcomePriorityKey: null,
  }
}

/**
 * Build a normalized lead profile from database row
 * Uses the same normalization as production
 */
export function buildLeadProfileFromDB(leadRow: any): LeadAnswer {
  return normalizeLead(leadRow)
}

/**
 * Build a normalized clinic profile from database row
 */
export function buildClinicProfile(clinicRow: any, filterKeys: string[] = []): ClinicProfile {
  return normalizeClinic(clinicRow, filterKeys)
}

/**
 * Compute full match score for a clinic against a lead profile
 * Returns score breakdown with all categories
 *
 * IMPORTANT: This function builds MatchFacts from scoring, then passes
 * ONLY MatchFacts to the reasons engine. Never raw lead answers.
 *
 * @param profile - The lead profile
 * @param clinic - The clinic profile
 * @param deprioritizeTreatment - If true, prioritize Q4/Q5/Q8/Q10 tags over treatment
 * @param fallbackOffset - Offset for rotating fallbacks
 */
export function computeClinicScore(
  profile: LeadAnswer,
  clinic: ClinicProfile,
  deprioritizeTreatment = false,
  fallbackOffset = 0,
): {
  score: MatchScoreBreakdown
  reasons: MatchReason[]
  explanationVersion: string
  matchFacts: any
  reasonsDebug: any
} {
  const score = scoreClinic(profile, clinic)
  const matchFacts = buildMatchFacts(profile, clinic, score)
  const reasons = buildMatchReasons(matchFacts, deprioritizeTreatment, fallbackOffset)
  const reasonsDebug = buildMatchReasonsDebug(matchFacts, reasons)

  return {
    score,
    reasons,
    explanationVersion: getExplanationVersion(),
    matchFacts,
    reasonsDebug,
  }
}

/**
 * Determine match tier based on percentage
 */
function getTier(percent: number): "excellent" | "strong" | "good" | "possible" {
  if (percent >= 80) return "excellent"
  if (percent >= 60) return "strong"
  if (percent >= 40) return "good"
  return "possible"
}

/**
 * Build debug info from score breakdown
 */
function buildDebugInfo(
  score: MatchScoreBreakdown,
  profile: LeadAnswer,
  clinic: ClinicProfile,
  reasonsDebug?: any,
): RankedClinic["debug"] {
  const treatmentCategory = score.categories.find((c) => c.category === "treatment")
  const priorityCategory = score.categories.find((c) => c.category === "priorities")
  const anxietyCategory = score.categories.find((c) => c.category === "anxiety")
  const budgetCategory = score.categories.find((c) => c.category === "budget")

  return {
    distanceMiles: score.distanceMiles,
    treatmentMatch: treatmentCategory ? treatmentCategory.points > 0 : false,
    priorityTagsMatched: priorityCategory?.facts?.matchedPriorities || [],
    anxietyMatched: anxietyCategory ? anxietyCategory.points > 0 : false,
    budgetMatched: budgetCategory ? budgetCategory.points > 0 : false,
    rawScore: score.totalScore,
    percent: score.percent,
    categories: score.categories.map((c) => ({
      category: c.category,
      points: c.points,
      maxPoints: c.maxPoints,
      weight: c.weight,
    })),
    reasonsDebug,
  }
}

/**
 * Check if a clinic has enough matching tags to be considered matchable
 * NOT_MATCHABLE clinics should be excluded from matching entirely
 */
function checkClinicMatchable(clinic: ClinicProfile): boolean {
  return isClinicMatchable(clinic.filterKeys || [])
}

/**
 * Get count of matching tags for a clinic
 */
function getClinicMatchingTagCount(clinic: ClinicProfile): number {
  return getMatchingTagCount(clinic.filterKeys || [])
}

/**
 * Rank clinics by match score with optional pinned clinic
 * This is the main entry point for matching operations
 *
 * IMPORTANT: Clinics with NOT_MATCHABLE status (< 3 matching tags) are
 * excluded BEFORE reason generation to prevent validation failures
 *
 * Now implements two-pass system to differentiate primary reasons:
 * 1) First pass: generate reasons normally
 * 2) If all clinics have TREATMENT_MATCH as primary, re-run with deprioritized treatment
 */
export function rankClinics(
  profile: LeadAnswer,
  clinics: ClinicProfile[],
  options: RankingOptions = {},
): RankedClinic[] {
  const { topN = 10, pinnedClinicId, includeUnverified = false } = options

  // Separate clinics into categories:
  // 1. Verified + Matchable (primary results with full scoring)
  // 2. Unverified + Matchable (scored but shown after verified)
  // 3. Non-matchable (directory listings at the end)
  const verifiedMatchable: ClinicProfile[] = []
  const unverifiedMatchable: ClinicProfile[] = []
  const nonMatchableClinics: ClinicProfile[] = []
  
  for (const clinic of clinics) {
    const matchable = checkClinicMatchable(clinic)
    if (!matchable) {
      console.log(
        `[rankClinics] Clinic NOT_MATCHABLE (will appear in directory): ${clinic.name} (${getClinicMatchingTagCount(clinic)} tags, need ${MIN_MATCHING_TAGS})`,
      )
      nonMatchableClinics.push(clinic)
    } else if (clinic.verified === true) {
      verifiedMatchable.push(clinic)
    } else {
      unverifiedMatchable.push(clinic)
    }
  }
  
  // Primary clinics are always verified ones
  // When includeUnverified is true, we also score unverified ones (but sort them after verified)
  const primaryClinics = verifiedMatchable

  // First pass: score all primary (matchable) clinics with normal priority
  let scoredClinics: RankedClinic[] = primaryClinics.map((clinic, index) => {
    const { score, reasons, explanationVersion, reasonsDebug } = computeClinicScore(profile, clinic, false, index)
    const tier = getTier(score.percent)
    const debug = buildDebugInfo(score, profile, clinic, reasonsDebug)

    return {
      clinic,
      score,
      reasons,
      tier,
      isPinned: clinic.id === pinnedClinicId,
      explanationVersion,
      debug,
    }
  })

  const primaryReasons = scoredClinics.map((c) => c.reasons[0]?.tagKey).filter(Boolean)
  const uniquePrimary = new Set(primaryReasons)
  const allTreatmentMatch = uniquePrimary.size === 1 && primaryReasons[0] === "TREATMENT_MATCH"

  // Second pass: if all have TREATMENT_MATCH, re-run with deprioritized treatment
  if (allTreatmentMatch && scoredClinics.length > 1) {
    console.log("[rankClinics] All clinics have TREATMENT_MATCH primary reason, re-running with differentiation")
    scoredClinics = primaryClinics.map((clinic, index) => {
      // Deprioritize treatment, use index as fallback offset for differentiation
      const { score, reasons, explanationVersion, reasonsDebug } = computeClinicScore(profile, clinic, true, index)
      const tier = getTier(score.percent)
      const debug = buildDebugInfo(score, profile, clinic, reasonsDebug)

      return {
        clinic,
        score,
        reasons,
        tier,
        isPinned: clinic.id === pinnedClinicId,
        explanationVersion,
        debug,
      }
    })
  }

  // Sort verified clinics by score (highest first), with tie-breakers
  scoredClinics.sort((a, b) => {
    // Pinned clinic always comes first if it exists
    if (a.isPinned) return -1
    if (b.isPinned) return 1

    // Primary: match percentage (quality of match relative to what was scored)
    if (b.score.percent !== a.score.percent) {
      return b.score.percent - a.score.percent
    }

    // Tie-breaker 1: distance (closer is better)
    const distA = a.score.distanceMiles ?? 999
    const distB = b.score.distanceMiles ?? 999
    if (distA !== distB) return distA - distB

    // Tie-breaker 2: review count
    if (b.clinic.reviewCount !== a.clinic.reviewCount) {
      return b.clinic.reviewCount - a.clinic.reviewCount
    }

    // Tie-breaker 3: rating
    const ratingA = a.clinic.rating ?? 0
    const ratingB = b.clinic.rating ?? 0
    if (ratingB !== ratingA) return ratingB - ratingA

    // Tie-breaker 4: name (alphabetical)
    return a.clinic.name.localeCompare(b.clinic.name)
  })

  // Score and sort unverified clinics (if includeUnverified is true)
  let scoredUnverified: RankedClinic[] = []
  if (includeUnverified && unverifiedMatchable.length > 0) {
    scoredUnverified = unverifiedMatchable.map((clinic, index) => {
      // Score unverified clinics but mark them appropriately
      const { score, reasons, explanationVersion, reasonsDebug } = computeClinicScore(profile, clinic, false, index)
      const tier = getTier(score.percent)
      const debug = buildDebugInfo(score, profile, clinic, reasonsDebug)
      debug.isDirectoryListing = false // They're scored, not directory listings

      return {
        clinic,
        score,
        reasons,
        tier,
        isPinned: clinic.id === pinnedClinicId,
        explanationVersion,
        debug,
      }
    })
    
    // Sort unverified by score (percentage first)
    scoredUnverified.sort((a, b) => {
      if (b.score.percent !== a.score.percent) {
        return b.score.percent - a.score.percent
      }
      const distA = a.score.distanceMiles ?? 999
      const distB = b.score.distanceMiles ?? 999
      if (distA !== distB) return distA - distB
      return a.clinic.name.localeCompare(b.clinic.name)
    })
    
    console.log(`[rankClinics] Scored ${scoredUnverified.length} unverified clinics (will appear after verified)`)
  }

  // Combine: verified first, then unverified
  const allScoredClinics = [...scoredClinics, ...scoredUnverified]
  
  // Get top N scored clinics
  const topClinics = allScoredClinics.slice(0, topN)
  
  // If includeUnverified is true, also add non-matchable clinics as "directory" tier
  // These appear at the end and don't have match scores/reasons
  if (includeUnverified && nonMatchableClinics.length > 0) {
    const remainingSlots = topN - topClinics.length
    if (remainingSlots > 0) {
      const directoryListings: RankedClinic[] = nonMatchableClinics.slice(0, remainingSlots).map((clinic) => ({
        clinic,
        score: {
          totalScore: 0,
          maxPossible: 100,
          percent: 0,
          categories: [],
        },
        reasons: [],
        tier: "possible" as const,
        isPinned: false,
        explanationVersion: EXPLANATION_SCHEMA_VERSION,
        debug: {
          distanceMiles: undefined,
          treatmentMatch: false,
          priorityTagsMatched: [],
          anxietyMatched: false,
          budgetMatched: false,
          rawScore: 0,
          percent: 0,
          categories: [],
          isDirectoryListing: true, // Flag to indicate this is just a directory listing
        },
      }))
      console.log(`[rankClinics] Adding ${directoryListings.length} non-matchable clinics as directory listings`)
      return [...topClinics, ...directoryListings]
    }
  }
  
  return topClinics
}

/**
 * Run the full matching pipeline
 * Used by both production and test-match
 */
export async function runMatchingPipeline(
  profile: LeadAnswer,
  clinics: ClinicProfile[],
  options: RankingOptions = {},
): Promise<MatchingResult> {
  const rankedClinics = rankClinics(profile, clinics, options)

  return {
    rankedClinics,
    totalClinicsEvaluated: clinics.length,
    contractVersion: EXPLANATION_SCHEMA_VERSION, // Use locked version from contract
    timestamp: new Date().toISOString(),
  }
}

/**
 * Run matching engine for a lead by ID
 * Fetches lead and clinics from database, then runs the full pipeline
 * Returns simplified result format for API consumption
 */
export async function runMatchingEngine(leadId: string): Promise<{
  clinics: Array<{
    clinicId: string
    clinicName: string
    score: number
    tier: string
    reasons: Array<{ key: string; text: string; tagKey: string }>
  }>
  radiusExpanded?: boolean
  finalRadiusMiles?: number
}> {
  const supabase = await createClient()

  // Fetch the lead
  const { data: leadRow, error: leadError } = await supabase.from("leads").select("*").eq("id", leadId).single()

  if (leadError || !leadRow) {
    console.error("[runMatchingEngine] Failed to fetch lead:", leadError)
    return { clinics: [] }
  }

  const liveFilter = getLiveClinicFilter()
  const { data: clinicRows, error: clinicsError } = await supabase
    .from("clinics")
    .select("*")
    .eq(liveFilter.field, liveFilter.value)

  if (clinicsError) {
    console.error("[runMatchingEngine] Failed to fetch clinics:", clinicsError)
    return { clinics: [] }
  }

  const finalClinicRows = clinicRows || []

  // Fetch all filter selections
  const { data: filterSelections } = await supabase.from("clinic_filter_selections").select("clinic_id, filter_key")

  // Build filter map
  const filterMap = new Map<string, string[]>()
  for (const selection of filterSelections || []) {
    const existing = filterMap.get(selection.clinic_id) || []
    existing.push(selection.filter_key)
    filterMap.set(selection.clinic_id, existing)
  }

  // Normalize lead and clinics
  const profile = buildLeadProfileFromDB(leadRow)
  const allClinics = finalClinicRows.map((row) => buildClinicProfile(row, filterMap.get(row.id) || []))

  // Radius expansion fallback
  const RADIUS_STEPS = [5, 10, 15, 20, 999] // 999 = nationwide
  let radiusExpanded = false
  let finalRadiusMiles = RADIUS_STEPS[0]
  let rankedClinics: RankedClinic[] = []

  for (const radiusMiles of RADIUS_STEPS) {
    // Filter clinics by distance
    const clinicsInRadius = allClinics.filter((clinic) => {
      if (radiusMiles === 999) return true // Nationwide
      if (!profile.latitude || !profile.longitude || !clinic.latitude || !clinic.longitude) return true

      const distMiles = haversineDistance(profile.latitude, profile.longitude, clinic.latitude, clinic.longitude)
      return distMiles <= radiusMiles
    })

    if (clinicsInRadius.length === 0) continue

    // Run matching pipeline
    const result = await runMatchingPipeline(profile, clinicsInRadius, { topN: 10 })
    rankedClinics = result.rankedClinics

    // If we have >= 2 clinics, we're done
    if (rankedClinics.length >= 2) {
      finalRadiusMiles = radiusMiles
      radiusExpanded = radiusMiles > RADIUS_STEPS[0]
      break
    }

    radiusExpanded = true
  }

  // If still no results, run against all clinics
  if (rankedClinics.length === 0) {
    const result = await runMatchingPipeline(profile, allClinics, { topN: 10 })
    rankedClinics = result.rankedClinics
    finalRadiusMiles = 999
    radiusExpanded = true
  }

  // Transform to simplified format
  return {
    clinics: rankedClinics.map((rc) => ({
      clinicId: rc.clinic.id,
      clinicName: rc.clinic.name,
      score: rc.score.percent,
      tier: rc.tier,
      reasons: rc.reasons.map((r) => ({
        key: r.key,
        text: r.text,
        tagKey: r.tagKey || "UNKNOWN",
      })),
    })),
    radiusExpanded,
    finalRadiusMiles,
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Re-export types for convenience
export type { LeadAnswer, ClinicProfile, MatchScoreBreakdown, MatchReason, ClinicMatch }
