import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"

// Roles allowed to edit clinic profile
const EDIT_ROLES = ["clinic_admin", "clinic_owner", "clinic_manager"]

// Fields that clinic users are allowed to edit (allowlist approach)
const EDITABLE_FIELDS = new Set([
  "name", "email", "phone", "website", "address", "postcode", "city",
  "description", "opening_hours", "facilities", "treatments", "price_range",
  "latitude", "longitude", "logo_url", "cover_image_url", "gallery_images",
  "accepts_nhs", "parking_available", "wheelchair_accessible",
  "booking_url", "social_links", "languages_spoken",
  "bot_intelligence", "notification_preferences",
  // Additional fields used by clinic profile page
  "notification_email", "accepts_urgent", "featured_review",
  "services", "languages", "accessibility_features", "key_selling_points",
  "finance_provider_names", "ideal_patient_tags", "exclusion_tags",
  "highlight_chips", "images", "before_after_images",
  "offers_free_consultation", "show_treatment_prices", "treatment_prices",
  "google_place_id", "google_rating", "google_review_count", "google_maps_url",
])

// Array fields with their max items
const ARRAY_FIELD_LIMITS: Record<string, number> = {
  treatments: 50,
  facilities: 50,
  gallery_images: 50,
  languages_spoken: 30,
  social_links: 20,
  services: 50,
  languages: 30,
  accessibility_features: 30,
  key_selling_points: 20,
  finance_provider_names: 20,
  ideal_patient_tags: 30,
  exclusion_tags: 30,
  highlight_chips: 30,
  images: 50,
  before_after_images: 20,
}

// Array fields that contain URLs — skip per-item string length validation
const URL_ARRAY_FIELDS = new Set(["images", "gallery_images"])

const MAX_STRING_ITEM_LENGTH = 200
const MAX_TEXT_LENGTH = 5000
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254
}

function validateTreatmentPrices(prices: unknown): string | null {
  if (!Array.isArray(prices)) return "treatment_prices must be an array"
  if (prices.length > 50) return "Too many treatment categories (max 50)"

  for (const category of prices) {
    if (typeof category !== "object" || category === null) {
      return "Invalid treatment category"
    }
    if (typeof category.category === "string" && category.category.length > MAX_STRING_ITEM_LENGTH) {
      return `Category name too long (max ${MAX_STRING_ITEM_LENGTH} chars)`
    }
    if (!Array.isArray(category.treatments)) continue
    if (category.treatments.length > 100) {
      return "Too many treatments in a category (max 100)"
    }
    for (const treatment of category.treatments) {
      if (typeof treatment !== "object" || treatment === null) {
        return "Invalid treatment item"
      }
      if (typeof treatment.price === "string" && treatment.price !== "") {
        const price = parseFloat(treatment.price)
        if (isNaN(price) || price < 0 || price > 99999) {
          return `Invalid price "${treatment.price}": must be a number between 0 and 99999`
        }
      }
      if (typeof treatment.name === "string" && treatment.name.length > MAX_STRING_ITEM_LENGTH) {
        return `Treatment name too long (max ${MAX_STRING_ITEM_LENGTH} chars)`
      }
      if (typeof treatment.description === "string" && treatment.description.length > MAX_STRING_ITEM_LENGTH) {
        return `Treatment description too long (max ${MAX_STRING_ITEM_LENGTH} chars)`
      }
    }
  }
  return null
}

function validateBeforeAfterImages(images: unknown): string | null {
  if (!Array.isArray(images)) return "before_after_images must be an array"
  if (images.length > 20) return "Too many before/after pairs (max 20)"

  for (const pair of images) {
    if (typeof pair !== "object" || pair === null) {
      return "Invalid before/after pair"
    }
    if (typeof pair.description === "string" && pair.description.length > MAX_STRING_ITEM_LENGTH) {
      return `Before/after description too long (max ${MAX_STRING_ITEM_LENGTH} chars)`
    }
    if (typeof pair.treatment === "string" && pair.treatment.length > MAX_STRING_ITEM_LENGTH) {
      return `Before/after treatment label too long (max ${MAX_STRING_ITEM_LENGTH} chars)`
    }
  }
  return null
}

function validateArrayField(value: unknown, fieldName: string, maxItems: number): string | null {
  if (!Array.isArray(value)) return `${fieldName} must be an array`
  if (value.length > maxItems) return `${fieldName}: too many items (max ${maxItems})`

  // Skip per-item string length check for URL fields (URLs can exceed 200 chars)
  if (URL_ARRAY_FIELDS.has(fieldName)) return null

  for (const item of value) {
    if (typeof item === "string" && item.length > MAX_STRING_ITEM_LENGTH) {
      return `${fieldName}: item too long (max ${MAX_STRING_ITEM_LENGTH} chars)`
    }
  }
  return null
}

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get clinic ID from clinic_users
    const supabaseAdmin = createAdminClient()
    const { data: clinicUser } = await supabaseAdmin
      .from("clinic_users")
      .select("clinic_id")
      .eq("user_id", user.id)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "No clinic found" }, { status: 404 })
    }

    // Get full clinic data
    const { data: clinic, error } = await supabaseAdmin
      .from("clinics")
      .select("*")
      .eq("id", clinicUser.clinic_id)
      .single()

    if (error || !clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    // Filter out sensitive fields before returning to the client
    const { booking_webhook_secret, email_forwarding_address, ...safeClinic } = clinic

    return NextResponse.json({ clinic: safeClinic })
  } catch (error) {
    console.error("[Clinic Profile API] GET error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get clinic ID from clinic_users
    const supabaseAdmin = createAdminClient()
    const { data: clinicUser } = await supabaseAdmin
      .from("clinic_users")
      .select("clinic_id, role")
      .eq("user_id", user.id)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "No clinic found" }, { status: 404 })
    }

    // Check role — only clinic_admin, clinic_owner, or clinic_manager can edit
    if (!EDIT_ROLES.includes(clinicUser.role)) {
      return NextResponse.json({ error: "Insufficient permissions to edit clinic profile" }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()

    // Allowlist approach: only include fields that clinic users are allowed to edit
    const sanitizedData: Record<string, any> = {}
    for (const [key, value] of Object.entries(body)) {
      if (EDITABLE_FIELDS.has(key)) {
        sanitizedData[key] = value
      }
    }

    if (Object.keys(sanitizedData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // Validate email fields
    if (sanitizedData.email !== undefined) {
      if (typeof sanitizedData.email !== "string" || !validateEmail(sanitizedData.email)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
      }
    }
    if (sanitizedData.notification_email !== undefined && sanitizedData.notification_email !== "") {
      if (typeof sanitizedData.notification_email !== "string" || !validateEmail(sanitizedData.notification_email)) {
        return NextResponse.json({ error: "Invalid notification email format" }, { status: 400 })
      }
    }

    // Validate text fields length
    for (const field of ["description", "featured_review"] as const) {
      if (sanitizedData[field] !== undefined && typeof sanitizedData[field] === "string") {
        if (sanitizedData[field].length > MAX_TEXT_LENGTH) {
          return NextResponse.json({ error: `${field} too long (max ${MAX_TEXT_LENGTH} characters)` }, { status: 400 })
        }
      }
    }

    // Validate array fields
    for (const [fieldName, maxItems] of Object.entries(ARRAY_FIELD_LIMITS)) {
      if (sanitizedData[fieldName] !== undefined) {
        // Special validation for treatment_prices
        if (fieldName === "treatment_prices") {
          const err = validateTreatmentPrices(sanitizedData[fieldName])
          if (err) return NextResponse.json({ error: err }, { status: 400 })
          continue
        }
        // Special validation for before_after_images
        if (fieldName === "before_after_images") {
          const err = validateBeforeAfterImages(sanitizedData[fieldName])
          if (err) return NextResponse.json({ error: err }, { status: 400 })
          continue
        }
        // Generic array validation
        const err = validateArrayField(sanitizedData[fieldName], fieldName, maxItems)
        if (err) return NextResponse.json({ error: err }, { status: 400 })
      }
    }

    // Update the clinic
    const { data: updatedClinic, error } = await supabaseAdmin
      .from("clinics")
      .update(sanitizedData)
      .eq("id", clinicUser.clinic_id)
      .select()
      .single()

    if (error) {
      console.error("[Clinic Profile API] Update error:", error)
      return NextResponse.json({ error: "Failed to update clinic" }, { status: 500 })
    }

    return NextResponse.json({ clinic: updatedClinic })
  } catch (error) {
    console.error("[Clinic Profile API] PUT error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
