import { NextRequest, NextResponse } from "next/server"
import { getStripe, calculateMonthlyCharge, PLANS, type PlanType } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatAmountGBP } from "@/lib/billing"
import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"

/**
 * GET /api/cron/calculate-monthly-billing
 *
 * Runs on the 1st of each month. Calculates the previous month's charges
 * for each clinic based on their plan tier and confirmed bookings.
 *
 * For each clinic with an active subscription:
 * 1. Count confirmed bookings from previous month (non-trial, finalised/confirmed)
 * 2. Calculate charge using tiered pricing
 * 3. Create Stripe invoice with line items
 * 4. Record in monthly_invoices table
 * 5. Send billing summary email
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stripe = getStripe()
    const supabase = createAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://pearlie.org"

    // Calculate previous month's billing period
    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const billingPeriod = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`

    // Get all clinics with active subscriptions and a Stripe customer
    const { data: subscriptions, error: subError } = await supabase
      .from("clinic_subscriptions")
      .select("clinic_id, stripe_customer_id, plan_type, last_billed_period")
      .in("status", ["active", "trialing"])
      .not("stripe_customer_id", "is", null)

    if (subError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ processed: 0, message: "No active subscriptions" })
    }

    let invoiced = 0
    let skipped = 0
    let errors = 0

    for (const sub of subscriptions) {
      try {
        // Skip if already billed for this period
        if (sub.last_billed_period === billingPeriod) {
          skipped++
          continue
        }

        const planType = (sub.plan_type || "starter") as PlanType
        const plan = PLANS[planType] || PLANS.starter

        // Count confirmed bookings for the previous month (non-trial only)
        const { count: confirmedCount } = await supabase
          .from("booking_charges")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", sub.clinic_id)
          .eq("is_trial_booking", false)
          .in("attendance_status", ["auto_confirmed", "confirmed"])
          .gte("created_at", prevMonth.toISOString())
          .lte("created_at", prevMonthEnd.toISOString())

        const bookings = confirmedCount ?? 0

        // Calculate charge
        const { totalPence, basePence, overageCount, overagePence } =
          calculateMonthlyCharge(planType, bookings)

        // Create Stripe invoice
        let stripeInvoiceId: string | null = null
        let stripeInvoiceUrl: string | null = null
        let stripeInvoicePdf: string | null = null
        let invoiceStatus = "draft"

        if (totalPence > 0 && sub.stripe_customer_id) {
          try {
            // Add base tier charge as invoice item
            if (basePence > 0) {
              const bookingsInBase = Math.min(bookings, plan.includedBookings)
              await stripe.invoiceItems.create({
                customer: sub.stripe_customer_id,
                amount: basePence,
                currency: "gbp",
                description: `${plan.name} plan — ${bookingsInBase} confirmed booking${bookingsInBase !== 1 ? "s" : ""} (${billingPeriod})`,
                metadata: {
                  clinic_id: sub.clinic_id,
                  billing_period: billingPeriod,
                  type: "base_tier",
                  plan_type: planType,
                  bookings: String(bookingsInBase),
                },
              })
            }

            // Add overage charges as separate line item
            if (overagePence > 0) {
              await stripe.invoiceItems.create({
                customer: sub.stripe_customer_id,
                amount: overagePence,
                currency: "gbp",
                description: `${overageCount} extra confirmed booking${overageCount !== 1 ? "s" : ""} × £35 (${billingPeriod})`,
                metadata: {
                  clinic_id: sub.clinic_id,
                  billing_period: billingPeriod,
                  type: "overage",
                  overage_count: String(overageCount),
                },
              })
            }

            // Create and finalise the invoice
            const invoice = await stripe.invoices.create({
              customer: sub.stripe_customer_id,
              auto_advance: true, // Auto-charge
              collection_method: "charge_automatically",
              description: `Pearlie ${plan.name} plan — ${billingPeriod}`,
              metadata: {
                clinic_id: sub.clinic_id,
                billing_period: billingPeriod,
                plan_type: planType,
              },
            })

            // Finalise the invoice (triggers payment)
            const finalisedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)

            stripeInvoiceId = finalisedInvoice.id
            stripeInvoiceUrl = finalisedInvoice.hosted_invoice_url ?? null
            stripeInvoicePdf = finalisedInvoice.invoice_pdf ?? null
            invoiceStatus = finalisedInvoice.status === "paid" ? "paid" : "sent"
          } catch (stripeErr) {
            console.error(`[cron/calculate-monthly-billing] Stripe invoice error for clinic ${sub.clinic_id}:`, stripeErr)
            invoiceStatus = "failed"
          }
        } else if (totalPence === 0) {
          invoiceStatus = "void" // No charge needed
        }

        // Record in monthly_invoices table
        await supabase.from("monthly_invoices").upsert({
          clinic_id: sub.clinic_id,
          billing_period: billingPeriod,
          plan_type: planType,
          confirmed_bookings: bookings,
          included_bookings: plan.includedBookings,
          overage_bookings: overageCount,
          base_amount: basePence,
          overage_amount: overagePence,
          total_amount: totalPence,
          stripe_invoice_id: stripeInvoiceId,
          stripe_invoice_url: stripeInvoiceUrl,
          stripe_invoice_pdf: stripeInvoicePdf,
          status: invoiceStatus,
          updated_at: new Date().toISOString(),
        }, { onConflict: "clinic_id,billing_period" })

        // Update last billed period
        await supabase
          .from("clinic_subscriptions")
          .update({ last_billed_period: billingPeriod, updated_at: new Date().toISOString() })
          .eq("clinic_id", sub.clinic_id)

        // Log billing event
        await supabase.from("billing_events").insert({
          event_type: "monthly_invoice_created",
          clinic_id: sub.clinic_id,
          stripe_event_id: stripeInvoiceId,
          metadata: {
            billing_period: billingPeriod,
            plan_type: planType,
            confirmed_bookings: bookings,
            included_bookings: plan.includedBookings,
            overage_bookings: overageCount,
            base_amount: basePence,
            overage_amount: overagePence,
            total_amount: totalPence,
            invoice_status: invoiceStatus,
          },
        })

        // Send billing summary email
        try {
          const { data: clinic } = await supabase
            .from("clinics")
            .select("name, email, notification_email")
            .eq("id", sub.clinic_id)
            .single()

          if (clinic) {
            const clinicEmail = clinic.notification_email || clinic.email
            if (clinicEmail) {
              await sendEmailWithRetry({
                from: EMAIL_FROM.NOTIFICATIONS,
                to: clinicEmail,
                subject: totalPence > 0
                  ? `Your ${billingPeriod} invoice: ${formatAmountGBP(totalPence)}`
                  : `Your ${billingPeriod} billing summary — no charge`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
                    <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0 0 16px;">Monthly Billing Summary</h1>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">Hi ${clinic.name},</p>
                    <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
                      Here's your billing summary for <strong>${billingPeriod}</strong>:
                    </p>
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                      <table style="width: 100%; font-size: 14px;">
                        <tr>
                          <td style="padding: 6px 0; color: #666;">Plan</td>
                          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${plan.name}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #666;">Confirmed bookings</td>
                          <td style="padding: 6px 0; text-align: right; font-weight: 600;">${bookings}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #666;">Included in plan</td>
                          <td style="padding: 6px 0; text-align: right;">${plan.includedBookings}</td>
                        </tr>
                        ${overageCount > 0 ? `<tr>
                          <td style="padding: 6px 0; color: #666;">Extra bookings (× £35)</td>
                          <td style="padding: 6px 0; text-align: right;">${overageCount}</td>
                        </tr>` : ""}
                        <tr style="border-top: 2px solid #ddd;">
                          <td style="padding: 12px 0 6px; font-weight: 700; font-size: 16px;">Total</td>
                          <td style="padding: 12px 0 6px; text-align: right; font-weight: 700; font-size: 16px;">${formatAmountGBP(totalPence)}</td>
                        </tr>
                      </table>
                    </div>
                    <div style="text-align: center; margin-bottom: 32px;">
                      <a href="${appUrl}/clinic/billing" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 36px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 16px;">
                        View Billing Dashboard
                      </a>
                    </div>
                    <p style="font-size: 12px; color: #999; text-align: center;">
                      Pearlie &mdash; Your dental clinic partner
                    </p>
                  </div>
                `,
              })
            }
          }
        } catch (emailErr) {
          console.error(`[cron/calculate-monthly-billing] Email error for clinic ${sub.clinic_id}:`, emailErr)
        }

        invoiced++
      } catch (err) {
        console.error(`[cron/calculate-monthly-billing] Error for clinic ${sub.clinic_id}:`, err)
        errors++
      }
    }

    return NextResponse.json({
      billing_period: billingPeriod,
      total_clinics: subscriptions.length,
      invoiced,
      skipped,
      errors,
    })
  } catch (error) {
    console.error("[cron/calculate-monthly-billing] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
