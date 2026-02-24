import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateReferralCode } from "@/lib/affiliates/generate-referral-code"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, phone, tiktok_handle, instagram_handle, youtube_handle, motivation } = body

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check if email already exists
    const { data: existing } = await supabase
      .from("affiliates")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single()

    if (existing) {
      return NextResponse.json({ error: "An application with this email already exists" }, { status: 409 })
    }

    // Generate unique referral code (retry if collision)
    let referralCode = generateReferralCode()
    let attempts = 0
    while (attempts < 5) {
      const { data: codeExists } = await supabase
        .from("affiliates")
        .select("id")
        .eq("referral_code", referralCode)
        .single()
      if (!codeExists) break
      referralCode = generateReferralCode()
      attempts++
    }

    const { data, error } = await supabase
      .from("affiliates")
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        tiktok_handle: tiktok_handle?.trim() || null,
        instagram_handle: instagram_handle?.trim() || null,
        youtube_handle: youtube_handle?.trim() || null,
        motivation: motivation?.trim() || null,
        referral_code: referralCode,
        status: "pending",
      })
      .select("id, referral_code")
      .single()

    if (error) {
      console.error("Affiliate signup error:", error)
      return NextResponse.json({ error: "Failed to create application" }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id, referral_code: data.referral_code })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
