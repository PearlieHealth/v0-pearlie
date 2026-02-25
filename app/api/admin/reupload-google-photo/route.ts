import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

/**
 * Downloads a Google Places photo server-side and re-uploads it to
 * Supabase storage so we store a permanent, key-free URL.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { photoUrl } = await request.json()

    if (!photoUrl || typeof photoUrl !== "string") {
      return NextResponse.json({ error: "Missing photoUrl" }, { status: 400 })
    }

    // Validate this is a Google Places photo URL
    let parsed: URL
    try {
      parsed = new URL(photoUrl)
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
    }

    if (parsed.hostname !== "places.googleapis.com") {
      return NextResponse.json({ error: "Only Google Places URLs are supported" }, { status: 400 })
    }

    // Use the current server-side API key
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 })
    }

    // Authenticate via header (matching how the search route talks to Google)
    const imageResponse = await fetch(parsed.toString(), {
      headers: {
        Accept: "image/*",
        "X-Goog-Api-Key": apiKey,
      },
      redirect: "follow",
    })

    if (!imageResponse.ok) {
      console.error("[reupload-google-photo] Google fetch failed:", imageResponse.status)
      return NextResponse.json({ error: "Failed to fetch image from Google" }, { status: 502 })
    }

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg"
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Response is not an image" }, { status: 502 })
    }

    const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer())

    // Determine file extension from content type
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }
    const ext = extMap[contentType] || "jpg"

    // Upload to Supabase storage using admin client (bypasses RLS)
    const supabase = createAdminClient()
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const filename = `${timestamp}_${randomString}.${ext}`
    const path = `clinic-photos/main/${filename}`

    const { data, error } = await supabase.storage.from("clinic-assets").upload(path, imageBuffer, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("[reupload-google-photo] Supabase upload error:", error)

      if (error.message?.includes("Bucket not found")) {
        // Bucket not configured - return the original URL as fallback
        // The image proxy will handle serving it
        return NextResponse.json({ url: photoUrl, proxied: true })
      }

      throw error
    }

    const { data: urlData } = supabase.storage.from("clinic-assets").getPublicUrl(path)

    return NextResponse.json({
      url: urlData.publicUrl,
      path: data.path,
    })
  } catch (error) {
    console.error("[reupload-google-photo] Error:", error)
    return NextResponse.json({ error: "Failed to re-upload photo" }, { status: 500 })
  }
}
