import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAffiliateAudit } from "@/lib/affiliate-audit"

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
      // State machine violation from DB trigger
      if (error.message?.includes("Cannot change status")) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      return NextResponse.json({ error: "Failed to update payout" }, { status: 500 })
    }

    // If completed, atomically increment affiliate's total_paid
    if (status === "completed" && payout) {
      await supabase.rpc("increment_affiliate_paid", {
        aff_id: payout.affiliate_id,
        amount: payout.amount,
      })
    }

    // M4: Audit log
    if (payout) {
      logAffiliateAudit(supabase, {
        affiliate_id: payout.affiliate_id,
        action: `payout_${status}`,
        entity_type: "affiliate_payout",
        entity_id: payout.id,
        details: {
          amount: payout.amount,
          new_status: status,
          payment_reference: payment_reference || null,
        },
        performed_by: "admin",
      })
    }

    return NextResponse.json(payout)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
