import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Compact clinic fields for treatment/listing grids (cards + directory).
 */
export const CLINIC_CARD_SELECT =
  "id, name, slug, city, address, postcode, rating, review_count, images, treatments, price_range, highlight_chips, verified, description"

/**
 * Public clinic fields safe for patient-facing views.
 * Mirrors the field list in app/api/clinics/[clinicId]/route.ts.
 */
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

const GOOGLE_FIELDS = "google_place_id, google_rating, google_review_count, google_maps_url"
const LANGUAGES_FIELDS = "languages"

/**
 * Fetch a single clinic by ID or slug for server-side rendering.
 * Returns null if the clinic is not found, archived, or not live.
 */
export async function getClinicByIdOrSlug(clinicId: string, options?: { skipLiveCheck?: boolean }) {
  const supabase = createAdminClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId)

  const { data: clinic, error } = isUUID
    ? await supabase.from("clinics").select(PUBLIC_CLINIC_FIELDS).eq("id", clinicId).single()
    : await supabase.from("clinics").select(PUBLIC_CLINIC_FIELDS).eq("slug", clinicId).single()

  if (error || !clinic) return null

  const clinicData = clinic as Record<string, any>

  // Merge Google review fields (columns may not exist yet)
  try {
    const { data: googleData } = isUUID
      ? await supabase.from("clinics").select(GOOGLE_FIELDS).eq("id", clinicId).single()
      : await supabase.from("clinics").select(GOOGLE_FIELDS).eq("slug", clinicId).single()
    if (googleData) Object.assign(clinicData, googleData)
  } catch {}

  // Merge languages field (column may not exist yet)
  try {
    const { data: langData } = isUUID
      ? await supabase.from("clinics").select(LANGUAGES_FIELDS).eq("id", clinicId).single()
      : await supabase.from("clinics").select(LANGUAGES_FIELDS).eq("slug", clinicId).single()
    if (langData) Object.assign(clinicData, langData)
  } catch {}

  // Don't expose archived or non-live clinics
  if (clinicData.is_archived === true) return null
  if (!options?.skipLiveCheck && clinicData.is_live !== true) return null

  return clinicData
}

/**
 * Fetch all public clinic IDs + updated_at for sitemap generation.
 */
export async function getAllPublicClinicIds(): Promise<{ id: string; slug: string | null; updated_at: string }[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("clinics")
    .select("id, slug, updated_at")
    .eq("is_live", true)
    .eq("is_archived", false)

  if (error || !data) return []
  return data as { id: string; slug: string | null; updated_at: string }[]
}
