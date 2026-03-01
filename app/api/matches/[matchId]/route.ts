import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { normalizeLead, normalizeClinic } from "@/lib/matching/normalize"
import { scoreClinic, scoreDirectoryListing, buildMatchFacts, isExcludedByClearPricingFilter } from "@/lib/matching/scoring"
import { buildMatchReasonsForMultipleClinics, buildDirectoryListingReasons, validateUniqueReasons } from "@/lib/matching/reasons-engine"
import { getExplanationVersion } from "@/lib/matching/reasons-engine"
import { isClinicMatchable } from "@/lib/matching/clinic-status"
import { isInGreaterLondon } from "@/lib/matching/reasons"
import { calculateHaversineDistance } from "@/lib/utils/geo"

export async function GET(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
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

    // Fast path: useLastMatch hook only needs to know if the match exists
    if (request.headers.get("x-validate-only") === "1") {
      return NextResponse.json({ ok: true }, { status: 200 })
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

        // Debug: log images data from DB
        ;(clinicsRaw || []).forEach((c: any) => {
          console.log(`[match-api] Clinic ${c.name}: images=${JSON.stringify(c.images)}, count=${c.images?.length || 0}`)
        })

        clinicsWithScores = cachedResults
          .map(cached => {
            const clinicRow = clinicMap.get(cached.clinic_id)
            if (!clinicRow) return null
            const isDir = cached.tier === "directory" || cached.match_reasons_meta?.source === "directory_listing"
            return {
              ...clinicRow,
              rating: Number(clinicRow.google_rating || clinicRow.rating) || 0,
              review_count: clinicRow.google_review_count || clinicRow.review_count || 0,
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
              card_title: isDir ? "About this clinic" : isEmergency ? "Why this clinic" : "Why we matched you",
              is_emergency: isEmergency,
              is_directory_listing: isDir,
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

      // Score each clinic — use scoreDirectoryListing for non-matchable clinics
      // First, apply hard filters then score remaining clinics
      const clinicScoringData = (clinicsRaw || []).filter((clinicRow) => {
        const filterKeys = Array.isArray(clinicRow.clinic_filter_selections)
          ? clinicRow.clinic_filter_selections.map((sel: any) => sel.filter_key)
          : []
        const normalizedClinic = normalizeClinic(clinicRow, filterKeys)
        if (isExcludedByClearPricingFilter(normalizedLead, normalizedClinic)) {
          console.log(`[match-api] Clinic excluded (clear pricing hard filter): ${clinicRow.name}`)
          return false
        }
        return true
      }).map((clinicRow, clinicIndex) => {
        const filterKeys = Array.isArray(clinicRow.clinic_filter_selections)
          ? clinicRow.clinic_filter_selections.map((sel: any) => sel.filter_key)
          : []

        const normalizedClinic = normalizeClinic(clinicRow, filterKeys)
        // Scoring algorithm is based on tag data availability
        const useDirScoring = !isClinicMatchable(filterKeys)
        // UI treatment: verified clinics are never shown as directory listings
        const isDir = !clinicRow.verified && useDirScoring

        // Use the appropriate scoring function based on matchability
        const scoreBreakdown = useDirScoring
          ? scoreDirectoryListing(normalizedLead, normalizedClinic)
          : scoreClinic(normalizedLead, normalizedClinic)
        const matchFacts = useDirScoring
          ? null
          : buildMatchFacts(normalizedLead, normalizedClinic, scoreBreakdown)

        return {
          clinicRow,
          normalizedClinic,
          filterKeys,
          scoreBreakdown,
          matchFacts,
          clinicIndex,
          isDir,
          useDirScoring,
        }
      })

      // Build reasons for matchable clinics with cross-clinic variant dedup
      const matchableScoringData = clinicScoringData.filter(c => !c.useDirScoring)
      const reasonsMap = buildMatchReasonsForMultipleClinics(
        normalizedLead.id,
        matchableScoringData.map(c => ({
          clinicId: c.normalizedClinic.id,
          matchFacts: c.matchFacts!,
          fallbackOffset: c.clinicIndex,
        }))
      )

      // Build final clinics with scores and reasons
      clinicsWithScores = clinicScoringData.map(({ clinicRow, normalizedClinic, filterKeys, scoreBreakdown, isDir, useDirScoring }) => {
        // For directory-scored clinics, build simple reasons; for matchable, use cross-clinic deduped reasons
        let reasons: string[]
        let composed: { bullets: string[]; longBullets: string[]; tagsUsed: string[]; templatesUsed: string[]; confidence: number } | undefined

        if (useDirScoring) {
          const dirReasons = buildDirectoryListingReasons(normalizedClinic, scoreBreakdown, normalizedLead.treatment, 0)
          reasons = dirReasons.map(r => r.text)
          composed = {
            bullets: reasons,
            longBullets: reasons,
            tagsUsed: dirReasons.map(r => r.tagKey || ""),
            templatesUsed: [],
            confidence: 0.3,
          }
        } else {
          const result = reasonsMap.get(normalizedClinic.id)
          reasons = result?.reasons?.map((r) => r.text) || []
          composed = result?.composed
        }

        return {
          ...clinicRow,
          rating: Number(clinicRow.google_rating || clinicRow.rating) || 0,
          review_count: clinicRow.google_review_count || clinicRow.review_count || 0,
          distance_miles: scoreBreakdown.distanceMiles,
          match_score: scoreBreakdown.percent,
          match_percentage: scoreBreakdown.percent,
          match_breakdown: scoreBreakdown.categories,
          match_reasons: reasons,
          match_reasons_composed: composed?.bullets || reasons,
          match_reasons_long: composed?.longBullets || reasons,
          match_reasons_meta: {
            tagsUsed: composed?.tagsUsed || [],
            templatesUsed: composed?.templatesUsed || [],
            confidence: composed?.confidence || 0.8,
            source: isDir ? "directory_listing" : "template" as string,
          },
          tier: isDir ? "directory" : "top",
          card_title: isDir ? "About this clinic" : isEmergency ? "Why this clinic" : "Why we matched you",
          is_emergency: isEmergency,
          is_directory_listing: isDir,
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
        const normalizedLead = normalizeLead({
          ...lead,
          latitude: lead.latitude,
          longitude: lead.longitude,
        })

        additionalClinics = nearbyClinics
          .filter((clinic) => {
            const filterKeys = Array.isArray(clinic.clinic_filter_selections)
              ? clinic.clinic_filter_selections.map((sel: any) => sel.filter_key)
              : []
            const nc = normalizeClinic(clinic, filterKeys)
            return !isExcludedByClearPricingFilter(normalizedLead, nc)
          })
          .map((clinic) => {
            const filterKeys = Array.isArray(clinic.clinic_filter_selections)
              ? clinic.clinic_filter_selections.map((sel: any) => sel.filter_key)
              : []

            const normalizedClinic = normalizeClinic(clinic, filterKeys)

            let distance = 999
            if (clinic.latitude && clinic.longitude) {
              distance = calculateHaversineDistance(lead.latitude, lead.longitude, clinic.latitude, clinic.longitude)
            }

            const isUnverified = !clinic.verified
            const isDir = isUnverified

            // Score directory listings instead of giving them zero
            const dirScore = scoreDirectoryListing(normalizedLead, normalizedClinic)
            const dirReasons = buildDirectoryListingReasons(normalizedClinic, dirScore, normalizedLead.treatment, 0)

            const tier = isUnverified ? "directory" : "nearby"

            return {
              ...clinic,
              rating: Number(clinic.google_rating || clinic.rating) || 0,
              review_count: clinic.google_review_count || clinic.review_count || 0,
              distance_miles: distance,
              tier,
              filter_keys: filterKeys,
              is_directory_listing: isDir,
              match_percentage: dirScore.percent,
              match_score: dirScore.percent,
              match_reasons: dirReasons.map(r => r.text),
              match_reasons_composed: dirReasons.map(r => r.text),
              match_breakdown: dirScore.categories.map(c => ({
                category: c.category,
                points: c.points,
                maxPoints: c.maxPoints,
              })),
              card_title: "About this clinic",
            }
          })
          .filter((c) => c.tier === "directory" ? c.distance_miles <= 25 : c.distance_miles <= 15)
          .sort((a, b) => {
            // Sort by score (higher first), then distance
            if (b.match_score !== a.match_score) return b.match_score - a.match_score
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

    // Check if the authenticated user owns this lead
    const isOwner = user && lead && (
      (lead.user_id && lead.user_id === user.id) ||
      (!lead.user_id && lead.email && lead.email.toLowerCase() === user.email?.toLowerCase())
    )

    const allClinics = [...clinicsWithScores, ...additionalClinics]

    return NextResponse.json(
      {
        match,
        clinics: allClinics,
        lead: lead
          ? {
              email: lead.email,
              isVerified: lead.is_verified ?? false,
              isOwner: !!isOwner,
              // Strip location data for non-owners to prevent leaking patient address
              ...(isOwner
                ? {
                    latitude: lead.latitude,
                    longitude: lead.longitude,
                    postcode: lead.postcode,
                  }
                : {
                    latitude: null,
                    longitude: null,
                    postcode: null,
                  }),
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
