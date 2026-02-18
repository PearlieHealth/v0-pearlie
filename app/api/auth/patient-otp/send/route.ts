import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateOTP, hashOTP, canSendOTP } from "@/lib/otp/generate"
import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"
import { createRateLimiter } from "@/lib/rate-limit"

const OTP_SECRET = process.env.SUPABASE_JWT_SECRET!
if (!OTP_SECRET) throw new Error("SUPABASE_JWT_SECRET environment variable is required")

const ipLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxAttempts: 10 })

export async function POST(request: NextRequest) {
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
    try {
      await sendEmailWithRetry({
        from: EMAIL_FROM.NOREPLY,
        to: email,
        subject: "Your Pearlie login code",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f7f4; margin: 0; padding: 40px 20px;">
            <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 24px; font-weight: 600; color: #1a1a1a; margin: 0;">Pearlie</h1>
              </div>

              <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6; margin-bottom: 24px;">
                Here's your login code for your Pearlie account:
              </p>

              <div style="background: #f8f7f4; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
              </div>

              <p style="font-size: 14px; color: #888; line-height: 1.5; margin-bottom: 8px;">
                This code expires in 10 minutes.
              </p>

              <p style="font-size: 14px; color: #888; line-height: 1.5;">
                If you didn't request this code, you can safely ignore this email.
              </p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

              <p style="font-size: 12px; color: #aaa; text-align: center;">
                Pearlie - Find your perfect dental clinic match
              </p>
            </div>
          </body>
          </html>
        `,
      })
    } catch (emailError) {
      console.error("[Patient OTP] Failed to send email:", emailError)
      return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 500 })
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
