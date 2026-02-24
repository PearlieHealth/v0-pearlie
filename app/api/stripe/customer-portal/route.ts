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
    const { clinicId } = body

    if (!clinicId) {
      return NextResponse.json({ error: "clinicId is required" }, { status: 400 })
    }

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

    // Get Stripe customer ID
    const { data: sub } = await supabase
      .from("clinic_subscriptions")
      .select("stripe_customer_id")
      .eq("clinic_id", clinicId)
      .single()

    if (!sub?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account found. Please set up a subscription first." },
        { status: 404 }
      )
    }

    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://pearlie.org"

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}/clinic/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[stripe/customer-portal] Error:", error)
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 })
  }
}
