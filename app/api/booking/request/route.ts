import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { randomBytes } from "crypto"
import { createRateLimiter } from "@/lib/rate-limit"
import { generateUnsubscribeFooterHtml, generateUnsubscribeUrl, generateUnsubscribeHeaders } from "@/lib/unsubscribe"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { trackTikTokServerEvent, extractIp, extractUserAgent } from "@/lib/tiktok-events-api"
import { escapeHtml } from "@/lib/escape-html"
import { portalUrl } from "@/lib/clinic-url"
import { generateReplyToAddress, generateThreadMarker } from "@/lib/email-reply-token"

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

    const { clinicId, leadId, date } = await request.json()

    if (!clinicId || !leadId || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date + "T00:00:00Z").getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
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

    // Require email verification before allowing appointment requests
    if (!lead.is_verified) {
      return NextResponse.json(
        { error: "Please verify your email before requesting appointments" },
        { status: 403 }
      )
    }

    // Cap concurrent pending appointment requests per user (max 5)
    const pendingQuery = supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("booking_status", "pending")
    if (lead.user_id) {
      pendingQuery.eq("user_id", lead.user_id)
    } else {
      pendingQuery.eq("email", lead.email)
    }
    const { count: pendingCount } = await pendingQuery

    if ((pendingCount || 0) >= 5) {
      return NextResponse.json(
        { error: "You can have at most 5 pending appointment requests. Please wait for a response before requesting more." },
        { status: 429 }
      )
    }

    // Limit re-requests to same clinic after repeated declines (max 3)
    const { count: declineCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("email", lead.email)
      .eq("booking_clinic_id", clinicId)
      .eq("booking_status", "declined")

    if ((declineCount || 0) >= 3) {
      return NextResponse.json(
        { error: "This clinic has declined your previous requests. Please message them directly to discuss." },
        { status: 429 }
      )
    }

    // Generate booking token for confirm/decline links
    const bookingToken = randomBytes(16).toString("hex")
    
    // Update lead with booking details
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        booking_status: "pending",
        booking_date: date,
        booking_time: null,
        booking_clinic_id: clinicId,
        booking_token: bookingToken,
      })
      .eq("id", leadId)

    if (updateError) {
      console.error("[booking-request] Error updating lead:", updateError)
    }

    // Send the direct lead notification email to the clinic (with confirm/decline links)
    const clinicNotificationEmail = clinic.notification_email || clinic.email
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
    if (clinicNotificationEmail) {
      try {
        await sendRegisteredEmail({
          type: EMAIL_TYPE.DIRECT_LEAD_NOTIFICATION,
          to: clinicNotificationEmail,
          data: {
            clinicName: clinic.name || "",
            firstName: lead.first_name || "",
            lastName: lead.last_name || "",
            email: lead.email || "",
            phone: lead.phone || "",
            treatment: lead.treatment_interest || "Not specified",
            urgency: lead.preferred_timing || "flexible",
            inboxUrl: portalUrl("/clinic/appointments"),
            bookingDate: date,
            _leadId: leadId,
            _clinicId: clinicId,
          },
          clinicId,
          leadId,
        })
      } catch (emailError) {
        console.error("[booking-request] Clinic notification email failed:", emailError)
      }
    }

    // Track the booking request event in analytics_events table
    await supabase.from("analytics_events").insert({
      event_name: "book_clicked",
      lead_id: leadId,
      clinic_id: clinicId,
      session_id: lead.session_id || "00000000-0000-0000-0000-000000000000",
      metadata: { date, source: "booking_confirmation" },
    })

    // Auto-create a chat conversation with the booking request so both patient
    // (in their dashboard) and clinic (in their inbox) can see and continue it.
    const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    const bookingMessageContent = `Hi! I'd like to request an appointment on ${formattedDate}. Would this date work?`

    // Hoist conversationId, tokenHash, and bookingMessage so they're accessible in the final response
    let conversationId: string | null = null
    let tokenHash: string | null = null
    let bookingMessage: { id: string; content: string; sender_type: string; status: string; created_at: string } | null = null
    let botMessages: { id: string; content: string; sender_type: string; status?: string; created_at: string }[] = []

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
          // Generate a fresh magic link token for auto-login on the confirm page
          let duplicateTokenHash: string | null = null
          try {
            const { data: linkData } = await supabase.auth.admin.generateLink({
              type: "magiclink",
              email: lead.email,
              options: { redirectTo: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"}/auth/callback?next=${encodeURIComponent("/patient/dashboard")}` },
            })
            if (linkData?.properties?.hashed_token) {
              duplicateTokenHash = linkData.properties.hashed_token
            }
          } catch {}

          return NextResponse.json(
            {
              error: "An appointment request has already been sent for this clinic.",
              alreadyRequested: true,
              conversationId,
              tokenHash: duplicateTokenHash,
            },
            { status: 409 }
          )
        }
      }

      if (conversationId) {
        // Insert the booking request as a chat message
        const { data: insertedMsg, error: msgError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_type: "patient",
          content: bookingMessageContent,
          sent_via: "chat",
          message_type: "booking-request",
          status: "sent",
        }).select("id, content, sender_type, status, created_at").single()

        if (msgError) {
          console.error("[booking-request] Failed to insert booking message:", msgError)
        } else if (insertedMsg) {
          bookingMessage = insertedMsg
        }

        // Insert bot acknowledgement so the patient knows why there's no immediate reply
        const botAckContent = `Thanks for your appointment request! 🗓️\n\n${clinic.name} will review your request for ${formattedDate} and get back to you shortly.\n\nIn the meantime, feel free to send any questions or additional details here.`
        const { data: botMsg, error: botMsgError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_type: "bot",
          content: botAckContent,
          sent_via: "chat",
          message_type: "bot-greeting",
        }).select("id, content, sender_type, created_at").single()

        if (botMsgError) {
          console.error("[booking-request] Failed to insert bot ack message:", botMsgError)
        } else if (botMsg) {
          botMessages.push(botMsg)
        }

        // Update conversation unread flags, mark appointment as requested, and flag bot as greeted
        await supabase
          .from("conversations")
          .update({
            unread_by_clinic: true,
            unread_count_clinic: currentUnreadCount + 1,
            last_message_at: new Date().toISOString(),
            appointment_requested_at: new Date().toISOString(),
            bot_greeted: true,
          })
          .eq("id", conversationId)

        // Send chat notification email to clinic about the booking request message
        if (clinicNotificationEmail && bookingMessage) {
          try {
            const safeName = escapeHtml(`${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "A patient")
            const safeContent = escapeHtml(bookingMessageContent.substring(0, 500))
            const unsubFooterClinic = generateUnsubscribeFooterHtml(
              generateUnsubscribeHeaders(clinicNotificationEmail, "clinic_notifications")["List-Unsubscribe"].replace(/[<>]/g, "")
            )
            const replyTo = generateReplyToAddress(conversationId, "clinic", clinicNotificationEmail)
            const threadMarker = generateThreadMarker(conversationId)

            await sendRegisteredEmail({
              type: EMAIL_TYPE.CHAT_NOTIFICATION_TO_CLINIC,
              to: clinicNotificationEmail,
              data: {
                patientName: safeName,
                messagePreview: safeContent,
                inboxUrl: portalUrl("/clinic/appointments"),
                unsubscribeFooterHtml: unsubFooterClinic,
                _conversationId: conversationId,
                replyToAddress: replyTo,
                threadMarker,
              },
              headers: generateUnsubscribeHeaders(clinicNotificationEmail, "clinic_notifications"),
              replyTo,
              clinicId,
              leadId,
            })
          } catch (chatEmailErr) {
            console.error("[booking-request] Chat notification email to clinic failed:", chatEmailErr)
          }
        }
      }
    } catch (convError) {
      // Don't fail the booking if conversation creation fails
      console.error("[booking-request] Conversation creation error:", convError)
    }

    // Send confirmation email to patient
    if (lead.email) {
      const formattedDateForEmail = new Date(date).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })

      const unsubUrl = generateUnsubscribeUrl(lead.email, "patient_notifications")
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

      try {
        await sendRegisteredEmail({
          type: EMAIL_TYPE.BOOKING_REQUEST_SENT,
          to: lead.email,
          data: {
            firstName: lead.first_name || "there",
            clinicName: clinic.name,
            formattedDate: formattedDateForEmail,
            dashboardUrl: viewDashboardUrl,
            unsubscribeFooterHtml: unsubFooter,
            _leadId: leadId,
            _clinicId: clinicId,
          },
          leadId,
        })
      } catch (err) {
        console.error("[booking-request] Patient email failed:", err)
      }
    }

    // Fire TikTok Lead event (appointment request = real lead, non-blocking)
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
      bookingMessage: bookingMessage ?? null,
      botMessages,
    })
  } catch (error) {
    console.error("[booking-request] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
