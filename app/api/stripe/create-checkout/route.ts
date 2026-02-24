import { NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { clinicId, successUrl, cancelUrl } = body

    if (!clinicId) {
      return NextResponse.json({ error: "clinicId is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify user owns this clinic
    const { data: clinicUser } = await supabase
      .from("clinic_users")
      .select("clinic_id, role")
      .eq("user_id", user.id)
      .eq("clinic_id", clinicId)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "Unauthorized for this clinic" }, { status: 403 })
    }

    // Only admin/owner can manage billing
    if (!["clinic_admin", "clinic_owner", "clinic_user"].includes(clinicUser.role)) {
      return NextResponse.json({ error: "Unauthorized to manage billing" }, { status: 403 })
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

      // Create subscription record with customer ID
      await supabase.from("clinic_subscriptions").upsert({
        clinic_id: clinicId,
        stripe_customer_id: stripeCustomerId,
        status: "incomplete",
      })
    }

    // If already active, redirect to portal instead
    if (existingSub?.status === "active" && existingSub?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "Subscription already active. Use the customer portal to manage it." },
        { status: 400 }
      )
    }

    const priceId = process.env.STRIPE_MEMBERSHIP_PRICE_ID
    if (!priceId) {
      console.error("[stripe/create-checkout] Missing STRIPE_MEMBERSHIP_PRICE_ID")
      return NextResponse.json({ error: "Billing not configured" }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://pearlie.org"
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${appUrl}/clinic/billing?setup=success`,
      cancel_url: cancelUrl || `${appUrl}/clinic/billing?setup=cancelled`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          clinic_id: clinicId,
          plan_type: "basic",
        },
      },
      metadata: {
        clinic_id: clinicId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[stripe/create-checkout] Error:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
