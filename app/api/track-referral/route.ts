import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { referral_code, landing_page, utm_source, utm_medium, utm_campaign } = body

    if (!referral_code) {
      return NextResponse.json({ error: "Missing referral code" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Look up affiliate by referral code
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id")
      .eq("referral_code", referral_code)
      .eq("status", "approved")
      .single()

    if (!affiliate) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 })
    }

    // Insert referral record
    await supabase.from("referrals").insert({
      affiliate_id: affiliate.id,
      landing_page: landing_page || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
