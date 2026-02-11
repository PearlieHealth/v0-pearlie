import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyOTPHash, isOTPExpired } from "@/lib/otp/generate"

const OTP_SECRET = process.env.SUPABASE_JWT_SECRET || "fallback-secret-key"

export async function POST(request: NextRequest) {
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

    const supabase = await createClient()

    // Get lead with OTP data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, otp_hash, verification_sent_at, verification_attempts, is_verified")
      .eq("id", leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Already verified
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
    console.log("[v0] Verifying OTP for lead:", leadId, "Submitted OTP:", normalizedOTP, "Stored hash:", lead.otp_hash?.substring(0, 16) + "...")
    const isValid = verifyOTPHash(normalizedOTP, lead.otp_hash, OTP_SECRET)
    console.log("[v0] OTP verification result:", isValid)

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

    // OTP is valid - mark as verified
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        otp_hash: null, // Clear OTP after successful verification
        verification_attempts: 0,
      })
      .eq("id", leadId)

    if (updateError) {
      console.error("[OTP] Failed to update verification status:", updateError)
      return NextResponse.json({ error: "Failed to verify email" }, { status: 500 })
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
