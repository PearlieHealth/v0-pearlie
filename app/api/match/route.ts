import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { geocodePostcode } from "@/lib/postcodes-io"
import { buildLeadProfileFromDB, buildClinicProfile, rankClinics } from "@/lib/matching/engine"
import { getLiveClinicFilter } from "@/lib/matching/clinic-status"

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { leadId } = body

    console.log("[match] Starting match for lead:", leadId)

    // 1. Fetch lead data
    const { data: lead, error: leadError } = await supabase.from("leads").select("*").eq("id", leadId).single()

    if (leadError || !lead) {
      console.error("[match] Lead not found:", leadId)
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // 2. Geocode postcode if lat/lng missing
    let leadLat = lead.latitude ? Number(lead.latitude) : null
    let leadLon = lead.longitude ? Number(lead.longitude) : null

    if (!leadLat || !leadLon) {
      console.log("[match] Geocoding postcode:", lead.postcode)
      const geocoded = await geocodePostcode(lead.postcode)

      if (geocoded) {
        leadLat = geocoded.latitude
        leadLon = geocoded.longitude

        // Update lead with geocoded coordinates (non-blocking)
        supabase
          .from("leads")
          .update({ latitude: leadLat, longitude: leadLon })
          .eq("id", leadId)
          .then(() => console.log("[match] Updated lead coordinates"))
      } else {
        console.warn("[match] Geocoding failed, using default London coordinates")
        leadLat = 51.5074
        leadLon = -0.1278
      }
    }

    // 3. Fetch active clinics with valid coordinates
    const liveFilter = getLiveClinicFilter()
    const { data: allClinicRows, error: clinicsError } = await supabase
      .from("clinics")
      .select("*")
      .eq(liveFilter.field, liveFilter.value)
      .not("latitude", "is", null)
      .not("longitude", "is", null)

    if (clinicsError) {
      console.error("[match] Error fetching clinics:", clinicsError)
      throw clinicsError
    }

    console.log("[match] Found", allClinicRows?.length || 0, "active clinics")

    if (!allClinicRows || allClinicRows.length === 0) {
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

    // 4. Fetch all filter selections for clinics
    const { data: filterSelections } = await supabase.from("clinic_filter_selections").select("clinic_id, filter_key")

    // Build filter map: clinic_id -> [filter_key, ...]
    const filterMap = new Map<string, string[]>()
    for (const selection of filterSelections || []) {
      const existing = filterMap.get(selection.clinic_id) || []
      existing.push(selection.filter_key)
      filterMap.set(selection.clinic_id, existing)
    }

    // 5. Normalize lead and clinics using the unified engine
    const profile = buildLeadProfileFromDB({
      ...lead,
      latitude: leadLat,
      longitude: leadLon,
    })

    const clinicProfiles = allClinicRows.map((row) =>
      buildClinicProfile(row, filterMap.get(row.id) || []),
    )

    // 6. Run the unified ranking engine
    const rankedClinics = rankClinics(profile, clinicProfiles, {
      topN: 20,
      includeUnverified: true,
    })

    console.log("[match] Ranked", rankedClinics.length, "clinics")

    // 7. Persist match to database
    const clinicIds = rankedClinics.map((rc) => rc.clinic.id)
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
      console.error("[match] Error creating match:", matchError)
      throw matchError
    }

    // 8. Save individual match_results for each clinic (feeds clinic dashboards)
    const matchResultRows = rankedClinics.map((rc, index) => ({
      lead_id: leadId,
      clinic_id: rc.clinic.id,
      score: rc.score.percent,
      reasons: rc.reasons.map((r) => r.text),
      match_run_id: match.id,
      rank: index + 1,
      match_breakdown: rc.score.categories.map((c) => ({
        category: c.category,
        points: c.points,
        maxPoints: c.maxPoints,
      })),
    }))

    const { error: resultsError } = await supabase
      .from("match_results")
      .insert(matchResultRows)

    if (resultsError) {
      console.error("[match] Error saving match_results:", resultsError)
      // Don't throw — the match was created, results are non-critical
    }

    // 9. Build response in format frontend expects
    const topClinics = rankedClinics.slice(0, 2).map((rc) => ({
      id: rc.clinic.id,
      name: rc.clinic.name,
      postcode: rc.clinic.postcode,
      latitude: rc.clinic.latitude,
      longitude: rc.clinic.longitude,
      rating: rc.clinic.rating || 0,
      review_count: rc.clinic.reviewCount || 0,
      treatments: rc.clinic.treatments || [],
      tags: rc.clinic.tags || [],
      verified: rc.clinic.verified || false,
      distance: rc.score.distanceMiles,
      score: rc.score.percent,
      whyMatched: rc.reasons.map((r) => r.text).slice(0, 3),
      tier: rc.tier,
      secondarySuggestion: false,
    }))

    const moreClinics = rankedClinics.slice(2).map((rc) => ({
      id: rc.clinic.id,
      name: rc.clinic.name,
      postcode: rc.clinic.postcode,
      latitude: rc.clinic.latitude,
      longitude: rc.clinic.longitude,
      rating: rc.clinic.rating || 0,
      review_count: rc.clinic.reviewCount || 0,
      treatments: rc.clinic.treatments || [],
      tags: rc.clinic.tags || [],
      verified: rc.clinic.verified || false,
      distance: rc.score.distanceMiles,
      score: rc.score.percent,
      whyMatched: rc.reasons.map((r) => r.text).slice(0, 3),
      tier: rc.tier,
      secondarySuggestion: false,
    }))

    const minDistance = rankedClinics.length > 0
      ? Math.min(...rankedClinics.map((rc) => rc.score.distanceMiles ?? 999))
      : null

    const expandBanner = minDistance !== null && minDistance > 5

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
    console.error("[match] Error in matching algorithm:", error)
    return NextResponse.json({ error: "Failed to match clinics" }, { status: 500 })
  }
}
