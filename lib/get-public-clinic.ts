import { cache } from "react"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Clinic } from "@/components/clinic/profile/types"

// Fields safe for public/patient-facing views (mirrors API route)
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
 * Fetch a public, live, non-archived clinic by UUID or slug.
 * Returns null if the clinic doesn't exist, is archived, or is not live.
 * Uses React cache() to deduplicate across generateMetadata + page render.
 */
export const getPublicClinic = cache(async (clinicId: string): Promise<Clinic | null> => {
  try {
    const supabase = createAdminClient()
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId)

    const { data: clinic, error } = isUUID
      ? await supabase.from("clinics").select(PUBLIC_CLINIC_FIELDS).eq("id", clinicId).single()
      : await supabase.from("clinics").select(PUBLIC_CLINIC_FIELDS).eq("slug", clinicId).single()

    if (error || !clinic) return null

    const clinicData = clinic as unknown as Record<string, unknown>

    // Merge Google fields (columns may not exist yet)
    try {
      const { data: googleData } = isUUID
        ? await supabase.from("clinics").select(GOOGLE_FIELDS).eq("id", clinicId).single()
        : await supabase.from("clinics").select(GOOGLE_FIELDS).eq("slug", clinicId).single()
      if (googleData) Object.assign(clinicData, googleData)
    } catch { /* columns don't exist yet */ }

    // Merge languages field (column may not exist yet)
    try {
      const { data: langData } = isUUID
        ? await supabase.from("clinics").select(LANGUAGES_FIELDS).eq("id", clinicId).single()
        : await supabase.from("clinics").select(LANGUAGES_FIELDS).eq("slug", clinicId).single()
      if (langData) Object.assign(clinicData, langData)
    } catch { /* column doesn't exist yet */ }

    // Don't show archived or non-live clinics publicly
    if (clinicData.is_archived === true) return null
    if (clinicData.is_live !== true) return null

    // Strip internal status fields
    const { is_live, is_archived, ...publicClinic } = clinicData as Record<string, unknown> & {
      is_live: boolean
      is_archived: boolean
    }

    // Only include treatment_prices if the clinic has enabled it
    if (!publicClinic.show_treatment_prices) {
      publicClinic.treatment_prices = []
    }

    // Normalize opening_hours: ensure all 7 days are present in object format
    if (publicClinic.opening_hours && typeof publicClinic.opening_hours === "object") {
      const ALL_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      const hours = publicClinic.opening_hours as Record<string, unknown>
      const lowerMap: Record<string, string> = {}
      for (const key of Object.keys(hours)) {
        lowerMap[key.toLowerCase()] = key
      }
      const normalized: Record<string, unknown> = {}
      for (const day of ALL_DAYS) {
        const actualKey = lowerMap[day]
        if (actualKey) {
          const val = hours[actualKey]
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
      }
      if (Object.keys(normalized).length > 0) {
        publicClinic.opening_hours = normalized
      }
    }

    return publicClinic as unknown as Clinic
  } catch (error) {
    console.error("Error fetching public clinic:", error)
    return null
  }
})
