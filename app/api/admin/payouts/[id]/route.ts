import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { z } from "zod"

const updateSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed"]),
  payment_reference: z.string().optional(),
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

    const updates: Record<string, any> = {
      status: parsed.data.status,
    }
    if (parsed.data.payment_reference) {
      updates.payment_reference = parsed.data.payment_reference
    }

    const { data: payout, error } = await supabase
      .from("affiliate_payouts")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      console.error("[Admin] Error updating payout:", error)
      return NextResponse.json({ error: "Failed to update payout" }, { status: 500 })
    }

    // If completed, update affiliate's total_paid
    if (parsed.data.status === "completed") {
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id, total_paid")
        .eq("id", payout.affiliate_id)
        .single()

      if (affiliate) {
        await supabase
          .from("affiliates")
          .update({
            total_paid: (affiliate.total_paid || 0) + (payout.amount || 0),
          })
          .eq("id", affiliate.id)
      }
    }

    return NextResponse.json({ payout })
  } catch (error) {
    console.error("[Admin] Error updating payout:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
