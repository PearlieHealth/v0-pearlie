import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"

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

    // Mark confirmed conversions within the period as paid
    if (period_start && period_end) {
      await supabase
        .from("referral_conversions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("affiliate_id", affiliate_id)
        .eq("status", "confirmed")
        .gte("confirmed_at", period_start)
        .lte("confirmed_at", period_end)
    }

    // Send payout notification email to affiliate (non-blocking)
    try {
      const { data: affProfile } = await supabase
        .from("affiliates")
        .select("name, email")
        .eq("id", affiliate_id)
        .single()

      if (affProfile?.email && period_start && period_end) {
        sendRegisteredEmail({
          type: EMAIL_TYPE.AFFILIATE_PAYOUT,
          to: affProfile.email,
          data: {
            affiliateName: affProfile.name,
            amount,
            periodStart: period_start,
            periodEnd: period_end,
            _payoutId: data.id,
          },
        }).catch(() => {})
      }
    } catch {
      // Non-blocking
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
