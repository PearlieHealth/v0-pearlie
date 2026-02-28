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

// Bulk fetch opening hours from Google for multiple clinics
export async function POST(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Missing GOOGLE_PLACES_API_KEY" }, { status: 500 })
  }

  try {
    const { clinicIds } = await request.json()

    if (!Array.isArray(clinicIds) || clinicIds.length === 0) {
      return NextResponse.json({ error: "clinicIds array required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch clinics with their google_place_id
    const { data: clinics, error } = await supabase
      .from("clinics")
      .select("id, name, address, postcode, google_place_id, opening_hours")
      .in("id", clinicIds)

    if (error) throw error

    const dayMap: Record<string, keyof OpeningHours> = {
      Monday: "monday",
      Tuesday: "tuesday",
      Wednesday: "wednesday",
      Thursday: "thursday",
      Friday: "friday",
      Saturday: "saturday",
      Sunday: "sunday",
    }

    const results: Array<{
      clinicId: string
      clinicName: string
      status: "updated" | "already_has_hours" | "no_place_id" | "no_hours_found" | "failed"
      error?: string
    }> = []

    for (const clinic of clinics || []) {
      // Need a google_place_id to fetch hours
      if (!clinic.google_place_id) {
        results.push({
          clinicId: clinic.id,
          clinicName: clinic.name,
          status: "no_place_id",
        })
        continue
      }

      try {
        // Fetch place details including opening hours
        const detailsRes = await fetch(
          `https://places.googleapis.com/v1/places/${clinic.google_place_id}`,
          {
            method: "GET",
            headers: {
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "regularOpeningHours",
            },
          }
        )

        const detailsData = await detailsRes.json()

        if (!detailsRes.ok) {
          results.push({
            clinicId: clinic.id,
            clinicName: clinic.name,
            status: "failed",
            error: "Google API error",
          })
          continue
        }

        const weekdayDescriptions = detailsData.regularOpeningHours?.weekdayDescriptions || []

        if (weekdayDescriptions.length === 0) {
          results.push({
            clinicId: clinic.id,
            clinicName: clinic.name,
            status: "no_hours_found",
          })
          continue
        }

        // Parse opening hours
        const openingHours: OpeningHours = {}
        for (const desc of weekdayDescriptions) {
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

        // Update clinic
        const { error: updateError } = await supabase
          .from("clinics")
          .update({
            opening_hours: openingHours,
            updated_at: new Date().toISOString(),
          })
          .eq("id", clinic.id)

        if (updateError) throw updateError

        results.push({
          clinicId: clinic.id,
          clinicName: clinic.name,
          status: "updated",
        })
      } catch (err) {
        results.push({
          clinicId: clinic.id,
          clinicName: clinic.name,
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    const updated = results.filter((r) => r.status === "updated").length
    const noPlaceId = results.filter((r) => r.status === "no_place_id").length
    const noHoursFound = results.filter((r) => r.status === "no_hours_found").length
    const failed = results.filter((r) => r.status === "failed").length

    return NextResponse.json({
      results,
      summary: { updated, noPlaceId, noHoursFound, failed, total: results.length },
    })
  } catch (error) {
    console.error("[bulk-fetch-hours] Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
