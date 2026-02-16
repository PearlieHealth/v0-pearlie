import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const VALID_EVENT_NAMES = [
  "form_started",
  "form_step_viewed",
  "form_step_completed",
  "lead_submitted",
  "matches_shown",
  "match_page_viewed",
  "clinic_card_viewed",
  "clinic_opened",
  "book_clicked",
  "call_clicked",
  "load_more_clicked",
  "outcome_step_viewed",
  "outcome_step_completed",
  "email_verified",
  "otp_sent",
  "otp_resent",
]

// Events that should be deduplicated (only count once per session/lead/clinic combo)
const DEDUPE_EVENTS = [
  "form_started",
  "lead_submitted", 
  "matches_shown",
  "match_page_viewed",
  "clinic_opened",
  "book_clicked",
  "call_clicked",
]

/**
 * Generate a deduplication key for an event
 * Format: {event_name}:{session_id}:{lead_id}:{clinic_id}
 */
function generateDedupeKey(eventName: string, sessionId: string, leadId?: string, clinicId?: string): string {
  const parts = [eventName, sessionId]
  if (leadId) parts.push(leadId)
  if (clinicId) parts.push(clinicId)
  return parts.join(":")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.session_id) {
      console.error("[v0] Missing session_id in track request")
      return NextResponse.json({ ok: false, error: "session_id is required" }, { status: 400 })
    }

    if (!body.event_name || !VALID_EVENT_NAMES.includes(body.event_name)) {
      console.error("[v0] Invalid event_name:", body.event_name)
      return NextResponse.json({ ok: false, error: `Invalid event_name: ${body.event_name}` }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Generate dedupe key for events that should be deduplicated
    const shouldDedupe = DEDUPE_EVENTS.includes(body.event_name)
    const dedupeKey = shouldDedupe 
      ? generateDedupeKey(body.event_name, body.session_id, body.lead_id, body.clinic_id)
      : null

    const eventData = {
      session_id: body.session_id,
      lead_id: body.lead_id || null,
      clinic_id: body.clinic_id || null,
      match_id: body.match_id || null,
      event_name: body.event_name,
      page: body.page || null,
      metadata: body.meta || {},
      dedupe_key: dedupeKey,
      match_count: body.match_count || null,
    }

    // For dedupable events, use upsert with ON CONFLICT DO NOTHING
    if (shouldDedupe && dedupeKey) {
      const { error } = await supabase
        .from("analytics_events")
        .upsert(eventData, { 
          onConflict: "dedupe_key",
          ignoreDuplicates: true 
        })

      if (error) {
        console.error("[v0] Event tracking failed:", error.message)
        return NextResponse.json({ ok: false, error: "Event tracking failed" }, { status: 500 })
      }
    } else {
      // For non-dedupable events, just insert
      const { error } = await supabase.from("analytics_events").insert(eventData)

      if (error) {
        console.error("[v0] Event tracking failed:", error.message)
        return NextResponse.json({ ok: false, error: "Event tracking failed" }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[v0] Error in track endpoint:", error)
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred" },
      { status: 500 },
    )
  }
}
