import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const ALLOWED_EVENTS = ["lead_submitted", "match_results_viewed", "clinic_opened", "book_clicked", "call_clicked"]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { session_id, event_name, lead_id, match_id, clinic_id, page, metadata } = body

    // Validate required fields
    if (!session_id || !event_name) {
      return NextResponse.json({ error: "Missing required fields: session_id, event_name" }, { status: 400 })
    }

    // Validate event_name
    if (!ALLOWED_EVENTS.includes(event_name)) {
      return NextResponse.json(
        { error: `Invalid event_name. Must be one of: ${ALLOWED_EVENTS.join(", ")}` },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    const { error } = await supabase.from("analytics_events").insert({
      session_id,
      event_name,
      lead_id: lead_id || null,
      match_id: match_id || null,
      clinic_id: clinic_id || null,
      page: page || null,
      metadata: metadata || {},
    })

    if (error) {
      console.error("[v0] Error inserting analytics event:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Analytics track error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
