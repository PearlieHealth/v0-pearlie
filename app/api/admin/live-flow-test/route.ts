import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { runMatchingEngine } from "@/lib/matching/engine"
import { FORM_VERSION } from "@/lib/matching/tag-schema"
import { getLiveClinicFilter, getMatchingTagCount, MIN_MATCHING_TAGS } from "@/lib/matching/clinic-status"
import { verifyAdminAuth } from "@/lib/admin-auth"

interface TestResult {
  name: string
  status: "PASS" | "FAIL" | "WARN"
  message: string
  details?: unknown
}

const DISTANCE_WORDS = ["mile", "km", "near your postcode", "close to", "nearby", "within"]

export async function POST() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  const results: TestResult[] = []

  try {
    const supabase = await createClient()

    const liveFilter = getLiveClinicFilter()
    const { data: activeClinics } = await supabase
      .from("clinics")
      .select("id, name")
      .eq(liveFilter.field, liveFilter.value)

    const { data: filterSelections } = await supabase.from("clinic_filter_selections").select("clinic_id, filter_key")

    const filterMap = new Map<string, string[]>()
    for (const sel of filterSelections || []) {
      const existing = filterMap.get(sel.clinic_id) || []
      existing.push(sel.filter_key)
      filterMap.set(sel.clinic_id, existing)
    }

    // Count clinics that are both active AND matchable (have enough tags)
    const matchableClinics =
      activeClinics?.filter((c) => {
        const tags = filterMap.get(c.id) || []
        return getMatchingTagCount(tags) >= MIN_MATCHING_TAGS
      }) || []

    results.push({
      name: "Active Clinics Check",
      status: (activeClinics?.length || 0) >= 2 ? "PASS" : "WARN",
      message: `${activeClinics?.length || 0} active clinic(s) available for matching (${matchableClinics.length} have enough tags)`,
      details: {
        activeClinicCount: activeClinics?.length || 0,
        matchableClinicCount: matchableClinics.length,
        filterUsed: `${liveFilter.field} = ${liveFilter.value}`,
        minTagsRequired: MIN_MATCHING_TAGS,
        clinicNames: activeClinics?.slice(0, 5).map((c) => c.name) || [],
      },
    })

    // Step 1: Create a synthetic lead using v6 schema fields
    const testLead = {
      first_name: "Live",
      last_name: "Flow Test",
      email: `test-${Date.now()}@pearlie-test.local`,
      phone: "07000000000",
      postcode: "SW1A 1AA",
      treatment_interest: "Invisalign / Clear Aligners",
      decision_values: ["Clear pricing before treatment", "A calm, reassuring environment"],
      conversion_blocker: "NOT_WORTH_COST",
      conversion_blocker_codes: ["NOT_WORTH_COST", "BAD_EXPERIENCE"],
      anxiety_level: "quite_anxious",
      cost_approach: "comfort_range",
      timing_preference: "few_weeks",
      preferred_times: ["morning", "afternoon"],
      location_preference: "near_home_work",
      schema_version: 6,
      form_version: FORM_VERSION,
      raw_answers: {
        treatments_selected: ["Invisalign / Clear Aligners"],
        is_emergency: false,
        location_preference: "near_home_work",
        postcode: "SW1A 1AA",
        values: ["Clear pricing before treatment", "A calm, reassuring environment"],
        blocker: ["NOT_WORTH_COST", "BAD_EXPERIENCE"],
        timing: "few_weeks",
        preferred_times: ["morning", "afternoon"],
        cost_approach: "comfort_range",
        anxiety_level: "quite_anxious",
        form_version: FORM_VERSION,
      },
    }

    // Step 2: Insert the lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert(testLead)
      .select("id, raw_answers, form_version")
      .single()

    if (leadError || !lead) {
      results.push({
        name: "Lead Creation",
        status: "FAIL",
        message: `Failed to create test lead: ${leadError?.message}`,
      })
      return NextResponse.json({ results, overallStatus: "FAIL" })
    }

    // Check: Lead saved with raw_answers and form_version
    results.push({
      name: "Lead Creation",
      status: lead.raw_answers && lead.form_version ? "PASS" : "FAIL",
      message:
        lead.raw_answers && lead.form_version
          ? "Lead saved with raw_answers and form_version"
          : "Lead missing raw_answers or form_version",
      details: { leadId: lead.id, hasRawAnswers: !!lead.raw_answers, formVersion: lead.form_version },
    })

    // Step 3: Run matching engine
    const matchResult = await runMatchingEngine(lead.id)

    if (matchResult.radiusExpanded) {
      results.push({
        name: "Radius Expansion",
        status: "WARN",
        message: `Search radius expanded to ${matchResult.finalRadiusMiles} miles to find enough clinics`,
        details: { finalRadiusMiles: matchResult.finalRadiusMiles },
      })
    }

    if (!matchResult || matchResult.clinics.length === 0) {
      results.push({
        name: "Matching Engine",
        status: "WARN",
        message: "No clinics returned by matching engine (may be expected if no clinics have tags or are live)",
        details: { clinicCount: 0 },
      })
    } else {
      // Check: Match returns >= 2 clinics when available
      results.push({
        name: "Matching Engine",
        status: matchResult.clinics.length >= 2 ? "PASS" : "WARN",
        message: `Returned ${matchResult.clinics.length} clinic(s)`,
        details: { clinicCount: matchResult.clinics.length },
      })

      // Check: Each clinic has exactly 3 reasons
      const clinicsWithWrongReasonCount = matchResult.clinics.filter((c) => !c.reasons || c.reasons.length !== 3)
      results.push({
        name: "Reason Count",
        status: clinicsWithWrongReasonCount.length === 0 ? "PASS" : "FAIL",
        message:
          clinicsWithWrongReasonCount.length === 0
            ? "All clinics have exactly 3 reasons"
            : `${clinicsWithWrongReasonCount.length} clinic(s) have wrong reason count`,
        details: {
          clinicsWithIssues: clinicsWithWrongReasonCount.map((c) => ({
            clinicId: c.clinicId,
            reasonCount: c.reasons?.length || 0,
          })),
        },
      })

      // Check: No reasons contain distance words
      const clinicsWithDistanceReasons: Array<{ clinicId: string; reason: string }> = []
      for (const clinic of matchResult.clinics) {
        for (const reason of clinic.reasons || []) {
          const hasDistanceWord = DISTANCE_WORDS.some((word) => reason.text.toLowerCase().includes(word.toLowerCase()))
          if (hasDistanceWord) {
            clinicsWithDistanceReasons.push({ clinicId: clinic.clinicId, reason: reason.text })
          }
        }
      }
      results.push({
        name: "No Distance Reasons",
        status: clinicsWithDistanceReasons.length === 0 ? "PASS" : "FAIL",
        message:
          clinicsWithDistanceReasons.length === 0
            ? "No reasons mention distance/proximity"
            : `${clinicsWithDistanceReasons.length} reason(s) mention distance`,
        details: { violations: clinicsWithDistanceReasons },
      })

      // Check: Reasons are differentiated across clinics
      if (matchResult.clinics.length >= 2) {
        const primaryReasons = matchResult.clinics.map((c) => c.reasons?.[0]?.tagKey || "NONE")
        const uniquePrimaryReasons = new Set(primaryReasons)
        const hasDifferentiation = uniquePrimaryReasons.size >= Math.min(2, matchResult.clinics.length)
        results.push({
          name: "Reason Differentiation",
          status: hasDifferentiation ? "PASS" : "WARN",
          message: hasDifferentiation
            ? `${uniquePrimaryReasons.size} unique primary reasons across ${matchResult.clinics.length} clinics`
            : "All clinics have identical primary reasons (may indicate poor tag coverage)",
          details: { uniquePrimaryReasons: Array.from(uniquePrimaryReasons) },
        })
      }

      // Check: All reason tagKeys are valid
      const invalidReasonTags: Array<{ clinicId: string; tagKey: string }> = []
      for (const clinic of matchResult.clinics) {
        for (const reason of clinic.reasons || []) {
          if (
            !reason.tagKey ||
            !(
              reason.tagKey.startsWith("TAG_") ||
              reason.tagKey.startsWith("FALLBACK_") ||
              reason.tagKey === "TREATMENT_MATCH"
            )
          ) {
            invalidReasonTags.push({ clinicId: clinic.clinicId, tagKey: reason.tagKey || "MISSING" })
          }
        }
      }
      results.push({
        name: "Valid Reason Tags",
        status: invalidReasonTags.length === 0 ? "PASS" : "FAIL",
        message:
          invalidReasonTags.length === 0
            ? "All reasons have valid TAG_*, FALLBACK_*, or TREATMENT_MATCH keys"
            : `${invalidReasonTags.length} reason(s) have invalid tagKeys`,
        details: { violations: invalidReasonTags },
      })
    }

    // Step 4: Cleanup - delete the test lead
    await supabase.from("leads").delete().eq("id", lead.id)

    results.push({
      name: "Cleanup",
      status: "PASS",
      message: "Test lead deleted successfully",
    })

    // Determine overall status
    const hasFail = results.some((r) => r.status === "FAIL")
    const hasWarn = results.some((r) => r.status === "WARN")
    const overallStatus = hasFail ? "FAIL" : hasWarn ? "WARN" : "PASS"

    return NextResponse.json({ results, overallStatus })
  } catch (error) {
    console.error("[LIVE_FLOW_TEST_ERROR]", error)
    results.push({
      name: "Unexpected Error",
      status: "FAIL",
      message: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json({ results, overallStatus: "FAIL" }, { status: 500 })
  }
}
