import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get the affiliate record
    const { data: affiliate, error: affError } = await admin
      .from("affiliates")
      .select("id, total_earned, total_paid")
      .eq("user_id", user.id)
      .single()

    if (affError || !affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 })
    }

    // Get total clicks
    const { count: totalClicks } = await admin
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id)

    // Get total conversions (confirmed or paid)
    const { count: totalConversions } = await admin
      .from("referral_conversions")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id)
      .in("status", ["confirmed", "paid"])

    // Get pending earnings
    const { data: pendingData } = await admin
      .from("referral_conversions")
      .select("commission_amount")
      .eq("affiliate_id", affiliate.id)
      .eq("status", "pending_verification")

    const pendingEarnings = pendingData?.reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0

    const clicks = totalClicks || 0
    const conversions = totalConversions || 0
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0

    return NextResponse.json({
      stats: {
        total_clicks: clicks,
        total_conversions: conversions,
        conversion_rate: Math.round(conversionRate * 100) / 100,
        total_earned: affiliate.total_earned || 0,
        pending_earnings: pendingEarnings,
        total_paid: affiliate.total_paid || 0,
      },
    })
  } catch (error) {
    console.error("[Affiliate] Error fetching stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
