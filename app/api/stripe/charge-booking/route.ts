import { NextRequest, NextResponse } from "next/server"
import { PLANS, TRIAL_BOOKING_CAP, type PlanType } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { getDisputeWindowEnd, getCurrentBillingPeriod, isInTrialPeriod } from "@/lib/billing"

/**
 * POST /api/stripe/charge-booking
 *
 * Records a confirmed booking for the clinic's monthly billing calculation.
 * No immediate Stripe charge — charges are calculated at end of billing period.
 *
 * Trial: first 30 days, capped at 3 confirmed bookings (free).
 * After trial: bookings count toward the monthly tiered invoice.
 *
 * Body: { bookingId?, leadId, clinicId, patientName, treatment }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal call via secret or auth
    const authHeader = request.headers.get("authorization")
    const isInternalCall = authHeader === `Bearer ${process.env.CRON_SECRET}`

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

    // Get clinic subscription
    let { data: sub } = await supabase
      .from("clinic_subscriptions")
      .select("stripe_customer_id, status, plan_type, trial_ends_at, trial_bookings_used, free_leads_used, free_leads_limit")
      .eq("clinic_id", clinicId)
      .single()

    // If no subscription record, create one with trial
    if (!sub) {
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 30)

      const { data: newSub } = await supabase
        .from("clinic_subscriptions")
        .insert({
          clinic_id: clinicId,
          status: "trialing",
          plan_type: "starter",
          trial_ends_at: trialEnd.toISOString(),
          trial_bookings_used: 0,
          free_leads_used: 0,
          free_leads_limit: TRIAL_BOOKING_CAP,
        })
        .select("stripe_customer_id, status, plan_type, trial_ends_at, trial_bookings_used, free_leads_used, free_leads_limit")
        .single()
      sub = newSub
    }

    const planType = (sub?.plan_type || "starter") as PlanType
    const plan = PLANS[planType] || PLANS.starter
    const { start: periodStart } = getCurrentBillingPeriod()
    const billingPeriod = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`

    // ── Check if in trial period ──
    const inTrial = isInTrialPeriod(sub?.trial_ends_at ?? null)
    const trialBookingsUsed = sub?.trial_bookings_used ?? 0

    if (inTrial && trialBookingsUsed < TRIAL_BOOKING_CAP) {
      // TRIAL BOOKING — free, no charge
      const { data: charge } = await supabase
        .from("booking_charges")
        .insert({
          booking_id: bookingId || null,
          lead_id: leadId || null,
          clinic_id: clinicId,
          patient_name: patientName || null,
          treatment: treatment || null,
          amount: 0,
          currency: "gbp",
          attendance_status: "auto_confirmed",
          is_trial_booking: true,
          billing_period: billingPeriod,
          dispute_window_ends_at: getDisputeWindowEnd().toISOString(),
        })
        .select("id")
        .single()

      // Increment trial bookings counter
      await supabase
        .from("clinic_subscriptions")
        .update({
          trial_bookings_used: trialBookingsUsed + 1,
          free_leads_used: (sub?.free_leads_used ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("clinic_id", clinicId)

      await supabase.from("billing_events").insert({
        event_type: "trial_booking_recorded",
        clinic_id: clinicId,
        booking_charge_id: charge?.id,
        metadata: {
          trial_booking_number: trialBookingsUsed + 1,
          trial_cap: TRIAL_BOOKING_CAP,
          patient_name: patientName,
          treatment,
        },
      })

      return NextResponse.json({
        success: true,
        chargeId: charge?.id,
        trialBooking: true,
        trialBookingsRemaining: TRIAL_BOOKING_CAP - (trialBookingsUsed + 1),
        message: `Trial booking ${trialBookingsUsed + 1} of ${TRIAL_BOOKING_CAP}. No charge.`,
      })
    }

    // ── Trial cap reached or trial expired — record for monthly billing ──
    // Estimated amount per booking for dashboard display
    const estimatedAmount = Math.round(plan.basePricePence / plan.includedBookings)

    const { data: charge } = await supabase
      .from("booking_charges")
      .insert({
        booking_id: bookingId || null,
        lead_id: leadId || null,
        clinic_id: clinicId,
        patient_name: patientName || null,
        treatment: treatment || null,
        amount: estimatedAmount,
        currency: "gbp",
        attendance_status: "auto_confirmed",
        is_trial_booking: false,
        billing_period: billingPeriod,
        dispute_window_ends_at: getDisputeWindowEnd().toISOString(),
      })
      .select("id")
      .single()

    await supabase.from("billing_events").insert({
      event_type: "booking_recorded",
      clinic_id: clinicId,
      booking_charge_id: charge?.id,
      metadata: {
        estimated_amount: estimatedAmount,
        plan_type: planType,
        billing_period: billingPeriod,
        patient_name: patientName,
        treatment,
      },
    })

    return NextResponse.json({
      success: true,
      chargeId: charge?.id,
      billingPeriod,
      message: "Booking recorded. Charge will be calculated at end of billing period.",
    })
  } catch (error) {
    console.error("[stripe/charge-booking] Error:", error)
    return NextResponse.json({ error: "Failed to record booking" }, { status: 500 })
  }
}
