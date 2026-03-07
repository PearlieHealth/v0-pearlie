import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyOTPHash, isOTPExpired } from "@/lib/otp/generate"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { portalUrl } from "@/lib/clinic-url"
import { generateReplyToAddress } from "@/lib/email-reply-token"

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

    // Auto-create auth user so patient is logged in immediately after intake OTP.
    // Uses createUser + generateLink (no listUsers) — same pattern as patient-otp/verify.
    let tokenHash: string | undefined
    let sessionFailed = false
    if (lead.email) {
      try {
        // Create auth user if none exists yet
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: lead.email,
          email_confirm: true,
          user_metadata: {
            full_name: `${lead.first_name || ""} ${lead.last_name || ""}`.trim(),
            first_name: lead.first_name,
            last_name: lead.last_name,
            role: "patient",
          },
        })

        let userId: string | null = newUser?.user?.id || null

        if (createError && !createError.message?.toLowerCase().includes("already")) {
          console.error("[OTP] Error creating auth user:", createError)
        }

        // Generate magic link token for browser session.
        // Also resolves userId for existing users (avoids listUsers).
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: lead.email,
        })

        if (!linkError && linkData?.properties?.hashed_token) {
          tokenHash = linkData.properties.hashed_token
        }

        // Resolve user ID from generateLink response (works for both new + existing users)
        if (!linkError && linkData?.user?.id && !userId) {
          userId = linkData.user.id
          // Ensure patient role is set on existing user
          await supabase.auth.admin.updateUser(userId, {
            user_metadata: { ...(linkData.user.user_metadata || {}), role: "patient" },
          }).catch(() => {})
        }

        // Link auth user to lead
        if (userId) {
          await supabase.from("leads").update({ user_id: userId }).eq("id", leadId)
        }
      } catch (accountError) {
        console.error("[OTP] Error creating account/session:", accountError)
        sessionFailed = true
      }
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
      tokenHash,
      sessionFailed,
    })
  } catch (error) {
    console.error("[OTP] Unexpected error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

/**
 * Send a notification email to the clinic when a direct profile lead verifies their email.
 * Uses the registered DIRECT_LEAD_NOTIFICATION email type for full logging, idempotency,
 * and notification preference checks.
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
    .select("name, notification_email, email")
    .eq("id", matchResult.clinic_id)
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
    .eq("clinic_id", matchResult.clinic_id)
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
      // Metadata fields for idempotency (prefixed with _)
      _leadId: lead.id,
      _clinicId: matchResult.clinic_id,
    },
    replyTo,
    clinicId: matchResult.clinic_id,
    leadId: lead.id,
  })
}
