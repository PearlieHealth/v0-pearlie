import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/leads/direct-auto
 * Auto-creates a direct lead for an authenticated patient visiting a new clinic.
 * Uses the existing Supabase auth session to identify the patient, pulls their
 * details from a previous lead, and creates a new lead + match_results for
 * the target clinic. Skips OTP since the patient is already verified.
 */
export async function POST(request: NextRequest) {
  try {
    const { clinicId } = await request.json()

    if (!clinicId) {
      return NextResponse.json({ error: "Clinic ID is required" }, { status: 400 })
    }

    // Verify the patient is authenticated
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user?.id || !user.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
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

    // Check if a lead already exists for this user + clinic (by user_id or email)
    const { data: userLeads } = await supabase
      .from("leads")
      .select("id")
      .or(`user_id.eq.${user.id},email.eq.${user.email.toLowerCase()}`)
      .limit(100)

    if (userLeads && userLeads.length > 0) {
      const leadIds = userLeads.map(l => l.id)
      const { data: existingMatch } = await supabase
        .from("match_results")
        .select("lead_id")
        .eq("clinic_id", clinicId)
        .in("lead_id", leadIds)
        .limit(1)

      if (existingMatch && existingMatch.length > 0) {
        return NextResponse.json({
          leadId: existingMatch[0].lead_id,
          clinicId: clinic.id,
          alreadyExisted: true,
        })
      }
    }

    // Get patient details from their most recent lead
    const { data: recentLead } = await supabase
      .from("leads")
      .select("first_name, last_name, email, phone, treatment_interest")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    // Fall back to user metadata if no prior lead found
    const firstName = recentLead?.first_name || user.user_metadata?.first_name || ""
    const lastName = recentLead?.last_name || user.user_metadata?.last_name || ""
    const email = recentLead?.email || user.email
    const phone = recentLead?.phone || ""
    const treatmentInterest = recentLead?.treatment_interest || "Not specified"

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "Patient details incomplete" }, { status: 400 })
    }

    // Create the lead — already verified since patient has an auth session
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        phone: phone,
        treatment_interest: treatmentInterest,
        preferred_timing: "flexible",
        postcode: "DIRECT",
        source: "direct_profile",
        consent_contact: true,
        contact_method: "email",
        contact_value: email.toLowerCase(),
        is_verified: true,
        verified_at: new Date().toISOString(),
        user_id: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[leads/direct-auto] Error creating lead:", insertError)
      return NextResponse.json({ error: "Failed to create enquiry" }, { status: 500 })
    }

    // Create match_results + lead_clinic_status in parallel
    await Promise.allSettled([
      supabase
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
          if (error) console.error("[leads/direct-auto] Failed to create match_result:", error)
        }),
      supabase
        .from("lead_clinic_status")
        .insert({
          lead_id: lead.id,
          clinic_id: clinicId,
          status: "NEW",
        })
        .then(({ error }) => {
          if (error) console.error("[leads/direct-auto] Failed to create lead_clinic_status:", error)
        }),
      supabase
        .from("analytics_events")
        .insert({
          event_name: "lead_submitted",
          lead_id: lead.id,
          clinic_id: clinicId,
          page: `/clinic/${clinicId}`,
          metadata: { source: "direct_profile_auto", treatment: treatmentInterest },
        })
        .then(({ error }) => {
          if (error) console.error("[leads/direct-auto] Failed to track analytics:", error)
        }),
    ])

    return NextResponse.json({
      leadId: lead.id,
      clinicId: clinic.id,
      alreadyExisted: false,
    })
  } catch (error) {
    console.error("[leads/direct-auto] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
