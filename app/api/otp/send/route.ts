import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Resend } from "resend"
import { generateOTP, hashOTP, canSendOTP } from "@/lib/otp/generate"

const resend = new Resend(process.env.RESEND_API_KEY)
const OTP_SECRET = process.env.SUPABASE_JWT_SECRET || "fallback-secret-key"

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

    const supabase = await createClient()

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
    
    console.log("[v0] OTP generated for lead:", leadId, "OTP:", otp, "Hash:", otpHash.substring(0, 16) + "...")

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
      await resend.emails.send({
        from: "Pearlie <verify@pearlie.org>",
        to: email,
        subject: "Your Pearlie verification code",
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
                Here's your verification code to view your matched dental clinics:
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
