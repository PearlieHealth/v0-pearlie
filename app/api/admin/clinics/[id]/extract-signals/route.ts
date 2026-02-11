import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { extractClinicSignals } from "@/lib/clinic-ingest/website-reader"
import { applyExtractedTags } from "@/lib/clinic-ingest/tag-applier"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { id: clinicId } = await params
    const supabase = createAdminClient()

    // Get clinic data
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name, website, description")
      .eq("id", clinicId)
      .single()

    if (clinicError || !clinic) {
      return NextResponse.json(
        { error: "Clinic not found" },
        { status: 404 }
      )
    }

    if (!clinic.website) {
      return NextResponse.json(
        { error: "Clinic has no website URL configured" },
        { status: 400 }
      )
    }

    // Extract signals from website
    const extraction = await extractClinicSignals(clinic.website)

    if (!extraction.success || !extraction.signals) {
      return NextResponse.json(
        { error: extraction.error || "Failed to extract signals from website" },
        { status: 500 }
      )
    }

    // Apply tags (in pending state for review)
    const application = await applyExtractedTags(
      clinicId,
      extraction.signals,
      supabase
    )

    return NextResponse.json({
      success: true,
      extraction: {
        signals: extraction.signals,
        pagesScraped: extraction.pagesScraped,
      },
      application: {
        added: application.added,
        skipped: application.skipped,
        errors: application.errors,
      },
    })
  } catch (error) {
    console.error("[v0] Error extracting clinic signals:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
