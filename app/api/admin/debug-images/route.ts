import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

/**
 * Diagnostic: shows what image URLs are stored for each clinic.
 * GET /api/admin/debug-images
 */
export async function GET() {
  const supabase = createAdminClient()
  const { data: clinics, error } = await supabase
    .from("clinics")
    .select("id, name, images")
    .eq("is_archived", false)
    .order("name")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const summary = (clinics || []).map((c) => {
    const images = c.images || []
    const types = images.map((url: string) => {
      if (!url) return "empty"
      if (url.includes("places.googleapis.com")) return "google"
      if (url.includes("supabase.co")) return "supabase"
      return "other"
    })
    return {
      name: c.name,
      imageCount: images.length,
      types,
      urls: images,
    }
  })

  const googleCount = summary.filter((c) => c.types.includes("google")).length
  const supabaseCount = summary.filter((c) => c.types.includes("supabase")).length
  const emptyCount = summary.filter((c) => c.imageCount === 0).length

  return NextResponse.json({
    totals: {
      clinics: summary.length,
      withGoogleUrls: googleCount,
      withSupabaseUrls: supabaseCount,
      withNoImages: emptyCount,
    },
    clinics: summary,
  })
}
