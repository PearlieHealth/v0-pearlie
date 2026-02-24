import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { formatAmountGBP } from "@/lib/billing"
import { generateUnsubscribeFooterHtml, generateUnsubscribeUrl } from "@/lib/unsubscribe"

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

    if (error) {
      console.error("[cron/dispute-reminders] Error fetching charges:", error)
      return NextResponse.json({ error: "Failed to fetch charges" }, { status: 500 })
    }

    if (!charges || charges.length === 0) {
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

        const totalAmount = clinicChargeList.reduce((sum, c) => sum + c.amount, 0)

        const unsubUrl = generateUnsubscribeUrl(clinicEmail, "clinic_notifications")
        const unsubFooter = generateUnsubscribeFooterHtml(unsubUrl)

        const result = await sendRegisteredEmail({
          type: EMAIL_TYPE.DISPUTE_REMINDER,
          to: clinicEmail,
          data: {
            clinicName: clinic.name,
            charges: clinicChargeList.map(c => {
              const daysLeft = Math.max(0, Math.ceil((new Date(c.dispute_window_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
              return {
                patientName: c.patient_name || "Unknown",
                treatment: c.treatment || "—",
                amount: formatAmountGBP(c.amount),
                daysLeft: `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`,
              }
            }),
            totalAmount: formatAmountGBP(totalAmount),
            reviewUrl: `${appUrl}/clinic/billing?tab=charges`,
            unsubscribeFooterHtml: unsubFooter,
            _clinicId: clinicId,
          },
          clinicId,
        })

        if (result.success && !result.skipped) sent++
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
