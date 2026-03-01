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
  isDentalPlace,
} from "@/lib/bulk-import/google-search"
import {
  findDuplicateClinic,
  createClinicRecord,
  reuploadGooglePhotos,
  extractEmailFromWebsite,
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
  email?: string
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

    // Note: we do NOT skip neighbourhoods that are "over target" —
    // each neighbourhood always imports at least 1 clinic for coverage.

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
        // Must be a dental clinic/dentist (reject pharmacies, medical centres, etc.)
        if (!isDentalPlace(r.types)) return false
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

    // How many more can we import beyond the guaranteed 1?
    const remaining = Math.max(1, run.target_count - run.imported_count)

    for (const place of filtered) {
      // Always allow at least 1 per neighbourhood for coverage,
      // then respect the global target for additional clinics.
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

      // Step 3c: Build opening hours JSONB in the same format as the
      // opening-hours route: { monday: "9:00 AM – 6:00 PM", ... }
      let openingHours: Record<string, string> | null = null
      if (place.openingHours && place.openingHours.length > 0) {
        const dayMap: Record<string, string> = {
          Monday: "monday", Tuesday: "tuesday", Wednesday: "wednesday",
          Thursday: "thursday", Friday: "friday", Saturday: "saturday",
          Sunday: "sunday",
        }
        openingHours = {}
        for (const desc of place.openingHours) {
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
        // If no days parsed, don't store empty object
        if (Object.keys(openingHours).length === 0) openingHours = null
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
        is_live: true,
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
      // Writes TreatmentCategory[] — the same format the clinic dashboard uses
      let pricingOk = false
      let priceCount = 0
      if (place.website) {
        try {
          const pricingResult = await extractPricing(place.website)
          if (pricingResult.success && pricingResult.categories && pricingResult.categories.length > 0) {
            // Count total treatments that have prices
            priceCount = pricingResult.categories.reduce(
              (sum, cat) => sum + cat.treatments.filter((t) => t.price !== "").length,
              0,
            )

            // Derive price_range from exam/hygiene prices
            let derivedPriceRange: string | null = null
            const examCategory = pricingResult.categories.find(
              (c) => /exam|consult/i.test(c.category)
            )
            const hygieneCategory = pricingResult.categories.find(
              (c) => /hygiene|preventive|clean/i.test(c.category)
            )
            const getNumericPrice = (cat: typeof pricingResult.categories[0] | undefined): number | null => {
              if (!cat) return null
              for (const t of cat.treatments) {
                if (!t.price) continue
                const num = parseFloat(t.price.replace(/[^0-9.]/g, ""))
                if (!isNaN(num) && num > 0) return num
              }
              return null
            }
            const examPrice = getNumericPrice(examCategory)
            const hygienePrice = getNumericPrice(hygieneCategory)
            const referencePrice = examPrice || hygienePrice
            if (referencePrice !== null) {
              if (referencePrice <= 50) derivedPriceRange = "budget"
              else if (referencePrice <= 120) derivedPriceRange = "mid"
              else derivedPriceRange = "premium"
            }

            // Store as TreatmentCategory[] — same format as clinic dashboard
            const priceUpdate: Record<string, any> = {
              treatment_prices: pricingResult.categories,
              show_treatment_prices: true,
            }
            if (derivedPriceRange) priceUpdate.price_range = derivedPriceRange

            await supabase
              .from("clinics")
              .update(priceUpdate)
              .eq("id", createResult.clinicId)

            pricingOk = true
            newPricingOk++
          } else {
            newPricingFail++
          }
        } catch (err) {
          console.error(`[bulk-import] Pricing extraction failed for ${place.name}:`, err)
          newPricingFail++
        }
      }

      // Step 3f: Extract email from website
      let extractedEmail: string | undefined
      if (place.website) {
        try {
          const email = await extractEmailFromWebsite(place.website)
          if (email) {
            extractedEmail = email
            await supabase
              .from("clinics")
              .update({ email, notification_email: email })
              .eq("id", createResult.clinicId)
          }
        } catch {
          // non-critical — skip
        }
      }

      // Step 3g: Fetch a featured review from Google Places
      if (place.placeId && apiKey) {
        try {
          const reviewUrl = `https://places.googleapis.com/v1/places/${place.placeId}?languageCode=en`
          const reviewRes = await fetch(reviewUrl, {
            headers: {
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "reviews",
            },
          })
          if (reviewRes.ok) {
            const reviewData = await reviewRes.json()
            const goodReviews = (reviewData.reviews || []).filter(
              (r: any) => r.rating >= 4 && r.text?.text && r.text.text.length >= 40
            )
            if (goodReviews.length > 0) {
              const picked = goodReviews[Math.floor(Math.random() * goodReviews.length)]
              await supabase
                .from("clinics")
                .update({ featured_review: picked.text.text.slice(0, 500) })
                .eq("id", createResult.clinicId)
            }
          }
        } catch {
          // non-critical — skip
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
        email: extractedEmail,
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
