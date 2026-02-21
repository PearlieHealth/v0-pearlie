import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { randomBytes } from "crypto"
import { createRateLimiter } from "@/lib/rate-limit"
import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"
import { HOURLY_SLOTS } from "@/lib/constants"
import { generateUnsubscribeFooterHtml, generateUnsubscribeHeaders } from "@/lib/unsubscribe"
import { trackTikTokServerEvent, extractIp, extractUserAgent } from "@/lib/tiktok-events-api"

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

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date + "T00:00:00Z").getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
    }

    // Validate time slot
    const validTime = HOURLY_SLOTS.some((s: { key: string }) => s.key === time)
    if (!validTime) {
      return NextResponse.json({ error: "Invalid time slot" }, { status: 400 })
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
      
      // Forward auth headers so lead-actions can verify the caller
      const incomingHeaders: Record<string, string> = { "Content-Type": "application/json" }
      const cookie = request.headers.get("cookie")
      if (cookie) incomingHeaders["cookie"] = cookie
      const authorization = request.headers.get("authorization")
      if (authorization) incomingHeaders["authorization"] = authorization

      const leadActionsResponse = await fetch(`${baseUrl}/api/lead-actions`, {
        method: "POST",
        headers: incomingHeaders,
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

    // Auto-create a chat conversation with the booking request so both patient
    // (in their dashboard) and clinic (in their inbox) can see and continue it.
    const timeLabelForMsg = HOURLY_SLOTS?.find((s: { key: string; label: string }) => s.key === time)?.label || time
    const dateLabelForMsg = new Date(date).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    // Hoist conversationId and tokenHash so they're accessible in the final response
    let conversationId: string | null = null
    let tokenHash: string | null = null

    try {
      // Get or create conversation
      const { data: existingConvs } = await supabase
        .from("conversations")
        .select("id, unread_count_clinic")
        .eq("lead_id", leadId)
        .eq("clinic_id", clinicId)
        .limit(1)

      conversationId = existingConvs?.[0]?.id || null
      let currentUnreadCount = existingConvs?.[0]?.unread_count_clinic || 0

      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            lead_id: leadId,
            clinic_id: clinicId,
            status: "active",
            unread_by_clinic: true,
            unread_by_patient: false,
          })
          .select("id")
          .single()

        if (convError) {
          // Handle race condition — conversation may have just been created
          if (convError.code === "23505") {
            const { data: raceConv } = await supabase
              .from("conversations")
              .select("id, unread_count_clinic")
              .eq("lead_id", leadId)
              .eq("clinic_id", clinicId)
              .limit(1)
            conversationId = raceConv?.[0]?.id || null
            currentUnreadCount = raceConv?.[0]?.unread_count_clinic || 0
          } else {
            console.error("[booking-request] Failed to create conversation:", convError)
          }
        } else {
          conversationId = newConv?.id || null

          // Ensure match_results entry exists so the clinic sees this lead
          await supabase.from("match_results").upsert(
            {
              lead_id: leadId,
              clinic_id: clinicId,
              score: 0,
              reasons: ["Patient requested an appointment"],
              tier: "conversation",
              rank: 0,
            },
            { onConflict: "lead_id,clinic_id", ignoreDuplicates: true }
          ).then(({ error: e }) => { if (e) console.error("[booking-request] match_results upsert:", e) })

          // Ensure lead_clinic_status entry exists
          await supabase.from("lead_clinic_status").upsert(
            {
              lead_id: leadId,
              clinic_id: clinicId,
              status: "NEW",
            },
            { onConflict: "lead_id,clinic_id", ignoreDuplicates: true }
          ).then(({ error: e }) => { if (e) console.error("[booking-request] lead_clinic_status upsert:", e) })
        }
      }

      // Check for existing appointment request to prevent duplicates
      if (conversationId) {
        const { data: convCheck } = await supabase
          .from("conversations")
          .select("appointment_requested_at")
          .eq("id", conversationId)
          .single()

        if (convCheck?.appointment_requested_at) {
          return NextResponse.json(
            { error: "An appointment request has already been sent for this clinic." },
            { status: 409 }
          )
        }
      }

      if (conversationId) {
        // Insert the booking request as a chat message
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_type: "patient",
          content: `Appointment request\nDate: ${dateLabelForMsg}\nTime: ${timeLabelForMsg}\n\nI'd like to request an appointment at this time. Looking forward to hearing from you!`,
          sent_via: "booking",
          message_type: "booking-request",
          status: "sent",
        })

        // Update conversation unread flags and mark appointment as requested
        await supabase
          .from("conversations")
          .update({
            unread_by_clinic: true,
            unread_count_clinic: currentUnreadCount + 1,
            last_message_at: new Date().toISOString(),
            appointment_requested_at: new Date().toISOString(),
          })
          .eq("id", conversationId)
      }
    } catch (convError) {
      // Don't fail the booking if conversation creation fails
      console.error("[booking-request] Conversation creation error:", convError)
    }

    // Send confirmation email to patient (non-blocking)
    if (lead.email) {
      const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
      const timeLabel = HOURLY_SLOTS?.find((s: { key: string; label: string }) => s.key === time)?.label || time
      const formattedDate = new Date(date).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })

      const unsubHeaders = generateUnsubscribeHeaders(lead.email, "patient_notifications")
      const unsubUrl = unsubHeaders["List-Unsubscribe"].replace(/[<>]/g, "")
      const unsubFooter = generateUnsubscribeFooterHtml(unsubUrl)

      // Generate magic link so patient is auto-logged in when they click
      const dashboardPath = "/patient/dashboard"
      const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(dashboardPath)}`
      let viewDashboardUrl = `${appUrl}${dashboardPath}` // fallback: plain link

      try {
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: lead.email,
          options: { redirectTo },
        })
        if (linkData?.properties?.action_link) {
          viewDashboardUrl = linkData.properties.action_link
          // Capture hashed_token for client-side auto-login on the confirm page
          if (linkData.properties.hashed_token) {
            tokenHash = linkData.properties.hashed_token
          }
          // Ensure redirect_to points to our app URL (Supabase may use Site URL)
          try {
            const linkUrl = new URL(viewDashboardUrl)
            const currentRedirect = linkUrl.searchParams.get("redirect_to")
            if (currentRedirect) {
              const redirectHost = new URL(currentRedirect).hostname
              const appHost = new URL(appUrl).hostname
              if (redirectHost !== appHost) {
                linkUrl.searchParams.set("redirect_to", redirectTo)
                viewDashboardUrl = linkUrl.toString()
              }
            }
          } catch {}
        }
      } catch (linkErr) {
        console.warn("[booking-request] Failed to generate magic link:", linkErr)
      }

      sendEmailWithRetry({
        from: EMAIL_FROM.NOTIFICATIONS,
        to: lead.email,
        subject: `Appointment request sent to ${clinic.name}`,
        headers: unsubHeaders,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">Appointment Request Sent</h1>
            </div>
            <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 8px;">
              Hi ${lead.first_name || "there"},
            </p>
            <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
              Your appointment request has been sent to <strong>${clinic.name}</strong>.
            </p>
            <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Clinic</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">${clinic.name}</p>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Date &amp; time</p>
              <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">${formattedDate} &middot; ${timeLabel}</p>
            </div>
            <div style="background: #FFF8E1; border: 1px solid #FFE082; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 14px; color: #6D4C00; line-height: 1.5;">
                The clinic will confirm your appointment shortly. They typically respond within 24&ndash;48 hours.
              </p>
            </div>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${viewDashboardUrl}" style="display: inline-block; background: #1a1a1a; color: white; padding: 12px 32px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 14px;">
                View your dashboard
              </a>
            </div>
            <p style="font-size: 12px; color: #999; text-align: center;">
              Pearlie &mdash; Finding your perfect dental match
            </p>
            ${unsubFooter}
          </div>
        `,
      }).catch((err) => console.error("[booking-request] Patient email failed:", err))
    }

    // Fire TikTok Lead event (appointment request = real lead, non-blocking)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://pearlie.org"
    trackTikTokServerEvent({
      event: "Lead",
      url: `${appUrl}/booking/confirm`,
      email: lead.email || null,
      phone: lead.phone || null,
      externalId: leadId,
      ip: extractIp(request),
      userAgent: extractUserAgent(request),
      properties: {
        content_name: "appointment_request",
        content_type: "booking",
        content_id: clinicId,
      },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      conversationId: conversationId ?? null,
      tokenHash: tokenHash ?? null,
    })
  } catch (error) {
    console.error("[booking-request] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
