import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { geocodePostcode } from "@/lib/postcodes-io"
import { deriveDesiredTags, TREATMENT_TO_CAPABILITY_TAG, EXPANSION_THRESHOLD_MILES } from "@/lib/matching/mapping"

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10 // Round to 1 decimal
}

interface ScoredClinic {
  id: string
  name: string
  address: string
  postcode: string
  latitude: number
  longitude: number
  phone: string
  website: string | null
  rating: number
  review_count: number
  treatments: string[]
  tags: string[]
  images: string[]
  verified: boolean
  distance: number
  score: number
  whyMatched: string[]
  secondarySuggestion: boolean
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { leadId } = body

    console.log("[v0] Starting match for lead:", leadId)

    // 1. Fetch lead data
    const { data: lead, error: leadError } = await supabase.from("leads").select("*").eq("id", leadId).single()

    if (leadError || !lead) {
      console.error("[v0] Lead not found:", leadId)
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // 2. Geocode postcode if lat/lng missing
    let leadLat = lead.latitude
    let leadLon = lead.longitude

    if (!leadLat || !leadLon) {
      console.log("[v0] Geocoding postcode:", lead.postcode)
      const geocoded = await geocodePostcode(lead.postcode)

      if (geocoded) {
        leadLat = geocoded.latitude
        leadLon = geocoded.longitude

        // Update lead with geocoded coordinates (non-blocking)
        supabase
          .from("leads")
          .update({ latitude: leadLat, longitude: leadLon })
          .eq("id", leadId)
          .then(() => console.log("[v0] Updated lead coordinates"))
          .catch((err) => console.warn("[v0] Failed to update lead coordinates:", err))
      } else {
        console.warn("[v0] Geocoding failed, using default London coordinates")
        leadLat = 51.5074
        leadLon = -0.1278
      }
    }

    // 3. Fetch active London clinics with valid coordinates
    const { data: allClinics, error: clinicsError } = await supabase
      .from("clinics")
      .select("*")
      .eq("is_archived", false)
      .not("latitude", "is", null)
      .not("longitude", "is", null)

    if (clinicsError) {
      console.error("[v0] Error fetching clinics:", clinicsError)
      throw clinicsError
    }

    console.log("[v0] Found", allClinics?.length || 0, "active clinics")

    if (!allClinics || allClinics.length === 0) {
      return NextResponse.json(
        {
          topClinics: [],
          moreClinics: [],
          minDistance: null,
          expandBanner: false,
        },
        { status: 200 },
      )
    }

    // 4. Derive desired tags from lead
    const desiredTags = deriveDesiredTags({
      decision_values: lead.decision_values,
      conversion_blocker: lead.conversion_blocker,
    })

    const capabilityBoostTag = lead.treatment_interest ? TREATMENT_TO_CAPABILITY_TAG[lead.treatment_interest] : null

    console.log("[v0] Desired tags:", desiredTags)
    console.log("[v0] Capability boost tag:", capabilityBoostTag)

    // 5. Score and rank each clinic
    const isEmergency = lead.is_emergency === true

    const scoredClinics: ScoredClinic[] = allClinics.map((clinic) => {
      const distance = calculateDistance(
        leadLat!,
        leadLon!,
        Number.parseFloat(clinic.latitude),
        Number.parseFloat(clinic.longitude),
      )

      let score = 0
      const whyMatched: string[] = []
      let secondarySuggestion = false

      if (isEmergency) {
        // ---- EMERGENCY SCORING PATH ----
        // Only 3 factors: accepts emergency (40), anxiety-friendly (25), distance (35)
        const clinicTags = clinic.tags || []

        // A) Accepts emergency (max 40)
        if (clinic.accepts_urgent === true) {
          score += 40
          whyMatched.push("Accepts emergency patients")
        }

        // B) Anxiety-friendly (max 25)
        const hasAnxietyTag = clinicTags.includes("calm-care") || clinicTags.includes("good-with-anxious-patients")
        if (hasAnxietyTag) {
          score += 25
          whyMatched.push("Anxiety-friendly care")
        }

        // C) Distance (max 35)
        if (distance <= 2) score += 35
        else if (distance <= 5) score += 28
        else if (distance <= 8) score += 20
        else if (distance <= 12) score += 12
        else score += 5

        whyMatched.unshift(`${distance} miles from ${lead.postcode}`)

      } else {
        // ---- STANDARD SCORING PATH ----

        // A) Treatment eligibility + boost (max 35)
        const clinicTreatments = (clinic.treatments || []).map((t: string) => t.toLowerCase())
        const treatmentInterest = lead.treatment_interest?.toLowerCase() || ""
        const treatmentMatch = clinicTreatments.some(
          (ct: string) => ct.includes(treatmentInterest) || treatmentInterest.includes(ct),
        )

        if (treatmentMatch) {
          score += 25
          whyMatched.push(`Offers ${lead.treatment_interest}`)
        } else {
          secondarySuggestion = true
        }

        // Capability boost tag
        if (capabilityBoostTag && (clinic.tags || []).includes(capabilityBoostTag)) {
          score += 10
        }

        // B) Distance (max 35)
        if (distance <= 2) score += 35
        else if (distance <= 5) score += 28
        else if (distance <= 8) score += 20
        else if (distance <= 12) score += 12
        else score += 5

        // C) Values + blocker tag match (max 20)
        const clinicTags = clinic.tags || []
        let tagMatchPoints = 0
        const matchedTags: string[] = []

        for (const desiredTag of desiredTags) {
          if (clinicTags.includes(desiredTag)) {
            tagMatchPoints += 5
            matchedTags.push(desiredTag)
            if (tagMatchPoints >= 20) break
          }
        }

        score += Math.min(tagMatchPoints, 20)

        // Add matched tags to reasons (simplified labels)
        if (matchedTags.includes("calm-care") || matchedTags.includes("good-with-anxious-patients")) {
          whyMatched.push("Anxiety-friendly care")
        }
        if (matchedTags.includes("clear-pricing") || matchedTags.includes("value-focused")) {
          whyMatched.push("Clear pricing")
        }
        if (matchedTags.includes("finance-available")) {
          whyMatched.push("Finance available")
        }

        // D) Trust (max 10)
        if (clinic.verified) {
          score += 4
          whyMatched.push("Verified clinic")
        }

        if (clinic.rating >= 4.6) score += 3
        if (clinic.review_count >= 50) score += 3

        // Add review info to reasons
        if (clinic.rating >= 4.5 && clinic.review_count >= 20) {
          whyMatched.push(`${clinic.rating}★ (${clinic.review_count}+ reviews)`)
        }

        // Add distance as first reason
        whyMatched.unshift(`${distance} miles from ${lead.postcode}`)
      }

      // Clamp score to 0-100
      score = Math.max(0, Math.min(100, score))

      return {
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        postcode: clinic.postcode,
        latitude: Number.parseFloat(clinic.latitude),
        longitude: Number.parseFloat(clinic.longitude),
        phone: clinic.phone,
        website: clinic.website,
        rating: clinic.rating || 0,
        review_count: clinic.review_count || 0,
        treatments: clinic.treatments || [],
        tags: clinic.tags || [],
        images: clinic.images || [],
        verified: clinic.verified || false,
        distance,
        score,
        whyMatched: whyMatched.slice(0, 3), // Top 3 reasons
        secondarySuggestion,
      }
    })

    // 6. Rank clinics by: primary eligibility → score → distance → review_count
    const rankedClinics = scoredClinics.sort((a, b) => {
      // Primary treatment match first
      if (a.secondarySuggestion !== b.secondarySuggestion) {
        return a.secondarySuggestion ? 1 : -1
      }
      // Then by score
      if (b.score !== a.score) return b.score - a.score
      // Then by distance
      if (a.distance !== b.distance) return a.distance - b.distance
      // Finally by review count
      return b.review_count - a.review_count
    })

    // 7. Calculate minDistance and expandBanner
    const minDistance = Math.min(...rankedClinics.map((c) => c.distance))
    const expandBanner = minDistance > EXPANSION_THRESHOLD_MILES

    // 8. Split into topClinics (first 2) and moreClinics (rest)
    const topClinics = rankedClinics.slice(0, 2)
    const moreClinics = rankedClinics.slice(2)

    // 9. Persist match to database
    const clinicIds = rankedClinics.map((c) => c.id)
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .insert({
        lead_id: leadId,
        clinic_ids: clinicIds,
        status: "pending",
      })
      .select()
      .single()

    if (matchError) {
      console.error("Error creating match:", matchError)
      throw matchError
    }

    // 10. Save individual match_results for each clinic (feeds clinic dashboards)
    const matchResultRows = rankedClinics.map((c, index) => ({
      lead_id: leadId,
      clinic_id: c.id,
      score: c.score,
      reasons: c.whyMatched || [],
      match_run_id: match.id,
      rank: index + 1,
    }))

    const { error: resultsError } = await supabase
      .from("match_results")
      .insert(matchResultRows)

    if (resultsError) {
      console.error("Error saving match_results:", resultsError)
      // Don't throw -- the match was created, results are non-critical
    }

    return NextResponse.json(
      {
        matchId: match.id,
        topClinics,
        moreClinics,
        minDistance,
        expandBanner,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Error in matching algorithm:", error)
    return NextResponse.json({ error: "Failed to match clinics" }, { status: 500 })
  }
}
