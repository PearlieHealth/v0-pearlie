import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { geocodePostcode } from "@/lib/postcodes-io"
import { buildLeadProfileFromDB, buildClinicProfile, rankClinics } from "@/lib/matching/engine"
import { getLiveClinicFilter } from "@/lib/matching/clinic-status"
import { buildMatchReasonsForMultipleClinics, getExplanationVersion } from "@/lib/matching/reasons-engine"
import { Resend } from "resend"

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
        // If lead already has stored coords from lead creation, use those
        // Otherwise return error — don't silently default to London
        if (lead.latitude && lead.longitude) {
          console.warn("[match] Re-geocoding failed, using stored lead coordinates")
          leadLat = Number(lead.latitude)
          leadLon = Number(lead.longitude)
        } else {
          console.error("[match] Geocoding failed and no stored coordinates for lead:", leadId)
          return NextResponse.json(
            { error: "We couldn't verify your postcode. Please try again." },
            { status: 400 },
          )
        }
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

    // 7. Persist match to database (clean up previous matches for this lead first)
    await supabase.from("matches").delete().eq("lead_id", leadId)

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

    // 8. Build cross-clinic deduped reasons (uses matchFacts from ranking)
    const reasonsMap = buildMatchReasonsForMultipleClinics(
      leadId,
      rankedClinics.map((rc, index) => ({
        clinicId: rc.clinic.id,
        matchFacts: rc.matchFacts,
        fallbackOffset: index,
      }))
    )

    // 9. Save individual match_results for each clinic (feeds clinic dashboards)
    // Clean up any previous match_results for this lead to avoid duplicates
    await supabase.from("match_results").delete().eq("lead_id", leadId)

    const matchResultRows = rankedClinics.map((rc, index) => {
      const result = reasonsMap.get(rc.clinic.id)
      const composed = result?.composed

      return {
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
        // Cache fields for D1 (served directly on GET without re-scoring)
        match_reasons_composed: composed?.bullets || rc.reasons.map((r) => r.text),
        match_reasons_long: composed?.longBullets || rc.reasons.map((r) => r.text),
        match_reasons_meta: {
          tagsUsed: composed?.tagsUsed || [],
          templatesUsed: composed?.templatesUsed || [],
          confidence: composed?.confidence || 0.8,
          source: "template",
        },
        distance_miles: rc.score.distanceMiles,
        explanation_version: getExplanationVersion(),
        tier: rc.tier,
      }
    })

    // Try insert with cache columns; fall back to base fields if columns don't exist yet
    const { error: insertError } = await supabase
      .from("match_results")
      .insert(matchResultRows)

    if (insertError) {
      console.warn("[match] match_results insert failed (cache columns may not exist), retrying with base fields:", insertError.message)
      const baseRows = matchResultRows.map(({ match_reasons_composed, match_reasons_long, match_reasons_meta, distance_miles, explanation_version, tier, ...base }) => base)
      const { error: retryError } = await supabase
        .from("match_results")
        .insert(baseRows)
      if (retryError) {
        console.error("[match] Error saving match_results (base fields):", retryError)
      }
      // Don't throw — the match was created, results are non-critical
    }

    // 10. Send "matches ready" email to patient (non-blocking)
    try {
      if (lead.email && process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const topClinicNames = rankedClinics.slice(0, 3).map(rc => rc.clinic.name)
        const matchUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://pearlie.co.uk"}/match/${match.id}`
        const firstName = lead.first_name || "there"

        await resend.emails.send({
          from: "Pearlie <matches@pearlie.co.uk>",
          to: lead.email,
          subject: `Your clinic matches are ready, ${firstName}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
              <h1 style="font-size: 24px; color: #1a1a1a; margin-bottom: 16px;">Your matches are ready</h1>
              <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6;">Hi ${firstName},</p>
              <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6;">We've found ${rankedClinics.length} clinic${rankedClinics.length === 1 ? "" : "s"} that match your needs${topClinicNames.length > 0 ? `, including <strong>${topClinicNames.join("</strong>, <strong>")}</strong>` : ""}.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${matchUrl}" style="background-color: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View Your Matches</a>
              </div>
              <p style="font-size: 14px; color: #6b7280; line-height: 1.5;">You can also view your matches anytime at:<br/><a href="${matchUrl}" style="color: #2563eb;">${matchUrl}</a></p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="font-size: 12px; color: #9ca3af;">Pearlie — Finding you the right dental clinic</p>
            </div>
          `,
        })
        console.log(`[match] Match-ready email sent to ${lead.email}`)
      }
    } catch (emailErr) {
      console.error("[match] Non-critical: failed to send match-ready email:", emailErr)
    }

    // 11. Build response in format frontend expects
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
