import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from("clinics")
      .select("*")
      .order("name")

    if (error) {
      console.error("[v0] Error fetching clinics:", error)
      throw error
    }

    return NextResponse.json({ clinics: data || [] })
  } catch (error) {
    console.error("[v0] Error fetching clinics:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch clinics" },
      { status: 500 }
    )
  }
}

async function geocodePostcode(postcode: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Clean postcode: uppercase, trim, remove extra spaces
    const cleanPostcode = postcode.toUpperCase().trim().replace(/\s+/g, "")

    console.log("[v0] Geocoding postcode:", cleanPostcode)

    const response = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`)

    if (!response.ok) {
      console.error("[v0] Geocoding failed:", response.status, response.statusText)
      return null
    }

    const data = await response.json()

    if (data.status === 200 && data.result) {
      console.log("[v0] Geocoded successfully:", data.result.latitude, data.result.longitude)
      return {
        latitude: data.result.latitude,
        longitude: data.result.longitude,
      }
    }

    return null
  } catch (error) {
    console.error("[v0] Geocoding error:", error)
    return null
  }
}

function validateUKPostcode(postcode: string): boolean {
  const ukPostcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i
  return ukPostcodeRegex.test(postcode.trim())
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = createAdminClient()
    const body = await request.json()

    console.log("[v0] Creating clinic with data:", body)

    if (body.postcode) {
      // Validate postcode format
      if (!validateUKPostcode(body.postcode)) {
        console.error("[v0] Invalid postcode format:", body.postcode)
        return NextResponse.json(
          { error: "Invalid postcode. Please enter a full UK postcode (e.g., SW1A 1AA)" },
          { status: 400 },
        )
      }

      // Geocode postcode to get latitude/longitude
      const coords = await geocodePostcode(body.postcode)

      if (!coords) {
        console.error("[v0] Failed to geocode postcode:", body.postcode)
        return NextResponse.json(
          { error: "Could not find location for postcode. Please check the postcode is correct." },
          { status: 400 },
        )
      }

      // Add coordinates to body
      body.latitude = coords.latitude
      body.longitude = coords.longitude

      console.log("[v0] Added coordinates:", coords)
    } else {
      // No postcode provided - require it
      return NextResponse.json({ error: "Postcode is required to create a clinic" }, { status: 400 })
    }

    // This ensures Active clinics appear in patient matching by default
    if (body.is_live === undefined && !body.is_archived) {
      body.is_live = true
    }

    // Sanitize fields with check constraints - convert empty strings to null
    const fieldsToSanitize = ['price_range', 'city', 'email', 'notification_email', 'tag_notes', 'description', 'opening_hours']
    for (const field of fieldsToSanitize) {
      if (body[field] === '' || body[field] === undefined) {
        body[field] = null
      }
    }
    
    // Also remove any undefined values entirely
    const cleanBody = Object.fromEntries(
      Object.entries(body).filter(([_, v]) => v !== undefined)
    )
    
    console.log("[v0] Sanitized body before insert:", JSON.stringify(cleanBody, null, 2))

    const { data, error } = await supabase.from("clinics").insert([cleanBody]).select().single()

    if (error) {
      console.error("[v0] Error creating clinic:", error)
      throw error
    }

    console.log("[v0] Clinic created successfully:", data.id)
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating clinic:", error)
    return NextResponse.json({ error: "Failed to create clinic" }, { status: 500 })
  }
}
