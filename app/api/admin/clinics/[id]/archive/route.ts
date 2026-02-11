import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { id } = await params
    const supabase = createAdminClient()
    const { isArchived } = await request.json()

    console.log("[v0] Archive request:", { id, isArchived })

    const { data: existingClinic, error: findError } = await supabase
      .from("clinics")
      .select("id, name, is_archived")
      .eq("id", id)
      .single()

    console.log("[v0] Found clinic:", existingClinic, "Error:", findError)

    if (findError || !existingClinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    const { data: updateResult, error: updateError } = await supabase
      .from("clinics")
      .update({
        is_archived: isArchived,
        archived_at: isArchived ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, is_archived, archived_at, updated_at")

    console.log("[v0] Update result:", updateResult, "Error:", updateError)

    if (updateError) {
      console.error("[v0] Update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updateResult || updateResult.length === 0) {
      return NextResponse.json({ error: "Clinic not found or update failed" }, { status: 404 })
    }

    return NextResponse.json(updateResult[0], {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    })
  } catch (error: any) {
    console.error("[v0] Error in archive API:", error)
    return NextResponse.json({ error: error.message || "Failed to archive clinic" }, { status: 500 })
  }
}
