import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Only return fields that are safe for public/patient-facing views
const PUBLIC_CLINIC_FIELDS = `
  id, name, slug, address, postcode, city, latitude, longitude,
  phone, website, rating, review_count, treatments, description,
  facilities, opening_hours, images, verified, accepts_nhs,
  parking_available, wheelchair_accessible, tags, available_days,
  available_hours, accepts_same_day, highlight_chips, price_range,
  featured
`.replace(/\s+/g, " ").trim()

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = Number.parseInt(searchParams.get("offset") || "0")
    const treatment = searchParams.get("treatment")
    const priceRange = searchParams.get("priceRange")
    const acceptsNhs = searchParams.get("acceptsNhs") === "true"

    const actualOffset = offset || (page - 1) * limit

    let query = supabase.from("clinics").select(PUBLIC_CLINIC_FIELDS, { count: "exact" })

    // Only show live, non-archived clinics to the public
    query = query.eq("is_archived", false).eq("is_live", true)

    // Apply filters
    if (treatment) {
      query = query.contains("treatments", [treatment])
    }

    if (priceRange) {
      query = query.eq("price_range", priceRange)
    }

    if (acceptsNhs) {
      query = query.eq("accepts_nhs", true)
    }

    // Sort by featured first, then rating
    query = query.order("featured", { ascending: false }).order("rating", { ascending: false })

    // Apply pagination
    query = query.range(actualOffset, actualOffset + limit - 1)

    const { data: clinics, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      clinics: clinics || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching clinics:", error)
    return NextResponse.json(
      {
        error: "Unable to load clinics at this time",
      },
      { status: 500 },
    )
  }
}
