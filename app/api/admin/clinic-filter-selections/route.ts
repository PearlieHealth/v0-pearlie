import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function GET(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get("clinicId")
    const source = searchParams.get("source") // 'manual', 'ai_website', or null for all

    if (!clinicId) {
      return NextResponse.json({ error: "Missing clinicId" }, { status: 400 })
    }

    const supabase = createAdminClient()

    let query = supabase
      .from("clinic_filter_selections")
      .select("filter_key, source, evidence, created_at")
      .eq("clinic_id", clinicId)

    if (source) {
      query = query.eq("source", source)
    }

    const { data, error } = await query

    if (error) throw error

    // If source filter is specified, return full selection objects
    if (source) {
      // Get filter details for each selection - clinic_filters uses 'key' and 'label' columns
      const { data: filters } = await supabase
        .from("clinic_filters")
        .select("key, label, category")

      const filterMap = new Map((filters || []).map(f => [f.key, f]))

      const selections = (data || []).map(row => ({
        filter_key: row.filter_key,
        filter_name: filterMap.get(row.filter_key)?.label || row.filter_key,
        category: filterMap.get(row.filter_key)?.category || 'unknown',
        evidence: row.evidence,
        created_at: row.created_at,
      }))

      return NextResponse.json({ selections })
    }

    // Default: return just filter keys for backwards compatibility
    const filterKeys = (data || []).map((row) => row.filter_key)
    return NextResponse.json({ filters: filterKeys })
  } catch (error) {
    console.error("[v0] Error fetching clinic filter selections:", error)
    return NextResponse.json({ error: "Failed to fetch selections" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { clinicId, filterKeys } = await request.json()

    if (!clinicId) {
      return NextResponse.json({ error: "Missing clinicId" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Delete existing selections
    await supabase.from("clinic_filter_selections").delete().eq("clinic_id", clinicId)

    // Insert new selections
    if (filterKeys && filterKeys.length > 0) {
      const insertData = filterKeys.map((filterKey: string) => ({
        clinic_id: clinicId,
        filter_key: filterKey,
      }))

      const { error } = await supabase.from("clinic_filter_selections").insert(insertData)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving clinic filter selections:", error)
    return NextResponse.json({ error: "Failed to save selections" }, { status: 500 })
  }
}
