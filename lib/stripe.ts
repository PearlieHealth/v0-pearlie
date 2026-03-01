import Stripe from "stripe"

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable")
    }
    _stripe = new Stripe(key, {
      // @ts-expect-error -- pinned Stripe API version
      apiVersion: "2025-01-27.acacia",
      typescript: true,
    })
  }
  return _stripe
}

// ── Tiered pricing plans ──

export type PlanType = "starter" | "standard" | "premium"

export interface PlanTier {
  name: string
  planType: PlanType
  /** Base monthly price in pence */
  basePricePence: number
  /** Number of confirmed bookings included in the base price */
  includedBookings: number
  /** Fee per extra confirmed booking beyond included, in pence */
  extraBookingFeePence: number
  /** Description shown on pricing page */
  description: string
}

export const PLANS: Record<PlanType, PlanTier> = {
  starter: {
    name: "Starter",
    planType: "starter",
    basePricePence: 9900, // £99
    includedBookings: 2,
    extraBookingFeePence: 3500, // £35
    description: "For clinics starting with Pearlie",
  },
  standard: {
    name: "Standard",
    planType: "standard",
    basePricePence: 24700, // £247
    includedBookings: 4,
    extraBookingFeePence: 3500, // £35
    description: "Best value for growing clinics",
  },
  premium: {
    name: "Premium",
    planType: "premium",
    basePricePence: 48600, // £486
    includedBookings: 8,
    extraBookingFeePence: 3500, // £35
    description: "Multi-practice clinics",
  },
}

/**
 * Calculate the monthly charge for a given plan and number of confirmed bookings.
 *
 * Logic:
 * - 0 confirmed bookings = £0
 * - Each booking up to `includedBookings` = proportional share of base price
 *   (e.g. Standard with 4 included: 1 booking = 25% of £247 = £61.75)
 * - Bookings beyond `includedBookings` = base price + £35 per extra
 *
 * Returns amount in pence.
 */
export function calculateMonthlyCharge(
  planType: PlanType,
  confirmedBookings: number
): { totalPence: number; basePence: number; overageCount: number; overagePence: number } {
  const plan = PLANS[planType]
  if (!plan || confirmedBookings <= 0) {
    return { totalPence: 0, basePence: 0, overageCount: 0, overagePence: 0 }
  }

  const bookingsInBase = Math.min(confirmedBookings, plan.includedBookings)
  const overageCount = Math.max(0, confirmedBookings - plan.includedBookings)

  // Proportional base: (bookingsInBase / includedBookings) * basePricePence
  const basePence = Math.round(
    (bookingsInBase / plan.includedBookings) * plan.basePricePence
  )
  const overagePence = overageCount * plan.extraBookingFeePence

  return {
    totalPence: basePence + overagePence,
    basePence,
    overageCount,
    overagePence,
  }
}

// ── Trial config ──

/** Trial duration in days */
export const TRIAL_DURATION_DAYS = 30

/** Maximum confirmed bookings during trial (free) */
export const TRIAL_BOOKING_CAP = 3

// ── Legacy constants (kept for backward compatibility during migration) ──

export const BOOKING_FEE_AMOUNT = 3500 // £35 overage fee
export const LATE_FEE_AMOUNT = parseInt(
  process.env.STRIPE_LATE_FEE_AMOUNT || "5000",
  10
)
export const CURRENCY = "gbp"
export const FREE_LEADS_LIMIT = TRIAL_BOOKING_CAP
