import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

async function geocodePostcode(postcode: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = createAdminClient()
    const { id } = await params

    const { data, error } = await supabase
      .from("clinics")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: "Clinic not found" }, { status: 404 })

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching clinic:", error)
    return NextResponse.json({ error: "Failed to fetch clinic" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { id } = await params

    // Sanitize fields with check constraints - convert empty strings to null
    const fieldsToSanitize = ['price_range', 'city', 'email', 'notification_email', 'tag_notes', 'description', 'opening_hours']
    for (const field of fieldsToSanitize) {
      if (body[field] === '' || body[field] === undefined) {
        body[field] = null
      }
    }

    const isImageUpdate = Object.keys(body).length <= 2 && ("images" in body || "mainImageUrl" in body)

    if (body.postcode && !isImageUpdate) {
      if (!validateUKPostcode(body.postcode)) {
        console.error("[v0] Invalid postcode format:", body.postcode)
        return NextResponse.json(
          { error: "Invalid postcode. Please enter a full UK postcode (e.g., SW1A 1AA)" },
          { status: 400 },
        )
      }

      const coords = await geocodePostcode(body.postcode)

      if (!coords) {
        console.error("[v0] Failed to geocode postcode:", body.postcode)
        return NextResponse.json(
          { error: "Could not find location for postcode. Please check the postcode is correct." },
          { status: 400 },
        )
      }

      body.latitude = coords.latitude
      body.longitude = coords.longitude
      console.log("[v0] Updated coordinates:", coords)
    }

    const selectFields = isImageUpdate ? "id, images, updated_at" : "*"

    const { data, error } = await supabase
      .from("clinics")
      .update({ ...body, updated_at: new Date().toISOString(), updated_by: "admin" })
      .eq("id", id)
      .select(selectFields)
      .single()

    if (error) throw error

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Error updating clinic:", error)
    return NextResponse.json({ error: "Failed to update clinic" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = await createAdminClient()
    const { id } = params

    console.log("[v0 API] Deleting clinic with ID:", id)

    const { data: existingClinic, error: checkError } = await supabase
      .from("clinics")
      .select("id, name")
      .eq("id", id)
      .maybeSingle()

    if (checkError) {
      console.error("[v0 API] Error checking clinic:", checkError)
      throw checkError
    }

    if (!existingClinic) {
      console.log("[v0 API] Clinic not found:", id)
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    console.log("[v0 API] Deleting clinic:", existingClinic.name)

    const { error } = await supabase.from("clinics").delete().eq("id", id)

    if (error) {
      console.error("[v0 API] Error deleting clinic:", error)
      throw error
    }

    console.log("[v0 API] Clinic deleted successfully")

    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error) {
    console.error("[v0 API] Error deleting clinic:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete clinic" },
      { status: 500 },
    )
  }
}
