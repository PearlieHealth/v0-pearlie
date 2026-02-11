import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin-auth"

interface OpeningHours {
  monday?: string
  tuesday?: string
  wednesday?: string
  thursday?: string
  friday?: string
  saturday?: string
  sunday?: string
}

// Fetch opening hours from Google Places API by place_id or address
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  const { id: clinicId } = await params

  try {
    const supabase = createAdminClient()
    const { placeId, address } = await request.json()

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({ error: "Missing GOOGLE_PLACES_API_KEY" }, { status: 500 })
    }

    let targetPlaceId = placeId

    // If no placeId provided, search for the clinic by address
    if (!targetPlaceId && address) {
      const searchUrl = `https://places.googleapis.com/v1/places:searchText`
      const searchRes = await fetch(searchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": "places.id,places.displayName",
        },
        body: JSON.stringify({
          textQuery: address,
          includedType: "dentist",
          maxResultCount: 1,
        }),
      })

      const searchData = await searchRes.json()
      if (searchData.places?.[0]?.id) {
        targetPlaceId = searchData.places[0].id
      }
    }

    if (!targetPlaceId) {
      return NextResponse.json({ error: "Could not find Google Place ID for this clinic" }, { status: 404 })
    }

    // Fetch place details including opening hours
    const detailsUrl = `https://places.googleapis.com/v1/places/${targetPlaceId}`
    const detailsRes = await fetch(detailsUrl, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "regularOpeningHours,currentOpeningHours",
      },
    })

    const detailsData = await detailsRes.json()

    if (!detailsRes.ok) {
      return NextResponse.json({ error: "Failed to fetch place details from Google" }, { status: 500 })
    }

    // Parse opening hours from Google's format
    const weekdayDescriptions = detailsData.regularOpeningHours?.weekdayDescriptions || []
    
    // Convert to our format: { monday: "9:00 AM – 6:00 PM", ... }
    const dayMap: Record<string, keyof OpeningHours> = {
      "Monday": "monday",
      "Tuesday": "tuesday",
      "Wednesday": "wednesday",
      "Thursday": "thursday",
      "Friday": "friday",
      "Saturday": "saturday",
      "Sunday": "sunday",
    }

    const openingHours: OpeningHours = {}
    
    for (const desc of weekdayDescriptions) {
      // Format: "Monday: 9:00 AM – 6:00 PM" or "Monday: Closed"
      const colonIndex = desc.indexOf(":")
      if (colonIndex > -1) {
        const dayName = desc.substring(0, colonIndex).trim()
        const hours = desc.substring(colonIndex + 1).trim()
        const dayKey = dayMap[dayName]
        if (dayKey) {
          openingHours[dayKey] = hours
        }
      }
    }

    // Update clinic in database
    const { error: updateError } = await supabase
      .from("clinics")
      .update({ 
        opening_hours: openingHours,
        updated_at: new Date().toISOString()
      })
      .eq("id", clinicId)

    if (updateError) {
      console.error("[opening-hours] Update error:", updateError)
      return NextResponse.json({ error: "Failed to update clinic opening hours" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      opening_hours: openingHours,
      placeId: targetPlaceId
    })

  } catch (error) {
    console.error("[opening-hours] Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// Get current opening hours for a clinic
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  const { id: clinicId } = await params

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("clinics")
      .select("opening_hours, name, address, postcode")
      .eq("id", clinicId)
      .single()

    if (error) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    return NextResponse.json({ 
      opening_hours: data.opening_hours,
      name: data.name,
      address: data.address,
      postcode: data.postcode
    })

  } catch (error) {
    console.error("[opening-hours] Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
