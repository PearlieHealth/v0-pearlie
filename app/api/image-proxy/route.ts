import { type NextRequest, NextResponse } from "next/server"

/**
 * Server-side image proxy for clinic photos.
 *
 * Proxies images from allowed external hosts so the browser can display
 * them without CORS issues or missing authentication.
 *
 * - Google Places URLs: adds the server-side API key
 * - Supabase storage URLs: fetches directly (handles public/private buckets)
 * - Other allowed image hosts: fetches directly
 *
 * Usage: /api/image-proxy?url=<encoded-url>
 */

function isAllowedHost(hostname: string): boolean {
  if (hostname === "places.googleapis.com") return true
  if (hostname.endsWith(".supabase.co")) return true
  if (hostname === "lh3.googleusercontent.com") return true
  if (hostname === "images.unsplash.com") return true
  if (hostname === "i.imgur.com") return true
  return false
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  if (!isAllowedHost(parsed.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 })
  }

  // Build request headers
  const headers: Record<string, string> = {
    Accept: "image/*",
  }

  // Google Places photos need API key authentication
  if (parsed.hostname === "places.googleapis.com") {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 })
    }
    parsed.searchParams.delete("key")
    headers["X-Goog-Api-Key"] = apiKey
  }

  try {
    const response = await fetch(parsed.toString(), {
      headers,
      redirect: "follow",
    })

    if (!response.ok) {
      console.error(`[image-proxy] Upstream ${response.status} for ${parsed.hostname}${parsed.pathname}`)
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: response.status },
      )
    }

    const contentType = response.headers.get("content-type") || "image/jpeg"

    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Response is not an image" }, { status: 502 })
    }

    const imageBuffer = await response.arrayBuffer()

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
        "Content-Length": String(imageBuffer.byteLength),
      },
    })
  } catch (error) {
    console.error("[image-proxy] Fetch error:", error)
    return NextResponse.json({ error: "Failed to proxy image" }, { status: 502 })
  }
}
