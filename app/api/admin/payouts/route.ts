import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { logAffiliateAudit } from "@/lib/affiliate-audit"

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

    if (!period_start || !period_end) {
      return NextResponse.json({ error: "Period start and end are required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Validate: payout amount must match confirmed conversions in period
    const { data: conversions } = await supabase
      .from("referral_conversions")
      .select("commission_amount")
      .eq("affiliate_id", affiliate_id)
      .eq("status", "confirmed")
      .gte("confirmed_at", period_start)
      .lte("confirmed_at", period_end)

    const confirmedTotal = (conversions || []).reduce(
      (sum: number, c: { commission_amount: number }) => sum + (c.commission_amount || 0),
      0
    )

    if (confirmedTotal <= 0) {
      return NextResponse.json(
        { error: "No confirmed conversions found for this period" },
        { status: 400 }
      )
    }

    // Allow partial payouts but not overpayment
    if (amount > confirmedTotal + 0.01) {
      return NextResponse.json(
        { error: `Payout amount (£${amount}) exceeds confirmed commissions (£${confirmedTotal.toFixed(2)}) for this period` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("affiliate_payouts")
      .insert({
        affiliate_id,
        amount,
        payment_method: payment_method || null,
        period_start,
        period_end,
        status: "pending",
      })
      .select("*")
      .single()

    if (error) {
      // Unique constraint violation = duplicate payout for this period
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A payout already exists for this affiliate and period" },
          { status: 409 }
        )
      }
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

    // M4: Audit log
    logAffiliateAudit(supabase, {
      affiliate_id,
      action: "payout_created",
      entity_type: "affiliate_payout",
      entity_id: data.id,
      details: {
        amount,
        period_start,
        period_end,
        payment_method: payment_method || null,
        confirmed_total: confirmedTotal,
      },
      performed_by: "admin",
    })

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
