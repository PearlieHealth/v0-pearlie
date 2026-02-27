import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"
import { portalUrl } from "@/lib/clinic-url"
import { escapeHtml } from "@/lib/escape-html"

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
 * Mirrors the notification in /api/otp/verify for manually-created direct leads.
 */
async function sendDirectLeadClinicNotification(
  supabase: ReturnType<typeof createAdminClient>,
  clinicId: string,
  lead: { id: string; first_name: string; last_name: string; email: string; phone: string; treatment_interest: string; preferred_timing: string }
) {
  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, notification_email, email, notification_preferences")
    .eq("id", clinicId)
    .single()

  if (!clinic) return

  const prefs = (clinic.notification_preferences as Record<string, boolean> | null) || {}
  if (prefs.new_leads === false) return

  const recipientEmail = clinic.notification_email || clinic.email
  if (!recipientEmail) return

  const safeName = escapeHtml(`${lead.first_name} ${lead.last_name}`.trim() || "A patient")
  const safeTreatment = escapeHtml(lead.treatment_interest || "Not specified")
  const safeEmail = escapeHtml(lead.email)
  const safePhone = escapeHtml(lead.phone || "")
  const safeTiming = escapeHtml(lead.preferred_timing || "Flexible")

  await sendEmailWithRetry({
    from: EMAIL_FROM.NOTIFICATIONS,
    to: recipientEmail,
    subject: `New enquiry from ${lead.first_name} ${lead.last_name} via your profile`,
    html: `
      <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0fbcb0 0%, #0da399 100%); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">New Direct Enquiry</h1>
          <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">A verified patient enquired from your profile</p>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <div style="background: white; border-radius: 8px; padding: 20px; border-left: 4px solid #0fbcb0; margin-bottom: 20px;">
            <h2 style="margin: 0 0 12px; font-size: 16px; color: #1a1a1a;">Patient Details</h2>
            <table style="width: 100%; font-size: 14px; color: #4b5563;">
              <tr><td style="padding: 4px 0; font-weight: 600; width: 120px;">Name</td><td>${safeName}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: 600;">Email</td><td><a href="mailto:${safeEmail}" style="color: #0fbcb0;">${safeEmail}</a></td></tr>
              <tr><td style="padding: 4px 0; font-weight: 600;">Phone</td><td><a href="tel:${safePhone}" style="color: #0fbcb0;">${safePhone}</a></td></tr>
              <tr><td style="padding: 4px 0; font-weight: 600;">Treatment</td><td>${safeTreatment}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: 600;">Timing</td><td>${safeTiming}</td></tr>
            </table>
          </div>
          <div style="background: #fffbeb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 13px; color: #92400e;">
              <strong>Tip:</strong> Patients who enquire directly from your profile are highly interested. Respond quickly to maximise your chance of booking.
            </p>
          </div>
          <div style="text-align: center;">
            <a href="${portalUrl("/clinic/appointments")}"
               style="background-color: #0fbcb0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px; font-weight: 600;">
              View in Inbox
            </a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>This patient found your clinic on Pearlie and submitted an enquiry directly.</p>
        </div>
      </div>
    `,
  })
}
