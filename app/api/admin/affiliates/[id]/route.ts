import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { z } from "zod"

const updateSchema = z.object({
  status: z.enum(["pending", "approved", "suspended"]).optional(),
  commission_per_booking: z.number().min(0).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const updates: Record<string, any> = {}
    if (parsed.data.status !== undefined) updates.status = parsed.data.status
    if (parsed.data.commission_per_booking !== undefined) {
      updates.commission_per_booking = parsed.data.commission_per_booking
    }

    const { data: affiliate, error } = await supabase
      .from("affiliates")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      console.error("[Admin] Error updating affiliate:", error)
      return NextResponse.json({ error: "Failed to update affiliate" }, { status: 500 })
    }

    return NextResponse.json({ affiliate })
  } catch (error) {
    console.error("[Admin] Error updating affiliate:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: affiliate, error } = await supabase
      .from("affiliates")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 })
    }

    // Get referral stats
    const { count: totalClicks } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", id)

    const { count: totalConversions } = await supabase
      .from("referral_conversions")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", id)
      .in("status", ["confirmed", "paid"])

    return NextResponse.json({
      affiliate: {
        ...affiliate,
        total_clicks: totalClicks || 0,
        total_conversions: totalConversions || 0,
      },
    })
  } catch (error) {
    console.error("[Admin] Error fetching affiliate:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
