/**
 * GET  /api/admin/bulk-import/[id] — Get a single import run with full details
 * PUT  /api/admin/bulk-import/[id] — Update run status (complete/cancel)
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  const { id } = await params

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("bulk_import_runs")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 })
    }

    return NextResponse.json({ run: data })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch run" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  const { id } = await params

  try {
    const { status } = await request.json()

    if (!["completed", "cancelled", "failed"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be completed, cancelled, or failed." },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    const updates: Record<string, any> = {
      status,
      current_neighbourhood: null,
      updated_at: new Date().toISOString(),
    }

    if (status === "completed" || status === "failed") {
      updates.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from("bulk_import_runs")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ run: data })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update run" }, { status: 500 })
  }
}
