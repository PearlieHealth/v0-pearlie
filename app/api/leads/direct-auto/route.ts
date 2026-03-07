import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { portalUrl } from "@/lib/clinic-url"
import { generateReplyToAddress } from "@/lib/email-reply-token"

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

    // Verify the clinic exists and is not archived
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name, is_archived")
      .eq("id", clinicId)
      .single()

    if (clinicError || !clinic || clinic.is_archived) {
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
      .select("first_name, last_name, email, phone, treatment_interest, preferred_timing")
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
    const preferredTiming = recentLead?.preferred_timing || "flexible"

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
        preferred_timing: preferredTiming,
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

    // Send clinic notification email (non-blocking)
    sendDirectLeadClinicNotification(supabase, clinicId, {
      id: lead.id,
      first_name: firstName,
      last_name: lastName,
      email: email.toLowerCase(),
      phone,
      treatment_interest: treatmentInterest,
      preferred_timing: preferredTiming,
    }).catch((err) => {
      console.error("[leads/direct-auto] Failed to send clinic notification:", err)
    })

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

/**
 * Send a notification email to the clinic when an auto-created lead is generated.
 * Uses the registered DIRECT_LEAD_NOTIFICATION email type for AI-generated natural
 * email formatting, full logging, idempotency, and notification preference checks.
 */
async function sendDirectLeadClinicNotification(
  supabase: ReturnType<typeof createAdminClient>,
  clinicId: string,
  lead: { id: string; first_name: string; last_name: string; email: string; phone: string; treatment_interest: string; preferred_timing: string }
) {
  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, notification_email, email")
    .eq("id", clinicId)
    .single()

  if (!clinic) return

  const recipientEmail = clinic.notification_email || clinic.email
  if (!recipientEmail) return

  // Look up existing conversation so clinic can reply via email
  let replyTo: string | undefined
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("lead_id", lead.id)
    .eq("clinic_id", clinicId)
    .limit(1)
    .maybeSingle()

  if (conv?.id) {
    replyTo = generateReplyToAddress(conv.id, "clinic", recipientEmail)
  }

  await sendRegisteredEmail({
    type: EMAIL_TYPE.DIRECT_LEAD_NOTIFICATION,
    to: recipientEmail,
    data: {
      clinicName: clinic.name || "",
      firstName: lead.first_name || "",
      lastName: lead.last_name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      treatment: lead.treatment_interest || "Not specified",
      urgency: lead.preferred_timing || "flexible",
      inboxUrl: portalUrl("/clinic/appointments"),
      _leadId: lead.id,
      _clinicId: clinicId,
    },
    replyTo,
    clinicId,
    leadId: lead.id,
  })
}
