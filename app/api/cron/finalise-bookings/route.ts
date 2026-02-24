import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"
import { formatAmountGBP } from "@/lib/billing"

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

        const chargeRows = finalisedCharges.map(c =>
          `<tr>
            <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${c.patient_name || "Unknown"}</td>
            <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${c.treatment || "—"}</td>
            <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${formatAmountGBP(c.amount)}</td>
          </tr>`
        ).join("")

        await sendEmailWithRetry({
          from: EMAIL_FROM.NOTIFICATIONS,
          to: clinicEmail,
          subject: `${finalisedCharges.length} booking charge${finalisedCharges.length !== 1 ? "s" : ""} confirmed (${formatAmountGBP(totalAmount)})`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0 0 16px;">Charges Confirmed</h1>
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
                Hi ${clinic.name}, the following booking charges have been finalised after the 7-day dispute window closed:
              </p>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px;">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="padding: 6px 12px; text-align: left;">Patient</th>
                    <th style="padding: 6px 12px; text-align: left;">Treatment</th>
                    <th style="padding: 6px 12px; text-align: left;">Amount</th>
                  </tr>
                </thead>
                <tbody>${chargeRows}</tbody>
                <tfoot>
                  <tr style="font-weight: 700;">
                    <td colspan="2" style="padding: 8px 12px;">Total</td>
                    <td style="padding: 8px 12px;">${formatAmountGBP(totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${appUrl}/clinic/billing" style="display: inline-block; background: #1a1a1a; color: white; padding: 12px 28px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  View Billing Dashboard
                </a>
              </div>
              <p style="font-size: 12px; color: #999; text-align: center;">
                Pearlie &mdash; Your dental clinic partner
              </p>
            </div>
          `,
        })
        emailsSent++
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
