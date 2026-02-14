import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Only return fields that are safe for public/patient-facing views.
// Excludes: notification_email, email_forwarding_address, booking_webhook_url,
// booking_webhook_secret, capacity_bands, priority_sliders, ideal_patient_tags,
// exclusion_tags, tag_notes, updated_by, corporate_id, matching_style_tags,
// extra_tags, is_archived, archived_at, is_live, created_at, updated_at
const PUBLIC_CLINIC_FIELDS = `
  id, name, slug, address, postcode, city, latitude, longitude,
  phone, website, rating, review_count, treatments, description,
  facilities, opening_hours, images, verified, accepts_nhs,
  parking_available, wheelchair_accessible, tags, available_days,
  available_hours, accepts_same_day, highlight_chips, price_range,
  featured, featured_review, is_live,
  show_treatment_prices, treatment_prices, offers_free_consultation
`.replace(/\s+/g, " ").trim()

export async function GET(request: NextRequest, { params }: { params: Promise<{ clinicId: string }> }) {
  try {
    const { clinicId } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const isPreview = searchParams.get("preview") === "true"

    // Determine if clinicId is a UUID or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId)

    const { data: clinic, error } = isUUID
      ? await supabase.from("clinics").select(PUBLIC_CLINIC_FIELDS).eq("id", clinicId).single()
      : await supabase.from("clinics").select(PUBLIC_CLINIC_FIELDS).eq("slug", clinicId).single()

    if (error || !clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    const clinicData = clinic as Record<string, any>

    // Don't show archived clinics to anyone
    if (clinicData.is_archived === true) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    // For non-live clinics, only allow if preview=true AND the user owns this clinic
    if (clinicData.is_live !== true) {
      if (!isPreview) {
        return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
      }

      // Verify the requesting user owns this clinic
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
      }

      const supabaseAdmin = createAdminClient()
      const { data: clinicUser } = await supabaseAdmin
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .eq("clinic_id", clinicData.id)
        .single()

      if (!clinicUser) {
        return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
      }
    }

    // Strip internal status fields from the response
    const { is_live, ...publicClinic } = clinicData

    // Only include treatment_prices if the clinic has enabled it
    if (!publicClinic.show_treatment_prices) {
      publicClinic.treatment_prices = []
    }

    return NextResponse.json({ clinic: publicClinic })
  } catch (error) {
    console.error("Error in clinic API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
