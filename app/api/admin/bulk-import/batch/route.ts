/**
 * POST /api/admin/bulk-import/batch
 *
 * Processes one neighbourhood batch for a bulk import run.
 * The client calls this repeatedly, once per neighbourhood, to avoid
 * hitting the 60-second Vercel timeout.
 *
 * Body: { runId, neighbourhood }
 *
 * For each neighbourhood:
 * 1. Searches Google Places for dental clinics
 * 2. Filters by rating/review count criteria
 * 3. Deduplicates against existing clinics
 * 4. Creates new clinics (draft, is_live=false)
 * 5. Re-uploads photos to Supabase storage
 * 6. Attempts pricing extraction from website
 * 7. Updates the import run record with progress
 *
 * Returns the batch results so the client can show progress.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import {
  searchGooglePlaces,
  isGreaterLondon,
  type GooglePlaceResult,
} from "@/lib/bulk-import/google-search"
import {
  findDuplicateClinic,
  createClinicRecord,
  reuploadGooglePhotos,
} from "@/lib/bulk-import/clinic-pipeline"
import { extractPricing } from "@/lib/bulk-import/pricing-extractor"

interface BatchClinicResult {
  placeId: string
  name: string
  status: "imported" | "skipped" | "failed"
  clinicId?: string
  reason?: string
  photosOk: boolean
  pricingOk: boolean
  priceCount?: number
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { runId, neighbourhood } = await request.json()

    if (!runId || !neighbourhood) {
      return NextResponse.json(
        { error: "runId and neighbourhood are required" },
        { status: 400 },
      )
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Places API key not configured" },
        { status: 500 },
      )
    }

    const supabase = createAdminClient()

    // Fetch the run to get criteria and current progress
    const { data: run, error: runError } = await supabase
      .from("bulk_import_runs")
      .select("*")
      .eq("id", runId)
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: "Import run not found" }, { status: 404 })
    }

    if (run.status === "cancelled") {
      return NextResponse.json({ error: "Import run was cancelled" }, { status: 400 })
    }

    // Check if we've already reached the target
    if (run.imported_count >= run.target_count) {
      return NextResponse.json({
        message: "Target count already reached",
        results: [],
        done: true,
      })
    }

    // Update current neighbourhood
    await supabase
      .from("bulk_import_runs")
      .update({ current_neighbourhood: neighbourhood, status: "running" })
      .eq("id", runId)

    // Step 1: Search Google Places
    console.log(`[bulk-import] Searching neighbourhood: ${neighbourhood}`)
    const searchResults = await searchGooglePlaces(neighbourhood, apiKey)
    console.log(`[bulk-import] Found ${searchResults.length} results for ${neighbourhood}`)

    // Step 2: Filter and sort by criteria
    const filtered = searchResults
      .filter((r) => {
        // Must have a valid UK postcode
        if (!r.postcode) return false
        // Must be in Greater London
        if (!isGreaterLondon(r.address)) return false
        // Must meet rating threshold
        if (r.rating < (run.min_rating || 0)) return false
        // Must meet review count threshold
        if (r.reviewCount < (run.min_review_count || 0)) return false
        return true
      })
      // Sort: highest rating first, then most reviews
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating
        return b.reviewCount - a.reviewCount
      })

    // Step 3: Process each clinic
    const batchResults: BatchClinicResult[] = []
    let newImported = 0
    let newSkipped = 0
    let newFailed = 0
    let newPhotosOk = 0
    let newPhotosFail = 0
    let newPricingOk = 0
    let newPricingFail = 0

    // How many more can we import?
    const remaining = run.target_count - run.imported_count

    for (const place of filtered) {
      // Stop if we've hit the target
      if (newImported >= remaining) break

      // Step 3a: Deduplication
      const existingId = await findDuplicateClinic(
        place.placeId,
        place.website || null,
        place.name,
        place.postcode,
      )

      if (existingId) {
        batchResults.push({
          placeId: place.placeId,
          name: place.name,
          status: "skipped",
          reason: "duplicate",
          clinicId: existingId,
          photosOk: false,
          pricingOk: false,
        })
        newSkipped++
        continue
      }

      // Step 3b: Re-upload photos
      let images: string[] = []
      let photosOk = false
      if (place.photoUrls.length > 0) {
        const photoResult = await reuploadGooglePhotos(place.photoUrls, apiKey, 5)
        images = photoResult.urls
        photosOk = images.length > 0
        if (photosOk) newPhotosOk++
        else newPhotosFail++
      }

      // Step 3c: Build opening hours JSONB
      let openingHours = null
      if (place.openingHours && place.openingHours.length > 0) {
        openingHours = { weekday_text: place.openingHours }
      }

      // Step 3d: Create clinic record
      const createResult = await createClinicRecord({
        name: place.name,
        address: place.address,
        postcode: place.postcode,
        latitude: place.latitude,
        longitude: place.longitude,
        phone: place.phone,
        website: place.website,
        google_place_id: place.placeId,
        google_rating: place.rating,
        google_review_count: place.reviewCount,
        google_maps_url: place.mapsUrl,
        opening_hours: openingHours,
        images,
        is_live: false,
        is_archived: false,
        verified: false,
      })

      if (!createResult.success) {
        batchResults.push({
          placeId: place.placeId,
          name: place.name,
          status: "failed",
          reason: createResult.error,
          photosOk,
          pricingOk: false,
        })
        newFailed++
        continue
      }

      // Step 3e: Extract pricing from website
      let pricingOk = false
      let priceCount = 0
      if (place.website) {
        try {
          const pricingResult = await extractPricing(place.website)
          if (pricingResult.success && pricingResult.prices && pricingResult.prices.length > 0) {
            // Store pricing data on the clinic record
            await supabase
              .from("clinics")
              .update({
                treatment_prices: {
                  prices: pricingResult.prices,
                  source_url: pricingResult.source_url,
                  extracted_at: new Date().toISOString(),
                  needs_review: true,
                },
              })
              .eq("id", createResult.clinicId)

            pricingOk = true
            priceCount = pricingResult.prices.length
            newPricingOk++
          } else {
            newPricingFail++
          }
        } catch (err) {
          console.error(`[bulk-import] Pricing extraction failed for ${place.name}:`, err)
          newPricingFail++
        }
      }

      batchResults.push({
        placeId: place.placeId,
        name: place.name,
        status: "imported",
        clinicId: createResult.clinicId,
        photosOk,
        pricingOk,
        priceCount,
      })
      newImported++
    }

    // Step 4: Update the run record
    const completedNeighbourhoods = [
      ...(run.neighbourhoods_completed || []),
      neighbourhood,
    ]

    // Append batch results to the import log
    const updatedLog = [...(run.import_log || []), ...batchResults]

    await supabase
      .from("bulk_import_runs")
      .update({
        searched_count: (run.searched_count || 0) + searchResults.length,
        imported_count: (run.imported_count || 0) + newImported,
        skipped_count: (run.skipped_count || 0) + newSkipped,
        failed_count: (run.failed_count || 0) + newFailed,
        photos_success_count: (run.photos_success_count || 0) + newPhotosOk,
        photos_failed_count: (run.photos_failed_count || 0) + newPhotosFail,
        pricing_success_count: (run.pricing_success_count || 0) + newPricingOk,
        pricing_failed_count: (run.pricing_failed_count || 0) + newPricingFail,
        neighbourhoods_completed: completedNeighbourhoods,
        current_neighbourhood: null,
        import_log: updatedLog,
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId)

    const totalImported = (run.imported_count || 0) + newImported
    const done = totalImported >= run.target_count

    return NextResponse.json({
      neighbourhood,
      searched: searchResults.length,
      filtered: filtered.length,
      results: batchResults,
      totalImported,
      done,
    })
  } catch (error) {
    console.error("[bulk-import] Batch error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Batch processing failed" },
      { status: 500 },
    )
  }
}
