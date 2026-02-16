import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { randomBytes } from "crypto"
import { createRateLimiter } from "@/lib/rate-limit"

// 10 booking requests per IP per hour
const bookingIpLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, maxAttempts: 10 })

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const ipCheck = bookingIpLimiter.check(ip)
    if (ipCheck.limited) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${ipCheck.retryAfterSecs} seconds.` },
        { status: 429, headers: { "Retry-After": String(ipCheck.retryAfterSecs) } }
      )
    }
    bookingIpLimiter.record(ip)

    const { clinicId, leadId, date, time } = await request.json()

    if (!clinicId || !leadId || !date || !time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch clinic details
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name, email, notification_email, phone, address, postcode")
      .eq("id", clinicId)
      .single()

    if (clinicError || !clinic) {
      console.error("[booking-request] Clinic not found:", clinicError)
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    // Fetch full lead details (all form data)
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single()

    if (leadError || !lead) {
      console.error("[booking-request] Lead not found:", leadError)
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Generate booking token for confirm/decline links
    const bookingToken = randomBytes(16).toString("hex")
    
    // Update lead with booking details
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        booking_status: "pending",
        booking_date: date,
        booking_time: time,
        booking_clinic_id: clinicId,
        booking_token: bookingToken,
      })
      .eq("id", leadId)

    if (updateError) {
      console.error("[booking-request] Error updating lead:", updateError)
    }

    // Call the lead-actions API to send the full detailed email
    // This reuses the existing email template with all form details, tips, etc.
    try {
      // Use request origin or construct URL
      const requestUrl = new URL(request.url)
      const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
      
      console.log("[v0] Booking request - sending email via lead-actions")
      console.log("[v0] Base URL:", baseUrl)
      console.log("[v0] Clinic ID:", clinicId, "Lead ID:", leadId)
      
      const leadActionsResponse = await fetch(`${baseUrl}/api/lead-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId,
          leadId,
          actionType: "click_book",
        }),
      })

      console.log("[v0] Lead-actions response status:", leadActionsResponse.status)
      
      if (!leadActionsResponse.ok) {
        const errorData = await leadActionsResponse.text()
        console.error("[v0] Failed to send email via lead-actions:", errorData)
      } else {
        const responseData = await leadActionsResponse.json()
        console.log("[v0] Email sent successfully:", responseData)
      }
    } catch (emailError) {
      // Don't fail the booking if email fails - just log it
      console.error("[v0] Email sending error:", emailError)
    }

    // Track the booking request event in analytics_events table
    await supabase.from("analytics_events").insert({
      event_name: "book_clicked",
      lead_id: leadId,
      clinic_id: clinicId,
      session_id: lead.session_id || "00000000-0000-0000-0000-000000000000",
      metadata: { date, time, source: "booking_confirmation" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[booking-request] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
