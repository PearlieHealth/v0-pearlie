import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
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

    const supabase = createAdminClient()

    // Get lead with OTP data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, email, first_name, last_name, otp_hash, verification_sent_at, verification_attempts, is_verified, user_id")
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

    // OTP is valid - mark as verified
    const updateData: Record<string, any> = {
      is_verified: true,
      verified_at: new Date().toISOString(),
      otp_hash: null, // Clear OTP after successful verification
      verification_attempts: 0,
    }

    // Auto-create a Supabase auth user for the patient (if they don't have one yet)
    if (!lead.user_id && lead.email) {
      try {
        // Check if a user with this email already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(
          (u) => u.email?.toLowerCase() === lead.email?.toLowerCase()
        )

        if (existingUser) {
          // Link existing user to this lead
          updateData.user_id = existingUser.id
        } else {
          // Create a new auth user for this patient
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: lead.email,
            email_confirm: true, // Already verified via OTP
            user_metadata: {
              full_name: `${lead.first_name || ""} ${lead.last_name || ""}`.trim(),
              first_name: lead.first_name,
              last_name: lead.last_name,
              role: "patient",
            },
          })

          if (!createError && newUser?.user) {
            updateData.user_id = newUser.user.id
          } else {
            console.error("[OTP] Failed to create auth user:", createError)
            // Don't block verification if account creation fails
          }
        }
      } catch (accountError) {
        console.error("[OTP] Error creating patient account:", accountError)
        // Don't block verification if account creation fails
      }
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update(updateData)
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
