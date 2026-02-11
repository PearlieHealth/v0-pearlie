import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user belongs to a clinic
    const supabaseAdmin = createAdminClient()
    const { data: clinicUser } = await supabaseAdmin
      .from("clinic_users")
      .select("clinic_id")
      .eq("user_id", user.id)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "No clinic found for user" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string // 'main', 'gallery', or 'provider'

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WEBP are allowed." },
        { status: 400 },
      )
    }

    // Validate file size (5MB max for provider photos, 10MB for gallery)
    const maxSize = type === "provider" || type === "main" ? 5 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      const limitMB = maxSize / (1024 * 1024)
      return NextResponse.json(
        { error: `File size exceeds ${limitMB}MB limit. Please choose a smaller image.` },
        { status: 400 },
      )
    }

    // Generate unique filename scoped to the clinic
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const filename = `${timestamp}_${randomString}.${extension}`

    // Determine storage path - scope to clinic for security
    const folder = type === "provider" ? "providers" : type === "main" ? "main" : "gallery"
    const path = `clinic-photos/${clinicUser.clinic_id}/${folder}/${filename}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage using admin client (bypasses RLS/bucket policies)
    const { data, error } = await supabaseAdmin.storage.from("clinic-assets").upload(path, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("[Clinic Upload] Storage upload error:", error)

      if (error.message?.includes("Bucket not found")) {
        return NextResponse.json(
          {
            error: "Storage not configured. Please contact support.",
            details: error.message,
          },
          { status: 503 },
        )
      }

      return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("clinic-assets").getPublicUrl(data.path)

    return NextResponse.json({
      url: publicUrl,
      path: data.path,
      filename: file.name,
    })
  } catch (error) {
    console.error("[Clinic Upload] Error:", error)
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 })
  }
}

// DELETE endpoint to remove uploaded images
export async function DELETE(request: NextRequest) {
  try {
    // Verify user is authenticated
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
      return NextResponse.json({ error: "No clinic found for user" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const path = searchParams.get("path")

    if (!path) {
      return NextResponse.json({ error: "No path provided" }, { status: 400 })
    }

    // Security: only allow deletion of files in this clinic's folder
    if (!path.includes(clinicUser.clinic_id)) {
      return NextResponse.json({ error: "Not authorized to delete this file" }, { status: 403 })
    }

    const { error } = await supabaseAdmin.storage.from("clinic-assets").remove([path])

    if (error) {
      console.error("[Clinic Upload] Storage delete error:", error)
      return NextResponse.json({ error: `Delete failed: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Clinic Upload] Delete error:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
