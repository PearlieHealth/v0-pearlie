/**
 * Billing utilities for Pearlie clinic billing.
 *
 * Billing model:
 * - Monthly membership subscription via Stripe
 * - Per-booking fee charged when patient match is created
 * - 7-day dispute window for clinics to mark "not attended" or "exempt"
 * - After 7 days, charge is auto-finalised
 */

/**
 * Returns the current billing period (7th of prev month to 6th of current month).
 */
export function getCurrentBillingPeriod(): { start: Date; end: Date } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  if (now.getDate() <= 6) {
    // First 6 days of month: period is prev-month 7th to this-month 6th
    const start = new Date(year, month - 1, 7)
    const end = new Date(year, month, 6)
    return { start, end }
  } else {
    // After 6th: period is this-month 7th to next-month 6th
    const start = new Date(year, month, 7)
    const end = new Date(year, month + 1, 6)
    return { start, end }
  }
}

/**
 * Formats pence amount to GBP string: 7500 -> "£75.00"
 */
export function formatAmountGBP(amountPence: number): string {
  return `£${(amountPence / 100).toFixed(2)}`
}

/**
 * Returns the dispute window end date (7 days from now).
 */
export function getDisputeWindowEnd(): Date {
  const end = new Date()
  end.setDate(end.getDate() + 7)
  return end
}

/**
 * Valid attendance statuses for booking charges.
 */
export const ATTENDANCE_STATUSES = [
  "auto_confirmed",
  "confirmed",
  "not_attended",
  "exempt",
  "disputed",
] as const

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

/**
 * Valid exemption reasons.
 */
export const EXEMPTION_REASONS = [
  "nhs",
  "under_18",
  "cancellation",
  "duplicate",
  "existing_patient",
  "other",
] as const

export type ExemptionReason = (typeof EXEMPTION_REASONS)[number]

/**
 * Valid subscription statuses.
 */
export const SUBSCRIPTION_STATUSES = [
  "active",
  "past_due",
  "cancelled",
  "incomplete",
  "trialing",
] as const

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]
