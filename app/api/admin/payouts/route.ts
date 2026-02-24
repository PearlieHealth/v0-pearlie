import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("affiliate_payouts")
      .select("*, affiliates(name, email)")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const body = await request.json()
    const { affiliate_id, amount, payment_method, period_start, period_end } = body

    if (!affiliate_id || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid payout data" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("affiliate_payouts")
      .insert({
        affiliate_id,
        amount,
        payment_method: payment_method || null,
        period_start: period_start || null,
        period_end: period_end || null,
        status: "pending",
      })
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to create payout" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
