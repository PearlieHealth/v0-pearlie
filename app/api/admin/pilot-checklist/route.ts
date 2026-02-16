import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { CANONICAL_TAG_KEYS, FORM_VERSION } from "@/lib/matching/tag-schema"
import { runMatchingEngine } from "@/lib/matching/engine"
import { verifyAdminAuth } from "@/lib/admin-auth"

interface ChecklistItem {
  id: string
  name: string
  description: string
  status: "pass" | "fail" | "warn" | "pending"
  details?: string
  link?: string
  linkText?: string
}

const DISTANCE_WORDS = ["mile", "km", "near your postcode", "close to", "nearby", "within"]

async function runInlineLiveFlowTest(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ status: "pass" | "fail" | "warn"; details: string }> {
  try {
    // Create test lead using v6 schema fields
    const testLead = {
      first_name: "Pilot",
      last_name: "Check Test",
      email: `pilot-check-${Date.now()}@pearlie-test.local`,
      phone: "07000000000",
      postcode: "SW1A 1AA",
      treatment_interest: "Invisalign / Clear Aligners",
      decision_values: ["Clear pricing before treatment", "A calm, reassuring environment"],
      conversion_blocker: "NOT_WORTH_COST",
      conversion_blocker_codes: ["NOT_WORTH_COST"],
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
        blocker: ["NOT_WORTH_COST"],
        timing: "few_weeks",
        preferred_times: ["morning", "afternoon"],
        cost_approach: "comfort_range",
        anxiety_level: "quite_anxious",
        form_version: FORM_VERSION,
      },
    }

    const { data: lead, error: leadError } = await supabase.from("leads").insert(testLead).select("id").single()

    if (leadError || !lead) {
      return { status: "fail", details: `Failed to create test lead: ${leadError?.message}` }
    }

    // Run matching
    const matchResult = await runMatchingEngine(lead.id)

    // Cleanup immediately
    await supabase.from("leads").delete().eq("id", lead.id)

    if (!matchResult || matchResult.clinics.length === 0) {
      return { status: "warn", details: "No clinics returned (check active clinics have tags)" }
    }

    // Validate results
    const issues: string[] = []

    // Check reason count
    const wrongReasonCount = matchResult.clinics.filter((c) => !c.reasons || c.reasons.length !== 3)
    if (wrongReasonCount.length > 0) {
      issues.push(`${wrongReasonCount.length} clinic(s) missing 3 reasons`)
    }

    // Check for distance words
    for (const clinic of matchResult.clinics) {
      for (const reason of clinic.reasons || []) {
        if (DISTANCE_WORDS.some((w) => reason.text.toLowerCase().includes(w))) {
          issues.push("Reason contains distance words")
          break
        }
      }
    }

    if (issues.length > 0) {
      return { status: "fail", details: issues.join("; ") }
    }

    return {
      status: "pass",
      details: `Pipeline OK: ${matchResult.clinics.length} clinic(s) with valid reasons`,
    }
  } catch (error) {
    return {
      status: "fail",
      details: error instanceof Error ? error.message : "Unknown error in live flow test",
    }
  }
}

export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  const items: ChecklistItem[] = []
  
  try {
    const supabase = await createClient()

    // 1. Check for active clinics
    const { data: activeClinics } = await supabase.from("clinics").select("id, name").eq("is_archived", false)

    const activeCount = activeClinics?.length || 0
    items.push({
      id: "active-clinics",
      name: "Active Clinics",
      description: "At least 3 clinics must be active (not archived) for patient matching",
      status: activeCount >= 3 ? "pass" : activeCount >= 1 ? "warn" : "fail",
      details: `${activeCount} clinic(s) are active`,
      link: "/admin/clinics",
      linkText: "Manage Clinics",
    })

    // 2. Check match readiness
    const { data: filterSelections } = await supabase.from("clinic_filter_selections").select("clinic_id, filter_key")

    const filterMap = new Map<string, string[]>()
    for (const sel of filterSelections || []) {
      const existing = filterMap.get(sel.clinic_id) || []
      existing.push(sel.filter_key)
      filterMap.set(sel.clinic_id, existing)
    }

    let okCount = 0
    let weakCount = 0
    let notMatchableCount = 0

    for (const clinic of activeClinics || []) {
      const tags = filterMap.get(clinic.id) || []
      const matchingTags = tags.filter((t) => CANONICAL_TAG_KEYS.includes(t))
      if (matchingTags.length >= 6) okCount++
      else if (matchingTags.length >= 3) weakCount++
      else notMatchableCount++
    }

    items.push({
      id: "match-readiness",
      name: "Match Readiness",
      description: "All active clinics should have OK tag status (6+ matching tags)",
      status: notMatchableCount === 0 ? (weakCount === 0 ? "pass" : "warn") : "fail",
      details: `OK: ${okCount}, WEAK: ${weakCount}, NOT_MATCHABLE: ${notMatchableCount}`,
      link: "/admin/tag-hygiene",
      linkText: "View Match Readiness",
    })

    // 3. Check that active clinics have OK tags
    let activeClinicsWithBadTags = 0
    for (const clinic of activeClinics || []) {
      const tags = filterMap.get(clinic.id) || []
      const matchingTags = tags.filter((t) => CANONICAL_TAG_KEYS.includes(t))
      if (matchingTags.length < 6) activeClinicsWithBadTags++
    }

    items.push({
      id: "active-clinic-tags",
      name: "Active Clinic Tag Quality",
      description: "All active clinics must have at least 6 matching tags",
      status: activeClinicsWithBadTags === 0 ? "pass" : "warn",
      details:
        activeClinicsWithBadTags === 0
          ? "All active clinics have OK tag status"
          : `${activeClinicsWithBadTags} active clinic(s) have insufficient tags`,
      link: "/admin/tag-hygiene",
      linkText: "Improve Tag Coverage",
    })

    // 4. Check notification emails
    const { data: clinicsWithoutEmail } = await supabase
      .from("clinics")
      .select("id, name")
      .eq("is_archived", false)
      .or("email.is.null,email.eq.,notification_email.is.null,notification_email.eq.")

    items.push({
      id: "notification-emails",
      name: "Notification Emails",
      description: "All active clinics should have a notification email for lead alerts",
      status: (clinicsWithoutEmail?.length || 0) === 0 ? "pass" : "warn",
      details:
        (clinicsWithoutEmail?.length || 0) === 0
          ? "All active clinics have notification emails"
          : `${clinicsWithoutEmail?.length} active clinic(s) missing email`,
      link: "/admin/clinics",
      linkText: "Add Missing Emails",
    })

    // 5. Check treatments
    const { data: clinicsWithoutTreatments } = await supabase
      .from("clinics")
      .select("id, name")
      .eq("is_archived", false)
      .or("treatments.is.null,treatments.eq.{}")

    items.push({
      id: "treatments",
      name: "Treatment Coverage",
      description: "All active clinics should have at least one treatment listed",
      status: (clinicsWithoutTreatments?.length || 0) === 0 ? "pass" : "warn",
      details:
        (clinicsWithoutTreatments?.length || 0) === 0
          ? "All active clinics have treatments"
          : `${clinicsWithoutTreatments?.length} active clinic(s) missing treatments`,
      link: "/admin/clinics",
      linkText: "Add Treatments",
    })

    // 6. Check postcodes/coordinates
    const { data: clinicsWithoutLocation } = await supabase
      .from("clinics")
      .select("id, name")
      .eq("is_archived", false)
      .or("postcode.is.null,postcode.eq.,latitude.is.null,longitude.is.null")

    items.push({
      id: "locations",
      name: "Location Data",
      description: "All active clinics should have postcode and coordinates for distance matching",
      status: (clinicsWithoutLocation?.length || 0) === 0 ? "pass" : "warn",
      details:
        (clinicsWithoutLocation?.length || 0) === 0
          ? "All active clinics have location data"
          : `${clinicsWithoutLocation?.length} active clinic(s) missing location`,
      link: "/admin/clinics",
      linkText: "Add Locations",
    })

    // 7. Check waitlist applications processed
    const { data: pendingWaitlist } = await supabase.from("clinic_waitlist").select("id").eq("status", "pending")

    items.push({
      id: "waitlist-processed",
      name: "Waitlist Processed",
      description: "All clinic applications should be reviewed",
      status: (pendingWaitlist?.length || 0) === 0 ? "pass" : "warn",
      details:
        (pendingWaitlist?.length || 0) === 0
          ? "No pending applications"
          : `${pendingWaitlist?.length} application(s) pending review`,
      link: "/admin/clinic-waitlist",
      linkText: "Review Applications",
    })

    // 8. Run live flow test inline (avoid fetch issues in serverless)
    const liveFlowResult = await runInlineLiveFlowTest(supabase)

    items.push({
      id: "live-flow-test",
      name: "Live Flow Test",
      description: "End-to-end test of lead creation and matching pipeline",
      status: liveFlowResult.status,
      details: liveFlowResult.details,
      link: "/admin/analytics",
      linkText: "Run Tests Manually",
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error("[PILOT_CHECKLIST_ERROR]", error)
    return NextResponse.json({ items, error: "Some checks failed" }, { status: 500 })
  }
}
