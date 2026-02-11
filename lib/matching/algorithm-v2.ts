// Bulletproof Matching Algorithm v2
// Deterministic scoring with robust fallback reason generation

import { createClient } from "@/lib/supabase/client"
import { generateReasonsWithAI, type ReasonCode, type ReasonFacts } from "./reason-generator"

const ALGORITHM_VERSION = "v2"
const PROMPT_VERSION = "v1"

interface Lead {
  id: string
  treatment: string
  budget: string
  priorities: string[]
  urgency: string
  contact_method: string
  latitude?: number
  longitude?: number
  city?: string
}

interface Clinic {
  id: string
  name: string
  latitude: number
  longitude: number
  price_range: string
  finance_available: boolean
  verified: boolean
  rating?: number
  reviews_count?: number
  tags: string[]
}

interface ScoreBreakdown {
  treatment_fit: number
  priorities_match: number
  distance_bonus: number
  budget_match: number
  logistics: number
  total: number
}

interface MatchResult {
  clinic_id: string
  rank: number
  score_total: number
  score_breakdown: ScoreBreakdown
  reason_codes: ReasonCode[]
  reason_facts: ReasonFacts
  reason_title: string
  reason_bullets: string[]
  reason_footer: string
  reason_source: "ai" | "fallback"
  ai_model?: string
  ai_error_code?: string
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculate deterministic match score
 */
function calculateScore(lead: Lead, clinic: Clinic): ScoreBreakdown {
  let treatmentFit = 0
  let prioritiesMatch = 0
  let distanceBonus = 0
  let budgetMatch = 0
  let logistics = 0

  // Treatment fit (0-30 points)
  const treatmentTag = clinic.tags.find((tag) => tag.toLowerCase().includes(lead.treatment.toLowerCase()))
  if (treatmentTag) {
    treatmentFit = 30
  } else {
    treatmentFit = 10 // Base points for any clinic
  }

  // Priorities match (0-25 points)
  const priorityMatches = lead.priorities.filter((priority) =>
    clinic.tags.some((tag) => tag.toLowerCase().includes(priority.toLowerCase())),
  )
  prioritiesMatch = Math.min(25, priorityMatches.length * 8)

  // Distance bonus (0-20 points)
  if (lead.latitude && lead.longitude) {
    const distance = calculateDistance(lead.latitude, lead.longitude, clinic.latitude, clinic.longitude)
    if (distance <= 2) {
      distanceBonus = 20
    } else if (distance <= 5) {
      distanceBonus = 12
    } else if (distance <= 10) {
      distanceBonus = 6
    }
  }

  // Budget match (0-15 points)
  const budgetMap: Record<string, string[]> = {
    low: ["low", "budget"],
    medium: ["medium", "mid"],
    high: ["high", "premium"],
  }
  const leadBudgetKeys = budgetMap[lead.budget.toLowerCase()] || []
  if (leadBudgetKeys.some((key) => clinic.price_range.toLowerCase().includes(key))) {
    budgetMatch = 15
  } else {
    budgetMatch = 5
  }

  // Logistics (0-10 points)
  if (clinic.verified) logistics += 3
  if (clinic.finance_available) logistics += 3
  if (clinic.rating && clinic.rating >= 4.5) logistics += 2
  if (clinic.reviews_count && clinic.reviews_count >= 50) logistics += 2

  const total = treatmentFit + prioritiesMatch + distanceBonus + budgetMatch + logistics

  return {
    treatment_fit: treatmentFit,
    priorities_match: prioritiesMatch,
    distance_bonus: distanceBonus,
    budget_match: budgetMatch,
    logistics,
    total: Math.min(100, total),
  }
}

/**
 * Generate reason codes based on score breakdown
 */
function generateReasonCodes(lead: Lead, clinic: Clinic, breakdown: ScoreBreakdown): ReasonCode[] {
  const codes: ReasonCode[] = []

  // Treatment/Finance category
  if (breakdown.treatment_fit >= 25) codes.push("TREATMENT_MATCH")
  if (breakdown.budget_match >= 10) codes.push("BUDGET_MATCH")
  if (clinic.finance_available) codes.push("FINANCE_AVAILABLE")

  // Priorities category
  if (lead.priorities.includes("Anxious patients")) codes.push("PRIORITY_ANXIOUS")
  if (lead.priorities.includes("Quality care")) codes.push("PRIORITY_QUALITY")
  if (lead.priorities.includes("Convenient location")) codes.push("PRIORITY_CONVENIENCE")
  if (lead.priorities.includes("Quick appointments")) codes.push("PRIORITY_SPEED")

  // Logistics category
  if (breakdown.distance_bonus >= 12) codes.push("DISTANCE_CLOSE")
  if (lead.urgency === "urgent") codes.push("AVAILABLE_SOON")
  if (clinic.rating && clinic.rating >= 4.5) codes.push("HIGHLY_RATED")
  if (clinic.verified) codes.push("VERIFIED_CLINIC")

  return codes
}

/**
 * Generate reason facts for template interpolation
 */
function generateReasonFacts(lead: Lead, clinic: Clinic): ReasonFacts {
  let distance: number | undefined
  if (lead.latitude && lead.longitude) {
    distance = calculateDistance(lead.latitude, lead.longitude, clinic.latitude, clinic.longitude)
  }

  return {
    clinic_name: clinic.name,
    distance_miles: distance,
    matched_treatment: lead.treatment,
    matched_priorities: lead.priorities,
    price_range: clinic.price_range,
    finance_available: clinic.finance_available,
    reviews_count: clinic.reviews_count,
    rating: clinic.rating,
    verified: clinic.verified,
    availability: lead.urgency === "urgent" ? "this week" : "soon",
  }
}

/**
 * Main matching function - bulletproof v2
 */
export async function runMatchingV2(lead: Lead, clinics: Clinic[]): Promise<MatchResult[]> {
  console.log(`[v0] Running bulletproof matching v2 for lead ${lead.id}`)
  console.log(`[v0] Matching against ${clinics.length} clinics`)

  const results: MatchResult[] = []

  // Calculate scores for all clinics
  for (const clinic of clinics) {
    const breakdown = calculateScore(lead, clinic)
    const codes = generateReasonCodes(lead, clinic, breakdown)
    const facts = generateReasonFacts(lead, clinic)

    // Generate reasons with AI or fallback
    const reasonOutput = await generateReasonsWithAI(codes, facts, lead.id, clinic.id, PROMPT_VERSION)

    results.push({
      clinic_id: clinic.id,
      rank: 0, // Will be set after sorting
      score_total: breakdown.total,
      score_breakdown: breakdown,
      reason_codes: codes,
      reason_facts: facts,
      reason_title: reasonOutput.title,
      reason_bullets: reasonOutput.bullets,
      reason_footer: reasonOutput.footer,
      reason_source: reasonOutput.source,
      ai_model: reasonOutput.ai_model,
      ai_error_code: reasonOutput.ai_error_code,
    })
  }

  // Sort by score and assign ranks
  results.sort((a, b) => b.score_total - a.score_total)
  results.forEach((result, index) => {
    result.rank = index + 1
  })

  console.log(`[v0] Matching complete. Top score: ${results[0]?.score_total || 0}`)

  return results
}

/**
 * Save matching results to database
 */
export async function saveMatchResults(leadId: string, results: MatchResult[]): Promise<string> {
  const supabase = createClient()

  // Create match_run record
  const { data: matchRun, error: runError } = await supabase
    .from("match_runs")
    .insert({
      lead_id: leadId,
      algorithm_version: ALGORITHM_VERSION,
      prompt_version: PROMPT_VERSION,
    })
    .select("id")
    .single()

  if (runError || !matchRun) {
    console.error("[v0] Error creating match_run:", runError)
    throw new Error("Failed to create match run")
  }

  console.log(`[v0] Created match_run ${matchRun.id}`)

  // Save all match results
  const matchResultsData = results.map((result) => ({
    lead_id: leadId,
    clinic_id: result.clinic_id,
    match_run_id: matchRun.id,
    rank: result.rank,
    score_total: result.score_total,
    score_breakdown: result.score_breakdown,
    reason_codes: result.reason_codes,
    reason_facts: result.reason_facts,
    reason_title: result.reason_title,
    reason_bullets: result.reason_bullets,
    reason_footer: result.reason_footer,
    reason_source: result.reason_source,
    ai_model: result.ai_model,
    ai_error_code: result.ai_error_code,
  }))

  const { error: resultsError } = await supabase.from("match_results").insert(matchResultsData)

  if (resultsError) {
    console.error("[v0] Error saving match results:", resultsError)
    throw new Error("Failed to save match results")
  }

  console.log(`[v0] Saved ${results.length} match results`)

  return matchRun.id
}
