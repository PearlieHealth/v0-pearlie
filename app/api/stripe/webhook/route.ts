import { NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import Stripe from "stripe"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const supabase = createAdminClient()

  let event: Stripe.Event

  try {
    const body = await request.text()
    const sig = request.headers.get("stripe-signature")

    if (!sig) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error("[stripe/webhook] Missing STRIPE_WEBHOOK_SECRET")
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
    }

    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      // ── Checkout completed (new subscription) ──
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const clinicId = session.metadata?.clinic_id
        if (!clinicId) break

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id

        if (subscriptionId) {
          // Fetch subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)

          await supabase
            .from("clinic_subscriptions")
            .upsert({
              clinic_id: clinicId,
              stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id || "",
              stripe_subscription_id: subscriptionId,
              plan_type: subscription.metadata?.plan_type || "basic",
              status: "active",
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            }, { onConflict: "clinic_id" })

          await supabase.from("billing_events").insert({
            event_type: "subscription_created",
            clinic_id: clinicId,
            stripe_event_id: event.id,
            metadata: {
              subscription_id: subscriptionId,
              plan_type: subscription.metadata?.plan_type || "basic",
            },
          })
        }
        break
      }

      // ── Invoice paid (subscription renewal) ──
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id

        if (!customerId) break

        const { data: sub } = await supabase
          .from("clinic_subscriptions")
          .select("clinic_id, stripe_subscription_id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (sub) {
          // Update subscription period
          if (invoice.lines?.data?.[0]) {
            const line = invoice.lines.data[0]
            await supabase
              .from("clinic_subscriptions")
              .update({
                status: "active",
                current_period_start: line.period?.start
                  ? new Date(line.period.start * 1000).toISOString()
                  : undefined,
                current_period_end: line.period?.end
                  ? new Date(line.period.end * 1000).toISOString()
                  : undefined,
                updated_at: new Date().toISOString(),
              })
              .eq("clinic_id", sub.clinic_id)
          }

          await supabase.from("billing_events").insert({
            event_type: "subscription_renewed",
            clinic_id: sub.clinic_id,
            stripe_event_id: event.id,
            metadata: {
              invoice_id: invoice.id,
              amount_paid: invoice.amount_paid,
            },
          })
        }
        break
      }

      // ── Invoice payment failed ──
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id

        if (!customerId) break

        const { data: sub } = await supabase
          .from("clinic_subscriptions")
          .select("clinic_id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (sub) {
          await supabase
            .from("clinic_subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("clinic_id", sub.clinic_id)

          await supabase.from("billing_events").insert({
            event_type: "payment_failed",
            clinic_id: sub.clinic_id,
            stripe_event_id: event.id,
            metadata: {
              invoice_id: invoice.id,
              amount_due: invoice.amount_due,
              attempt_count: invoice.attempt_count,
            },
          })
        }
        break
      }

      // ── Subscription updated ──
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id

        if (!customerId) break

        const { data: sub } = await supabase
          .from("clinic_subscriptions")
          .select("clinic_id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (sub) {
          const statusMap: Record<string, string> = {
            active: "active",
            past_due: "past_due",
            canceled: "cancelled",
            incomplete: "incomplete",
            trialing: "trialing",
            incomplete_expired: "cancelled",
            unpaid: "past_due",
            paused: "cancelled",
          }

          await supabase
            .from("clinic_subscriptions")
            .update({
              status: statusMap[subscription.status] || subscription.status,
              cancel_at_period_end: subscription.cancel_at_period_end,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("clinic_id", sub.clinic_id)
        }
        break
      }

      // ── Subscription deleted/cancelled ──
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id

        if (!customerId) break

        const { data: sub } = await supabase
          .from("clinic_subscriptions")
          .select("clinic_id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (sub) {
          await supabase
            .from("clinic_subscriptions")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("clinic_id", sub.clinic_id)

          await supabase.from("billing_events").insert({
            event_type: "subscription_cancelled",
            clinic_id: sub.clinic_id,
            stripe_event_id: event.id,
            metadata: { subscription_id: subscription.id },
          })
        }
        break
      }

      // ── Charge refunded ──
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id

        if (!paymentIntentId) break

        // Find the booking charge by payment intent
        const { data: bookingCharge } = await supabase
          .from("booking_charges")
          .select("id, clinic_id")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .single()

        if (bookingCharge) {
          await supabase
            .from("booking_charges")
            .update({
              refund_status: "refunded",
              refund_amount: charge.amount_refunded,
              refunded_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", bookingCharge.id)

          await supabase.from("billing_events").insert({
            event_type: "refund_issued",
            clinic_id: bookingCharge.clinic_id,
            booking_charge_id: bookingCharge.id,
            stripe_event_id: event.id,
            metadata: {
              refund_amount: charge.amount_refunded,
              payment_intent_id: paymentIntentId,
            },
          })
        }
        break
      }

      default:
        // Unhandled event type — log for debugging
        console.log(`[stripe/webhook] Unhandled event type: ${event.type}`)
    }
  } catch (handlerError) {
    console.error(`[stripe/webhook] Error handling ${event.type}:`, handlerError)
    // Return 200 anyway to prevent Stripe from retrying
  }

  return NextResponse.json({ received: true })
}
