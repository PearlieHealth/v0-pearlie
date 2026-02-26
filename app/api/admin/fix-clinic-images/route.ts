import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

/**
 * One-shot fix: scans all clinics and re-uploads any Google Places photo
 * URLs to Supabase storage, replacing them with permanent URLs.
 *
 * POST /api/admin/fix-clinic-images
 *
 * This is safe to run multiple times — it only touches clinics that have
 * Google Places URLs in their images array.
 */
export async function POST() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  const supabase = createAdminClient()
  const apiKey = process.env.GOOGLE_PLACES_API_KEY

  const { data: clinics, error } = await supabase
    .from("clinics")
    .select("id, name, images")
    .eq("is_archived", false)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { name: string; before: number; fixed: number; failed: number }[] = []

  for (const clinic of clinics || []) {
    const images: string[] = clinic.images || []
    const googleImages = images.filter((url) => url?.includes("places.googleapis.com"))

    if (googleImages.length === 0) continue

    const newImages = [...images]
    let fixed = 0
    let failed = 0

    for (let i = 0; i < newImages.length; i++) {
      const url = newImages[i]
      if (!url?.includes("places.googleapis.com")) continue

      // Download from Google
      try {
        const headers: Record<string, string> = { Accept: "image/*" }
        if (apiKey) {
          const parsed = new URL(url)
          parsed.searchParams.delete("key")
          headers["X-Goog-Api-Key"] = apiKey
        }

        const response = await fetch(url, { headers, redirect: "follow" })
        if (!response.ok) {
          console.error(`[fix-images] Google fetch failed for ${clinic.name}: ${response.status}`)
          failed++
          continue
        }

        const contentType = response.headers.get("content-type") || "image/jpeg"
        if (!contentType.startsWith("image/")) {
          failed++
          continue
        }

        const imageBuffer = new Uint8Array(await response.arrayBuffer())
        const extMap: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }
        const ext = extMap[contentType] || "jpg"
        const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
        const path = `clinic-photos/main/${filename}`

        const { error: uploadError } = await supabase.storage
          .from("clinic-assets")
          .upload(path, imageBuffer, { contentType, cacheControl: "3600", upsert: false })

        if (uploadError) {
          console.error(`[fix-images] Upload failed for ${clinic.name}:`, uploadError)
          failed++
          continue
        }

        const { data: urlData } = supabase.storage.from("clinic-assets").getPublicUrl(path)
        newImages[i] = urlData.publicUrl
        fixed++
      } catch (err) {
        console.error(`[fix-images] Error for ${clinic.name}:`, err)
        failed++
      }
    }

    if (fixed > 0) {
      const { error: updateError } = await supabase
        .from("clinics")
        .update({ images: newImages })
        .eq("id", clinic.id)

      if (updateError) {
        console.error(`[fix-images] DB update failed for ${clinic.name}:`, updateError)
      }
    }

    results.push({ name: clinic.name, before: googleImages.length, fixed, failed })
  }

  return NextResponse.json({
    message: results.length === 0
      ? "All clinics already have Supabase URLs — no Google URLs found"
      : `Processed ${results.length} clinics`,
    results,
  })
}
