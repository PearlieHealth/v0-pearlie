import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// Fields that only admin can modify
const ADMIN_ONLY_FIELDS = ["is_live", "verified", "is_archived", "google_place_id", "google_rating", "google_review_count"]

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Verify user is logged in
    const { data: { user } } = await supabase.auth.getUser()
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
    const supabase = await createClient()
    
    // Verify user is logged in
    const { data: { user } } = await supabase.auth.getUser()
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

    // Parse request body
    const body = await request.json()
    
    // Remove admin-only fields from the update
    const sanitizedData = { ...body }
    for (const field of ADMIN_ONLY_FIELDS) {
      delete sanitizedData[field]
    }
    
    // Also remove id to prevent changing it
    delete sanitizedData.id

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
