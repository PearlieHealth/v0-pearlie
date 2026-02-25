import { NextResponse } from "next/server"

function pick(obj: any, path: string, fallback: any = null) {
  return (
    path.split(".").reduce((acc, key) => (acc && acc[key] != null ? acc[key] : null), obj) ?? fallback
  )
}

export async function POST(req: Request) {
  try {
    const { placeId, sessionToken, maxPhotos = 3 } = await req.json()

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({ error: "Missing GOOGLE_PLACES_API_KEY" }, { status: 500 })
    }
    if (!placeId || typeof placeId !== "string") {
      return NextResponse.json({ error: "Missing placeId" }, { status: 400 })
    }

    // Field mask: request only what you need
    const fields = [
      "id",
      "displayName",
      "formattedAddress",
      "internationalPhoneNumber",
      "nationalPhoneNumber",
      "websiteUri",
      "location",
      "regularOpeningHours",
      "rating",
      "userRatingCount",
      "photos",
      "primaryType",
      "types",
    ].join(",")

    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=${encodeURIComponent(fields)}`

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": fields,
        ...(sessionToken ? { "X-Goog-Session-Token": sessionToken } : {}),
      },
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data?.error?.message || "Details failed", raw: data }, { status: 500 })
    }

    const photos = (data?.photos || [])
      .slice(0, Math.max(0, Math.min(3, maxPhotos)))
      .map((p: any) => {
        const name = p?.name
        const photoUrl = name
          ? `https://places.googleapis.com/v1/${name}/media?maxHeightPx=800&maxWidthPx=1200`
          : null
        return photoUrl ? { url: photoUrl, author: p?.authorAttributions?.[0]?.displayName || null } : null
      })
      .filter(Boolean)

    // Normalize into clinic form fields
    const clinic = {
      placeId: data?.id || placeId,
      name: pick(data, "displayName.text", ""),
      formattedAddress: data?.formattedAddress || "",
      phone: data?.internationalPhoneNumber || data?.nationalPhoneNumber || "",
      website: data?.websiteUri || "",
      lat: pick(data, "location.latitude"),
      lng: pick(data, "location.longitude"),
      openingHours: data?.regularOpeningHours?.weekdayDescriptions || [],
      rating: data?.rating ?? null,
      ratingCount: data?.userRatingCount ?? null,
      types: data?.types || [],
      photos,
      raw: data,
    }

    return NextResponse.json({ clinic })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
