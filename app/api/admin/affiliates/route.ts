import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = createAdminClient()

    const { data: affiliates, error } = await supabase
      .from("affiliates")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Admin] Error fetching affiliates:", error)
      return NextResponse.json({ error: "Failed to fetch affiliates" }, { status: 500 })
    }

    // Get click counts for each affiliate
    const affiliateIds = (affiliates || []).map((a) => a.id)

    let clickCounts: Record<string, number> = {}
    if (affiliateIds.length > 0) {
      const { data: clicks } = await supabase
        .from("referrals")
        .select("affiliate_id")
        .in("affiliate_id", affiliateIds)

      if (clicks) {
        for (const click of clicks) {
          clickCounts[click.affiliate_id] = (clickCounts[click.affiliate_id] || 0) + 1
        }
      }
    }

    const enriched = (affiliates || []).map((a) => ({
      ...a,
      total_clicks: clickCounts[a.id] || 0,
    }))

    return NextResponse.json({ affiliates: enriched })
  } catch (error) {
    console.error("[Admin] Error fetching affiliates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
