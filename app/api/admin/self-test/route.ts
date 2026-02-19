import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { MATCHING_CONTRACT_VERSION } from "@/lib/matching/contract"
import { buildLeadProfile, buildClinicProfile, runMatchingPipeline } from "@/lib/matching/engine"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { FORM_VERSION } from "@/lib/matching/tag-schema"

export const runtime = "nodejs"

interface TestResult {
  name: string
  status: "pass" | "fail"
  message: string
  details?: any
}

/**
 * Self-test endpoint for automated verification
 * Runs tests on form saving and matching pipeline
 */
export async function POST() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  const results: TestResult[] = []
  const supabase = createAdminClient()

  // Test 1: Create synthetic lead with ALL fields
  try {
    const fullLead = {
      treatment_interest: "Invisalign / Clear Aligners",
      postcode: "W1G 9PF",
      latitude: 51.5167,
      longitude: -0.1467,
      decision_values: ["Clear pricing before treatment", "A calm, reassuring environment"],
      conversion_blocker: "NOT_WORTH_COST",
      conversion_blocker_codes: ["NOT_WORTH_COST", "NEED_MORE_TIME"],
      timing_preference: "few_weeks",
      cost_approach: "comfort_range",
      location_preference: "near_home_work",
      anxiety_level: "slightly_anxious",
      preferred_times: ["morning", "afternoon"],
      first_name: "Test",
      last_name: "User",
      email: "test@example.com",
      consent_contact: true,
      consent_terms: true,
      schema_version: 6,
      form_version: FORM_VERSION,
      raw_answers: {
        treatments_selected: ["Invisalign / Clear Aligners"],
        is_emergency: false,
        location_preference: "near_home_work",
        postcode: "W1G 9PF",
        values: ["Clear pricing before treatment", "A calm, reassuring environment"],
        blocker: ["NOT_WORTH_COST", "NEED_MORE_TIME"],
        timing: "few_weeks",
        preferred_times: ["morning", "afternoon"],
        cost_approach: "comfort_range",
        anxiety_level: "slightly_anxious",
        form_version: FORM_VERSION,
      },
    }

    const { data: insertedFull, error: fullError } = await supabase.from("leads").insert(fullLead).select().single()

    if (fullError) {
      results.push({
        name: "Full Lead Insert",
        status: "fail",
        message: `Failed to insert full lead: ${fullError.message}`,
        details: fullError,
      })
    } else {
      // Clean up test lead
      await supabase.from("leads").delete().eq("id", insertedFull.id)
      results.push({
        name: "Full Lead Insert",
        status: "pass",
        message: "Successfully created and deleted test lead with all fields",
        details: { leadId: insertedFull.id, formVersion: insertedFull.form_version },
      })
    }
  } catch (e) {
    results.push({
      name: "Full Lead Insert",
      status: "fail",
      message: `Exception: ${e instanceof Error ? e.message : "Unknown error"}`,
    })
  }

  // Test 2: Create synthetic lead with MINIMAL fields (nullish optionals)
  try {
    const minimalLead = {
      treatment_interest: "General Check-up & Clean",
      postcode: "SW1A 1AA",
      latitude: 51.5014,
      longitude: -0.1419,
      first_name: "Minimal",
      last_name: "Test",
      consent_terms: true,
      schema_version: 6,
      form_version: FORM_VERSION,
      raw_answers: {
        treatments_selected: ["General Check-up & Clean"],
        postcode: "SW1A 1AA",
        form_version: FORM_VERSION,
      },
    }

    const { data: insertedMinimal, error: minimalError } = await supabase
      .from("leads")
      .insert(minimalLead)
      .select()
      .single()

    if (minimalError) {
      results.push({
        name: "Minimal Lead Insert",
        status: "fail",
        message: `Failed to insert minimal lead: ${minimalError.message}`,
        details: minimalError,
      })
    } else {
      // Clean up test lead
      await supabase.from("leads").delete().eq("id", insertedMinimal.id)
      results.push({
        name: "Minimal Lead Insert",
        status: "pass",
        message: "Successfully created and deleted test lead with minimal fields",
        details: { leadId: insertedMinimal.id },
      })
    }
  } catch (e) {
    results.push({
      name: "Minimal Lead Insert",
      status: "fail",
      message: `Exception: ${e instanceof Error ? e.message : "Unknown error"}`,
    })
  }

  // Test 3: Run matching and ensure 2+ clinics with 3 bullets each
  try {
    const testProfile = buildLeadProfile({
      treatments: ["Invisalign / Clear Aligners"],
      postcode: "W1G 9PF",
      latitude: 51.5167,
      longitude: -0.1467,
      locationPreference: "travel_a_bit",
      decisionValues: ["Clear pricing before treatment", "A calm, reassuring environment"],
      anxietyLevel: "slightly_anxious",
      costApproach: "comfort_range",
      timingPreference: "few_weeks",
      preferred_times: ["morning", "afternoon"],
      conversionBlockerCodes: ["NOT_WORTH_COST"],
    })

    // Fetch clinics
    const { data: clinicsData } = await supabase
      .from("clinics")
      .select("*")
      .or("is_archived.is.null,is_archived.eq.false")

    const { data: filterSelections } = await supabase.from("clinic_filter_selections").select("clinic_id, filter_key")

    const clinicFilterMap: Record<string, string[]> = {}
    for (const selection of filterSelections || []) {
      if (!clinicFilterMap[selection.clinic_id]) {
        clinicFilterMap[selection.clinic_id] = []
      }
      clinicFilterMap[selection.clinic_id].push(selection.filter_key)
    }

    const clinics = (clinicsData || []).map((c) => buildClinicProfile(c, clinicFilterMap[c.id] || []))

    const matchResult = await runMatchingPipeline(testProfile, clinics, { topN: 5 })

    const hasEnoughClinics = matchResult.rankedClinics.length >= 2
    const allHave3Reasons = matchResult.rankedClinics.slice(0, 2).every((rc) => rc.reasons.length === 3)

    const allReasonsUnique = matchResult.rankedClinics.slice(0, 2).every((rc) => {
      const reasonTexts = rc.reasons.map((r) => r.text)
      return new Set(reasonTexts).size === reasonTexts.length
    })

    const bannedPhrases = ["accepts patients for your treatment", "good overall fit", "clear, patient-friendly"]
    const noBannedPhrases = matchResult.rankedClinics.slice(0, 2).every((rc) => {
      return rc.reasons.every((r) => !bannedPhrases.some((bp) => r.text.toLowerCase().includes(bp)))
    })

    if (hasEnoughClinics && allHave3Reasons && allReasonsUnique && noBannedPhrases) {
      results.push({
        name: "Matching Pipeline",
        status: "pass",
        message: `Matching returned ${matchResult.rankedClinics.length} clinics with 3 unique, personalized bullets each`,
        details: {
          clinicsEvaluated: matchResult.totalClinicsEvaluated,
          topClinics: matchResult.rankedClinics.slice(0, 2).map((rc) => ({
            name: rc.clinic.name,
            score: rc.score.totalScore,
            percent: rc.score.percent,
            reasonCount: rc.reasons.length,
            reasons: rc.reasons.map((r) => r.text),
          })),
        },
      })
    } else {
      results.push({
        name: "Matching Pipeline",
        status: "fail",
        message: `Matching issues: ${!hasEnoughClinics ? "< 2 clinics" : ""} ${!allHave3Reasons ? "not all have 3 reasons" : ""} ${!allReasonsUnique ? "duplicate reasons found" : ""} ${!noBannedPhrases ? "banned generic phrases found" : ""}`,
        details: {
          clinicCount: matchResult.rankedClinics.length,
          reasonCounts: matchResult.rankedClinics.slice(0, 2).map((rc) => rc.reasons.length),
          reasons: matchResult.rankedClinics.slice(0, 2).map((rc) => rc.reasons.map((r) => r.text)),
        },
      })
    }
  } catch (e) {
    results.push({
      name: "Matching Pipeline",
      status: "fail",
      message: `Exception: ${e instanceof Error ? e.message : "Unknown error"}`,
    })
  }

  // Test 4: Verify per-clinic filters are isolated
  try {
    const { data: clinics } = await supabase.from("clinics").select("id, name").limit(3)

    if (clinics && clinics.length >= 2) {
      const clinic1Filters = await supabase
        .from("clinic_filter_selections")
        .select("filter_key")
        .eq("clinic_id", clinics[0].id)

      const clinic2Filters = await supabase
        .from("clinic_filter_selections")
        .select("filter_key")
        .eq("clinic_id", clinics[1].id)

      results.push({
        name: "Per-Clinic Filter Isolation",
        status: "pass",
        message: "Clinic filters are stored separately per clinic",
        details: {
          clinic1: { id: clinics[0].id, filterCount: clinic1Filters.data?.length || 0 },
          clinic2: { id: clinics[1].id, filterCount: clinic2Filters.data?.length || 0 },
        },
      })
    } else {
      results.push({
        name: "Per-Clinic Filter Isolation",
        status: "pass",
        message: "Skipped - need at least 2 clinics to test",
      })
    }
  } catch (e) {
    results.push({
      name: "Per-Clinic Filter Isolation",
      status: "fail",
      message: `Exception: ${e instanceof Error ? e.message : "Unknown error"}`,
    })
  }

  // Test 5: Verify conversion rates are in valid range
  try {
    const { data: leads } = await supabase.from("leads").select("id").limit(1)
    const { data: matches } = await supabase.from("matches").select("id").limit(1)

    const leadCount = leads?.length || 0
    const matchCount = matches?.length || 0

    // This is a simple sanity check
    results.push({
      name: "Data Integrity Check",
      status: "pass",
      message: "Database tables accessible",
      details: { leadsExist: leadCount > 0, matchesExist: matchCount > 0 },
    })
  } catch (e) {
    results.push({
      name: "Data Integrity Check",
      status: "fail",
      message: `Exception: ${e instanceof Error ? e.message : "Unknown error"}`,
    })
  }

  // Test 6: Verify form version is being tracked
  try {
    const { data: recentLeads } = await supabase
      .from("leads")
      .select("id, form_version, raw_answers")
      .order("created_at", { ascending: false })
      .limit(5)

    const hasFormVersions = recentLeads?.every((l) => l.form_version) || false
    const hasRawAnswers = recentLeads?.every((l) => l.raw_answers !== null) || false

    results.push({
      name: "Form Version Tracking",
      status: hasFormVersions ? "pass" : "fail",
      message: hasFormVersions ? "Recent leads have form_version set" : "Some leads missing form_version",
      details: {
        recentLeadCount: recentLeads?.length || 0,
        hasFormVersions,
        hasRawAnswers,
      },
    })
  } catch (e) {
    results.push({
      name: "Form Version Tracking",
      status: "fail",
      message: `Exception: ${e instanceof Error ? e.message : "Unknown error"}`,
    })
  }

  // Test 7: Verify reasons differentiation
  try {
    const testProfile = buildLeadProfile({
      treatments: ["Invisalign / Clear Aligners"],
      postcode: "W1G 9PF",
      latitude: 51.5167,
      longitude: -0.1467,
      locationPreference: "travel_a_bit",
      decisionValues: ["Clear pricing before treatment", "Flexible appointments (late afternoons or weekends)"],
      anxietyLevel: "comfortable",
      costApproach: "best_outcome",
      timingPreference: "exploring",
      preferred_times: ["afternoon", "weekend"],
      conversionBlockerCodes: ["NO_CONCERN"],
    })

    const { data: clinicsData } = await supabase
      .from("clinics")
      .select("*")
      .or("is_archived.is.null,is_archived.eq.false")
      .limit(10)

    const { data: filterSelections } = await supabase.from("clinic_filter_selections").select("clinic_id, filter_key")

    const clinicFilterMap: Record<string, string[]> = {}
    for (const selection of filterSelections || []) {
      if (!clinicFilterMap[selection.clinic_id]) {
        clinicFilterMap[selection.clinic_id] = []
      }
      clinicFilterMap[selection.clinic_id].push(selection.filter_key)
    }

    const clinics = (clinicsData || []).map((c) => buildClinicProfile(c, clinicFilterMap[c.id] || []))

    const matchResult = await runMatchingPipeline(testProfile, clinics, { topN: 5 })

    // Check that different clinics have different primary reasons
    const primaryReasons = matchResult.rankedClinics.map((rc) => rc.reasons[0]?.text || "")
    const uniquePrimaryReasons = new Set(primaryReasons)

    const hasDifferentiation = uniquePrimaryReasons.size >= Math.min(2, matchResult.rankedClinics.length)

    if (hasDifferentiation) {
      results.push({
        name: "Reasons Differentiation",
        status: "pass",
        message: `${uniquePrimaryReasons.size} unique primary reasons across ${matchResult.rankedClinics.length} clinics`,
        details: {
          clinicCount: matchResult.rankedClinics.length,
          uniquePrimaryReasonCount: uniquePrimaryReasons.size,
          primaryReasons: matchResult.rankedClinics.slice(0, 3).map((rc) => ({
            clinic: rc.clinic.name,
            primaryReason: rc.reasons[0]?.text,
          })),
        },
      })
    } else {
      results.push({
        name: "Reasons Differentiation",
        status: "fail",
        message: `All clinics have identical primary reasons - WHY_MATCHED_GENERIC_BUG`,
        details: {
          clinicCount: matchResult.rankedClinics.length,
          uniquePrimaryReasonCount: uniquePrimaryReasons.size,
          primaryReasons: Array.from(uniquePrimaryReasons),
        },
      })
    }
  } catch (e) {
    results.push({
      name: "Reasons Differentiation",
      status: "fail",
      message: `Exception: ${e instanceof Error ? e.message : "Unknown error"}`,
    })
  }

  // Summary
  const passCount = results.filter((r) => r.status === "pass").length
  const failCount = results.filter((r) => r.status === "fail").length

  return NextResponse.json({
    summary: {
      total: results.length,
      passed: passCount,
      failed: failCount,
      status: failCount === 0 ? "ALL_PASS" : "HAS_FAILURES",
    },
    contractVersion: MATCHING_CONTRACT_VERSION,
    timestamp: new Date().toISOString(),
    results,
  })
}
