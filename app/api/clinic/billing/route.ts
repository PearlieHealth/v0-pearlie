import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"
import { getStripe, calculateMonthlyCharge, PLANS, TRIAL_BOOKING_CAP, type PlanType } from "@/lib/stripe"
import { formatAmountGBP, isInTrialPeriod } from "@/lib/billing"

/**
 * GET /api/clinic/billing
 *
 * Returns the billing overview for the authenticated clinic:
 * - Subscription status, plan tier, trial info
 * - Tiered billing estimate for current month
 * - Booking charges with dispute status
 * - Payment method info
 * - Monthly invoice history
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

    // Self-heal: if DB says incomplete but Stripe has active/trialing subscription
    if (subscription && subscription.status === "incomplete" && subscription.stripe_customer_id) {
      try {
        const stripe = getStripe()
        // Check for active
        const activeSubs = await stripe.subscriptions.list({
          customer: subscription.stripe_customer_id,
          limit: 1,
        })
        if (activeSubs.data.length > 0) {
          const stripeSub = activeSubs.data[0] as unknown as {
            id: string; status: string; metadata: Record<string, string>;
            current_period_start: number; current_period_end: number;
            cancel_at_period_end: boolean;
          }
          const statusMap: Record<string, string> = {
            active: "active",
            trialing: "trialing",
            past_due: "past_due",
          }
          const mappedStatus = statusMap[stripeSub.status]
          if (mappedStatus) {
            const updated = {
              stripe_subscription_id: stripeSub.id,
              status: mappedStatus,
              plan_type: stripeSub.metadata?.plan_type || subscription.plan_type || "starter",
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
        }
      } catch (syncErr) {
        console.error("[clinic/billing] Stripe sync error (non-fatal):", syncErr)
      }
    }

    // Get booking charges for this month (non-trial)
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

    // Calculate billing estimate for current month
    const planType = (subscription?.plan_type || "starter") as PlanType
    const plan = PLANS[planType] || PLANS.starter
    const inTrial = isInTrialPeriod(subscription?.trial_ends_at ?? null)

    // Count confirmed (billable, non-trial) bookings this month
    const billableCharges = charges?.filter(
      c => !c.is_trial_booking && ["auto_confirmed", "confirmed"].includes(c.attendance_status)
    ) || []
    const trialCharges = charges?.filter(c => c.is_trial_booking) || []
    const disputedCharges = charges?.filter(
      c => ["not_attended", "exempt", "disputed"].includes(c.attendance_status)
    ) || []

    const confirmedCount = billableCharges.length
    const estimate = calculateMonthlyCharge(planType, confirmedCount)

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

    // Get monthly invoices from our table
    const { data: monthlyInvoices } = await supabase
      .from("monthly_invoices")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("billing_period", { ascending: false })
      .limit(12)

    // Also get Stripe invoices for the subscription itself
    let stripeInvoices: Array<{
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
        const invoiceList = await stripe.invoices.list({
          customer: subscription.stripe_customer_id,
          limit: 12,
        })
        stripeInvoices = invoiceList.data.map(inv => ({
          id: inv.id,
          number: inv.number,
          amount_due: inv.amount_due,
          amount_paid: inv.amount_paid,
          status: inv.status as string | null,
          created: inv.created,
          hosted_invoice_url: inv.hosted_invoice_url ?? null,
          invoice_pdf: inv.invoice_pdf ?? null,
        }))
      } catch {
        // Silently fail
      }
    }

    // Trial days remaining
    let trialDaysRemaining = 0
    if (inTrial && subscription?.trial_ends_at) {
      trialDaysRemaining = Math.max(
        0,
        Math.ceil((new Date(subscription.trial_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      )
    }

    return NextResponse.json({
      clinic_id: clinicId,
      subscription: subscription
        ? {
            status: subscription.status,
            plan_type: subscription.plan_type,
            plan_name: plan.name,
            base_price_pence: plan.basePricePence,
            included_bookings: plan.includedBookings,
            extra_booking_fee_pence: plan.extraBookingFeePence,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            has_stripe_customer: !!subscription.stripe_customer_id,
            // Trial info
            in_trial: inTrial,
            trial_ends_at: subscription.trial_ends_at,
            trial_days_remaining: trialDaysRemaining,
            trial_bookings_used: subscription.trial_bookings_used ?? 0,
            trial_booking_cap: TRIAL_BOOKING_CAP,
            // Legacy compatibility
            free_leads_used: subscription.free_leads_used ?? 0,
            free_leads_limit: subscription.free_leads_limit ?? TRIAL_BOOKING_CAP,
          }
        : null,
      // Current month billing estimate
      estimate: {
        confirmed_bookings: confirmedCount,
        included_bookings: plan.includedBookings,
        overage_bookings: estimate.overageCount,
        base_amount_pence: estimate.basePence,
        base_amount_formatted: formatAmountGBP(estimate.basePence),
        overage_amount_pence: estimate.overagePence,
        overage_amount_formatted: formatAmountGBP(estimate.overagePence),
        total_pence: estimate.totalPence,
        total_formatted: formatAmountGBP(estimate.totalPence),
        plan_base_formatted: formatAmountGBP(plan.basePricePence),
      },
      charges: charges || [],
      summary: {
        total_count: charges?.length || 0,
        billable_count: confirmedCount,
        trial_count: trialCharges.length,
        disputed_count: disputedCharges.length,
        estimated_bill_formatted: inTrial ? "£0.00 (trial)" : formatAmountGBP(estimate.totalPence),
        estimated_bill_pence: inTrial ? 0 : estimate.totalPence,
      },
      payment_method: paymentMethod,
      monthly_invoices: monthlyInvoices || [],
      invoices: stripeInvoices,
    })
  } catch (error) {
    console.error("[clinic/billing] Error:", error)
    return NextResponse.json({ error: "Failed to fetch billing data" }, { status: 500 })
  }
}
