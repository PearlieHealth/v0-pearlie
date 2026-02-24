import { NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"
import { EXEMPTION_REASONS } from "@/lib/billing"

/**
 * PATCH /api/bookings/update-attendance
 *
 * Lets clinics mark a booking as "not_attended" or "exempt" within the 7-day dispute window.
 * Issues a Stripe refund if payment was collected.
 *
 * Body: { bookingChargeId, status: "not_attended" | "exempt", exemptionReason? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { bookingChargeId, status, exemptionReason } = body

    if (!bookingChargeId) {
      return NextResponse.json({ error: "bookingChargeId is required" }, { status: 400 })
    }

    if (!status || !["not_attended", "exempt"].includes(status)) {
      return NextResponse.json(
        { error: 'status must be "not_attended" or "exempt"' },
        { status: 400 }
      )
    }

    if (status === "exempt") {
      if (!exemptionReason) {
        return NextResponse.json(
          { error: "exemptionReason is required when status is \"exempt\"" },
          { status: 400 }
        )
      }
      if (!EXEMPTION_REASONS.includes(exemptionReason)) {
        return NextResponse.json(
          { error: `Invalid exemption reason. Must be one of: ${EXEMPTION_REASONS.join(", ")}` },
          { status: 400 }
        )
      }
    }

    const supabase = createAdminClient()

    // Get the booking charge
    const { data: charge, error: chargeError } = await supabase
      .from("booking_charges")
      .select("*")
      .eq("id", bookingChargeId)
      .single()

    if (chargeError || !charge) {
      return NextResponse.json({ error: "Booking charge not found" }, { status: 404 })
    }

    // Verify user owns this clinic
    const { data: clinicUser } = await supabase
      .from("clinic_users")
      .select("clinic_id, role")
      .eq("user_id", user.id)
      .eq("clinic_id", charge.clinic_id)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "Unauthorized for this clinic" }, { status: 403 })
    }

    // Check dispute window
    if (charge.is_finalised) {
      return NextResponse.json(
        { error: "This charge has been finalised. The dispute window has closed." },
        { status: 400 }
      )
    }

    if (new Date(charge.dispute_window_ends_at) < new Date()) {
      return NextResponse.json(
        { error: "The 7-day dispute window has expired." },
        { status: 400 }
      )
    }

    // Prevent duplicate disputes — only auto_confirmed charges can be disputed
    if (charge.attendance_status !== "auto_confirmed") {
      return NextResponse.json(
        { error: "This charge has already been disputed or updated. It cannot be changed again." },
        { status: 400 }
      )
    }

    // If there's a Stripe payment, issue refund FIRST — do NOT update DB if refund fails
    let stripeRefundId: string | null = null
    if (charge.stripe_payment_intent_id) {
      try {
        const stripe = getStripe()
        const refund = await stripe.refunds.create({
          payment_intent: charge.stripe_payment_intent_id,
          reason: "requested_by_customer",
          metadata: {
            clinic_id: charge.clinic_id,
            booking_charge_id: bookingChargeId,
            reason: status,
            exemption_reason: exemptionReason || "",
          },
        })
        stripeRefundId = refund.id
      } catch (refundError) {
        console.error("[bookings/update-attendance] Refund failed:", refundError)
        return NextResponse.json(
          { error: "Refund could not be processed. Please try again or contact support at billing@pearlie.org." },
          { status: 500 }
        )
      }
    }

    // Update the booking charge (only reached if refund succeeded or no payment existed)
    const updateData: Record<string, unknown> = {
      attendance_status: status,
      attendance_updated_at: new Date().toISOString(),
      attendance_updated_by: user.id,
      updated_at: new Date().toISOString(),
    }

    if (exemptionReason) {
      updateData.exemption_reason = exemptionReason
    }

    if (stripeRefundId) {
      updateData.refund_status = "refunded"
      updateData.refund_amount = charge.amount
      updateData.stripe_refund_id = stripeRefundId
      updateData.refunded_at = new Date().toISOString()
    }

    await supabase
      .from("booking_charges")
      .update(updateData)
      .eq("id", bookingChargeId)

    // Log billing event
    await supabase.from("billing_events").insert({
      event_type: status === "exempt" ? "attendance_exempt" : "attendance_disputed",
      clinic_id: charge.clinic_id,
      booking_charge_id: bookingChargeId,
      metadata: {
        previous_status: charge.attendance_status,
        new_status: status,
        exemption_reason: exemptionReason || null,
        refund_id: stripeRefundId,
        refund_amount: stripeRefundId ? charge.amount : null,
        updated_by: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      refunded: !!stripeRefundId,
      refundId: stripeRefundId,
    })
  } catch (error) {
    console.error("[bookings/update-attendance] Error:", error)
    return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 })
  }
}
