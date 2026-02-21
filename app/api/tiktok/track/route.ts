import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { trackTikTokServerEvent, extractIp, extractUserAgent } from "@/lib/tiktok-events-api"

const ALLOWED_EVENTS = ["Search", "ViewContent", "Contact", "Schedule"]

export async function POST(request: Request) {
  try {
    const { event, event_id, properties, lead_id, clinic_id, url } = await request.json()

    if (!event || !ALLOWED_EVENTS.includes(event)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 })
    }

    const ip = extractIp(request)
    const userAgent = extractUserAgent(request)

    // Look up lead PII if lead_id is provided (for better user matching)
    let email: string | null = null
    let phone: string | null = null

    if (lead_id) {
      const supabase = createAdminClient()
      const { data: lead } = await supabase
        .from("leads")
        .select("email, phone")
        .eq("id", lead_id)
        .single()

      if (lead) {
        email = lead.email || null
        phone = lead.phone || null
      }
    }

    // Fire-and-forget: don't await in production, but await here
    // so we can catch errors for logging
    await trackTikTokServerEvent({
      event,
      eventId: event_id || undefined,
      url: url || undefined,
      email,
      phone,
      externalId: lead_id || null,
      ip,
      userAgent,
      properties: properties || undefined,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[tiktok-track] Error:", error)
    return NextResponse.json({ ok: true }) // Never fail client-facing
  }
}
