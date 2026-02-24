import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { formatAmountGBP } from "@/lib/billing"
import { generateUnsubscribeFooterHtml, generateUnsubscribeUrl } from "@/lib/unsubscribe"

const BATCH_SIZE = 100
const DISPUTE_RATE_THRESHOLD = 0.4 // 40%

/**
 * GET /api/cron/finalise-bookings
 *
 * Runs daily. Finalises any booking charges where the 7-day dispute window has passed.
 * - Sets is_finalised = true
 * - Sets attendance_status = 'confirmed' (from 'auto_confirmed')
 * - Sends finalisation confirmation email to clinic
 * - Flags clinics with >40% dispute rate
 * - Logs billing_event
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://pearlie.org"

    // Find charges past their dispute window that haven't been finalised
    const { data: charges, error } = await supabase
      .from("booking_charges")
      .select("id, clinic_id, amount, attendance_status, patient_name, treatment")
      .eq("is_finalised", false)
      .eq("attendance_status", "auto_confirmed")
      .lt("dispute_window_ends_at", new Date().toISOString())
      .limit(BATCH_SIZE)

    if (error) {
      console.error("[cron/finalise-bookings] Error fetching charges:", error)
      return NextResponse.json({ error: "Failed to fetch charges" }, { status: 500 })
    }

    if (!charges || charges.length === 0) {
      return NextResponse.json({ processed: 0 })
    }

    let finalised = 0

    // Group by clinic for batch email
    const clinicCharges: Record<string, typeof charges> = {}

    for (const charge of charges) {
      try {
        await supabase
          .from("booking_charges")
          .update({
            is_finalised: true,
            attendance_status: "confirmed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", charge.id)

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

        if (!clinicCharges[charge.clinic_id]) {
          clinicCharges[charge.clinic_id] = []
        }
        clinicCharges[charge.clinic_id].push(charge)

        finalised++
      } catch (err) {
        console.error(`[cron/finalise-bookings] Error finalising charge ${charge.id}:`, err)
      }
    }

    // Send finalisation confirmation emails per clinic
    let emailsSent = 0
    for (const [clinicId, finalisedCharges] of Object.entries(clinicCharges)) {
      try {
        const { data: clinic } = await supabase
          .from("clinics")
          .select("name, email, notification_email")
          .eq("id", clinicId)
          .single()

        if (!clinic) continue
        const clinicEmail = clinic.notification_email || clinic.email
        if (!clinicEmail) continue

        const totalAmount = finalisedCharges.reduce((sum, c) => sum + c.amount, 0)
        const unsubUrl = generateUnsubscribeUrl(clinicEmail, "clinic_notifications")
        const unsubFooter = generateUnsubscribeFooterHtml(unsubUrl)

        const result = await sendRegisteredEmail({
          type: EMAIL_TYPE.BOOKING_CHARGE_FINALISED,
          to: clinicEmail,
          data: {
            clinicName: clinic.name,
            charges: finalisedCharges.map(c => ({
              patientName: c.patient_name || "Unknown",
              treatment: c.treatment || "—",
              amount: formatAmountGBP(c.amount),
            })),
            totalAmount: formatAmountGBP(totalAmount),
            billingUrl: `${appUrl}/clinic/billing`,
            unsubscribeFooterHtml: unsubFooter,
            _clinicId: clinicId,
          },
          clinicId,
        })

        if (result.success && !result.skipped) emailsSent++
      } catch (emailErr) {
        console.error(`[cron/finalise-bookings] Email error for clinic ${clinicId}:`, emailErr)
      }
    }

    // Check dispute rates and flag suspicious clinics (>40% dispute rate this month)
    let flagged = 0
    const checkedClinics = new Set<string>()
    for (const clinicId of Object.keys(clinicCharges)) {
      if (checkedClinics.has(clinicId)) continue
      checkedClinics.add(clinicId)

      try {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const { count: totalCount } = await supabase
          .from("booking_charges")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", clinicId)
          .gte("created_at", monthStart)

        const { count: disputedCount } = await supabase
          .from("booking_charges")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", clinicId)
          .gte("created_at", monthStart)
          .in("attendance_status", ["not_attended", "exempt"])

        if (totalCount && totalCount >= 5 && disputedCount) {
          const rate = disputedCount / totalCount
          if (rate > DISPUTE_RATE_THRESHOLD) {
            // Log a flagging event for admin review
            await supabase.from("billing_events").insert({
              event_type: "high_dispute_rate_flagged",
              clinic_id: clinicId,
              metadata: {
                total_charges: totalCount,
                disputed_charges: disputedCount,
                dispute_rate: Math.round(rate * 100),
                threshold_percent: Math.round(DISPUTE_RATE_THRESHOLD * 100),
                period: monthStart,
              },
            })
            flagged++
          }
        }
      } catch (flagErr) {
        console.error(`[cron/finalise-bookings] Flag check error for clinic ${clinicId}:`, flagErr)
      }
    }

    return NextResponse.json({
      processed: charges.length,
      finalised,
      emails_sent: emailsSent,
      clinics_flagged: flagged,
    })
  } catch (error) {
    console.error("[cron/finalise-bookings] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
