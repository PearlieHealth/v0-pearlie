import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { z } from "zod"

export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = createAdminClient()

    const { data: payouts, error } = await supabase
      .from("affiliate_payouts")
      .select(`
        *,
        affiliates:affiliate_id (name, email)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Admin] Error fetching payouts:", error)
      return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 })
    }

    return NextResponse.json({ payouts: payouts || [] })
  } catch (error) {
    console.error("[Admin] Error fetching payouts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const createPayoutSchema = z.object({
  affiliate_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_method: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
})

export async function POST(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const body = await request.json()
    const parsed = createPayoutSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: payout, error } = await supabase
      .from("affiliate_payouts")
      .insert({
        affiliate_id: parsed.data.affiliate_id,
        amount: parsed.data.amount,
        payment_method: parsed.data.payment_method || null,
        period_start: parsed.data.period_start || null,
        period_end: parsed.data.period_end || null,
        status: "pending",
      })
      .select("*")
      .single()

    if (error) {
      console.error("[Admin] Error creating payout:", error)
      return NextResponse.json({ error: "Failed to create payout" }, { status: 500 })
    }

    return NextResponse.json({ payout }, { status: 201 })
  } catch (error) {
    console.error("[Admin] Error creating payout:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
