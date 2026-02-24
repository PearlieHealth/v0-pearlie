import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { id } = await params
    const supabase = createAdminClient()

    // Fetch conversions with lead details
    const { data: conversions, error } = await supabase
      .from("referral_conversions")
      .select(`
        id,
        status,
        commission_amount,
        confirmed_at,
        paid_at,
        fraud_flags,
        fraud_score,
        booking_id,
        created_at,
        referral_id,
        leads:lead_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          treatment_interest,
          postcode,
          booking_status,
          booking_date,
          booking_time,
          booking_clinic_id,
          created_at
        )
      `)
      .eq("affiliate_id", id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: "Failed to fetch conversions" }, { status: 500 })
    }

    // Enrich with referral (click) data
    const enriched = await Promise.all(
      (conversions || []).map(async (conv) => {
        let referralClick = null
        if (conv.referral_id) {
          const { data: ref } = await supabase
            .from("referrals")
            .select("id, landing_page, utm_source, utm_medium, utm_campaign, visitor_ip, created_at")
            .eq("id", conv.referral_id)
            .single()
          referralClick = ref
        }

        // Get clinic name if booking_id exists
        let clinicName = null
        const lead = conv.leads as unknown as Record<string, unknown> | null
        if (lead?.booking_clinic_id) {
          const { data: clinic } = await supabase
            .from("clinics")
            .select("name")
            .eq("id", lead.booking_clinic_id)
            .single()
          clinicName = clinic?.name || null
        }

        return {
          ...conv,
          referral_click: referralClick,
          clinic_name: clinicName,
        }
      })
    )

    return NextResponse.json(enriched)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
