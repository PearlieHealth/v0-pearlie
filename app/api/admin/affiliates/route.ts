import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

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
      return NextResponse.json({ error: "Failed to fetch affiliates" }, { status: 500 })
    }

    // Enrich with click counts
    const enriched = await Promise.all(
      (affiliates || []).map(async (aff) => {
        const { count: clicks } = await supabase
          .from("referrals")
          .select("*", { count: "exact", head: true })
          .eq("affiliate_id", aff.id)

        const { count: conversions } = await supabase
          .from("referral_conversions")
          .select("*", { count: "exact", head: true })
          .eq("affiliate_id", aff.id)
          .in("status", ["confirmed", "paid"])

        return {
          ...aff,
          total_clicks: clicks || 0,
          total_conversions: conversions || 0,
        }
      })
    )

    return NextResponse.json(enriched)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
