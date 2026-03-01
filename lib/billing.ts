/**
 * Billing utilities for Pearlie clinic billing.
 *
 * Billing model (tiered):
 * - Clinics choose a plan: Starter (£99), Standard (£247), Premium (£486)
 * - Each plan includes N confirmed bookings per month
 * - 0 bookings = £0 (no charge)
 * - Proportional: each booking = base_price / included_bookings
 * - Over included: base price + £35 per extra booking
 * - 30-day free trial capped at 3 confirmed bookings
 * - 7-day dispute window for clinics to mark "not attended" or "exempt"
 * - After 7 days, charge is auto-finalised
 * - Monthly invoice generated at end of billing period
 */

/**
 * Returns the current billing period (1st to last day of month).
 */
export function getCurrentBillingPeriod(): { start: Date; end: Date } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

/**
 * Returns the billing period for a given date.
 */
export function getBillingPeriodForDate(date: Date): { start: Date; end: Date } {
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { start, end }
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
 * Check if a clinic is currently in their trial period.
 */
export function isInTrialPeriod(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false
  return new Date(trialEndsAt) > new Date()
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
