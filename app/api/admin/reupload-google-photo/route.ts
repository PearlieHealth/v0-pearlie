import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Downloads a Google Places photo and uploads it to Supabase storage.
 * Retries up to MAX_RETRIES times before giving up.
 * Returns { url, path } on success, or { url, failed: true } on failure.
 */
async function downloadAndUpload(photoUrl: string): Promise<{ url: string; path?: string; failed?: boolean }> {
  const parsed = new URL(photoUrl)
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    throw new Error("Google Places API key not configured")
  }

  let lastError: string = ""

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Fetch the image from Google Places
      const imageResponse = await fetch(parsed.toString(), {
        headers: {
          Accept: "image/*",
          "X-Goog-Api-Key": apiKey,
        },
        redirect: "follow",
      })

      if (!imageResponse.ok) {
        lastError = `Google fetch failed with status ${imageResponse.status}`
        console.error(`[reupload-google-photo] Attempt ${attempt}/${MAX_RETRIES}: ${lastError}`)
        if (attempt < MAX_RETRIES) { await sleep(RETRY_DELAY_MS * attempt); continue }
        break
      }

      const contentType = imageResponse.headers.get("content-type") || "image/jpeg"
      if (!contentType.startsWith("image/")) {
        lastError = `Response content-type is not an image: ${contentType}`
        console.error(`[reupload-google-photo] Attempt ${attempt}/${MAX_RETRIES}: ${lastError}`)
        if (attempt < MAX_RETRIES) { await sleep(RETRY_DELAY_MS * attempt); continue }
        break
      }

      const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer())

      const extMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      }
      const ext = extMap[contentType] || "jpg"

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
        lastError = `Supabase upload error: ${error.message}`
        console.error(`[reupload-google-photo] Attempt ${attempt}/${MAX_RETRIES}: ${lastError}`)
        if (attempt < MAX_RETRIES) { await sleep(RETRY_DELAY_MS * attempt); continue }
        break
      }

      const { data: urlData } = supabase.storage.from("clinic-assets").getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      // Verify the Supabase URL actually works
      const check = await fetch(publicUrl, { method: "HEAD" })
      if (!check.ok) {
        lastError = `Supabase URL not accessible: ${check.status}`
        console.error(`[reupload-google-photo] Attempt ${attempt}/${MAX_RETRIES}: ${lastError}`)
        if (attempt < MAX_RETRIES) { await sleep(RETRY_DELAY_MS * attempt); continue }
        break
      }

      // Success
      return { url: publicUrl, path: data.path }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      console.error(`[reupload-google-photo] Attempt ${attempt}/${MAX_RETRIES}: ${lastError}`)
      if (attempt < MAX_RETRIES) { await sleep(RETRY_DELAY_MS * attempt); continue }
    }
  }

  // All retries exhausted — return failure (do NOT silently return the Google URL)
  console.error(`[reupload-google-photo] All ${MAX_RETRIES} attempts failed for ${photoUrl}: ${lastError}`)
  return { url: photoUrl, failed: true }
}

/**
 * Downloads a Google Places photo server-side and re-uploads it to
 * Supabase storage so we store a permanent, key-free URL.
 *
 * Returns { url, path } on success.
 * Returns { url, failed: true } if all retries fail — the caller should
 * NOT store this URL in the database.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const body = await request.json()
    const photoUrl = body.photoUrl

    if (!photoUrl || typeof photoUrl !== "string") {
      return NextResponse.json({ error: "Missing photoUrl" }, { status: 400 })
    }

    let parsed: URL
    try {
      parsed = new URL(photoUrl)
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
    }

    if (parsed.hostname !== "places.googleapis.com") {
      return NextResponse.json({ error: "Only Google Places URLs are supported" }, { status: 400 })
    }

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 })
    }

    const result = await downloadAndUpload(photoUrl)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[reupload-google-photo] Error:", error)
    return NextResponse.json({ error: "Failed to re-upload photo" }, { status: 500 })
  }
}
