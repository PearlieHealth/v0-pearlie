import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"
import { formatAmountGBP } from "@/lib/billing"

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

        await sendEmailWithRetry({
          from: EMAIL_FROM.NOTIFICATIONS,
          to: clinicEmail,
          subject: `Billing reminder: ${formatAmountGBP(totalAmount)} due on the 6th`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">Billing Reminder</h1>
              </div>
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px;">
                Hi ${clinic.name},
              </p>
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
                Your next billing date is <strong>the 6th of this month</strong> (${daysUntilBilling} days away).
              </p>
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="font-size: 14px; color: #666; margin: 0 0 8px;">This period's charges:</p>
                <p style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0;">
                  ${formatAmountGBP(totalAmount)}
                </p>
                <p style="font-size: 14px; color: #666; margin: 4px 0 0;">
                  ${chargeCount} confirmed appointment${chargeCount !== 1 ? "s" : ""}
                </p>
              </div>
              <p style="font-size: 14px; color: #666; line-height: 1.5; margin-bottom: 24px;">
                If any appointments were not attended, you can dispute them within 7 days of the charge in your billing dashboard.
              </p>
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${appUrl}/clinic/billing" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 36px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  View Billing
                </a>
              </div>
              <p style="font-size: 12px; color: #999; text-align: center; margin-top: 32px;">
                Pearlie &mdash; Your dental clinic partner
              </p>
            </div>
          `,
        })

        sent++
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
