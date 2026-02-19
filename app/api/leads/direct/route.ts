import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/leads/direct
 * Creates a lightweight lead from a direct clinic profile visit.
 * Only collects name, email, phone, treatment interest, and urgency.
 * Skips the full intake questionnaire.
 * Also creates match_results + lead_clinic_status rows so the clinic
 * sees this lead in their dashboard, and tracks the analytics event.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { firstName, lastName, email, phone, treatmentInterest, urgency, clinicId } = body

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: "First and last name are required" }, { status: 400 })
    }

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 })
    }

    if (!phone?.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    if (!clinicId) {
      return NextResponse.json({ error: "Clinic ID is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the clinic exists and is live
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name, is_live")
      .eq("id", clinicId)
      .single()

    if (clinicError || !clinic || !clinic.is_live) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    // Check for duplicate: same email + direct_profile source
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .eq("source", "direct_profile")
      .limit(1)
      .maybeSingle()

    if (existingLead) {
      // Check if this lead already has a match_result for the same clinic
      const { data: existingMatch } = await supabase
        .from("match_results")
        .select("id")
        .eq("lead_id", existingLead.id)
        .eq("clinic_id", clinicId)
        .limit(1)
        .maybeSingle()

      if (existingMatch) {
        // Same patient, same clinic — return existing lead instead of duplicating
        return NextResponse.json({
          leadId: existingLead.id,
          clinicId: clinic.id,
          existing: true,
        })
      }
      // Different clinic — fall through to create a new lead
    }

    // Create the lead with source = "direct_profile"
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        treatment_interest: treatmentInterest || "",
        preferred_timing: urgency || "flexible",
        source: "direct_profile",
        consent_contact: true,
        contact_method: "email",
        contact_value: email.trim().toLowerCase(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("[leads/direct] Error creating lead:", insertError)
      return NextResponse.json({ error: "Failed to create enquiry" }, { status: 500 })
    }

    // Create match_results row so the clinic sees this lead in their dashboard.
    // Direct profile leads get score=100 and rank=1 since the patient chose this clinic.
    const matchResultPromise = supabase
      .from("match_results")
      .insert({
        lead_id: lead.id,
        clinic_id: clinicId,
        score: 100,
        rank: 1,
        reasons: ["Patient enquired directly from your profile"],
        tier: "direct",
        match_reasons_composed: "Patient enquired directly from your clinic profile.",
      })
      .then(({ error }) => {
        if (error) console.error("[leads/direct] Failed to create match_result:", error)
      })

    // Create lead_clinic_status row so the clinic can track this lead's status
    const statusPromise = supabase
      .from("lead_clinic_status")
      .insert({
        lead_id: lead.id,
        clinic_id: clinicId,
        status: "NEW",
      })
      .then(({ error }) => {
        if (error) console.error("[leads/direct] Failed to create lead_clinic_status:", error)
      })

    // Track analytics event server-side
    const analyticsPromise = supabase
      .from("analytics_events")
      .insert({
        event_name: "lead_submitted",
        lead_id: lead.id,
        clinic_id: clinicId,
        page: `/clinic/${clinicId}`,
        metadata: { source: "direct_profile", treatment: treatmentInterest || null },
      })
      .then(({ error }) => {
        if (error) console.error("[leads/direct] Failed to track analytics:", error)
      })

    // Run these in parallel - don't block the response on non-critical writes
    await Promise.allSettled([matchResultPromise, statusPromise, analyticsPromise])

    return NextResponse.json({
      leadId: lead.id,
      clinicId: clinic.id,
    })
  } catch (error) {
    console.error("[leads/direct] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
