import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { referral_code, landing_page, utm_source, utm_medium, utm_campaign } = body

    if (!referral_code) {
      return NextResponse.json({ error: "Missing referral_code" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Look up the affiliate by referral code
    const { data: affiliate, error: affiliateError } = await supabase
      .from("affiliates")
      .select("id, status")
      .eq("referral_code", referral_code)
      .single()

    if (affiliateError || !affiliate) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 })
    }

    // Only track referrals for approved affiliates
    if (affiliate.status !== "approved") {
      return NextResponse.json({ error: "Affiliate not active" }, { status: 403 })
    }

    // Get visitor IP from headers
    const forwarded = request.headers.get("x-forwarded-for")
    const visitor_ip = forwarded?.split(",")[0]?.trim() || null

    // Insert the referral record
    const { error: insertError } = await supabase.from("referrals").insert({
      affiliate_id: affiliate.id,
      visitor_ip,
      landing_page: landing_page || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
    })

    if (insertError) {
      console.error("[Affiliate] Error tracking referral:", insertError)
      return NextResponse.json({ error: "Failed to track referral" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Affiliate] Error in track-referral:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
