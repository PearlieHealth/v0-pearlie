import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"
import { escapeHtml } from "@/lib/escape-html"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { generateUnsubscribeFooterHtml, generateUnsubscribeHeaders } from "@/lib/unsubscribe"
import { HOURLY_SLOTS } from "@/lib/constants"

const VALID_ACTIONS = ["confirm", "reschedule", "decline", "cancel"] as const
type Action = (typeof VALID_ACTIONS)[number]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, action, newDate, newTime, message, reason } = body

    if (!leadId || !action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 })
    }

    // Validate date/time fields for reschedule (required) and confirm (optional override)
    if (action === "reschedule" || (action === "confirm" && (newDate || newTime))) {
      if (action === "reschedule" && (!newDate || !newTime)) {
        return NextResponse.json({ error: "Date and time required for reschedule" }, { status: 400 })
      }
      if (action === "confirm" && ((newDate && !newTime) || (!newDate && newTime))) {
        return NextResponse.json({ error: "Both date and time are required when overriding" }, { status: 400 })
      }
      if (newDate) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
          return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
        }
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (new Date(newDate + "T00:00:00") < today) {
          return NextResponse.json({ error: "Cannot schedule to a past date" }, { status: 400 })
        }
      }
      if (newTime) {
        const validTime = HOURLY_SLOTS.some((s: { key: string }) => s.key === newTime)
        if (!validTime) {
          return NextResponse.json({ error: "Invalid time slot" }, { status: 400 })
        }
      }
    }

    // Auth: verify clinic user
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()

    const { data: clinicUser } = await supabaseAdmin
      .from("clinic_users")
      .select("clinic_id")
      .eq("user_id", user.id)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "No clinic found" }, { status: 404 })
    }

    // Fetch lead and verify it belongs to this clinic (via booking_clinic_id)
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("id, email, first_name, booking_status, booking_date, booking_time, booking_clinic_id")
      .eq("id", leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    if (lead.booking_clinic_id !== clinicUser.clinic_id) {
      return NextResponse.json({ error: "This appointment belongs to a different clinic" }, { status: 403 })
    }

    // Fetch clinic name
    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("name")
      .eq("id", clinicUser.clinic_id)
      .single()

    const clinicName = clinic?.name || "Your clinic"

    // Find conversation for this lead + clinic
    const { data: conversation } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("lead_id", leadId)
      .eq("clinic_id", clinicUser.clinic_id)
      .single()

    const conversationId = conversation?.id || null

    // Execute the action
    const now = new Date().toISOString()
    let botMessageContent = ""

    if (action === "confirm") {
      // Clinic can optionally override date/time (e.g. after chatting with patient)
      const confirmedDate = newDate || lead.booking_date
      const confirmedTime = newTime || lead.booking_time

      const leadUpdate: Record<string, string | null> = {
        booking_status: "confirmed",
        booking_confirmed_at: now,
      }
      if (newDate) leadUpdate.booking_date = newDate
      if (newTime) leadUpdate.booking_time = newTime

      await supabaseAdmin
        .from("leads")
        .update(leadUpdate)
        .eq("id", leadId)

      await supabaseAdmin
        .from("lead_clinic_status")
        .update({ status: "BOOKED_CONFIRMED" })
        .eq("lead_id", leadId)
        .eq("clinic_id", clinicUser.clinic_id)

      // Also upsert into bookings table so Scheduled tab picks it up
      if (confirmedDate) {
        const apptDatetime = confirmedTime
          ? `${confirmedDate}T${confirmedTime}:00`
          : `${confirmedDate}T09:00:00`
        await supabaseAdmin.from("bookings").upsert(
          {
            lead_id: leadId,
            clinic_id: clinicUser.clinic_id,
            appointment_datetime: apptDatetime,
            booking_method: "patient_request",
            status: "confirmed",
          },
          { onConflict: "lead_id,clinic_id", ignoreDuplicates: false }
        ).then(() => {}).catch(() => {
          supabaseAdmin.from("bookings").insert({
            lead_id: leadId,
            clinic_id: clinicUser.clinic_id,
            appointment_datetime: apptDatetime,
            booking_method: "patient_request",
            status: "confirmed",
          }).catch(() => {})
        })
      }

      const dateLabel = formatDateLabel(confirmedDate)
      const timeLabel = formatTimeLabel(confirmedTime)
      botMessageContent = `Your appointment has been confirmed for ${dateLabel} at ${timeLabel}.`
    }

    if (action === "reschedule") {
      await supabaseAdmin
        .from("leads")
        .update({
          booking_status: "confirmed",
          booking_date: newDate,
          booking_time: newTime,
          booking_rescheduled_at: now,
          booking_confirmed_at: now,
        })
        .eq("id", leadId)

      // Also upsert into bookings table
      const apptDatetime = newTime
        ? `${newDate}T${newTime}:00`
        : `${newDate}T09:00:00`
      await supabaseAdmin.from("bookings").upsert(
        {
          lead_id: leadId,
          clinic_id: clinicUser.clinic_id,
          appointment_datetime: apptDatetime,
          booking_method: "patient_request",
          status: "confirmed",
        },
        { onConflict: "lead_id,clinic_id", ignoreDuplicates: false }
      ).catch(() => {
        supabaseAdmin.from("bookings").insert({
          lead_id: leadId,
          clinic_id: clinicUser.clinic_id,
          appointment_datetime: apptDatetime,
          booking_method: "patient_request",
          status: "confirmed",
        }).catch(() => {})
      })

      const dateLabel = formatDateLabel(newDate)
      const timeLabel = formatTimeLabel(newTime)
      botMessageContent = `${clinicName} has rescheduled your appointment to ${dateLabel} at ${timeLabel}.`
    }

    if (action === "decline") {
      await supabaseAdmin
        .from("leads")
        .update({
          booking_status: "declined",
          booking_declined_at: now,
          booking_decline_reason: reason || null,
        })
        .eq("id", leadId)

      // Clear appointment_requested_at so patient can re-request
      if (conversationId) {
        await supabaseAdmin
          .from("conversations")
          .update({ appointment_requested_at: null })
          .eq("id", conversationId)
      }

      await supabaseAdmin
        .from("lead_clinic_status")
        .update({ status: "CONTACTED" })
        .eq("lead_id", leadId)
        .eq("clinic_id", clinicUser.clinic_id)

      botMessageContent = `${clinicName} was unable to accommodate your requested time.`
      if (reason) botMessageContent += ` Reason: ${reason}`
      botMessageContent += "\nYou can request a new appointment time."
    }

    if (action === "cancel") {
      await supabaseAdmin
        .from("leads")
        .update({
          booking_status: "cancelled",
          booking_cancelled_at: now,
          booking_cancel_reason: reason || null,
        })
        .eq("id", leadId)

      // Clear appointment_requested_at so patient can re-request
      if (conversationId) {
        await supabaseAdmin
          .from("conversations")
          .update({ appointment_requested_at: null })
          .eq("id", conversationId)
      }

      await supabaseAdmin
        .from("lead_clinic_status")
        .update({ status: "CONTACTED" })
        .eq("lead_id", leadId)
        .eq("clinic_id", clinicUser.clinic_id)

      const dateLabel = formatDateLabel(lead.booking_date)
      botMessageContent = `Your appointment on ${dateLabel} has been cancelled.`
      if (reason) botMessageContent += ` Reason: ${reason}`
    }

    // Post bot message in chat
    if (conversationId && botMessageContent) {
      await supabaseAdmin.from("messages").insert({
        conversation_id: conversationId,
        sender_type: "bot",
        content: botMessageContent,
        message_type: "appointment_update",
        status: "sent",
      })

      await supabaseAdmin
        .from("conversations")
        .update({
          last_message_at: now,
          unread_by_patient: true,
          unread_count_patient: 1, // Reset to 1 for this notification
        })
        .eq("id", conversationId)

      // Broadcast bot message for real-time delivery
      try {
        const channel = supabaseAdmin.channel(`chat:${conversationId}`)
        await channel.send({
          type: "broadcast",
          event: "new_message",
          payload: {
            message: {
              conversation_id: conversationId,
              sender_type: "bot",
              content: botMessageContent,
              message_type: "appointment_update",
            },
          },
        })
        await supabaseAdmin.removeChannel(channel)
      } catch (broadcastErr) {
        console.error("[clinic-action] Broadcast error:", broadcastErr)
      }

      // If reschedule has a clinic message, post it as a separate clinic message
      if (action === "reschedule" && message?.trim()) {
        await supabaseAdmin.from("messages").insert({
          conversation_id: conversationId,
          sender_type: "clinic",
          content: message.trim(),
          sent_via: "chat",
          status: "sent",
        })
      }
    }

    // Send patient email notification
    if (lead.email) {
      try {
        await sendPatientNotificationEmail({
          supabaseAdmin,
          action: action as Action,
          lead,
          clinicId: clinicUser.clinic_id,
          clinicName,
          conversationId,
          newDate,
          newTime,
          reason,
        })
      } catch (emailErr) {
        console.error("[clinic-action] Patient email error:", emailErr)
      }
    }

    return NextResponse.json({ success: true, action })
  } catch (error) {
    console.error("[clinic-action] Unexpected error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

// ---- Helpers ----

function formatDateLabel(dateStr: string | null): string {
  if (!dateStr) return "the scheduled date"
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  } catch {
    return dateStr
  }
}

function formatTimeLabel(timeStr: string | null): string {
  if (!timeStr) return "the scheduled time"
  const slot = HOURLY_SLOTS.find((s: { key: string }) => s.key === timeStr)
  return slot?.label || timeStr
}

async function sendPatientNotificationEmail({
  supabaseAdmin,
  action,
  lead,
  clinicId,
  clinicName,
  conversationId,
  newDate,
  newTime,
  reason,
}: {
  supabaseAdmin: ReturnType<typeof createAdminClient>
  action: Action
  lead: { id: string; email: string; first_name: string; booking_date: string | null; booking_time: string | null }
  clinicId: string
  clinicName: string
  conversationId: string | null
  newDate?: string
  newTime?: string
  reason?: string
}) {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
  const dashboardPath = "/patient/dashboard"
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(dashboardPath)}`
  let viewUrl = `${appUrl}${dashboardPath}`

  // Generate magic link for auto-login
  try {
    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
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
  } catch {
    // Fall back to plain URL
  }

  const unsubHeaders = generateUnsubscribeHeaders(lead.email, "patient_notifications")
  const unsubFooter = generateUnsubscribeFooterHtml(
    unsubHeaders["List-Unsubscribe"].replace(/[<>]/g, "")
  )

  const emailTypeMap: Record<Action, string> = {
    confirm: EMAIL_TYPE.APPOINTMENT_CONFIRMED,
    reschedule: EMAIL_TYPE.APPOINTMENT_RESCHEDULED,
    decline: EMAIL_TYPE.APPOINTMENT_DECLINED,
    cancel: EMAIL_TYPE.APPOINTMENT_CANCELLED,
  }

  const dateStr = newDate || lead.booking_date
  const timeStr = newTime || lead.booking_time

  await sendRegisteredEmail({
    type: emailTypeMap[action],
    to: lead.email,
    data: {
      patientFirstName: escapeHtml(lead.first_name || ""),
      clinicName: escapeHtml(clinicName),
      bookingDate: formatDateLabel(dateStr || null),
      bookingTime: formatTimeLabel(timeStr || null),
      reason: reason ? escapeHtml(reason) : null,
      viewUrl,
      unsubscribeFooterHtml: unsubFooter,
      _conversationId: conversationId,
    },
    headers: unsubHeaders,
    clinicId,
    leadId: lead.id,
  })
}
