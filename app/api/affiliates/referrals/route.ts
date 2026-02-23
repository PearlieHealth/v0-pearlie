import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get the affiliate
    const { data: affiliate } = await admin
      .from("affiliates")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 })
    }

    // Pagination
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    // Date filter
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    let query = admin
      .from("referrals")
      .select("*", { count: "exact" })
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (from) query = query.gte("created_at", from)
    if (to) query = query.lte("created_at", to)

    const { data: referrals, count, error } = await query

    if (error) {
      console.error("[Affiliate] Error fetching referrals:", error)
      return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 })
    }

    return NextResponse.json({
      referrals: referrals || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error("[Affiliate] Error fetching referrals:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
