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
])

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

    return NextResponse.json({ clinic })
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
