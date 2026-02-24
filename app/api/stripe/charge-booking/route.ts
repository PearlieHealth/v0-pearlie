import { NextRequest, NextResponse } from "next/server"
import { getStripe, BOOKING_FEE_AMOUNT, CURRENCY, FREE_LEADS_LIMIT } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { getDisputeWindowEnd } from "@/lib/billing"

/**
 * POST /api/stripe/charge-booking
 *
 * Auto-charges the clinic for a confirmed booking.
 * Called internally when a patient booking is confirmed (ATTENDED status).
 *
 * First 3 leads are free (no charge). After that, £75 per booking.
 *
 * Body: { bookingId?, leadId, clinicId, patientName, treatment }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal call via secret or auth
    const authHeader = request.headers.get("authorization")
    const isInternalCall = authHeader === `Bearer ${process.env.CRON_SECRET}`

    // Also allow authenticated clinic users (for attendance-triggered charges)
    let userId: string | null = null
    if (!isInternalCall) {
      const { getAuthUser } = await import("@/lib/supabase/get-clinic-user")
      const user = await getAuthUser()
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = user.id
    }

    const body = await request.json()
    const { bookingId, leadId, clinicId, patientName, treatment } = body

    if (!clinicId) {
      return NextResponse.json({ error: "clinicId is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // If authenticated user, verify they own this clinic
    if (userId) {
      const { data: clinicUser } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", userId)
        .eq("clinic_id", clinicId)
        .single()

      if (!clinicUser) {
        return NextResponse.json({ error: "Unauthorized for this clinic" }, { status: 403 })
      }
    }

    // Check for duplicate charge (same lead + clinic)
    if (leadId) {
      const { data: existingCharge } = await supabase
        .from("booking_charges")
        .select("id")
        .eq("lead_id", leadId)
        .eq("clinic_id", clinicId)
        .single()

      if (existingCharge) {
        return NextResponse.json({
          success: true,
          message: "Charge already exists for this booking",
          chargeId: existingCharge.id,
          alreadyCharged: true,
        })
      }
    }

    // Get clinic subscription (or create a placeholder if none exists)
    let { data: sub } = await supabase
      .from("clinic_subscriptions")
      .select("stripe_customer_id, status, free_leads_used, free_leads_limit, trial_ends_at")
      .eq("clinic_id", clinicId)
      .single()

    // If no subscription record at all, create one (no-leads-no-sub: we track free leads even before Stripe setup)
    if (!sub) {
      const { data: newSub } = await supabase
        .from("clinic_subscriptions")
        .insert({
          clinic_id: clinicId,
          status: "incomplete",
          free_leads_used: 0,
          free_leads_limit: FREE_LEADS_LIMIT,
        })
        .select("stripe_customer_id, status, free_leads_used, free_leads_limit, trial_ends_at")
        .single()
      sub = newSub
    }

    const freeLeadsUsed = sub?.free_leads_used ?? 0
    const freeLeadsLimit = sub?.free_leads_limit ?? FREE_LEADS_LIMIT

    // ── FREE LEAD: first N leads are free ──
    if (freeLeadsUsed < freeLeadsLimit) {
      // Record as a £0 charge (free lead)
      const { data: charge } = await supabase
        .from("booking_charges")
        .insert({
          booking_id: bookingId || null,
          lead_id: leadId || null,
          clinic_id: clinicId,
          patient_name: patientName || null,
          treatment: treatment || null,
          amount: 0,
          currency: CURRENCY,
          attendance_status: "confirmed",
          is_finalised: true,
          dispute_window_ends_at: new Date().toISOString(),
        })
        .select("id")
        .single()

      // Increment free leads counter
      await supabase
        .from("clinic_subscriptions")
        .update({ free_leads_used: freeLeadsUsed + 1, updated_at: new Date().toISOString() })
        .eq("clinic_id", clinicId)

      await supabase.from("billing_events").insert({
        event_type: "free_lead_used",
        clinic_id: clinicId,
        booking_charge_id: charge?.id,
        metadata: {
          free_lead_number: freeLeadsUsed + 1,
          free_leads_limit: freeLeadsLimit,
          patient_name: patientName,
          treatment,
        },
      })

      return NextResponse.json({
        success: true,
        chargeId: charge?.id,
        freeLead: true,
        freeLeadsRemaining: freeLeadsLimit - (freeLeadsUsed + 1),
        message: `Free lead ${freeLeadsUsed + 1} of ${freeLeadsLimit}. No charge applied.`,
      })
    }

    // ── PAID LEADS: check subscription & charge ──

    if (!sub?.stripe_customer_id) {
      // No Stripe customer — create booking_charges record without charging
      const { data: charge } = await supabase
        .from("booking_charges")
        .insert({
          booking_id: bookingId || null,
          lead_id: leadId || null,
          clinic_id: clinicId,
          patient_name: patientName || null,
          treatment: treatment || null,
          amount: BOOKING_FEE_AMOUNT,
          currency: CURRENCY,
          attendance_status: "auto_confirmed",
          dispute_window_ends_at: getDisputeWindowEnd().toISOString(),
        })
        .select("id")
        .single()

      await supabase.from("billing_events").insert({
        event_type: "booking_charged",
        clinic_id: clinicId,
        booking_charge_id: charge?.id,
        metadata: {
          amount: BOOKING_FEE_AMOUNT,
          patient_name: patientName,
          treatment,
          payment_deferred: true,
        },
      })

      return NextResponse.json({
        success: true,
        chargeId: charge?.id,
        paymentDeferred: true,
        message: "Booking charge recorded. Payment will be collected when billing is set up.",
      })
    }

    // Check subscription is active or trialing
    if (sub.status !== "active" && sub.status !== "trialing") {
      const { data: charge } = await supabase
        .from("booking_charges")
        .insert({
          booking_id: bookingId || null,
          lead_id: leadId || null,
          clinic_id: clinicId,
          patient_name: patientName || null,
          treatment: treatment || null,
          amount: BOOKING_FEE_AMOUNT,
          currency: CURRENCY,
          attendance_status: "auto_confirmed",
          dispute_window_ends_at: getDisputeWindowEnd().toISOString(),
        })
        .select("id")
        .single()

      await supabase.from("billing_events").insert({
        event_type: "booking_charged",
        clinic_id: clinicId,
        booking_charge_id: charge?.id,
        metadata: {
          amount: BOOKING_FEE_AMOUNT,
          patient_name: patientName,
          treatment,
          subscription_inactive: true,
        },
      })

      return NextResponse.json({
        success: true,
        chargeId: charge?.id,
        paymentDeferred: true,
        message: "Booking charge recorded. Subscription is not active.",
      })
    }

    // During trial period, record charge but don't collect payment
    if (sub.status === "trialing") {
      const { data: charge } = await supabase
        .from("booking_charges")
        .insert({
          booking_id: bookingId || null,
          lead_id: leadId || null,
          clinic_id: clinicId,
          patient_name: patientName || null,
          treatment: treatment || null,
          amount: BOOKING_FEE_AMOUNT,
          currency: CURRENCY,
          attendance_status: "auto_confirmed",
          dispute_window_ends_at: getDisputeWindowEnd().toISOString(),
        })
        .select("id")
        .single()

      await supabase.from("billing_events").insert({
        event_type: "booking_charged",
        clinic_id: clinicId,
        booking_charge_id: charge?.id,
        metadata: {
          amount: BOOKING_FEE_AMOUNT,
          patient_name: patientName,
          treatment,
          trial_period: true,
          trial_ends_at: sub.trial_ends_at,
        },
      })

      return NextResponse.json({
        success: true,
        chargeId: charge?.id,
        paymentDeferred: true,
        trialPeriod: true,
        message: "Booking charge recorded. Payment deferred during trial period.",
      })
    }

    // Attempt Stripe charge
    const stripe = getStripe()

    let paymentIntentId: string | null = null
    let chargeId: string | null = null

    try {
      // Get customer's default payment method
      const customer = await stripe.customers.retrieve(sub.stripe_customer_id)
      if (customer.deleted) {
        throw new Error("Stripe customer has been deleted")
      }

      const defaultPaymentMethod =
        typeof customer.invoice_settings?.default_payment_method === "string"
          ? customer.invoice_settings.default_payment_method
          : customer.invoice_settings?.default_payment_method?.id

      if (!defaultPaymentMethod) {
        // No payment method on file — record charge without payment
        const { data: charge } = await supabase
          .from("booking_charges")
          .insert({
            booking_id: bookingId || null,
            lead_id: leadId || null,
            clinic_id: clinicId,
            patient_name: patientName || null,
            treatment: treatment || null,
            amount: BOOKING_FEE_AMOUNT,
            currency: CURRENCY,
            attendance_status: "auto_confirmed",
            dispute_window_ends_at: getDisputeWindowEnd().toISOString(),
          })
          .select("id")
          .single()

        await supabase.from("billing_events").insert({
          event_type: "booking_charged",
          clinic_id: clinicId,
          booking_charge_id: charge?.id,
          metadata: { amount: BOOKING_FEE_AMOUNT, no_payment_method: true },
        })

        return NextResponse.json({
          success: true,
          chargeId: charge?.id,
          paymentDeferred: true,
          message: "Booking charge recorded. No payment method on file.",
        })
      }

      // Create and confirm payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: BOOKING_FEE_AMOUNT,
        currency: CURRENCY,
        customer: sub.stripe_customer_id,
        payment_method: defaultPaymentMethod,
        off_session: true,
        confirm: true,
        description: `Pearlie booking fee: ${patientName || "Patient"} - ${treatment || "Treatment"}`,
        metadata: {
          clinic_id: clinicId,
          lead_id: leadId || "",
          booking_id: bookingId || "",
          type: "booking_fee",
        },
      })

      paymentIntentId = paymentIntent.id
      chargeId = paymentIntent.latest_charge as string | null
    } catch (stripeError: unknown) {
      console.error("[stripe/charge-booking] Stripe charge failed:", stripeError)
      // Record the charge without payment — will need manual resolution
      const { data: charge } = await supabase
        .from("booking_charges")
        .insert({
          booking_id: bookingId || null,
          lead_id: leadId || null,
          clinic_id: clinicId,
          patient_name: patientName || null,
          treatment: treatment || null,
          amount: BOOKING_FEE_AMOUNT,
          currency: CURRENCY,
          attendance_status: "auto_confirmed",
          dispute_window_ends_at: getDisputeWindowEnd().toISOString(),
        })
        .select("id")
        .single()

      await supabase.from("billing_events").insert({
        event_type: "booking_charged",
        clinic_id: clinicId,
        booking_charge_id: charge?.id,
        metadata: {
          amount: BOOKING_FEE_AMOUNT,
          charge_failed: true,
          error: stripeError instanceof Error ? stripeError.message : "Unknown error",
        },
      })

      return NextResponse.json({
        success: true,
        chargeId: charge?.id,
        paymentDeferred: true,
        message: "Booking charge recorded but payment failed. Will retry.",
      })
    }

    // Payment successful — create booking_charges record
    const { data: charge } = await supabase
      .from("booking_charges")
      .insert({
        booking_id: bookingId || null,
        lead_id: leadId || null,
        clinic_id: clinicId,
        patient_name: patientName || null,
        treatment: treatment || null,
        amount: BOOKING_FEE_AMOUNT,
        currency: CURRENCY,
        stripe_payment_intent_id: paymentIntentId,
        stripe_charge_id: chargeId,
        attendance_status: "auto_confirmed",
        dispute_window_ends_at: getDisputeWindowEnd().toISOString(),
      })
      .select("id")
      .single()

    // Log billing event
    await supabase.from("billing_events").insert({
      event_type: "booking_charged",
      clinic_id: clinicId,
      booking_charge_id: charge?.id,
      metadata: {
        amount: BOOKING_FEE_AMOUNT,
        stripe_payment_intent_id: paymentIntentId,
        patient_name: patientName,
        treatment,
      },
    })

    return NextResponse.json({
      success: true,
      chargeId: charge?.id,
      paymentIntentId,
    })
  } catch (error) {
    console.error("[stripe/charge-booking] Error:", error)
    return NextResponse.json({ error: "Failed to charge booking" }, { status: 500 })
  }
}
