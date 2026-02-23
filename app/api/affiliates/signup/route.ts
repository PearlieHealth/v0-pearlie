import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { generateReferralCode } from "@/lib/affiliates/referral-code"
import { z } from "zod"

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional().default(""),
  tiktok_handle: z.string().optional().default(""),
  instagram_handle: z.string().optional().default(""),
  youtube_handle: z.string().optional().default(""),
  motivation: z.string().optional().default(""),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = signupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, phone, tiktok_handle, instagram_handle, youtube_handle, motivation } = parsed.data

    const supabase = createAdminClient()

    // Check if email already exists
    const { data: existing } = await supabase
      .from("affiliates")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .maybeSingle()

    if (existing) {
      if (existing.status === "pending") {
        return NextResponse.json(
          { error: "You've already applied. We'll review your application and get back to you within 48 hours." },
          { status: 409 }
        )
      }
      if (existing.status === "approved") {
        return NextResponse.json(
          { error: "You already have an active affiliate account. Please log in to your dashboard." },
          { status: 409 }
        )
      }
      if (existing.status === "suspended") {
        return NextResponse.json(
          { error: "Your affiliate account has been suspended. Please contact us for more information." },
          { status: 409 }
        )
      }
    }

    // Generate a unique referral code (retry up to 5 times if collision)
    let referral_code = ""
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateReferralCode()
      const { data: codeExists } = await supabase
        .from("affiliates")
        .select("id")
        .eq("referral_code", code)
        .maybeSingle()

      if (!codeExists) {
        referral_code = code
        break
      }
    }

    if (!referral_code) {
      return NextResponse.json(
        { error: "Failed to generate referral code. Please try again." },
        { status: 500 }
      )
    }

    // Insert the affiliate
    const { data: affiliate, error: insertError } = await supabase
      .from("affiliates")
      .insert({
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        tiktok_handle: tiktok_handle || null,
        instagram_handle: instagram_handle || null,
        youtube_handle: youtube_handle || null,
        motivation: motivation || null,
        referral_code,
        status: "pending",
      })
      .select("id, referral_code")
      .single()

    if (insertError) {
      console.error("[Affiliate] Error creating affiliate:", insertError)
      return NextResponse.json({ error: "Failed to create affiliate" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Thanks for applying! We'll review your application and get back to you within 48 hours.",
      affiliate_id: affiliate.id,
    })
  } catch (error) {
    console.error("[Affiliate] Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
