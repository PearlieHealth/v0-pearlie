import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { escapeHtml } from "@/lib/escape-html"
import { generateUnsubscribeFooterHtml, generateUnsubscribeHeaders } from "@/lib/unsubscribe"
import { HOURLY_SLOTS } from "@/lib/constants"

/**
 * POST /api/clinic/bookings
 *
 * Unified booking creation for the BookingDialog (clinic-initiated).
 * Creates the bookings row AND syncs leads.booking_*, lead_clinic_status,
 * chat message, and patient email — keeping both booking systems in sync.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, clinicId, appointmentDatetime, bookingMethod, expectedValueGbp } = body

    if (!leadId || !clinicId || !appointmentDatetime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Verify the clinic user belongs to this clinic
    const { data: clinicUser } = await supabase
      .from("clinic_users")
      .select("clinic_id")
      .eq("user_id", user.id)
      .eq("clinic_id", clinicId)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Fetch lead + clinic name
    const [{ data: lead }, { data: clinic }] = await Promise.all([
      supabase.from("leads").select("id, first_name, last_name, email, booking_status").eq("id", leadId).single(),
      supabase.from("clinics").select("id, name").eq("id", clinicId).single(),
    ])

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const now = new Date().toISOString()
    const apptDate = new Date(appointmentDatetime)
    const bookingDate = apptDate.toISOString().split("T")[0]
    // Extract HH:MM from the datetime
    const hours = String(apptDate.getHours()).padStart(2, "0")
    const minutes = String(apptDate.getMinutes()).padStart(2, "0")
    const bookingTime = `${hours}:${minutes}`

    // 1. Create bookings entry
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        lead_id: leadId,
        clinic_id: clinicId,
        appointment_datetime: appointmentDatetime,
        booking_method: bookingMethod || "clinic_manual",
        expected_value_gbp: expectedValueGbp || null,
        status: "confirmed",
      })
      .select()
      .single()

    if (bookingError) {
      console.error("[Bookings] Insert error:", bookingError)
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
    }

    // 2. Sync leads.booking_* fields
    await supabase
      .from("leads")
      .update({
        booking_status: "confirmed",
        booking_date: bookingDate,
        booking_time: bookingTime,
        booking_clinic_id: clinicId,
        booking_confirmed_at: now,
      })
      .eq("id", leadId)

    // 3. Upsert lead_clinic_status to BOOKED_CONFIRMED
    await supabase
      .from("lead_clinic_status")
      .upsert(
        {
          lead_id: leadId,
          clinic_id: clinicId,
          status: "BOOKED_CONFIRMED",
          updated_at: now,
          updated_by: user.id,
        },
        { onConflict: "lead_id,clinic_id" }
      )

    // 4. Post bot message in conversation (if one exists)
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("lead_id", leadId)
      .eq("clinic_id", clinicId)
      .single()

    const dateLabel = apptDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    const timeSlot = HOURLY_SLOTS.find((s: { key: string }) => s.key === bookingTime)
    const timeLabel = timeSlot?.label || bookingTime

    if (conversation) {
      const botContent = `${clinic?.name || "The clinic"} has confirmed your appointment for ${dateLabel} at ${timeLabel}.`

      const { data: botMsg } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          sender_type: "bot",
          content: botContent,
          sent_via: "chat",
          message_type: "appointment_update",
        })
        .select("*")
        .single()

      // Update conversation
      await supabase
        .from("conversations")
        .update({
          last_message_at: now,
          unread_by_patient: true,
          unread_count_patient: 1,
        })
        .eq("id", conversation.id)

      // Broadcast for realtime
      if (botMsg) {
        try {
          const channel = supabase.channel(`chat:${conversation.id}`)
          await channel.send({ type: "broadcast", event: "new_message", payload: { message: botMsg } })
          await supabase.removeChannel(channel)
        } catch {}
      }
    }

    // 5. Send patient email notification
    if (lead.email && clinic) {
      try {
        const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
        const unsubFooter = generateUnsubscribeFooterHtml(
          generateUnsubscribeHeaders(lead.email, "patient_notifications")["List-Unsubscribe"].replace(/[<>]/g, "")
        )

        await sendRegisteredEmail({
          type: EMAIL_TYPE.APPOINTMENT_CONFIRMED,
          to: lead.email,
          data: {
            patientFirstName: escapeHtml(lead.first_name || ""),
            clinicName: escapeHtml(clinic.name),
            bookingDate: dateLabel,
            bookingTime: timeLabel,
            viewUrl: `${appUrl}/patient/dashboard`,
            unsubscribeFooterHtml: unsubFooter,
          },
          headers: generateUnsubscribeHeaders(lead.email, "patient_notifications"),
          clinicId,
          leadId,
        })
      } catch (emailErr) {
        console.error("[Bookings] Email send error:", emailErr)
      }
    }

    return NextResponse.json({ success: true, booking })
  } catch (error) {
    console.error("[Bookings] Unexpected error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
