import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = await createClient()
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string // 'main' or 'gallery'

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, JPG, and PNG are allowed." }, { status: 400 })
    }

    // Validate file size (5MB for main, 10MB for gallery)
    const maxSize = type === "main" ? 5 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB.` },
        { status: 400 },
      )
    }

    // Create unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const extension = file.name.split(".").pop()
    const filename = `${timestamp}_${randomString}.${extension}`
    const folder = type === "main" ? "main" : "gallery"
    const path = `clinic-photos/${folder}/${filename}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from("clinic-assets").upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("Storage upload error:", error)

      // Check if the bucket exists
      if (error.message?.includes("Bucket not found")) {
        return NextResponse.json(
          {
            error:
              "Storage bucket not configured. Please create a 'clinic-assets' bucket in your Supabase Dashboard under Storage.",
            details: error.message,
          },
          { status: 503 },
        )
      }

      throw error
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("clinic-assets").getPublicUrl(path)

    return NextResponse.json({
      url: urlData.publicUrl,
      path: data.path,
    })
  } catch (error) {
    console.error("Error uploading photo:", error)
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 })
  }
}
