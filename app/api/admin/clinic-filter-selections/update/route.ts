import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function POST(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { clinicId, filterKey, source } = await request.json()

    if (!clinicId || !filterKey) {
      return NextResponse.json({ error: "Missing clinicId or filterKey" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from("clinic_filter_selections")
      .update({ source, updated_at: new Date().toISOString() })
      .eq("clinic_id", clinicId)
      .eq("filter_key", filterKey)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating clinic filter selection:", error)
    return NextResponse.json({ error: "Failed to update selection" }, { status: 500 })
  }
}
