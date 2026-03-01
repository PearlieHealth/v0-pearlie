import { NextRequest, NextResponse } from "next/server"
import { getStripe, PLANS, TRIAL_DURATION_DAYS, type PlanType } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"

/**
 * POST /api/stripe/create-checkout
 *
 * Creates a Stripe Checkout session for the selected plan.
 * Includes a 30-day free trial. No card charged during trial.
 *
 * Body: { clinicId, planType: "starter" | "standard" | "premium", successUrl?, cancelUrl? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { clinicId, planType = "starter", successUrl, cancelUrl } = body

    if (!clinicId) {
      return NextResponse.json({ error: "clinicId is required" }, { status: 400 })
    }

    // Validate plan type
    const validPlans: PlanType[] = ["starter", "standard", "premium"]
    const selectedPlan = validPlans.includes(planType) ? planType as PlanType : "starter"
    const plan = PLANS[selectedPlan]

    const supabase = createAdminClient()

    // Verify user belongs to this clinic
    const { data: clinicUser } = await supabase
      .from("clinic_users")
      .select("clinic_id, role")
      .eq("user_id", user.id)
      .eq("clinic_id", clinicId)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "Unauthorized for this clinic" }, { status: 403 })
    }

    // Get clinic details
    const { data: clinic } = await supabase
      .from("clinics")
      .select("id, name, email")
      .eq("id", clinicId)
      .single()

    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    const stripe = getStripe()

    // Check if subscription already exists
    const { data: existingSub } = await supabase
      .from("clinic_subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status")
      .eq("clinic_id", clinicId)
      .single()

    let stripeCustomerId = existingSub?.stripe_customer_id

    // Create Stripe customer if needed
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: clinic.email || user.email || undefined,
        name: clinic.name,
        metadata: { clinic_id: clinicId, platform: "pearlie" },
      })
      stripeCustomerId = customer.id

      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS)

      await supabase.from("clinic_subscriptions").upsert({
        clinic_id: clinicId,
        stripe_customer_id: stripeCustomerId,
        status: "incomplete",
        plan_type: selectedPlan,
        trial_ends_at: trialEnd.toISOString(),
        trial_bookings_used: 0,
      })
    }

    // If already active, redirect to portal instead
    if (existingSub?.status === "active" && existingSub?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "Subscription already active. Use the customer portal to manage it." },
        { status: 400 }
      )
    }

    // Cancel any existing incomplete Stripe subscriptions to prevent duplicates
    if (stripeCustomerId) {
      try {
        const incompleteSubs = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "incomplete",
        })
        for (const sub of incompleteSubs.data) {
          await stripe.subscriptions.cancel(sub.id)
        }
      } catch (cancelErr) {
        console.error("[stripe/create-checkout] Error cancelling incomplete subs (non-fatal):", cancelErr)
      }
    }

    // Use plan-specific Stripe price ID from env, or create a price dynamically
    const priceEnvKey = `STRIPE_PRICE_ID_${selectedPlan.toUpperCase()}`
    let priceId = process.env[priceEnvKey] || process.env.STRIPE_MEMBERSHIP_PRICE_ID

    // If no price ID configured, create an ad-hoc price
    if (!priceId) {
      const product = await stripe.products.create({
        name: `Pearlie ${plan.name} Plan`,
        metadata: { plan_type: selectedPlan },
      })
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.basePricePence,
        currency: "gbp",
        recurring: { interval: "month" },
        metadata: { plan_type: selectedPlan },
      })
      priceId = price.id
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://pearlie.org"
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${appUrl}/clinic/billing?setup=success&plan=${selectedPlan}`,
      cancel_url: cancelUrl || `${appUrl}/clinic/billing?setup=cancelled`,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: TRIAL_DURATION_DAYS,
        metadata: {
          clinic_id: clinicId,
          plan_type: selectedPlan,
        },
      },
      metadata: {
        clinic_id: clinicId,
        plan_type: selectedPlan,
      },
    })

    // Update subscription record with selected plan
    await supabase
      .from("clinic_subscriptions")
      .update({ plan_type: selectedPlan, updated_at: new Date().toISOString() })
      .eq("clinic_id", clinicId)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[stripe/create-checkout] Error:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
