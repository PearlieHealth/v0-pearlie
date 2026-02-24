import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get affiliate record
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, total_earned, total_paid")
      .eq("user_id", user.id)
      .single()

    if (!affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 })
    }

    // Count clicks
    const { count: totalClicks } = await supabase
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id)

    // Count conversions
    const { count: totalConversions } = await supabase
      .from("referral_conversions")
      .select("*", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id)
      .in("status", ["confirmed", "paid"])

    // Pending earnings
    const { data: pendingData } = await supabase
      .from("referral_conversions")
      .select("commission_amount")
      .eq("affiliate_id", affiliate.id)
      .eq("status", "pending_verification")

    const pendingEarnings = pendingData?.reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0

    const clicks = totalClicks || 0
    const conversions = totalConversions || 0

    return NextResponse.json({
      total_clicks: clicks,
      total_conversions: conversions,
      conversion_rate: clicks > 0 ? Math.round((conversions / clicks) * 10000) / 100 : 0,
      total_earned: affiliate.total_earned || 0,
      pending_earnings: pendingEarnings,
      total_paid: affiliate.total_paid || 0,
    })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
