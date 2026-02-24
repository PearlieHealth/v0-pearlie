import Stripe from "stripe"

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable")
    }
    _stripe = new Stripe(key, {
      apiVersion: "2025-01-27.acacia",
      typescript: true,
    })
  }
  return _stripe
}

// Booking fee amount in pence (default £75.00)
export const BOOKING_FEE_AMOUNT = parseInt(
  process.env.STRIPE_BOOKING_FEE_AMOUNT || "7500",
  10
)

// Late payment fee in pence (default £50.00)
export const LATE_FEE_AMOUNT = parseInt(
  process.env.STRIPE_LATE_FEE_AMOUNT || "5000",
  10
)

export const CURRENCY = "gbp"
