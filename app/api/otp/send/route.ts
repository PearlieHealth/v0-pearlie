import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateOTP, hashOTP, canSendOTP } from "@/lib/otp/generate"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
const OTP_SECRET = process.env.SUPABASE_JWT_SECRET!
if (!OTP_SECRET) throw new Error("SUPABASE_JWT_SECRET environment variable is required")

export async function POST(request: NextRequest) {
  try {
    const { leadId, email } = await request.json()

    if (!leadId || !email) {
      return NextResponse.json({ error: "Lead ID and email are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get lead and check rate limits
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, verification_sent_at, verification_attempts, is_verified")
      .eq("id", leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Already verified
    if (lead.is_verified) {
      return NextResponse.json({ error: "Email already verified", alreadyVerified: true }, { status: 400 })
    }

    // Check rate limiting
    const rateCheck = canSendOTP(lead.verification_sent_at, lead.verification_attempts)
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.reason }, { status: 429 })
    }

    // Generate OTP
    const otp = generateOTP()
    const otpHash = hashOTP(otp, OTP_SECRET)
    const now = new Date().toISOString()
    
    console.log("[OTP] Code generated for lead:", leadId)

    // Store OTP hash and update verification tracking FIRST before sending email
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        verification_email: email,
        verification_sent_at: now,
        otp_hash: otpHash,
        verification_attempts: 0, // Reset attempts when sending new OTP
      })
      .eq("id", leadId)

    if (updateError) {
      console.error("[OTP] Failed to store OTP:", updateError)
      return NextResponse.json({ error: "Failed to generate verification code" }, { status: 500 })
    }

    // Send OTP email via Resend (after DB is updated to ensure consistency)
    try {
      await sendRegisteredEmail({
        type: EMAIL_TYPE.INTAKE_OTP,
        to: email,
        data: { otp, _leadId: leadId, _email: email },
      })
    } catch (emailError) {
      console.error("[OTP] Failed to send email:", emailError)
      return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
      email: email.replace(/(.{2})(.*)(@.*)/, "$1***$3"), // Mask email for display
    })
  } catch (error) {
    console.error("[OTP] Unexpected error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
