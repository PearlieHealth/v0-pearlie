import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const { status, payment_reference } = body

    if (!status || !["processing", "completed", "failed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const updates: Record<string, unknown> = { status }
    if (payment_reference) updates.payment_reference = payment_reference

    const { data: payout, error } = await supabase
      .from("affiliate_payouts")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to update payout" }, { status: 500 })
    }

    // If completed, update affiliate's total_paid
    if (status === "completed" && payout) {
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("total_paid")
        .eq("id", payout.affiliate_id)
        .single()

      if (affiliate) {
        await supabase
          .from("affiliates")
          .update({ total_paid: (affiliate.total_paid || 0) + payout.amount })
          .eq("id", payout.affiliate_id)
      }
    }

    return NextResponse.json(payout)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
