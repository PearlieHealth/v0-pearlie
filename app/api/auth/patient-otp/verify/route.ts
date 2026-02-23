import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyOTPHash, isOTPExpired } from "@/lib/otp/generate"

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

    const normalizedOTP = String(otp).trim()
    if (!/^\d{6}$/.test(normalizedOTP)) {
      return NextResponse.json({ error: "Invalid verification code format" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, email, first_name, last_name, otp_hash, verification_sent_at, verification_attempts, is_verified, user_id")
      .eq("id", leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Check attempts
    if (lead.verification_attempts >= 5) {
      return NextResponse.json({ error: "Too many failed attempts. Please request a new code." }, { status: 429 })
    }

    if (!lead.otp_hash || !lead.verification_sent_at) {
      return NextResponse.json({ error: "No verification code found. Please request a new one." }, { status: 400 })
    }

    if (isOTPExpired(new Date(lead.verification_sent_at))) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one.", expired: true },
        { status: 400 },
      )
    }

    const isValid = verifyOTPHash(normalizedOTP, lead.otp_hash, OTP_SECRET)

    if (!isValid) {
      await supabase
        .from("leads")
        .update({ verification_attempts: lead.verification_attempts + 1 })
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

    // OTP valid — ensure auth user exists before clearing hash
    // (If token generation fails, patient can retry with the same code)
    let userId = lead.user_id
    if (!userId && lead.email) {
      try {
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

        if (!createError && newUser?.user) {
          userId = newUser.user.id
        } else if (createError?.message?.toLowerCase().includes("already")) {
          // User already exists — look up by email using admin getUserByEmail
          // (not available in all Supabase versions, so fall back to paginated list)
          try {
            const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
            const existing = users?.users?.find(
              (u) => u.email?.toLowerCase() === lead.email?.toLowerCase()
            )
            if (existing) {
              userId = existing.id
              // Ensure patient role is set
              await supabase.auth.admin.updateUser(existing.id, {
                user_metadata: { ...existing.user_metadata, role: "patient" },
              }).catch(() => {})
            }
          } catch {
            // Non-critical — we still generated a session token below
          }
        }

        if (userId && userId !== lead.user_id) {
          await supabase.from("leads").update({ user_id: userId }).eq("id", leadId)
        }
      } catch (accountError) {
        console.error("[Patient OTP Verify] Error ensuring auth user:", accountError)
      }
    }

    // Generate magic link token for browser session
    let tokenHash: string | undefined
    if (lead.email) {
      try {
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: lead.email,
        })
        if (!linkError && linkData?.properties?.hashed_token) {
          tokenHash = linkData.properties.hashed_token
        }
      } catch (tokenError) {
        console.error("[Patient OTP Verify] Error generating session token:", tokenError)
      }
    }

    // Only clear OTP hash after session token is confirmed — if token generation
    // failed, the patient can retry with the same code (attempts + expiry still apply)
    if (tokenHash) {
      await supabase
        .from("leads")
        .update({
          otp_hash: null,
          verification_attempts: 0,
        })
        .eq("id", leadId)
    }

    return NextResponse.json({
      success: true,
      tokenHash,
      email: lead.email,
    })
  } catch (error) {
    console.error("[Patient OTP Verify] Unexpected error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
