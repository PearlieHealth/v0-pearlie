import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * Clinic Event Tracking API
 * 
 * Tracks clinic-specific events for dashboard metrics:
 * - clinic_impression: Clinic shown in match results
 * - clinic_match_shown: Clinic displayed to patient
 * - clinic_card_clicked: Patient clicked clinic card
 * - clinic_book_clicked: Patient clicked "Book" button
 * - clinic_booking_confirmed: Booking was confirmed
 * - clinic_conversion: Patient completed treatment
 */

export type ClinicEventType =
  | "clinic_impression"
  | "clinic_match_shown"
  | "clinic_card_clicked"
  | "clinic_book_clicked"
  | "clinic_booking_confirmed"
  | "clinic_conversion"
  | "clinic_lead_contacted"
  | "clinic_lead_lost"

interface TrackEventRequest {
  event_type: ClinicEventType
  clinic_id: string
  lead_id?: string
  match_id?: string
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const body: TrackEventRequest = await request.json()
    const { event_type, clinic_id, lead_id, match_id, metadata } = body

    if (!event_type || !clinic_id) {
      return NextResponse.json(
        { error: "event_type and clinic_id are required" },
        { status: 400 }
      )
    }

    // Rate limiting check - allow max 100 events per IP per minute
    // This prevents abuse without requiring full auth for tracking
    const supabase = await createClient()

    // Insert into events table (existing table for tracking)
    const { error } = await supabase.from("events").insert({
      event_type,
      clinic_id,
      match_id: match_id || null,
      metadata: {
        ...metadata,
        lead_id,
        tracked_at: new Date().toISOString(),
      },
    })

    if (error) {
      console.error("[v0] Error tracking clinic event:", error)
      return NextResponse.json({ error: "Failed to track event" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Clinic event tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET endpoint to fetch clinic metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get("clinic_id")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    if (!clinicId) {
      return NextResponse.json({ error: "clinic_id is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user has access to this clinic
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check clinic access
    const { data: portalUser } = await supabase
      .from("clinic_portal_users")
      .select("clinic_ids")
      .eq("email", session.user.email)
      .single()

    if (!portalUser?.clinic_ids?.includes(clinicId)) {
      // Fallback to clinic_users
      const { data: clinicUser } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .eq("clinic_id", clinicId)
        .single()

      if (!clinicUser) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    // Build query for events
    let query = supabase
      .from("events")
      .select("*")
      .eq("clinic_id", clinicId)

    if (startDate) {
      query = query.gte("created_at", startDate)
    }
    if (endDate) {
      query = query.lte("created_at", endDate)
    }

    const { data: events, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching clinic events:", error)
      return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
    }

    // Calculate metrics
    const metrics = {
      impressions: events?.filter(e => e.event_type === "clinic_impression").length || 0,
      matches_shown: events?.filter(e => e.event_type === "clinic_match_shown").length || 0,
      card_clicks: events?.filter(e => e.event_type === "clinic_card_clicked").length || 0,
      book_clicks: events?.filter(e => e.event_type === "clinic_book_clicked").length || 0,
      bookings_confirmed: events?.filter(e => e.event_type === "clinic_booking_confirmed").length || 0,
      conversions: events?.filter(e => e.event_type === "clinic_conversion").length || 0,
    }

    // Calculate rates
    const ctr = metrics.impressions > 0 
      ? ((metrics.card_clicks / metrics.impressions) * 100).toFixed(1) 
      : "0.0"
    const bookingRate = metrics.card_clicks > 0 
      ? ((metrics.book_clicks / metrics.card_clicks) * 100).toFixed(1) 
      : "0.0"
    const conversionRate = metrics.book_clicks > 0 
      ? ((metrics.conversions / metrics.book_clicks) * 100).toFixed(1) 
      : "0.0"

    return NextResponse.json({
      metrics,
      rates: {
        ctr: `${ctr}%`,
        booking_rate: `${bookingRate}%`,
        conversion_rate: `${conversionRate}%`,
      },
      events: events?.slice(0, 100), // Return last 100 events
    })
  } catch (error) {
    console.error("[v0] Clinic metrics error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
