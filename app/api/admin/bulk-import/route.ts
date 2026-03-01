/**
 * POST /api/admin/bulk-import
 *
 * Creates a new bulk import run and returns the run ID.
 * The client then drives the import by calling /api/admin/bulk-import/batch
 * for each neighbourhood.
 *
 * GET /api/admin/bulk-import
 *
 * Returns all import runs for display in the admin UI.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const body = await request.json()
    const {
      target_count = 100,
      min_rating = 4.5,
      min_review_count = 100,
    } = body

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("bulk_import_runs")
      .insert([{
        area: "London",
        target_count,
        min_rating,
        min_review_count,
        status: "running",
        started_at: new Date().toISOString(),
      }])
      .select("id")
      .single()

    if (error) {
      console.error("[bulk-import] Error creating run:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ runId: data.id }, { status: 201 })
  } catch (error) {
    console.error("[bulk-import] Error:", error)
    return NextResponse.json({ error: "Failed to create import run" }, { status: 500 })
  }
}

export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("bulk_import_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ runs: data || [] })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch runs" }, { status: 500 })
  }
}
