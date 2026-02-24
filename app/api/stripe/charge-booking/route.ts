import { NextRequest, NextResponse } from "next/server"
import { getStripe, BOOKING_FEE_AMOUNT, CURRENCY } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { getDisputeWindowEnd } from "@/lib/billing"

/**
 * POST /api/stripe/charge-booking
 *
 * Auto-charges the clinic for a confirmed booking.
 * Called internally when a patient booking is confirmed (ATTENDED status).
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

    // Get clinic subscription to find Stripe customer
    const { data: sub } = await supabase
      .from("clinic_subscriptions")
      .select("stripe_customer_id, status")
      .eq("clinic_id", clinicId)
      .single()

    if (!sub?.stripe_customer_id) {
      // No Stripe customer — create booking_charges record without charging
      // The charge will happen when the clinic sets up billing
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

      // Log billing event
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

    // Check subscription is active
    if (sub.status !== "active" && sub.status !== "trialing") {
      // Still record the charge but don't attempt payment
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
