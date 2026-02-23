import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { trackTikTokServerEvent } from "@/lib/tiktok-events-api"

export async function POST(request: Request) {
  try {
    const { token, action, declineReason } = await request.json()

    if (!token || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["confirm", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Find lead by booking token
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*, clinics:booking_clinic_id(*)")
      .eq("booking_token", token)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Invalid or expired booking token" }, { status: 404 })
    }

    // If already responded, return success with existing data so the page
    // shows the confirmation rather than an error (clinic may click link twice)
    if (lead.booking_status === "confirmed" || lead.booking_status === "declined") {
      return NextResponse.json({
        success: true,
        action: lead.booking_status,
        alreadyResponded: true,
        lead: {
          id: lead.id,
          firstName: lead.first_name,
          lastName: lead.last_name,
          email: lead.email,
          phone: lead.phone,
          bookingDate: lead.booking_date,
          bookingTime: lead.booking_time,
        },
        clinic: {
          id: lead.booking_clinic_id,
          name: lead.clinics?.name || null,
        },
      })
    }

    // Update lead status
    const updateData: Record<string, any> = {
      booking_status: action === "confirm" ? "confirmed" : "declined",
    }

    if (action === "confirm") {
      updateData.booking_confirmed_at = new Date().toISOString()
    } else {
      updateData.booking_declined_at = new Date().toISOString()
      if (declineReason) {
        updateData.booking_decline_reason = declineReason
      }
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", lead.id)

    if (updateError) {
      console.error("[clinic-response] Error updating lead:", updateError)
      return NextResponse.json({ error: "Failed to update booking status" }, { status: 500 })
    }

    // Track the event
    await supabase.from("analytics_events").insert({
      event_name: action === "confirm" ? "booking_confirmed" : "booking_declined",
      lead_id: lead.id,
      clinic_id: lead.booking_clinic_id,
      session_id: lead.session_id || "00000000-0000-0000-0000-000000000000",
      metadata: {
        action,
        decline_reason: declineReason || null,
        booking_date: lead.booking_date,
        booking_time: lead.booking_time,
      },
    })

    // Fire TikTok Schedule event when clinic confirms (non-blocking)
    if (action === "confirm") {
      const portalDomain = process.env.NEXT_PUBLIC_PORTAL_DOMAIN
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://pearlie.org"
      trackTikTokServerEvent({
        event: "Schedule",
        url: portalDomain ? `https://${portalDomain}/appointments` : `${appUrl}/clinic/appointments`,
        email: lead.email || null,
        phone: lead.phone || null,
        externalId: lead.id,
        properties: {
          content_name: "appointment_confirmed",
          content_type: "booking",
          content_id: lead.booking_clinic_id,
        },
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      action,
      leadId: lead.id,
      clinicName: lead.clinics?.name || null,
      lead: {
        id: lead.id,
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        bookingDate: lead.booking_date,
        bookingTime: lead.booking_time,
      },
      clinic: {
        id: lead.booking_clinic_id,
        name: lead.clinics?.name || null,
      },
    })
  } catch (error) {
    console.error("[clinic-response] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
