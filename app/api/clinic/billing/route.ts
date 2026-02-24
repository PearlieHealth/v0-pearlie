import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"
import { getStripe } from "@/lib/stripe"
import { formatAmountGBP } from "@/lib/billing"

/**
 * GET /api/clinic/billing
 *
 * Returns the billing overview for the authenticated clinic:
 * - Subscription status, plan, next billing date
 * - Outstanding booking charges for current period
 * - Payment method info (last4, brand)
 * - Recent invoices from Stripe
 * - Booking charges with dispute status
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get clinic user
    const { data: clinicUser } = await supabase
      .from("clinic_users")
      .select("clinic_id, role")
      .eq("user_id", user.id)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "No clinic account found" }, { status: 404 })
    }

    const clinicId = clinicUser.clinic_id

    // Get subscription
    let { data: subscription } = await supabase
      .from("clinic_subscriptions")
      .select("*")
      .eq("clinic_id", clinicId)
      .single()

    // Self-heal: if DB says incomplete but Stripe subscription is actually active,
    // sync the status (handles case where webhook didn't fire, e.g. sandbox)
    if (subscription && subscription.status === "incomplete" && subscription.stripe_customer_id) {
      try {
        const stripe = getStripe()
        const subs = await stripe.subscriptions.list({
          customer: subscription.stripe_customer_id,
          status: "active",
          limit: 1,
        })
        if (subs.data.length > 0) {
          const stripeSub = subs.data[0]
          const updated = {
            stripe_subscription_id: stripeSub.id,
            status: "active" as const,
            plan_type: stripeSub.metadata?.plan_type || subscription.plan_type || "basic",
            current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: stripeSub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }
          await supabase
            .from("clinic_subscriptions")
            .update(updated)
            .eq("clinic_id", clinicId)
          subscription = { ...subscription, ...updated }
        }
      } catch (syncErr) {
        console.error("[clinic/billing] Stripe sync error (non-fatal):", syncErr)
      }
    }

    // Get booking charges for this month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const { data: charges } = await supabase
      .from("booking_charges")
      .select("*")
      .eq("clinic_id", clinicId)
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd)
      .order("created_at", { ascending: false })

    // Calculate summary
    const totalCharges = charges?.reduce((sum, c) => sum + c.amount, 0) || 0
    const refundedCharges = charges?.filter(c => c.refund_status === "refunded").reduce((sum, c) => sum + (c.refund_amount || c.amount), 0) || 0
    const confirmedCount = charges?.filter(c => ["auto_confirmed", "confirmed"].includes(c.attendance_status)).length || 0
    const disputedCount = charges?.filter(c => ["not_attended", "exempt", "disputed"].includes(c.attendance_status)).length || 0

    // Get payment method info from Stripe
    let paymentMethod = null
    if (subscription?.stripe_customer_id) {
      try {
        const stripe = getStripe()
        const customer = await stripe.customers.retrieve(subscription.stripe_customer_id)
        if (!customer.deleted && customer.invoice_settings?.default_payment_method) {
          const pmId = typeof customer.invoice_settings.default_payment_method === "string"
            ? customer.invoice_settings.default_payment_method
            : customer.invoice_settings.default_payment_method.id
          const pm = await stripe.paymentMethods.retrieve(pmId)
          paymentMethod = {
            brand: pm.card?.brand || "unknown",
            last4: pm.card?.last4 || "****",
            exp_month: pm.card?.exp_month,
            exp_year: pm.card?.exp_year,
          }
        }
      } catch {
        // Silently fail — payment method info is optional
      }
    }

    // Get recent invoices from Stripe
    let invoices: Array<{
      id: string
      number: string | null
      amount_due: number
      amount_paid: number
      status: string | null
      created: number
      hosted_invoice_url: string | null
      invoice_pdf: string | null
    }> = []

    if (subscription?.stripe_customer_id) {
      try {
        const stripe = getStripe()
        const stripeInvoices = await stripe.invoices.list({
          customer: subscription.stripe_customer_id,
          limit: 12,
        })
        invoices = stripeInvoices.data.map(inv => ({
          id: inv.id,
          number: inv.number,
          amount_due: inv.amount_due,
          amount_paid: inv.amount_paid,
          status: inv.status,
          created: inv.created,
          hosted_invoice_url: inv.hosted_invoice_url,
          invoice_pdf: inv.invoice_pdf,
        }))
      } catch {
        // Silently fail
      }
    }

    return NextResponse.json({
      clinic_id: clinicId,
      subscription: subscription
        ? {
            status: subscription.status,
            plan_type: subscription.plan_type,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            has_stripe_customer: !!subscription.stripe_customer_id,
            free_leads_used: subscription.free_leads_used ?? 0,
            free_leads_limit: subscription.free_leads_limit ?? 3,
          }
        : null,
      charges: charges || [],
      summary: {
        total_charges_formatted: formatAmountGBP(totalCharges),
        total_charges_pence: totalCharges,
        total_refunds_formatted: formatAmountGBP(refundedCharges),
        total_refunds_pence: refundedCharges,
        net_charges_formatted: formatAmountGBP(totalCharges - refundedCharges),
        net_charges_pence: totalCharges - refundedCharges,
        confirmed_count: confirmedCount,
        disputed_count: disputedCount,
        total_count: charges?.length || 0,
      },
      payment_method: paymentMethod,
      invoices,
    })
  } catch (error) {
    console.error("[clinic/billing] Error:", error)
    return NextResponse.json({ error: "Failed to fetch billing data" }, { status: 500 })
  }
}
