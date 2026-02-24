import { wrapInBaseLayout } from "./base-layout"

interface AffiliateConversionData {
  affiliateName: string
  commissionAmount: number
  patientFirstName: string
}

interface AffiliatePayoutData {
  affiliateName: string
  amount: number
  periodStart: string
  periodEnd: string
}

export function renderAffiliateConversionEmail(data: AffiliateConversionData): string {
  return wrapInBaseLayout({
    title: "You earned a commission!",
    subtitle: "A patient you referred has confirmed their booking",
    headerStyle: "green",
    body: `
      <p style="margin: 0 0 16px; font-size: 16px;">Hi ${data.affiliateName.split(" ")[0]},</p>
      <p style="margin: 0 0 16px; font-size: 16px;">
        Great news! <strong>${data.patientFirstName}</strong> has confirmed their booking with a clinic.
        You&rsquo;ve earned a commission of:
      </p>
      <div style="text-align: center; padding: 20px; margin: 16px 0; background: #f0fdf4; border-radius: 8px;">
        <span style="font-size: 36px; font-weight: 700; color: #059669;">&pound;${data.commissionAmount.toFixed(2)}</span>
      </div>
      <p style="margin: 0 0 16px; font-size: 14px; color: #6b7280;">
        This commission is now confirmed and will be included in your next payout.
        You can track all your earnings in your
        <a href="https://pearlie.org/affiliate/dashboard" style="color: #0fbcb0; text-decoration: none;">affiliate dashboard</a>.
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">Keep up the great work!</p>
    `,
  })
}

export function renderAffiliatePayoutEmail(data: AffiliatePayoutData): string {
  const startDate = new Date(data.periodStart).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
  const endDate = new Date(data.periodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })

  return wrapInBaseLayout({
    title: "Your payout is being processed",
    subtitle: `For the period ${startDate} - ${endDate}`,
    headerStyle: "green",
    body: `
      <p style="margin: 0 0 16px; font-size: 16px;">Hi ${data.affiliateName.split(" ")[0]},</p>
      <p style="margin: 0 0 16px; font-size: 16px;">
        A payout has been created for your affiliate earnings:
      </p>
      <div style="text-align: center; padding: 20px; margin: 16px 0; background: #f0fdf4; border-radius: 8px;">
        <span style="font-size: 36px; font-weight: 700; color: #059669;">&pound;${data.amount.toFixed(2)}</span>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Period</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">${startDate} &ndash; ${endDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Amount</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500; color: #059669;">&pound;${data.amount.toFixed(2)}</td>
        </tr>
      </table>
      <p style="margin: 0 0 16px; font-size: 14px; color: #6b7280;">
        You&rsquo;ll receive your payment shortly. You can view your full payout history in your
        <a href="https://pearlie.org/affiliate/payouts" style="color: #0fbcb0; text-decoration: none;">affiliate dashboard</a>.
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">Thank you for being a Pearlie affiliate!</p>
    `,
  })
}
