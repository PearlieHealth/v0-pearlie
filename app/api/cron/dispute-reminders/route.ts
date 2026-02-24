import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"
import { formatAmountGBP } from "@/lib/billing"

const BATCH_SIZE = 50

/**
 * GET /api/cron/dispute-reminders
 *
 * Runs daily. Sends reminders to clinics for booking charges where the 7-day
 * dispute window is 2 days from closing (Day 5).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://pearlie.org"

    // Find charges created ~5 days ago (dispute window closes in ~2 days)
    // We look for charges where dispute_window_ends_at is between 1 and 3 days from now
    const now = new Date()
    const windowStart = new Date(now)
    windowStart.setDate(windowStart.getDate() + 1) // 1 day from now
    const windowEnd = new Date(now)
    windowEnd.setDate(windowEnd.getDate() + 3) // 3 days from now

    const { data: charges, error } = await supabase
      .from("booking_charges")
      .select("id, clinic_id, patient_name, treatment, amount, dispute_window_ends_at, created_at")
      .eq("is_finalised", false)
      .eq("attendance_status", "auto_confirmed")
      .gte("dispute_window_ends_at", windowStart.toISOString())
      .lte("dispute_window_ends_at", windowEnd.toISOString())
      .limit(BATCH_SIZE)

    if (error || !charges || charges.length === 0) {
      return NextResponse.json({ processed: 0 })
    }

    // Group charges by clinic
    const clinicCharges: Record<string, typeof charges> = {}
    for (const charge of charges) {
      if (!clinicCharges[charge.clinic_id]) {
        clinicCharges[charge.clinic_id] = []
      }
      clinicCharges[charge.clinic_id].push(charge)
    }

    let sent = 0

    for (const [clinicId, clinicChargeList] of Object.entries(clinicCharges)) {
      try {
        const { data: clinic } = await supabase
          .from("clinics")
          .select("name, email, notification_email")
          .eq("id", clinicId)
          .single()

        if (!clinic) continue
        const clinicEmail = clinic.notification_email || clinic.email
        if (!clinicEmail) continue

        const chargeRows = clinicChargeList.map(c => {
          const daysLeft = Math.max(0, Math.ceil((new Date(c.dispute_window_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          return `<tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${c.patient_name || "Unknown"}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${c.treatment || "—"}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${formatAmountGBP(c.amount)}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #c05621; font-weight: 600;">${daysLeft} day${daysLeft !== 1 ? "s" : ""} left</td>
          </tr>`
        }).join("")

        const totalAmount = clinicChargeList.reduce((sum, c) => sum + c.amount, 0)

        await sendEmailWithRetry({
          from: EMAIL_FROM.NOTIFICATIONS,
          to: clinicEmail,
          subject: `Dispute window closing soon for ${clinicChargeList.length} booking charge${clinicChargeList.length !== 1 ? "s" : ""}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0 0 16px;">Dispute Window Closing Soon</h1>
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px;">
                Hi ${clinic.name},
              </p>
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
                You have <strong>${clinicChargeList.length} booking charge${clinicChargeList.length !== 1 ? "s" : ""}</strong> totalling <strong>${formatAmountGBP(totalAmount)}</strong> with dispute windows closing soon. If any patients did not attend, please report it now.
              </p>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="padding: 8px 12px; text-align: left;">Patient</th>
                    <th style="padding: 8px 12px; text-align: left;">Treatment</th>
                    <th style="padding: 8px 12px; text-align: left;">Amount</th>
                    <th style="padding: 8px 12px; text-align: left;">Time Left</th>
                  </tr>
                </thead>
                <tbody>${chargeRows}</tbody>
              </table>
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${appUrl}/clinic/billing?tab=charges" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 36px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Review Charges
                </a>
              </div>
              <p style="font-size: 14px; color: #666; line-height: 1.5;">
                After the dispute window closes, charges are automatically finalised and cannot be reversed. If a patient didn't attend, mark it as "Not Attended" for a full refund.
              </p>
              <p style="font-size: 12px; color: #999; text-align: center; margin-top: 32px;">
                Pearlie &mdash; Your dental clinic partner
              </p>
            </div>
          `,
        })

        sent++
      } catch (err) {
        console.error(`[cron/dispute-reminders] Error for clinic ${clinicId}:`, err)
      }
    }

    return NextResponse.json({ processed: charges.length, clinics_notified: sent })
  } catch (error) {
    console.error("[cron/dispute-reminders] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
