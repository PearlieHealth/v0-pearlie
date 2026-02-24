import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { trackTikTokServerEvent } from "@/lib/tiktok-events-api"
import { escapeHtml } from "@/lib/escape-html"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { generateUnsubscribeFooterHtml, generateUnsubscribeHeaders } from "@/lib/unsubscribe"
import { HOURLY_SLOTS } from "@/lib/constants"

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

    // Post bot message in chat + send patient email + clear appointment_requested_at on decline
    const clinicName = lead.clinics?.name || "Your clinic"
    {
      try {
        // Find conversation for this lead + clinic
        const { data: conversation } = await supabase
          .from("conversations")
          .select("id")
          .eq("lead_id", lead.id)
          .eq("clinic_id", lead.booking_clinic_id)
          .single()

        const conversationId = conversation?.id || null

        // Post bot message
        if (conversationId) {
          const dateLabel = lead.booking_date
            ? new Date(lead.booking_date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
            : "the scheduled date"
          const timeLabel = HOURLY_SLOTS.find((s: { key: string }) => s.key === lead.booking_time)?.label || lead.booking_time || "the scheduled time"

          let botContent = ""
          if (action === "confirm") {
            botContent = `Your appointment has been confirmed for ${dateLabel} at ${timeLabel}.`
          } else {
            botContent = `${clinicName} was unable to accommodate your requested time.`
            if (declineReason) botContent += ` Reason: ${declineReason}`
            botContent += "\nYou can request a new appointment time."
          }

          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_type: "bot",
            content: botContent,
            message_type: "appointment_update",
            status: "sent",
          })

          await supabase.from("conversations").update({
            last_message_at: new Date().toISOString(),
            unread_by_patient: true,
            unread_count_patient: 1,
          }).eq("id", conversationId)

          // On decline: clear appointment_requested_at so patient can re-request
          if (action === "decline") {
            await supabase.from("conversations").update({
              appointment_requested_at: null,
            }).eq("id", conversationId)
          }
        }

        // Send patient email notification
        if (lead.email) {
          const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
          const dashboardPath = "/patient/dashboard"
          const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(dashboardPath)}`
          let viewUrl = `${appUrl}${dashboardPath}`

          try {
            const { data: linkData } = await supabase.auth.admin.generateLink({
              type: "magiclink",
              email: lead.email,
              options: { redirectTo },
            })
            if (linkData?.properties?.action_link) {
              viewUrl = linkData.properties.action_link
              try {
                const linkUrl = new URL(viewUrl)
                const currentRedirect = linkUrl.searchParams.get("redirect_to")
                if (currentRedirect) {
                  const redirectHost = new URL(currentRedirect).hostname
                  const appHost = new URL(appUrl).hostname
                  if (redirectHost !== appHost) {
                    linkUrl.searchParams.set("redirect_to", redirectTo)
                    viewUrl = linkUrl.toString()
                  }
                }
              } catch {}
            }
          } catch {}

          const unsubHeaders = generateUnsubscribeHeaders(lead.email, "patient_notifications")
          const unsubFooter = generateUnsubscribeFooterHtml(
            unsubHeaders["List-Unsubscribe"].replace(/[<>]/g, "")
          )

          const dateLabel = lead.booking_date
            ? new Date(lead.booking_date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
            : "TBD"
          const timeLabel = HOURLY_SLOTS.find((s: { key: string }) => s.key === lead.booking_time)?.label || lead.booking_time || "TBD"

          const emailType = action === "confirm" ? EMAIL_TYPE.APPOINTMENT_CONFIRMED : EMAIL_TYPE.APPOINTMENT_DECLINED

          await sendRegisteredEmail({
            type: emailType,
            to: lead.email,
            data: {
              patientFirstName: escapeHtml(lead.first_name || ""),
              clinicName: escapeHtml(clinicName),
              bookingDate: dateLabel,
              bookingTime: timeLabel,
              reason: declineReason ? escapeHtml(declineReason) : null,
              viewUrl,
              unsubscribeFooterHtml: unsubFooter,
              _conversationId: conversationId,
            },
            headers: unsubHeaders,
            clinicId: lead.booking_clinic_id,
            leadId: lead.id,
          })
        }
      } catch (notifError) {
        // Don't fail the response if notifications fail
        console.error("[clinic-response] Notification error:", notifError)
      }
    }

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
