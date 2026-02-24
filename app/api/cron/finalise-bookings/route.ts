import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/cron/finalise-bookings
 *
 * Runs daily. Finalises any booking charges where the 7-day dispute window has passed.
 * - Sets is_finalised = true
 * - Sets attendance_status = 'confirmed' (from 'auto_confirmed')
 * - Logs billing_event
 */
export async function GET(request: NextRequest) {
  try {
    // Verify Vercel Cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Find charges past their dispute window that haven't been finalised
    const { data: charges, error } = await supabase
      .from("booking_charges")
      .select("id, clinic_id, amount, attendance_status, patient_name")
      .eq("is_finalised", false)
      .eq("attendance_status", "auto_confirmed")
      .lt("dispute_window_ends_at", new Date().toISOString())
      .limit(100) // Process in batches

    if (error) {
      console.error("[cron/finalise-bookings] Error fetching charges:", error)
      return NextResponse.json({ error: "Failed to fetch charges" }, { status: 500 })
    }

    if (!charges || charges.length === 0) {
      return NextResponse.json({ processed: 0 })
    }

    let finalised = 0

    for (const charge of charges) {
      try {
        // Finalise the charge
        await supabase
          .from("booking_charges")
          .update({
            is_finalised: true,
            attendance_status: "confirmed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", charge.id)

        // Log billing event
        await supabase.from("billing_events").insert({
          event_type: "dispute_window_expired",
          clinic_id: charge.clinic_id,
          booking_charge_id: charge.id,
          metadata: {
            amount: charge.amount,
            patient_name: charge.patient_name,
            previous_status: charge.attendance_status,
          },
        })

        finalised++
      } catch (err) {
        console.error(`[cron/finalise-bookings] Error finalising charge ${charge.id}:`, err)
      }
    }

    return NextResponse.json({
      processed: charges.length,
      finalised,
    })
  } catch (error) {
    console.error("[cron/finalise-bookings] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
