import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get("clinicId")

    const supabaseAdmin = createAdminClient()

    // Public fetch by clinicId (for public profile page) - only return safe fields
    if (clinicId) {
      const { data: providers, error } = await supabaseAdmin
        .from("clinic_providers")
        .select("id, name, photo_url, bio, education, certifications")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })

      if (error) {
        return NextResponse.json({ error: "Failed to fetch providers" }, { status: 500 })
      }

      return NextResponse.json({ providers: providers || [] })
    }

    // Authenticated fetch for clinic dashboard (own providers)
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: clinicUser } = await supabaseAdmin
      .from("clinic_users")
      .select("clinic_id")
      .eq("user_id", user.id)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "No clinic found" }, { status: 404 })
    }

    const { data: providers, error } = await supabaseAdmin
      .from("clinic_providers")
      .select("*")
      .eq("clinic_id", clinicUser.clinic_id)
      .order("sort_order", { ascending: true })

    if (error) {
      return NextResponse.json({ error: "Failed to fetch providers" }, { status: 500 })
    }

    return NextResponse.json({ providers: providers || [] })
  } catch (error) {
    console.error("[Clinic Providers API] GET error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()
    const { data: clinicUser } = await supabaseAdmin
      .from("clinic_users")
      .select("clinic_id")
      .eq("user_id", user.id)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "No clinic found" }, { status: 404 })
    }

    const body = await request.json()

    // Get current max sort_order
    const { data: existing } = await supabaseAdmin
      .from("clinic_providers")
      .select("sort_order")
      .eq("clinic_id", clinicUser.clinic_id)
      .order("sort_order", { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

    const { data: provider, error } = await supabaseAdmin
      .from("clinic_providers")
      .insert({
        clinic_id: clinicUser.clinic_id,
        name: body.name || "",
        photo_url: body.photo_url || null,
        bio: body.bio || null,
        education: body.education || [],
        certifications: body.certifications || [],
        sort_order: nextOrder,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("[Clinic Providers API] Insert error:", error)
      return NextResponse.json({ error: "Failed to create provider" }, { status: 500 })
    }

    return NextResponse.json({ provider })
  } catch (error) {
    console.error("[Clinic Providers API] POST error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()
    const { data: clinicUser } = await supabaseAdmin
      .from("clinic_users")
      .select("clinic_id")
      .eq("user_id", user.id)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "No clinic found" }, { status: 404 })
    }

    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: "Provider ID required" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.photo_url !== undefined) updateData.photo_url = body.photo_url
    if (body.bio !== undefined) updateData.bio = body.bio
    if (body.education !== undefined) updateData.education = body.education
    if (body.certifications !== undefined) updateData.certifications = body.certifications
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    updateData.updated_at = new Date().toISOString()

    const { data: provider, error } = await supabaseAdmin
      .from("clinic_providers")
      .update(updateData)
      .eq("id", body.id)
      .eq("clinic_id", clinicUser.clinic_id)
      .select()
      .single()

    if (error) {
      console.error("[Clinic Providers API] Update error:", error)
      return NextResponse.json({ error: "Failed to update provider" }, { status: 500 })
    }

    return NextResponse.json({ provider })
  } catch (error) {
    console.error("[Clinic Providers API] PUT error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()
    const { data: clinicUser } = await supabaseAdmin
      .from("clinic_users")
      .select("clinic_id")
      .eq("user_id", user.id)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "No clinic found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get("id")

    if (!providerId) {
      return NextResponse.json({ error: "Provider ID required" }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from("clinic_providers")
      .delete()
      .eq("id", providerId)
      .eq("clinic_id", clinicUser.clinic_id)

    if (error) {
      console.error("[Clinic Providers API] Delete error:", error)
      return NextResponse.json({ error: "Failed to delete provider" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Clinic Providers API] DELETE error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
