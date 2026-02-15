export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { randomBytes } from "crypto"
import { TIME_SLOT_OPTIONS, URGENCY_OPTIONS } from "@/lib/constants"
import { escapeHtml } from "@/lib/escape-html"

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set")
  }
  return new Resend(apiKey)
}

/**
 * POST /api/booking/confirm
 * Patient confirms they want to book with a specific clinic
 * This sends a notification to the clinic with patient contact info
 */
export async function POST(request: Request) {
  try {
    const { leadId, clinicId } = await request.json()

    if (!leadId || !clinicId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[booking/confirm] Processing booking confirmation", { leadId, clinicId })

    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // Generate a unique booking token
    const bookingToken = randomBytes(16).toString("hex")

    // Update lead with booking status
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        booking_status: "pending",
        booking_confirmed_at: new Date().toISOString(),
        booking_token: bookingToken,
      })
      .eq("id", leadId)

    if (updateError) {
      console.error("[booking/confirm] Failed to update lead:", updateError)
      return NextResponse.json({ error: "Failed to update booking status" }, { status: 500 })
    }

    // Record the lead action
    await supabase
      .from("lead_actions")
      .insert({
        lead_id: leadId,
        clinic_id: clinicId,
        action_type: "booking_confirmed",
        metadata: {
          timestamp: new Date().toISOString(),
          booking_token: bookingToken,
        },
      })
      .single()

    // Fetch lead and clinic data for email
    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .select(
        "first_name, last_name, email, phone, treatment_interest, postcode, budget_range, preferred_timing, preferred_times, created_at, location_preference, anxiety_level, decision_values, conversion_blocker, raw_answers"
      )
      .eq("id", leadId)
      .maybeSingle()

    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("name, notification_email, email, notification_preferences")
      .eq("id", clinicId)
      .maybeSingle()

    if (!leadData || !clinic) {
      console.error("[booking/confirm] Lead or clinic data missing", {
        leadId,
        clinicId,
        hasLeadData: !!leadData,
        hasClinic: !!clinic,
      })
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: "Booking confirmed but email notification failed"
      })
    }

    // Check notification preferences — default to sending if not configured
    const prefs = (clinic.notification_preferences as Record<string, boolean> | null) || {}
    if (prefs.booking_confirmations === false) {
      console.log("[booking/confirm] Clinic has disabled booking confirmation emails:", clinic.name)
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: "Booking confirmed - email notifications disabled by clinic"
      })
    }

    const recipientEmail = clinic.notification_email || clinic.email

    if (!recipientEmail) {
      console.log("[booking/confirm] No notification email configured for clinic:", clinic.name)
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: "Booking confirmed - clinic will be notified"
      })
    }

    // Send clinic notification email
    try {
      const emailFrom = "Pearlie <hello@pearlie.org>"
      const subject = `Booking Request from ${leadData.first_name} ${leadData.last_name}`
      const html = generateBookingEmailHTML(clinic.name, leadData)

      const resend = getResendClient()
      const { data, error } = await resend.emails.send({
        from: emailFrom,
        to: recipientEmail,
        subject,
        html,
      })

      if (error) {
        console.error("[booking/confirm] Resend API error:", error)
        await supabaseAdmin.from("email_logs").insert({
          clinic_id: clinicId,
          lead_id: leadId,
          to_email: recipientEmail,
          subject,
          status: "failed",
          error: error.message || "Unknown error",
        })
      } else {
        console.log("[booking/confirm] Email sent successfully, ID:", data?.id)
        await supabaseAdmin.from("email_logs").insert({
          clinic_id: clinicId,
          lead_id: leadId,
          to_email: recipientEmail,
          subject,
          status: "sent",
          provider_message_id: data?.id,
        })
      }

      return NextResponse.json({
        success: true,
        emailSent: !error,
        bookingToken,
      })
    } catch (emailError: any) {
      console.error("[booking/confirm] Exception sending email:", emailError)
      await supabaseAdmin.from("email_logs").insert({
        clinic_id: clinicId,
        lead_id: leadId,
        to_email: recipientEmail,
        subject: `Booking Request`,
        status: "failed",
        error: emailError.message || "Unknown error",
      })

      return NextResponse.json({
        success: true,
        emailSent: false,
        bookingToken,
      })
    }
  } catch (error) {
    console.error("[booking/confirm] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generateBookingEmailHTML(clinicName: string, lead: any): string {
  const date = new Date(lead.created_at).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  const timing = lead.raw_answers?.timing || lead.preferred_timing
  const preferredTimes = lead.preferred_times || lead.raw_answers?.preferred_times || []

  // Format preferred times for display
  const formattedTimes = preferredTimes
    .map((key: string) => {
      const slot = TIME_SLOT_OPTIONS.find(s => s.key === key)
      return slot ? `${slot.label} (${slot.time})` : key
    })
    .join(", ")

  // Format urgency
  const urgencyOption = URGENCY_OPTIONS.find(u => u.key === timing)
  const urgencyLabel = urgencyOption?.label || timing || "Flexible"

  const isUrgent = timing === "asap" || timing === "1_week"

  // Escape all user-supplied values for safe HTML embedding
  const safeFirstName = escapeHtml(lead.first_name || "")
  const safeLastName = escapeHtml(lead.last_name || "")
  const safeEmail = escapeHtml(lead.email || "")
  const safePhone = escapeHtml(lead.phone || "")
  const safeTreatment = escapeHtml(lead.treatment_interest || "")
  const safePostcode = escapeHtml(lead.postcode || "")
  const safeClinicName = escapeHtml(clinicName || "")

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; margin-bottom: 10px; }
          .urgent-badge { background: #fef3c7; color: #92400e; }
          .time-badge { background: #ecfdf5; color: #065f46; margin-right: 8px; margin-bottom: 8px; }
          .field { margin-bottom: 15px; }
          .label { font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          .value { font-size: 16px; color: #111827; margin-top: 4px; }
          .cta-box { background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center; }
          .cta-button { display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
          .section-title { font-size: 14px; font-weight: 700; color: #374151; margin: 25px 0 12px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">New Booking Request</h1>
            <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">${safeClinicName}</p>
          </div>
          <div class="content">
            <div class="badge">Confirmed Booking Request</div>
            ${isUrgent ? '<div class="badge urgent-badge" style="margin-left: 8px;">Urgent</div>' : ""}
            
            <p style="font-size: 16px; color: #374151; margin: 10px 0 20px;">
              Great news! A patient from Pearlie has confirmed they want to book with your clinic. Please contact them to arrange an appointment.
            </p>
            
            <!-- Patient Details -->
            <div class="field">
              <div class="label">Patient Name</div>
              <div class="value">${safeFirstName} ${safeLastName}</div>
            </div>
            
            <div class="field">
              <div class="label">Contact Details</div>
              <div class="value">
                ${lead.email ? `<strong>Email:</strong> ${safeEmail}` : ""}
                ${lead.email && lead.phone ? "<br>" : ""}
                ${lead.phone ? `<strong>Phone:</strong> ${safePhone}` : ""}
              </div>
            </div>
            
            <div class="field">
              <div class="label">Treatment Interest</div>
              <div class="value">${safeTreatment}</div>
            </div>
            
            <div class="field">
              <div class="label">Location</div>
              <div class="value">${safePostcode}</div>
            </div>
            
            <!-- Appointment Preferences -->
            <div class="section-title">Appointment Preferences</div>
            
            <div class="field">
              <div class="label">How Soon Do They Need Treatment?</div>
              <div class="value">${urgencyLabel}</div>
            </div>
            
            ${preferredTimes.length > 0 ? `
            <div class="field">
              <div class="label">Preferred Times</div>
              <div class="value">
                ${preferredTimes.map((key: string) => {
                  const slot = TIME_SLOT_OPTIONS.find(s => s.key === key)
                  return `<span class="badge time-badge">${slot ? `${slot.label} (${slot.time})` : key}</span>`
                }).join(" ")}
              </div>
            </div>
            ` : ""}
            
            <div class="cta-box">
              <h3 style="margin: 0 0 10px; color: #065f46;">Ready to Book?</h3>
              <p style="margin: 0 0 15px; color: #047857;">Contact ${safeFirstName} to schedule their appointment</p>
              ${lead.phone ? `<a href="tel:${safePhone}" class="cta-button">Call ${safePhone}</a>` : ""}
              ${lead.email && !lead.phone ? `<a href="mailto:${safeEmail}" class="cta-button">Email ${safeFirstName}</a>` : ""}
            </div>
            
            <div class="field" style="margin-top: 20px;">
              <div class="label">Request Submitted</div>
              <div class="value">${date}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>This booking request was generated by <strong>Pearlie</strong></p>
            <p style="font-size: 12px;">pearlie.org</p>
          </div>
        </div>
      </body>
    </html>
  `
}
