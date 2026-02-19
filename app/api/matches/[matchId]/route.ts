import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { normalizeLead, normalizeClinic } from "@/lib/matching/normalize"
import { scoreClinic, buildMatchFacts } from "@/lib/matching/scoring"
import { buildMatchReasonsForMultipleClinics, validateUniqueReasons } from "@/lib/matching/reasons-engine"
import { getExplanationVersion } from "@/lib/matching/reasons-engine"
import { isInGreaterLondon } from "@/lib/matching/reasons"
import { calculateHaversineDistance } from "@/lib/utils/geo"

export async function GET(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const supabase = await createClient()
    const { matchId } = await params
    const url = new URL(request.url)
    const forceRefresh = url.searchParams.get("refresh") === "true"

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

    // Detect emergency
    const isEmergency = lead.treatment_interest?.toLowerCase().includes("emergency") || false

    // ─── Try cached path first ──────────────────────────────────────────────
    let clinicsWithScores: any[] = []
    let usedCache = false

    if (!forceRefresh) {
      // Check if we have cached match_results with composed reasons
      const { data: cachedResults } = await supabase
        .from("match_results")
        .select("*")
        .eq("match_run_id", matchId)
        .order("rank", { ascending: true })

      const currentVersion = getExplanationVersion()
      const hasCachedComposed = cachedResults?.length &&
        cachedResults.every(r =>
          r.match_reasons_composed &&
          Array.isArray(r.match_reasons_composed) &&
          r.match_reasons_composed.length > 0 &&
          // Ensure cached reasons match current engine version
          (!r.explanation_version || r.explanation_version === currentVersion)
        )

      if (hasCachedComposed) {
        console.log(`[match-api] Serving cached results for match ${matchId} (${cachedResults.length} clinics)`)

        // FAST PATH: Fetch fresh clinic base data (name, address, phone, images, etc.)
        const { data: clinicsRaw } = await supabase
          .from("clinics")
          .select("*")
          .in("id", match.clinic_ids)
          .eq("is_archived", false)

        const clinicMap = new Map((clinicsRaw || []).map(c => [c.id, c]))

        clinicsWithScores = cachedResults
          .map(cached => {
            const clinicRow = clinicMap.get(cached.clinic_id)
            if (!clinicRow) return null
            return {
              ...clinicRow,
              distance_miles: cached.distance_miles,
              match_score: cached.score,
              match_percentage: cached.score,
              match_breakdown: cached.match_breakdown || [],
              match_reasons: cached.reasons || [],
              match_reasons_composed: cached.match_reasons_composed,
              match_reasons_long: cached.match_reasons_long || cached.match_reasons_composed,
              match_reasons_meta: cached.match_reasons_meta || {
                tagsUsed: [],
                templatesUsed: [],
                confidence: 0.8,
                source: "template",
              },
              tier: cached.tier || "top",
              card_title: isEmergency ? "Why this clinic" : "Why we matched you",
              is_emergency: isEmergency,
            }
          })
          .filter(Boolean)

        usedCache = true
      }
    }

    // ─── Slow path: re-score if no cache or forced refresh ──────────────────
    if (!usedCache) {
      console.log(`[match-api] ${forceRefresh ? "Forced refresh" : "No cache"} — running full scoring for match ${matchId}`)

      // Fetch clinics with their filter keys
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

      // Score each clinic
      const clinicScoringData = (clinicsRaw || []).map((clinicRow, clinicIndex) => {
        const filterKeys = Array.isArray(clinicRow.clinic_filter_selections)
          ? clinicRow.clinic_filter_selections.map((sel: any) => sel.filter_key)
          : []

        const normalizedClinic = normalizeClinic(clinicRow, filterKeys)
        const scoreBreakdown = scoreClinic(normalizedLead, normalizedClinic)
        const matchFacts = buildMatchFacts(normalizedLead, normalizedClinic, scoreBreakdown)

        return {
          clinicRow,
          normalizedClinic,
          filterKeys,
          scoreBreakdown,
          matchFacts,
          clinicIndex,
        }
      })

      // Build reasons for ALL clinics at once with cross-clinic variant dedup
      const reasonsMap = buildMatchReasonsForMultipleClinics(
        normalizedLead.id,
        clinicScoringData.map(c => ({
          clinicId: c.normalizedClinic.id,
          matchFacts: c.matchFacts,
          fallbackOffset: c.clinicIndex,
        }))
      )

      // Build final clinics with scores and reasons
      clinicsWithScores = clinicScoringData.map(({ clinicRow, normalizedClinic, scoreBreakdown }) => {
        const result = reasonsMap.get(normalizedClinic.id)
        const reasons = result?.reasons || []
        const composed = result?.composed

        return {
          ...clinicRow,
          distance_miles: scoreBreakdown.distanceMiles,
          match_score: scoreBreakdown.percent,
          match_percentage: scoreBreakdown.percent,
          match_breakdown: scoreBreakdown.categories,
          match_reasons: reasons.map((r) => r.text),
          match_reasons_composed: composed?.bullets || reasons.map(r => r.text),
          match_reasons_long: composed?.longBullets || reasons.map(r => r.text),
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

      // Backfill cache columns in parallel (non-blocking) so next request uses fast path
      try {
        await Promise.all(
          clinicsWithScores.map((c: any) =>
            supabase
              .from("match_results")
              .update({
                match_breakdown: (c.match_breakdown || []).map((cat: any) => ({
                  category: cat.category,
                  points: cat.points,
                  maxPoints: cat.maxPoints,
                })),
                score: c.match_percentage,
                match_reasons_composed: c.match_reasons_composed,
                match_reasons_long: c.match_reasons_long,
                match_reasons_meta: c.match_reasons_meta,
                distance_miles: c.distance_miles,
                explanation_version: getExplanationVersion(),
                tier: c.tier,
              })
              .eq("lead_id", match.lead_id)
              .eq("clinic_id", c.id)
          )
        )
      } catch (e) {
        console.error("[match-api] Non-critical: failed to backfill cache:", e)
      }
    }

    // ─── Common: sort, nearby clinics, validate, respond ────────────────────

    // Sort by score with tie-breakers
    clinicsWithScores.sort((a: any, b: any) => {
      if (b.match_score !== a.match_score) return b.match_score - a.match_score
      const distA = a.distance_miles ?? 9999
      const distB = b.distance_miles ?? 9999
      if (distA !== distB) return distA - distB
      if ((b.verified ? 1 : 0) !== (a.verified ? 1 : 0)) return (b.verified ? 1 : 0) - (a.verified ? 1 : 0)
      if ((b.review_count ?? 0) !== (a.review_count ?? 0)) return (b.review_count ?? 0) - (a.review_count ?? 0)
      return a.name.localeCompare(b.name)
    })

    // Fetch additional nearby clinics not in the matched list (for "Load More" feature)
    const matchedClinicIds = match.clinic_ids || []
    let additionalClinics: any[] = []

    if (lead?.latitude && lead?.longitude) {
      let nearbyQuery = supabase
        .from("clinics")
        .select(`
          *,
          clinic_filter_selections(filter_key)
        `)
        .eq("is_archived", false)
        .limit(20)

      if (matchedClinicIds.length > 0) {
        nearbyQuery = nearbyQuery.not("id", "in", `(${matchedClinicIds.join(",")})`)
      }

      const { data: nearbyClinics, error: nearbyError } = await nearbyQuery

      if (nearbyError) {
        console.error("[match-api] Error fetching nearby clinics:", nearbyError)
      }

      console.log(`[match-api] Found ${nearbyClinics?.length || 0} nearby clinics to check`)

      if (nearbyClinics && nearbyClinics.length > 0) {
        additionalClinics = nearbyClinics
          .map((clinic) => {
            const filterKeys = Array.isArray(clinic.clinic_filter_selections)
              ? clinic.clinic_filter_selections.map((sel: any) => sel.filter_key)
              : []

            let distance = 999
            if (clinic.latitude && clinic.longitude) {
              distance = calculateHaversineDistance(lead.latitude, lead.longitude, clinic.latitude, clinic.longitude)
            }

            const isUnverified = !clinic.verified
            const isDirectoryListing = isUnverified || filterKeys.length < 3

            // Tier based on verified status: verified clinics are "nearby", unverified are "directory"
            const tier = isUnverified ? "directory" : "nearby"

            return {
              ...clinic,
              distance_miles: distance,
              tier,
              filter_keys: filterKeys,
              is_directory_listing: isDirectoryListing,
              match_percentage: (isDirectoryListing || isUnverified) ? 0 : undefined,
              match_reasons: (isDirectoryListing || isUnverified) ? [] : undefined,
              match_reasons_composed: (isDirectoryListing || isUnverified)
                ? [isUnverified ? "This clinic is in our directory but hasn't completed verification yet." : "Listed in our clinic directory."]
                : undefined,
            }
          })
          .filter((c) => c.tier === "directory" ? c.distance_miles <= 25 : c.distance_miles <= 15)
          .sort((a, b) => {
            if (a.tier === "directory" && b.tier !== "directory") return 1
            if (a.tier !== "directory" && b.tier === "directory") return -1
            if (a.verified !== b.verified) return a.verified ? -1 : 1
            return a.distance_miles - b.distance_miles
          })
      }
    }

    // Validate unique reasons (dev assertion)
    validateUniqueReasons(
      clinicsWithScores.map((c: any) => ({
        clinicId: c.id,
        reasons: (c.match_reasons || []).map((text: string, idx: number) => ({
          key: `${c.id}_${idx}`,
          text,
          category: "treatment" as const,
          weight: 0,
        })),
      })),
    )

    console.log(`[match-api] Final sorted order (cached=${usedCache}):`)
    clinicsWithScores.forEach((c: any, idx: number) => {
      console.log(
        `[match-api] ${idx + 1}. ${c.name}: ${c.match_score} pts (${c.match_percentage}%) @ ${c.distance_miles?.toFixed(1) || "N/A"} mi`,
      )
    })

    const needsExpansionBanner = lead
      ? !isInGreaterLondon(lead.postcode) || clinicsWithScores.every((c: any) => (c.distance_miles ?? 999) > 5)
      : false

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
        headers: usedCache
          ? {
              "Cache-Control": "public, max-age=60",
            }
          : {
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
