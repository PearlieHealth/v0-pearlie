import { type NextRequest, NextResponse } from "next/server"

/**
 * Server-side image proxy for Google Places photos.
 *
 * Google Places photo URLs require an API key and often have referrer/IP
 * restrictions that prevent the Next.js image optimizer (or the browser)
 * from fetching them directly. This route fetches the image server-side
 * and streams it back so the frontend can display it.
 *
 * Usage: /api/image-proxy?url=<encoded-places-url>
 *
 * Only proxies requests to places.googleapis.com for safety.
 */
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

  // Only proxy Google Places photo URLs
  if (parsed.hostname !== "places.googleapis.com") {
    return NextResponse.json({ error: "Only Google Places photo URLs are supported" }, { status: 403 })
  }

  // Ensure it's a photo media endpoint
  if (!parsed.pathname.includes("/photos/") || !parsed.pathname.endsWith("/media")) {
    return NextResponse.json({ error: "URL does not look like a Google Places photo" }, { status: 403 })
  }

  // Replace whatever key is in the stored URL with the current server-side key
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 })
  }

  parsed.searchParams.set("key", apiKey)

  try {
    const response = await fetch(parsed.toString(), {
      headers: { Accept: "image/*" },
      redirect: "follow",
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image from Google Places" },
        { status: response.status },
      )
    }

    const contentType = response.headers.get("content-type") || "image/jpeg"

    // Only allow image content types
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
