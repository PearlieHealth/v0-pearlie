import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function GET(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get("clinicId")

    if (clinicId) {
      const { data, error } = await supabase
        .from("clinic_filter_selections")
        .select("filter_key, updated_at")
        .eq("clinic_id", clinicId)

      if (error) throw error

      const filterKeys = data.map((row) => row.filter_key)
      // Get the most recent updated_at timestamp
      const lastSavedAt =
        data.length > 0
          ? data.reduce((latest, row) => {
              const rowTime = row.updated_at ? new Date(row.updated_at).getTime() : 0
              return rowTime > latest ? rowTime : latest
            }, 0)
          : null

      return NextResponse.json({
        filterKeys,
        lastSavedAt: lastSavedAt ? new Date(lastSavedAt).toISOString() : null,
      })
    }

    const { data, error } = await supabase
      .from("clinic_filters")
      .select("key, label, category, sort_order, tag_type")
      .eq("active", true)
      .order("sort_order", { ascending: true })

    if (error) throw error

    return NextResponse.json({ filters: data })
  } catch (error) {
    console.error("[v0] Error fetching clinic filters:", error)
    return NextResponse.json({ error: "Failed to fetch filters" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { clinicId, filterKeys } = await request.json()

    if (!clinicId) {
      return NextResponse.json({ error: "Clinic ID is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    console.log("[v0] Saving filters for clinic:", clinicId, "filters:", filterKeys)

    // Delete existing selections for this clinic
    const { error: deleteError } = await supabase.from("clinic_filter_selections").delete().eq("clinic_id", clinicId)

    if (deleteError) {
      console.error("[v0] Error deleting old filters:", deleteError)
      throw deleteError
    }

    // Insert new selections if any (use upsert to handle any race conditions)
    if (filterKeys && filterKeys.length > 0) {
      const insertData = filterKeys.map((filterKey: string) => ({
        clinic_id: clinicId,
        filter_key: filterKey,
        updated_at: new Date().toISOString(),
      }))

      const { error: insertError } = await supabase.from("clinic_filter_selections").upsert(insertData, {
        onConflict: "clinic_id,filter_key",
        ignoreDuplicates: false,
      })

      if (insertError) {
        console.error("[v0] Error inserting new filters:", insertError)
        throw insertError
      }

      console.log("[v0] Successfully saved", filterKeys.length, "filters for clinic:", clinicId)
    } else {
      console.log("[v0] No filters to save for clinic:", clinicId)
    }

    return NextResponse.json({
      success: true,
      savedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error saving clinic filters:", error)
    return NextResponse.json({ error: "Failed to save filters" }, { status: 500 })
  }
}
