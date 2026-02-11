import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { query, sessionToken } = await req.json()

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({ error: "Missing GOOGLE_PLACES_API_KEY" }, { status: 500 })
    }
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing query" }, { status: 400 })
    }

    // Places API (New) Autocomplete endpoint
    const url = "https://places.googleapis.com/v1/places:autocomplete"

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
      },
      body: JSON.stringify({
        input: query,
        // Bias to UK
        regionCode: "GB",
        sessionToken: sessionToken || undefined,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Autocomplete failed", raw: data },
        { status: 500 }
      )
    }

    // Normalize response
    const suggestions =
      (data?.suggestions || [])
        .map((s: any) => {
          const placeId = s?.placePrediction?.placeId
          const text = s?.placePrediction?.text
          return placeId
            ? {
                placeId,
                primaryText: text?.text || "",
                secondaryText: s?.placePrediction?.structuredFormat?.secondaryText?.text || "",
              }
            : null
        })
        .filter(Boolean) || []

    return NextResponse.json({ suggestions })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
