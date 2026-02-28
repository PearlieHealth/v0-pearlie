import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  buildLeadProfile,
  buildClinicProfile,
  runMatchingPipeline,
  type TestLeadInput,
  type RankingOptions,
} from "@/lib/matching/engine"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { buildMatchReasonsForMultipleClinics } from "@/lib/matching/reasons-engine"

export const runtime = "nodejs"

interface TestMatchRequest {
  testLead: TestLeadInput
  pinnedClinicId?: string
  limit?: number
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    // Parse request body
    const body: TestMatchRequest = await request.json()
    const { testLead, pinnedClinicId, limit = 10 } = body

    // Validate required fields - support both old (treatment) and new (treatments) formats
    if (!testLead) {
      return NextResponse.json({ error: "testLead is required" }, { status: 400 })
    }
    
    // Support both old single treatment and new treatments array format
    const treatments = testLead.treatments || (testLead.treatment ? [testLead.treatment] : [])
    if (treatments.length === 0) {
      return NextResponse.json({ error: "At least one treatment is required" }, { status: 400 })
    }
    
    // Normalize testLead to new format
    const normalizedTestLead = {
      ...testLead,
      treatments,
      treatment: treatments[0], // Keep for backward compatibility with engine
      decisionValues: testLead.decisionValues || testLead.priorities || [],
      conversionBlockerCodes: testLead.conversionBlockerCodes || (testLead.conversionBlocker ? [testLead.conversionBlocker] : []),
    }

    // Build normalized lead profile from test input
    const profile = buildLeadProfile(normalizedTestLead)

    // Fetch all non-archived clinics (same filter as live flow)
    const supabase = createAdminClient()
    const { data: clinicsData, error: clinicsError } = await supabase
      .from("clinics")
      .select("*")
      .eq("is_archived", false)

    if (clinicsError) {
      console.error("[test-match] Error fetching clinics:", clinicsError)
      return NextResponse.json({ error: "Failed to fetch clinics" }, { status: 500 })
    }

    // Fetch filter selections for all clinics
    const { data: filterSelections } = await supabase.from("clinic_filter_selections").select("clinic_id, filter_key")

    // Build clinic filter map
    const clinicFilterMap: Record<string, string[]> = {}
    for (const selection of filterSelections || []) {
      if (!clinicFilterMap[selection.clinic_id]) {
        clinicFilterMap[selection.clinic_id] = []
      }
      clinicFilterMap[selection.clinic_id].push(selection.filter_key)
    }

    // Normalize clinics with their filter keys
    const clinics = (clinicsData || []).map((c) => buildClinicProfile(c, clinicFilterMap[c.id] || []))

    // Run matching pipeline (NO database writes)
    // Use same options as live flow for consistency
    const options: RankingOptions = {
      topN: limit,
      pinnedClinicId,
      includeUnverified: true, // Match live flow behavior
    }

    const result = await runMatchingPipeline(profile, clinics, options)

    // Build reasons with cross-clinic dedup (same as live flow, uses matchFacts from engine)
    const reasonsMap = buildMatchReasonsForMultipleClinics(
      "test-lead",
      result.rankedClinics.map((rc, index) => ({
        clinicId: rc.clinic.id,
        matchFacts: rc.matchFacts,
        fallbackOffset: index,
      }))
    )

    // Return results with debug info
    return NextResponse.json({
      success: true,
      rankedClinics: result.rankedClinics.map((rc) => {
        const result2 = reasonsMap.get(rc.clinic.id)
        const composed = result2?.composed

        return {
          clinicId: rc.clinic.id,
          clinicName: rc.clinic.name,
          postcode: rc.clinic.postcode,
          verified: rc.clinic.verified,
          filterKeys: rc.clinic.filterKeys,
          score: rc.score.totalScore,
          percent: rc.score.percent,
          tier: rc.tier,
          isPinned: rc.isPinned,
          explanationVersion: rc.explanationVersion,
          isDirectoryListing: rc.isDirectoryListing,
          // Use composed reasons (same as live flow)
          reasons: rc.reasons.map((r, idx) => ({
            text: composed?.bullets[idx] || r.text,
            rawText: r.text, // Keep raw for debug
            category: r.category,
            tagKey: r.tagKey,
          })),
          // Primary composed reasons (as displayed to patients)
          composedReasons: composed?.bullets || rc.reasons.map(r => r.text),
          debug: {
            ...rc.debug,
            categories: rc.score.categories.map((c) => ({
              category: c.category,
              points: c.points,
              maxPoints: c.maxPoints,
              weight: c.weight,
              facts: c.facts,
            })),
            reasonsComposer: {
              tagsUsed: composed?.tagsUsed || [],
              templatesUsed: composed?.templatesUsed || [],
              confidence: composed?.confidence || 0.8,
            },
          },
        }
      }),
      meta: {
        totalClinicsEvaluated: result.totalClinicsEvaluated,
        contractVersion: result.contractVersion,
        timestamp: result.timestamp,
        inputProfile: {
          treatments: treatments,
          treatment: profile.treatment,
          postcode: profile.postcode,
          locationPreference: profile.locationPreference,
          decisionValues: normalizedTestLead.decisionValues,
          priorities: profile.priorities,
          anxietyLevel: profile.anxietyLevel,
          costApproach: profile.costApproach,
          strictBudgetAmount: normalizedTestLead.strictBudgetAmount,
          timingPreference: profile.timingPreference,
          conversionBlockerCodes: normalizedTestLead.conversionBlockerCodes,
        },
      },
    })
  } catch (error) {
    console.error("[test-match] Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
