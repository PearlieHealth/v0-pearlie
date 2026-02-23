import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = createAdminClient()

    const { data: conversions, error } = await supabase
      .from("referral_conversions")
      .select(`
        *,
        affiliates:affiliate_id (name, email, referral_code)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Admin] Error fetching conversions:", error)
      return NextResponse.json({ error: "Failed to fetch conversions" }, { status: 500 })
    }

    return NextResponse.json({ conversions: conversions || [] })
  } catch (error) {
    console.error("[Admin] Error fetching conversions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
