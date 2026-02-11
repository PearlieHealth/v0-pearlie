import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const VALID_EVENT_NAMES = [
  "form_started",
  "step_viewed",
  "step_completed",
  "form_abandoned",
  "lead_submitted",
  "matches_shown",
  "clinic_card_viewed",
  "clinic_opened",
  "book_clicked",
  "call_clicked",
]

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate event name
    if (!VALID_EVENT_NAMES.includes(body.event_name)) {
      return NextResponse.json({ success: false, error: `Invalid event_name: ${body.event_name}` }, { status: 400 })
    }

    // Ensure session_id is provided
    if (!body.session_id) {
      return NextResponse.json({ success: false, error: "session_id is required" }, { status: 400 })
    }

    const { error } = await supabase.from("events").insert({
      session_id: body.session_id,
      event_name: body.event_name,
      lead_id: body.lead_id || null,
      match_id: body.match_id || null,
      clinic_id: body.clinic_id || null,
      meta: body.meta || {},
    })

    if (error) {
      console.error("[v0] Event tracking failed:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, tracked: true }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error logging event:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    )
  }
}
