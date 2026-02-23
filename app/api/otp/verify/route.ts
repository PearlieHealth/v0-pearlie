import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyOTPHash, isOTPExpired } from "@/lib/otp/generate"
import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"
import { escapeHtml } from "@/lib/escape-html"

export async function POST(request: NextRequest) {
  const OTP_SECRET = process.env.SUPABASE_JWT_SECRET
  if (!OTP_SECRET) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }
  try {
    const { leadId, otp } = await request.json()

    if (!leadId || !otp) {
      return NextResponse.json({ error: "Lead ID and OTP are required" }, { status: 400 })
    }

    // Normalize OTP - trim whitespace and ensure string
    const normalizedOTP = String(otp).trim()

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(normalizedOTP)) {
      return NextResponse.json({ error: "Invalid verification code format" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get lead with OTP data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, email, first_name, last_name, phone, treatment_interest, preferred_timing, source, otp_hash, verification_sent_at, verification_attempts, is_verified")
      .eq("id", leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Already verified — nothing more to do
    if (lead.is_verified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: "Email already verified",
      })
    }

    // Check if too many attempts
    if (lead.verification_attempts >= 5) {
      return NextResponse.json({ error: "Too many failed attempts. Please request a new code." }, { status: 429 })
    }

    // Check if OTP exists
    if (!lead.otp_hash || !lead.verification_sent_at) {
      return NextResponse.json({ error: "No verification code found. Please request a new one." }, { status: 400 })
    }

    // Check if OTP is expired
    if (isOTPExpired(new Date(lead.verification_sent_at))) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one.", expired: true },
        { status: 400 },
      )
    }

    // Verify OTP using timing-safe comparison
    const isValid = verifyOTPHash(normalizedOTP, lead.otp_hash, OTP_SECRET)

    if (!isValid) {
      // Increment failed attempts
      await supabase
        .from("leads")
        .update({
          verification_attempts: lead.verification_attempts + 1,
        })
        .eq("id", leadId)

      const attemptsRemaining = 5 - (lead.verification_attempts + 1)
      return NextResponse.json(
        {
          error: `Invalid verification code. ${attemptsRemaining > 0 ? `${attemptsRemaining} attempts remaining.` : "Please request a new code."}`,
          attemptsRemaining,
        },
        { status: 400 },
      )
    }

    // Mark as verified — patient can now send messages via the embedded chat.
    const { error: verifyError } = await supabase
      .from("leads")
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        otp_hash: null,
        verification_attempts: 0,
      })
      .eq("id", leadId)

    if (verifyError) {
      console.error("[OTP] Failed to update verification status:", verifyError)
      return NextResponse.json({ error: "Failed to verify email" }, { status: 500 })
    }

    // Send clinic notification for direct profile leads (non-blocking)
    if (lead.source === "direct_profile") {
      sendDirectLeadClinicNotification(supabase, lead).catch((err) => {
        console.error("[OTP] Failed to send clinic notification:", err)
      })
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
    })
  } catch (error) {
    console.error("[OTP] Unexpected error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

/**
 * Send a notification email to the clinic when a direct profile lead verifies their email.
 * This lets the clinic know immediately that a verified patient is interested.
 */
async function sendDirectLeadClinicNotification(
  supabase: ReturnType<typeof createAdminClient>,
  lead: { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; treatment_interest: string | null; preferred_timing: string | null }
) {
  // Find the clinic this direct lead was created for via match_results
  const { data: matchResult } = await supabase
    .from("match_results")
    .select("clinic_id")
    .eq("lead_id", lead.id)
    .limit(1)
    .single()

  if (!matchResult) return

  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, notification_email, email, notification_preferences")
    .eq("id", matchResult.clinic_id)
    .single()

  if (!clinic) return

  // Respect notification preferences
  const prefs = (clinic.notification_preferences as Record<string, boolean> | null) || {}
  if (prefs.new_leads === false) return

  const recipientEmail = clinic.notification_email || clinic.email
  if (!recipientEmail) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
  const safeName = escapeHtml(`${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "A patient")
  const safeTreatment = escapeHtml(lead.treatment_interest || "Not specified")
  const safeEmail = escapeHtml(lead.email || "")
  const safePhone = escapeHtml(lead.phone || "")
  const safeTiming = escapeHtml(lead.preferred_timing || "Flexible")

  await sendEmailWithRetry({
    from: EMAIL_FROM.NOTIFICATIONS,
    to: recipientEmail,
    subject: `New enquiry from ${lead.first_name || "a patient"} ${lead.last_name || ""} via your profile`,
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
            <a href="${appUrl}/clinic/inbox"
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
