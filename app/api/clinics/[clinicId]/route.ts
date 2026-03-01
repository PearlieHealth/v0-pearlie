import { type NextRequest, NextResponse } from "next/server"
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
  featured, featured_review, is_live, is_archived,
  show_treatment_prices, treatment_prices, offers_free_consultation,
  before_after_images
`.replace(/\s+/g, " ").trim()

// Google fields may not exist if the migration hasn't been applied yet.
// Fetched separately so the main query never fails.
const GOOGLE_FIELDS = "google_place_id, google_rating, google_review_count, google_maps_url"

// Languages column may not exist on all environments yet.
const LANGUAGES_FIELDS = "languages"

export async function GET(request: NextRequest, { params }: { params: Promise<{ clinicId: string }> }) {
  try {
    const { clinicId } = await params
    // Determine if clinicId is a UUID or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId)

    // Use admin client to bypass RLS so non-live clinics can still be
    // fetched for preview. Access control is handled explicitly below.
    const supabaseAdmin = createAdminClient()

    const { data: clinic, error } = isUUID
      ? await supabaseAdmin.from("clinics").select(PUBLIC_CLINIC_FIELDS).eq("id", clinicId).single()
      : await supabaseAdmin.from("clinics").select(PUBLIC_CLINIC_FIELDS).eq("slug", clinicId).single()

    if (error || !clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    const clinicData = clinic as Record<string, any>

    // Try to merge Google review fields (columns may not exist yet)
    try {
      const { data: googleData } = isUUID
        ? await supabaseAdmin.from("clinics").select(GOOGLE_FIELDS).eq("id", clinicId).single()
        : await supabaseAdmin.from("clinics").select(GOOGLE_FIELDS).eq("slug", clinicId).single()
      if (googleData) {
        Object.assign(clinicData, googleData)
      }
    } catch {
      // Google columns don't exist yet — that's fine, skip them
    }

    // Try to merge languages field (column may not exist yet)
    try {
      const { data: langData } = isUUID
        ? await supabaseAdmin.from("clinics").select(LANGUAGES_FIELDS).eq("id", clinicId).single()
        : await supabaseAdmin.from("clinics").select(LANGUAGES_FIELDS).eq("slug", clinicId).single()
      if (langData) {
        Object.assign(clinicData, langData)
      }
    } catch {
      // languages column doesn't exist yet — skip
    }

    // Don't show archived clinics to anyone
    if (clinicData.is_archived === true) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    // Strip internal status fields from the response
    const { is_live, is_archived, ...publicClinic } = clinicData

    // Only include treatment_prices if the clinic has enabled it
    if (!publicClinic.show_treatment_prices) {
      publicClinic.treatment_prices = []
    }

    // Normalize opening_hours: ensure all 7 days are present.
    // Some clinics have incomplete data (e.g. only Sunday saved).
    if (publicClinic.opening_hours && typeof publicClinic.opening_hours === "object") {
      const ALL_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      const hours = publicClinic.opening_hours as Record<string, unknown>
      // Build case-insensitive lookup
      const lowerMap: Record<string, string> = {}
      for (const key of Object.keys(hours)) {
        lowerMap[key.toLowerCase()] = key
      }
      const normalized: Record<string, unknown> = {}
      for (const day of ALL_DAYS) {
        const actualKey = lowerMap[day]
        if (actualKey) {
          const val = hours[actualKey]
          // Convert string format ("9:00-18:00" / "Closed") to object format
          if (typeof val === "string") {
            if (val.toLowerCase() === "closed") {
              normalized[day] = { open: "", close: "", closed: true }
            } else {
              const parts = val.split("-")
              normalized[day] = { open: parts[0] || "09:00", close: parts[1] || "17:00", closed: false }
            }
          } else {
            normalized[day] = val
          }
        }
        // Don't add defaults for missing days — only show what the clinic has set
      }
      if (Object.keys(normalized).length > 0) {
        publicClinic.opening_hours = normalized
      }
    }

    return NextResponse.json({ clinic: publicClinic })
  } catch (error) {
    console.error("Error in clinic API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
