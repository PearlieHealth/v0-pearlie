import { createAdminClient } from "@/lib/supabase/admin"

interface LeadData {
  id: string
  treatment_interest: string
  postcode: string
  latitude?: number
  longitude?: number
  decision_values: string[]
  conversion_blocker?: string
  outcome_priority?: string
  outcome_priority_key?: string
  preferred_timing?: string
}

interface MatchResult {
  clinic_id: string
  clinic_name: string
  reasons: string[]
  score: number
  clinicTags: string[]
  matchedTags: string[] // Tags that actually matched patient priorities
  ai_reasons_source: "ai" | "fallback_template"
  ai_headline?: string
  ai_proof?: string
}

const FILTER_KEY_TO_LABEL: Record<string, string> = {
  clear_explanations_honest_advice: "Clear explanations and honest advice",
  no_pressure_no_upselling: "No pressure or upselling",
  experienced_with_selected_treatment: "Experienced with your treatment",
  calm_reassuring_approach: "Calm, reassuring approach",
  transparent_pricing_before_treatment: "Transparent pricing before treatment",
  flexible_scheduling_options: "Flexible scheduling options",
  suitable_for_time_conscious_patients: "Efficient visits",
  strong_treatment_planning_before_consult: "Strong treatment planning",
  clear_aftercare_and_maintenance_guidance: "Clear aftercare guidance",
  accepts_staged_or_phased_treatment_plans: "Staged treatment plans available",
  experienced_with_complex_or_multistep_cases: "Experienced with complex cases",
  finance_options_available: "Finance options available",
  conservative_treatment_philosophy: "Conservative treatment approach",
  good_long_term_outcomes_and_follow_up: "Good long-term outcomes",
  clear_expectation_setting_before_starting: "Clear expectations upfront",
}

const PRIORITY_KEY_TO_LABEL: Record<string, string> = {
  price_transparency: "Price transparency",
  clear_communication: "Clear communication",
  no_pressure: "No pressure approach",
  flexible_timing: "Flexible timing",
  payment_plans: "Payment plans",
  experienced_dentist: "Experienced dentist",
}

const BLOCKER_KEY_TO_LABEL: Record<string, string> = {
  cost_concerns: "Cost concerns",
  anxiety: "Dental anxiety",
  time_constraints: "Time constraints",
  trust_issues: "Trust concerns",
}

const TIMING_KEY_TO_LABEL: Record<string, string> = {
  ready_now: "Ready to start now",
  within_1_week: "Within a week",
  within_1_month: "Within a month",
  exploring_options: "Just exploring options",
}

const NEARBY_RADIUS_MILES = 5
const DISTANCE_SCORE_NEARBY = 15 // 0-2 miles
const DISTANCE_SCORE_CLOSE = 10 // 2-5 miles
const DISTANCE_SCORE_FAR = 2 // >5 miles

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function getDistanceScore(distanceMiles: number): number {
  if (distanceMiles <= 2) return DISTANCE_SCORE_NEARBY
  if (distanceMiles <= 5) return DISTANCE_SCORE_CLOSE
  return DISTANCE_SCORE_FAR
}

async function callGroqAPI(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 400,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Groq API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ""
}

async function generateAIExplanations(
  leadData: LeadData,
  clinicId: string,
  clinicName: string,
  clinicTags: string[],
  matchedTags: string[],
): Promise<{ headline: string; reasons: string[]; proof: string; source: "ai" | "fallback_template" }> {
  // Generate variation seed from lead_id + clinic_id for controlled micro-variation
  const seedString = `${leadData.id}-${clinicId}`
  const variationSeed = seedString.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100

  const systemPrompt = `You write patient-facing match reasons for dental clinic recommendations.
CRITICAL RULES:
- NEVER say "you said", "you chose", "you selected", "based on your answers", "you mentioned"
- NEVER quote patient inputs directly
- NEVER reference sensitive feelings explicitly (don't say "you're anxious")
- Make it sound like a calm concierge explaining fit
- Focus on CLINIC strengths and services, not what patient filled out
- Output ONLY valid JSON with keys: headline, reasons, proof
- headline: Max 60 characters, clinic-focused (e.g. "Clear plans for confident decisions")
- reasons: Exactly 3 unique bullets, each 6-14 words
- proof: One credibility line, max 90 characters
- Each bullet must be grounded in clinic tags provided
- Variation seed ${variationSeed}: Use to vary phrasing while keeping meaning stable
  0-33: Empathy tone ("Helps patients feel...")
  34-66: Clinic strength tone ("Known for...")  
  67-99: Outcome focus tone ("For clearer...")

IMPORTANT: Only use verifiable clinic tags. Do not invent services.`

  // Internal context (not shown to patient)
  const internalContext = {
    treatment: leadData.treatment_interest,
    timeline: leadData.preferred_timing,
    priorities: leadData.decision_values,
    concern: leadData.conversion_blocker,
    outcome_code: leadData.outcome_priority_key,
  }

  const userPrompt = `Generate clinic-focused match reasons.

CLINIC:
- Name: ${clinicName}
- Available tags/services: ${JSON.stringify(clinicTags)}
- Tags matching patient needs: ${JSON.stringify(matchedTags)}

INTERNAL CONTEXT (do NOT quote directly in output):
${JSON.stringify(internalContext, null, 2)}

Return ONLY valid JSON:
{
  "headline": "max 60 chars, clinic-focused",
  "reasons": ["bullet 1 (6-14 words)", "bullet 2", "bullet 3"],
  "proof": "credibility line, max 90 chars"
}

Example good bullets (adapt to THIS clinic):
- "Clear treatment planning with realistic timelines"
- "Transparent costs explained before starting"
- "Supportive approach for patients needing more time"

Example BAD bullets (NEVER use):
- "You said you want clear pricing" (quotes patient)
- "Based on your anxiety concerns" (too direct)
- "Matches your form answers" (references form)`

  try {
    const text = await callGroqAPI(systemPrompt, userPrompt)

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("[v0] AI response not valid JSON")
      return { headline: "", reasons: [], proof: "", source: "fallback_template" }
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate structure
    if (!parsed.reasons || !Array.isArray(parsed.reasons) || parsed.reasons.length !== 3) {
      console.error("[v0] AI response missing 3 reasons, got:", parsed.reasons?.length || 0)
      return { headline: "", reasons: [], proof: "", source: "fallback_template" }
    }

    // Quality guardrails: reject if contains patient-reference language
    const badPhrases = ["you said", "you chose", "you selected", "based on your", "you mentioned", "you want"]
    const hasBadPhrase = parsed.reasons.some((r: string) =>
      badPhrases.some((phrase) => r.toLowerCase().includes(phrase)),
    )
    if (hasBadPhrase) {
      console.error("[v0] AI output contains forbidden patient-reference language, using fallback")
      return { headline: "", reasons: [], proof: "", source: "fallback_template" }
    }

    // Dedupe check - ensure all 3 are unique
    const uniqueReasons = deduplicateReasons(parsed.reasons)
    if (uniqueReasons.length !== 3) {
      console.error("[v0] AI returned duplicate reasons after dedup")
      return { headline: "", reasons: [], proof: "", source: "fallback_template" }
    }

    console.log("[v0] AI explanations generated for", clinicName, "with variation seed:", variationSeed)
    return {
      headline: parsed.headline || "",
      reasons: uniqueReasons,
      proof: parsed.proof || "",
      source: "ai",
    }
  } catch (error) {
    console.error("[v0] AI explanation generation failed:", error)
    return { headline: "", reasons: [], proof: "", source: "fallback_template" }
  }
}

function deduplicateReasons(reasons: string[]): string[] {
  const seen = new Set<string>()
  const seenPrefixes = new Set<string>()
  const result: string[] = []

  for (const reason of reasons) {
    const normalized = reason.toLowerCase().trim()
    const prefix = normalized.split(" ").slice(0, 3).join(" ")

    // Skip exact duplicates or near-duplicates (same first 3 words)
    if (seen.has(normalized) || seenPrefixes.has(prefix)) {
      continue
    }

    seen.add(normalized)
    seenPrefixes.add(prefix)
    result.push(reason)
  }

  return result
}

function buildFallbackReasons(
  leadData: LeadData,
  clinicId: string,
  clinicName: string,
  clinicTags: string[],
  matchedTags: string[],
): { headline: string; reasons: string[]; proof: string } {
  // Generate variation seed from lead_id + clinic_id
  const seedString = `${leadData.id}-${clinicId}`
  const variationSeed = seedString.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100

  const reasons: string[] = []

  // VARIATION 1: Treatment experience (always different phrasing per clinic)
  const treatmentOptions = [
    `Experienced with ${leadData.treatment_interest} treatment`,
    `${leadData.treatment_interest} expertise and proven results`,
    `Skilled in delivering ${leadData.treatment_interest} outcomes`,
  ]
  const treatmentIndex = variationSeed % treatmentOptions.length
  reasons.push(treatmentOptions[treatmentIndex])

  // VARIATION 2: Based on matched tags OR decision values
  if (matchedTags.length > 0) {
    const tag = matchedTags[0]
    const label = FILTER_KEY_TO_LABEL[tag] || tag.replace(/_/g, " ")
    reasons.push(label)
  } else if (leadData.decision_values.length > 0) {
    // Use first decision value as a priority indicator
    const priorityIndex = Math.floor(variationSeed / 33) % leadData.decision_values.length
    reasons.push(leadData.decision_values[priorityIndex])
  }

  // VARIATION 3: Logistics or availability (vary by seed)
  const logisticsOptions = [
    "Convenient location and accessible facilities",
    "Flexible scheduling to fit your timetable",
    "Well-located practice with easy access",
  ]
  const logisticsIndex = Math.floor(variationSeed / 50) % logisticsOptions.length
  reasons.push(logisticsOptions[logisticsIndex])

  // Ensure exactly 3 unique reasons
  const uniqueReasons = Array.from(new Set(reasons)).slice(0, 3)

  // Pad if needed with generic but varied options
  while (uniqueReasons.length < 3) {
    const fillerOptions = ["Comprehensive care approach", "Patient-focused service", "Professional and welcoming team"]
    const fillerIndex = (uniqueReasons.length + variationSeed) % fillerOptions.length
    const filler = fillerOptions[fillerIndex]
    if (!uniqueReasons.includes(filler)) {
      uniqueReasons.push(filler)
    }
  }

  // Generate varied headlines
  const headlineOptions = [
    "Professional care for your treatment",
    "Experienced team ready to help",
    "Quality treatment you can trust",
  ]
  const headlineIndex = Math.floor(variationSeed / 25) % headlineOptions.length
  const headline = headlineOptions[headlineIndex]

  return {
    headline,
    reasons: uniqueReasons,
    proof: "Serving patients in your area",
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, delayMs = 500): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      const isNetworkError =
        error instanceof TypeError && (error.message.includes("Failed to fetch") || error.message.includes("network"))

      if (!isNetworkError || attempt === maxRetries) {
        throw error
      }

      console.log(`[v0] Retry attempt ${attempt + 1}/${maxRetries} after network error`)
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)))
    }
  }
  throw lastError
}

export async function generateMatchesWithReasons(leadData: LeadData): Promise<MatchResult[]> {
  const supabase = createAdminClient()

  console.log("[v0] Starting comprehensive matching algorithm for lead:", leadData.id)

  try {
    const { data: eligibleClinics, error: clinicsError } = await withRetry(async () => {
      return supabase
        .from("clinics")
        .select("*")
        .contains("treatments", [leadData.treatment_interest])
        .eq("is_archived", false)
    })

    if (clinicsError) {
      console.error("[v0] Error fetching eligible clinics:", clinicsError)
      throw new Error(`Failed to fetch clinics: ${clinicsError.message}`)
    }

    if (!eligibleClinics || eligibleClinics.length === 0) {
      console.log("[v0] No eligible clinics found for treatment:", leadData.treatment_interest)
      return []
    }

    console.log("[v0] Found", eligibleClinics.length, "eligible clinics")

    const results: MatchResult[] = []

    for (const clinic of eligibleClinics) {
      try {
        // Get clinic's selected filters
        const { data: clinicFilters, error: filtersError } = await supabase
          .from("clinic_filter_selections")
          .select("filter_key")
          .eq("clinic_id", clinic.id)

        if (filtersError) {
          console.error("[v0] Error fetching filters for clinic", clinic.id, ":", filtersError)
          continue
        }

        const clinicFilterKeys = new Set((clinicFilters || []).map((f) => f.filter_key))
        const clinicTags = Array.from(clinicFilterKeys).map((key) => FILTER_KEY_TO_LABEL[key] || key.replace(/_/g, " "))

        console.log("[v0] Clinic", clinic.name, "has", clinicFilterKeys.size, "filters:", Array.from(clinicFilterKeys))
        console.log("[v0] Clinic", clinic.name, "tags:", clinicTags)

        console.log("[v0] Clinic", clinic.name, "has", clinicFilterKeys.size, "filters")

        // Initialize scoring components
        let treatmentFitScore = 0
        let patientPrioritiesScore = 0
        let logisticsScore = 0
        let confidenceScore = 0

        const matchReasons: Array<{ filterKey: string; weight: number; reason: string }> = []
        const matchedTags: string[] = []

        // ==========================================
        // COMPONENT A: TreatmentFit (0-30 points)
        // ==========================================
        const treatmentKeys = Object.keys(FILTER_KEY_TO_LABEL).filter((key) =>
          key.includes("experienced_with_selected_treatment"),
        )

        if (treatmentKeys.length > 0) {
          const matchedTreatments = treatmentKeys.filter((t) => clinicFilterKeys.has(t))
          if (matchedTreatments.length > 0) {
            treatmentFitScore = 30
            matchReasons.push({
              filterKey: matchedTreatments[0],
              weight: 30,
              reason: `Offers ${leadData.treatment_interest || "your treatment"}`,
            })
            matchedTags.push(FILTER_KEY_TO_LABEL[matchedTreatments[0]] || matchedTreatments[0])
          }
        }

        // ==========================================
        // COMPONENT B+C: PatientPriorities (0-32.5 points)
        // ==========================================
        const priorityCount = (leadData.decision_values || []).length
        const pointsPerPriority = priorityCount > 0 ? 32.5 / Math.min(priorityCount, 3) : 0

        const priorityFilterMap: Record<string, string> = {
          price_transparency: "transparent_pricing_before_treatment",
          clear_communication: "clear_explanations_honest_advice",
          no_pressure: "no_pressure_no_upselling",
          flexible_timing: "suitable_for_time_conscious_patients",
          payment_plans: "finance_options_available",
          experienced_dentist: "experienced_with_selected_treatment",
        }

        for (const priority of (leadData.decision_values || []).slice(0, 3)) {
          const targetFilter = priorityFilterMap[priority]
          if (targetFilter && clinicFilterKeys.has(targetFilter)) {
            patientPrioritiesScore += pointsPerPriority
            matchReasons.push({
              filterKey: targetFilter,
              weight: pointsPerPriority,
              reason: `Matches your ${priority.replace(/_/g, " ")} priority`,
            })
            matchedTags.push(FILTER_KEY_TO_LABEL[targetFilter] || targetFilter)
          }
        }

        // Handle conversion_blocker as implied priority
        const blockerFilterMap: Record<string, string> = {
          cost_concerns: "finance_options_available",
          anxiety: "calm_reassuring_approach",
          time_constraints: "flexible_scheduling_options",
          trust_issues: "no_pressure_no_upselling",
        }

        if (leadData.conversion_blocker) {
          const targetFilter = blockerFilterMap[leadData.conversion_blocker]
          if (targetFilter && clinicFilterKeys.has(targetFilter)) {
            const blockerBonus = 5
            patientPrioritiesScore += blockerBonus
            matchReasons.push({
              filterKey: targetFilter,
              weight: blockerBonus,
              reason: `Addresses your ${leadData.conversion_blocker.replace(/_/g, " ")}`,
            })
            matchedTags.push(FILTER_KEY_TO_LABEL[targetFilter] || targetFilter)
          }
        }

        // ==========================================
        // COMPONENT D+E: Logistics (0-22.5 points)
        // ==========================================
        if (leadData.preferred_timing === "ready_now" || leadData.preferred_timing === "within_1_week") {
          if (
            clinicFilterKeys.has("suitable_for_time_conscious_patients") ||
            clinicFilterKeys.has("flexible_scheduling_options")
          ) {
            logisticsScore += 10
            matchReasons.push({
              filterKey: "flexible_scheduling_options",
              weight: 10,
              reason: "Offers fast appointment availability",
            })
            matchedTags.push("Flexible scheduling options")
          } else {
            logisticsScore += 5
          }
        } else if (leadData.preferred_timing === "within_1_month") {
          logisticsScore += 7
        } else if (leadData.preferred_timing === "exploring_options") {
          logisticsScore += 5
        }

        // E: Distance (0-12.5 points)
        if (leadData.latitude && leadData.longitude && clinic.latitude && clinic.longitude) {
          const distance = calculateDistance(
            leadData.latitude,
            leadData.longitude,
            Number(clinic.latitude),
            Number(clinic.longitude),
          )

          logisticsScore += getDistanceScore(distance)

          console.log("[v0] Distance to", clinic.name, ":", distance.toFixed(1), "miles")
        } else {
          logisticsScore += 6
        }

        // ==========================================
        // COMPONENT F: Confidence (0-15 points)
        // ==========================================
        const tagCount = clinicFilterKeys.size
        if (tagCount >= 10) {
          confidenceScore = 15
        } else if (tagCount >= 7) {
          confidenceScore = 12
        } else if (tagCount >= 5) {
          confidenceScore = 9
        } else if (tagCount >= 3) {
          confidenceScore = 6
        } else {
          confidenceScore = 3
        }

        // ==========================================
        // PENALTIES
        // ==========================================
        let penalties = 0
        for (const priority of leadData.decision_values || []) {
          const expectedFilter = priorityFilterMap[priority]
          if (expectedFilter && !clinicFilterKeys.has(expectedFilter)) {
            penalties += 5
          }
        }

        // ==========================================
        // FINAL SCORE CALCULATION
        // ==========================================
        const rawScore = treatmentFitScore + patientPrioritiesScore + logisticsScore + confidenceScore - penalties
        const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)))

        console.log("[v0] Scores for", clinic.name, ":", {
          treatmentFit: treatmentFitScore.toFixed(1),
          patientPriorities: patientPrioritiesScore.toFixed(1),
          logistics: logisticsScore.toFixed(1),
          confidence: confidenceScore.toFixed(1),
          penalties,
          final: finalScore,
        })

        const fallbackReasons = buildFallbackReasons(leadData, clinic.id, clinic.name, clinicTags, matchedTags)

        results.push({
          clinic_id: clinic.id,
          clinic_name: clinic.name,
          reasons: fallbackReasons.reasons,
          score: finalScore,
          clinicTags,
          matchedTags: [...new Set(matchedTags)], // Dedupe matched tags
          ai_reasons_source: fallbackReasons.reasons.length === 3 ? "ai" : "fallback_template",
          ai_headline: fallbackReasons.headline,
          ai_proof: fallbackReasons.proof,
        })
      } catch (clinicError) {
        console.error("[v0] Error processing clinic", clinic.id, ":", clinicError)
        continue
      }
    }

    if (results.length === 0 && eligibleClinics.length > 0) {
      console.log("[v0] No matches found, using fallback")
      const treatmentName = leadData.treatment_interest || "your treatment"
      for (const clinic of eligibleClinics.slice(0, 3)) {
        results.push({
          clinic_id: clinic.id,
          clinic_name: clinic.name,
          reasons: [
            `Experienced with ${treatmentName}`,
            "Accepting new patients in your area",
            "Patient-focused approach to care",
          ],
          score: 40,
          clinicTags: [],
          matchedTags: [],
          ai_reasons_source: "fallback_template",
        })
      }
    }

    // Sort results by score descending
    results.sort((a, b) => b.score - a.score)

    const topClinics = results.slice(0, 5)
    console.log("[v0] Generating AI explanations for top", topClinics.length, "clinics")

    for (const result of topClinics) {
      if (result.clinicTags.length > 0) {
        const aiResult = await generateAIExplanations(
          leadData,
          result.clinic_id,
          result.clinic_name,
          result.clinicTags,
          result.matchedTags.length > 0 ? result.matchedTags : result.clinicTags.slice(0, 5),
        )

        if (aiResult.reasons.length === 3) {
          result.reasons = aiResult.reasons
          result.ai_reasons_source = "ai"
          result.ai_headline = aiResult.headline
          result.ai_proof = aiResult.proof
          console.log("[v0] AI explanations used for", result.clinic_name, "headline:", aiResult.headline)
        } else {
          console.log("[v0] Fallback reasons used for", result.clinic_name)
        }
      }
    }

    const aiCount = results.filter((r) => r.ai_reasons_source === "ai").length
    const fallbackCount = results.filter((r) => r.ai_reasons_source === "fallback_template").length
    console.log("[v0] AI reasons stats - AI:", aiCount, "Fallback:", fallbackCount, "Total:", results.length)

    console.log("[v0] Generated", results.length, "match results")

    if (results.length > 0) {
      const insertData = results.map((r) => ({
        lead_id: leadData.id,
        clinic_id: r.clinic_id,
        reasons: r.reasons,
        score: r.score,
        ai_reasons_source: r.ai_reasons_source,
        ai_headline: r.ai_headline || null,
        ai_proof: r.ai_proof || null,
      }))

      const { error: upsertError } = await supabase.from("match_results").upsert(insertData, {
        onConflict: "lead_id,clinic_id",
      })

      if (upsertError) {
        console.error("[v0] Error saving match_results:", upsertError)
        throw new Error(`Failed to save match results: ${upsertError.message}`)
      }

      // Also save to new lead_matches table for tiered display
      const leadMatchesData = results.map((r) => ({
        lead_id: leadData.id,
        clinic_id: r.clinic_id,
        score: r.score,
        reasons: r.reasons,
      }))

      const { error: leadMatchesError } = await supabase.from("lead_matches").upsert(leadMatchesData, {
        onConflict: "lead_id,clinic_id",
      })

      if (leadMatchesError) {
        console.error("[v0] Error saving lead_matches:", leadMatchesError)
        // Don't throw - this is a new feature, keep backward compatibility
      } else {
        console.log("[v0] Successfully saved to lead_matches table")
      }

      console.log("[v0] Successfully saved match results")
    }

    return results
  } catch (error) {
    console.error("[v0] Fatal error in matching algorithm:", error)
    throw error
  }
}
