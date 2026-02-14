import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { normalizeLead, normalizeClinic } from "@/lib/matching/normalize"
import { scoreClinic, buildMatchFacts } from "@/lib/matching/scoring"
import { buildMatchReasons, validateUniqueReasons } from "@/lib/matching/reasons-engine"
import { isInGreaterLondon } from "@/lib/matching/reasons"
import { composeReasonsForMultipleClinics } from "@/lib/matching/reasonComposer"

export async function GET(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const supabase = await createClient()
    const { matchId } = await params

    if (!matchId || typeof matchId !== "string") {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 })
    }

    // Fetch match record
    const { data: match, error: matchError } = await supabase.from("matches").select("*").eq("id", matchId).single()

    if (matchError || !match) {
      console.error("[match-api] Match not found:", matchError)
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    // Check session status
    const { data: session } = await supabase
      .from("match_sessions")
      .select("*")
      .eq("lead_id", match.lead_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (session?.status === "running") {
      return NextResponse.json({ status: "running", message: "Matching in progress" }, { status: 202 })
    }

    if (session?.status === "error") {
      return NextResponse.json(
        {
          status: "error",
          message: session.error_message || "An error occurred during matching",
        },
        { status: 500 },
      )
    }

    // Fetch lead
    const { data: lead, error: leadError } = await supabase.from("leads").select("*").eq("id", match.lead_id).single()

    if (leadError || !lead) {
      console.error("[match-api] Lead not found:", leadError)
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Fetch clinics with their filter keys (left join to include clinics without tags)
    const { data: clinicsRaw, error: clinicsError } = await supabase
      .from("clinics")
      .select(
        `
        *,
        clinic_filter_selections(filter_key)
      `,
      )
      .in("id", match.clinic_ids)
      .eq("is_archived", false)

    if (clinicsError) {
      console.error("[match-api] Error fetching clinics:", clinicsError)
      throw clinicsError
    }

    // Normalize lead
    const normalizedLead = normalizeLead(lead)

    // Score each clinic first
    const clinicsWithScoresRaw = (clinicsRaw || []).map((clinicRow, clinicIndex) => {
      // Extract filter keys
      const filterKeys = Array.isArray(clinicRow.clinic_filter_selections)
        ? clinicRow.clinic_filter_selections.map((sel: any) => sel.filter_key)
        : []

      // Normalize clinic
      const normalizedClinic = normalizeClinic(clinicRow, filterKeys)

      // Score clinic
      const scoreBreakdown = scoreClinic(normalizedLead, normalizedClinic)

      const matchFacts = buildMatchFacts(normalizedLead, normalizedClinic, scoreBreakdown)

      // Build personalized reasons from MatchFacts (never raw lead data)
      // Pass clinicIndex as fallbackOffset so each clinic gets different group rotation + template variants
      const reasons = buildMatchReasons(matchFacts, false, clinicIndex)

      return {
        clinicRow,
        normalizedClinic,
        filterKeys,
        scoreBreakdown,
        matchFacts,
        reasons,
      }
    })

    // Compose reasons for ALL clinics at once to ensure uniqueness across cards
    const composedReasonsMap = composeReasonsForMultipleClinics(
      normalizedLead.id,
      clinicsWithScoresRaw.map(c => ({
        clinicId: c.normalizedClinic.id,
        matchReasons: c.reasons,
        matchFacts: c.matchFacts,
      }))
    )

    // Detect if this is an emergency match
    const isEmergency = normalizedLead.treatment?.toLowerCase().includes("emergency") || false

    // Build final clinics with scores and reasons
    const clinicsWithScores = clinicsWithScoresRaw.map(({ clinicRow, normalizedClinic, filterKeys, scoreBreakdown, matchFacts, reasons }) => {
      const composed = composedReasonsMap.get(normalizedClinic.id)
      const finalReasons = composed?.bullets || reasons.map(r => r.text)
      const finalLongReasons = composed?.longBullets || finalReasons

      return {
        ...clinicRow,
        distance_miles: scoreBreakdown.distanceMiles,
        match_score: scoreBreakdown.totalScore,
        match_percentage: scoreBreakdown.percent,
        match_breakdown: scoreBreakdown.categories,
        match_reasons: reasons.map((r) => r.text),
        match_reasons_composed: finalReasons,
        match_reasons_long: finalLongReasons,
        match_reasons_meta: {
          tagsUsed: composed?.tagsUsed || [],
          templatesUsed: composed?.templatesUsed || [],
          confidence: composed?.confidence || 0.8,
          source: "template" as const,
        },
        tier: "top",
        card_title: isEmergency ? "Why this clinic" : "Why we matched you",
        is_emergency: isEmergency,
      }
    })

    // Sort by score with tie-breakers
    clinicsWithScores.sort((a, b) => {
      if (b.match_score !== a.match_score) return b.match_score - a.match_score
      const distA = a.distance_miles ?? 9999
      const distB = b.distance_miles ?? 9999
      if (distA !== distB) return distA - distB
      if ((b.verified ? 1 : 0) !== (a.verified ? 1 : 0)) return (b.verified ? 1 : 0) - (a.verified ? 1 : 0)
      if ((b.review_count ?? 0) !== (a.review_count ?? 0)) return (b.review_count ?? 0) - (a.review_count ?? 0)
      return a.name.localeCompare(b.name)
    })

    // Persist match breakdowns for clinic dashboard visibility (upsert, non-blocking)
    try {
      const breakdownUpdates = clinicsWithScores.map((c) => ({
        lead_id: match.lead_id,
        clinic_id: c.id,
        match_breakdown: c.match_breakdown.map((cat: any) => ({
          category: cat.category,
          points: cat.points,
          maxPoints: cat.maxPoints,
        })),
        score: c.match_percentage,
      }))

      for (const update of breakdownUpdates) {
        await supabase
          .from("match_results")
          .update({ match_breakdown: update.match_breakdown, score: update.score })
          .eq("lead_id", update.lead_id)
          .eq("clinic_id", update.clinic_id)
      }
    } catch (e) {
      console.error("[match-api] Non-critical: failed to persist match breakdowns:", e)
    }

    // Fetch additional nearby clinics not in the matched list (for "Load More" feature)
    // These are non-verified clinics or clinics that didn't match well enough
    const matchedClinicIds = match.clinic_ids || []
    let additionalClinics: any[] = []

    if (lead?.latitude && lead?.longitude) {
      // Get nearby clinics within 15 miles that weren't in the matched list
      // Use LEFT join to include clinics without any filter selections (non-matchable)
      let nearbyQuery = supabase
        .from("clinics")
        .select(`
          *,
          clinic_filter_selections(filter_key)
        `)
        .eq("is_archived", false)
        .limit(20)
      
      // Only exclude matched clinics if there are any
      if (matchedClinicIds.length > 0) {
        // Supabase requires proper array format for not.in operator
        nearbyQuery = nearbyQuery.not("id", "in", `(${matchedClinicIds.map((id: string) => `"${id}"`).join(",")})`)
      }
      
      const { data: nearbyClinics, error: nearbyError } = await nearbyQuery
      
      if (nearbyError) {
        console.error("[match-api] Error fetching nearby clinics:", nearbyError)
      }

      console.log(`[match-api] Found ${nearbyClinics?.length || 0} nearby clinics to check`)
      console.log(`[match-api] Nearby clinics raw:`, nearbyClinics?.map(c => ({
        name: c.name,
        verified: c.verified,
        tags: c.clinic_filter_selections?.length || 0
      })))
      
      if (nearbyClinics && nearbyClinics.length > 0) {
        // Calculate distances and filter by 15 miles
        additionalClinics = nearbyClinics
          .map((clinic) => {
            // Extract filter keys (may be empty for non-matchable clinics)
            const filterKeys = Array.isArray(clinic.clinic_filter_selections)
              ? clinic.clinic_filter_selections.map((sel: any) => sel.filter_key)
              : []
            
            let distance = 999
            if (clinic.latitude && clinic.longitude) {
              const R = 3959 // Earth's radius in miles
              const dLat = ((clinic.latitude - lead.latitude) * Math.PI) / 180
              const dLon = ((clinic.longitude - lead.longitude) * Math.PI) / 180
              const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((lead.latitude * Math.PI) / 180) *
                  Math.cos((clinic.latitude * Math.PI) / 180) *
                  Math.sin(dLon / 2) *
                  Math.sin(dLon / 2)
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
              distance = R * c
            }
            
            // Determine if this is just a directory listing (not matchable - less than 3 tags)
            const isDirectoryListing = filterKeys.length < 3
            // Also check if unverified
            const isUnverified = !clinic.verified
            
            // Determine tier: directory (no tags or unverified), nearby-unverified, or nearby
            // Unverified clinics should also be treated as directory listings
            let tier = "nearby"
            if (isDirectoryListing || isUnverified) {
              tier = "directory"
            }
            
            return { 
              ...clinic, 
              distance_miles: distance, 
              tier,
              filter_keys: filterKeys,
              is_directory_listing: isDirectoryListing,
              // For directory listings and unverified clinics, set a default match percentage of 0
              match_percentage: (isDirectoryListing || isUnverified) ? 0 : undefined,
              match_reasons: (isDirectoryListing || isUnverified) ? [] : undefined,
              match_reasons_composed: (isDirectoryListing || isUnverified) 
                ? [isUnverified ? "This clinic is in our directory but hasn't completed verification yet." : "Listed in our clinic directory."] 
                : undefined,
            }
          })
          // Include clinics within 15 miles, but be more lenient for directory listings (25 miles)
          .filter((c) => c.tier === "directory" ? c.distance_miles <= 25 : c.distance_miles <= 15)
          .sort((a, b) => {
            // Sort by: 
            // 1. Directory listings at the end
            // 2. Verified first within each group
            // 3. Then by distance
            if (a.tier === "directory" && b.tier !== "directory") return 1
            if (a.tier !== "directory" && b.tier === "directory") return -1
            if (a.verified !== b.verified) return a.verified ? -1 : 1
            return a.distance_miles - b.distance_miles
          })
        
        console.log(`[match-api] Additional nearby clinics after distance filter: ${additionalClinics.length}`)
        additionalClinics.forEach(c => {
          console.log(`[match-api]   - ${c.name} (${c.distance_miles?.toFixed(1)} mi, verified: ${c.verified}, tags: ${c.filter_keys?.length || 0}, tier: ${c.tier})`)
        })
      }
    }

    // Validate unique reasons (dev assertion)
    validateUniqueReasons(
      clinicsWithScores.map((c) => ({
        clinicId: c.id,
        reasons: c.match_reasons.map((text: string, idx: number) => ({
          key: `${c.id}_${idx}`,
          text,
          category: "treatment" as const,
          weight: 0,
        })),
      })),
    )

    console.log("[match-api] Final sorted order:")
    clinicsWithScores.forEach((c, idx) => {
      console.log(
        `[match-api] ${idx + 1}. ${c.name}: ${c.match_score} pts (${c.match_percentage}%) @ ${c.distance_miles?.toFixed(1) || "N/A"} mi`,
      )
    })

    const needsExpansionBanner = lead
      ? !isInGreaterLondon(lead.postcode) || clinicsWithScores.every((c) => (c.distance_miles ?? 999) > 5)
      : false

    // Combine matched clinics with additional nearby clinics
    // Matched clinics first (sorted by score), then additional nearby clinics (sorted by distance)
    const allClinics = [...clinicsWithScores, ...additionalClinics]

    return NextResponse.json(
      {
        match,
        clinics: allClinics,
        lead: lead
          ? {
              latitude: lead.latitude,
              longitude: lead.longitude,
              postcode: lead.postcode,
              email: lead.email,
              isVerified: lead.is_verified ?? false,
            }
          : null,
        needsExpansionBanner,
        session: session
          ? {
              status: session.status,
              matched_count: session.matched_count,
              completed_at: session.completed_at,
            }
          : null,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error) {
    console.error("[match-api] Error fetching match:", error)
    return NextResponse.json(
      {
        error: "We're having trouble loading your matches. Please try again.",
      },
      { status: 500 },
    )
  }
}
