import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateOTP, hashOTP, canSendOTP } from "@/lib/otp/generate"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { createRateLimiter } from "@/lib/rate-limit"

const ipLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxAttempts: 10 })

export async function POST(request: NextRequest) {
  const OTP_SECRET = process.env.SUPABASE_JWT_SECRET
  if (!OTP_SECRET) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }
  try {
    // IP-based rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const { limited, retryAfterSecs } = ipLimiter.check(ip)
    if (limited) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${retryAfterSecs}s.` },
        { status: 429 },
      )
    }
    ipLimiter.record(ip)

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Find the most recent verified lead with this email
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, email, verification_sent_at, verification_attempts, is_verified")
      .eq("email", email.toLowerCase())
      .eq("is_verified", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (leadError || !lead) {
      // Don't reveal whether an account exists — send a generic success response
      // This prevents email enumeration attacks
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a verification code has been sent.",
        email: email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
      })
    }

    // Check rate limiting on the lead
    const rateCheck = canSendOTP(lead.verification_sent_at, lead.verification_attempts)
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.reason }, { status: 429 })
    }

    // Generate OTP
    const otp = generateOTP()
    const otpHash = hashOTP(otp, OTP_SECRET)
    const now = new Date().toISOString()

    // Store OTP hash
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        otp_hash: otpHash,
        verification_sent_at: now,
        verification_attempts: 0,
      })
      .eq("id", lead.id)

    if (updateError) {
      console.error("[Patient OTP] Failed to store OTP:", updateError)
      return NextResponse.json({ error: "Failed to generate verification code" }, { status: 500 })
    }

    // Send OTP email
    {
      const emailResult = await sendRegisteredEmail({
        type: EMAIL_TYPE.PATIENT_LOGIN_OTP,
        to: email,
        data: { otp, _email: email },
      })

      if (!emailResult.success) {
        console.error("[Patient OTP] Email send failed:", emailResult.error)
        return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
      email: email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
      leadId: lead.id,
    })
  } catch (error) {
    console.error("[Patient OTP] Unexpected error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
