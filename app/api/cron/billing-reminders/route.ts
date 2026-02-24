import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { formatAmountGBP } from "@/lib/billing"
import { generateUnsubscribeFooterHtml, generateUnsubscribeUrl } from "@/lib/unsubscribe"

const BATCH_SIZE = 20

/**
 * GET /api/cron/billing-reminders
 *
 * Runs on the 1st and 3rd of each month.
 * Sends reminders to clinics with active subscriptions about upcoming billing on the 6th.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify Vercel Cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Find clinics with active subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("clinic_subscriptions")
      .select("clinic_id, stripe_customer_id")
      .eq("status", "active")
      .limit(BATCH_SIZE)

    if (subError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ processed: 0 })
    }

    let sent = 0
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://pearlie.org"

    for (const sub of subscriptions) {
      try {
        // Get clinic details
        const { data: clinic } = await supabase
          .from("clinics")
          .select("name, email, notification_email")
          .eq("id", sub.clinic_id)
          .single()

        if (!clinic) continue

        const clinicEmail = clinic.notification_email || clinic.email
        if (!clinicEmail) continue

        // Count pending/auto_confirmed charges this month
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const { data: charges } = await supabase
          .from("booking_charges")
          .select("amount")
          .eq("clinic_id", sub.clinic_id)
          .in("attendance_status", ["auto_confirmed", "confirmed"])
          .gte("created_at", monthStart)

        const totalAmount = charges?.reduce((sum, c) => sum + c.amount, 0) || 0
        const chargeCount = charges?.length || 0

        if (chargeCount === 0) continue // No charges to bill

        // Calculate exact days until the next 6th
        const dayOfMonth = now.getDate()
        let billingDate: Date
        if (dayOfMonth <= 6) {
          billingDate = new Date(now.getFullYear(), now.getMonth(), 6)
        } else {
          billingDate = new Date(now.getFullYear(), now.getMonth() + 1, 6)
        }
        const daysUntilBilling = Math.ceil((billingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        const unsubUrl = generateUnsubscribeUrl(clinicEmail, "clinic_notifications")
        const unsubFooter = generateUnsubscribeFooterHtml(unsubUrl)

        const result = await sendRegisteredEmail({
          type: EMAIL_TYPE.BILLING_REMINDER,
          to: clinicEmail,
          data: {
            clinicName: clinic.name,
            totalAmount: formatAmountGBP(totalAmount),
            chargeCount,
            daysUntilBilling,
            billingUrl: `${appUrl}/clinic/billing`,
            unsubscribeFooterHtml: unsubFooter,
            _clinicId: sub.clinic_id,
          },
          clinicId: sub.clinic_id,
        })

        if (result.success && !result.skipped) sent++
      } catch (err) {
        console.error(`[cron/billing-reminders] Error for clinic ${sub.clinic_id}:`, err)
      }
    }

    return NextResponse.json({ processed: subscriptions.length, sent })
  } catch (error) {
    console.error("[cron/billing-reminders] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
