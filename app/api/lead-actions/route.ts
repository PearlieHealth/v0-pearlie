export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { TIMING_LABELS, COST_APPROACH_LABELS, LOCATION_PREFERENCE_LABELS, ANXIETY_LEVEL_LABELS } from "@/lib/intake-form-config"
import { escapeHtml } from "@/lib/escape-html"

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set")
  }
  return new Resend(apiKey)
}

export async function POST(request: Request) {
  try {
    const { leadId, clinicId, actionType } = await request.json()

    console.log("[lead-actions] Environment check", {
      hasResendKey: !!process.env.RESEND_API_KEY,
      emailFrom: process.env.EMAIL_FROM,
      appUrl: process.env.APP_URL,
    })

    if (!leadId || !clinicId || !actionType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[lead-actions] Processing action", { leadId, clinicId, actionType })

    const supabase = await createClient()

    const { data: lead, error: leadError } = await supabase.from("leads").select("id").eq("id", leadId).maybeSingle()

    if (!lead || leadError) {
      console.error("[lead-actions] Lead not found:", leadId, leadError)
      return NextResponse.json({ error: "Lead not found" }, { status: 400 })
    }

    const { data: actionRecord, error: insertError } = await supabase
      .from("lead_actions")
      .insert({
        lead_id: leadId,
        clinic_id: clinicId,
        action_type: actionType,
        metadata: {
          timestamp: new Date().toISOString(),
          source: "match_page",
        },
      })
      .select("id")
      .maybeSingle()

    if (insertError && insertError.code === "23505") {
      console.log("[lead-actions] Duplicate action prevented", { leadId, clinicId, actionType })
      return NextResponse.json({
        success: true,
        alreadyNotified: true,
        emailSent: false,
      })
    }

    if (insertError) {
      console.error("[lead-actions] Error recording lead action:", insertError)
      return NextResponse.json({ error: "Failed to record action" }, { status: 500 })
    }

    console.log("[lead-actions] Action recorded successfully")

    // Send email notification in background (non-blocking)
    const emailPromise = (async () => {
      try {
        const { data: leadData, error: leadDataError } = await supabase
          .from("leads")
          .select(
            "first_name, last_name, email, phone, treatment_interest, postcode, budget_range, preferred_timing, preferred_times, booking_token, booking_date, booking_time, created_at, location_preference, anxiety_level, decision_values, conversion_blocker, raw_answers",
          )
          .eq("id", leadId)
          .maybeSingle()

        const { data: clinic, error: clinicError } = await supabase
          .from("clinics")
          .select("name, notification_email, email, notification_preferences")
          .eq("id", clinicId)
          .maybeSingle()

        if (!leadData || !clinic) {
          console.error("[lead-actions] Lead or clinic data missing for email", {
            leadId,
            clinicId,
            hasLeadData: !!leadData,
            hasClinic: !!clinic,
          })
          return
        }

        // Check notification preferences — default to sending if not configured
        const prefs = (clinic.notification_preferences as Record<string, boolean> | null) || {}
        if (prefs.new_leads === false) {
          console.log("[lead-actions] Clinic has disabled new lead alerts:", clinic.name)
          return
        }

        const recipientEmail = clinic.notification_email || clinic.email

        if (!recipientEmail) {
          console.log("[lead-actions] No notification email configured for clinic:", clinic.name)
          return
        }

        await sendClinicNotification({
          recipientEmail,
          clinicName: clinic.name,
          clinicId,
          leadId,
          actionType,
          lead: {
            firstName: leadData.first_name || "",
            lastName: leadData.last_name || "",
            email: leadData.email || "",
            phone: leadData.phone || "",
            treatment: leadData.treatment_interest || "",
            postcode: leadData.postcode || "",
            budget: leadData.budget_range || "",
            timing: leadData.preferred_timing || "",
            preferredTimes: leadData.preferred_times || [],
            bookingToken: leadData.booking_token || "",
            bookingDate: leadData.booking_date || null,
            bookingTime: leadData.booking_time || null,
            submittedAt: leadData.created_at || new Date().toISOString(),
            locationPreference: leadData.location_preference || "",
            anxietyLevel: leadData.anxiety_level || "",
            decisionValues: leadData.decision_values || [],
            conversionBlocker: leadData.conversion_blocker || "",
            rawAnswers: leadData.raw_answers || {},
          },
        })
      } catch (backgroundError) {
        console.error("[lead-actions] Background email error:", backgroundError)
      }
    })()

    // Wait for email to complete before returning (serverless functions may terminate early otherwise)
    await emailPromise

    return NextResponse.json({
      success: true,
      emailSent: true,
      alreadyNotified: false,
    })
  } catch (error) {
    console.error("[lead-actions] Error in lead-actions API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function sendClinicNotification({
  recipientEmail,
  clinicName,
  clinicId,
  leadId,
  actionType,
  lead,
}: {
  recipientEmail: string
  clinicName: string
  clinicId: string
  leadId: string
  actionType: string
  lead: {
    firstName: string
    lastName: string
    email: string
    phone: string
    treatment: string
    postcode: string
    budget: string
    timing: string
    preferredTimes: string[]
    bookingToken: string
    bookingDate?: string | null
    bookingTime?: string | null
    submittedAt: string
    locationPreference: string
    anxietyLevel: string
    decisionValues: string[]
    conversionBlocker: string
    rawAnswers: Record<string, any>
  }
}): Promise<{ success: boolean; error?: string }> {
  // Use admin client to bypass RLS for email_logs table
  const supabaseAdmin = createAdminClient()

  try {
    const emailFrom = "Pearlie <hello@pearlie.org>"

    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set")
    }

    console.log("[lead-actions] Testing Resend API connectivity...")
    const pingResponse = await fetch("https://api.resend.com/domains", {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
    })
    console.log("[lead-actions] Resend API ping status:", pingResponse.status)

    const actionLabel = actionType === "click_book" ? "Book Consultation" : "Call Clinic"
    const subject = `New ${actionLabel} Request - ${lead.firstName} ${lead.lastName}`
    const html = generateEmailHTML(clinicName, actionType, lead)

    console.log("[lead-actions] Sending email", {
      to: recipientEmail,
      from: emailFrom,
      subject,
      leadId,
      clinicId,
    })

    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: recipientEmail,
      subject,
      html,
    })

    if (error) {
      console.error("[lead-actions] Resend API error:", error)

      await supabaseAdmin.from("email_logs").insert({
        clinic_id: clinicId,
        lead_id: leadId,
        to_email: recipientEmail,
        subject,
        status: "failed",
        error: error.message || "Unknown error",
      })

      return { success: false, error: error.message }
    }

    console.log("[lead-actions] Email sent successfully, ID:", data?.id)

    await supabaseAdmin.from("email_logs").insert({
      clinic_id: clinicId,
      lead_id: leadId,
      to_email: recipientEmail,
      subject,
      status: "sent",
      provider_message_id: data?.id,
    })

    return { success: true }
  } catch (error: any) {
    console.error("[lead-actions] Exception sending email:", error)

    await supabaseAdmin.from("email_logs").insert({
      clinic_id: clinicId,
      lead_id: leadId,
      to_email: recipientEmail,
      subject: `Email error`,
      status: "failed",
      error: error.message || "Unknown error",
    })

    return { success: false, error: error.message }
  }
}

function generateEmailHTML(
  clinicName: string,
  actionType: string,
  lead: {
    firstName: string
    lastName: string
    email: string
    phone: string
    treatment: string
    postcode: string
    budget: string
    timing: string
    preferredTimes: string[]
    bookingToken: string
    bookingDate?: string | null
    bookingTime?: string | null
    submittedAt: string
    locationPreference: string
    anxietyLevel: string
    decisionValues: string[]
    conversionBlocker: string
    rawAnswers: Record<string, any>
  },
): string {
  const actionLabel = actionType === "click_book" ? "Book Consultation" : "Call Clinic"
  const date = new Date(lead.submittedAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  const timing = lead.rawAnswers?.timing || lead.timing
  const costApproach = lead.rawAnswers?.cost_approach || lead.budget
  const locationPref = lead.rawAnswers?.location_preference || lead.locationPreference
  const anxiety = lead.rawAnswers?.anxiety_level || lead.anxietyLevel
  const values = lead.rawAnswers?.values || lead.decisionValues || []
  const blockers = lead.rawAnswers?.blocker_labels || (lead.conversionBlocker ? [lead.conversionBlocker] : [])
  const strictBudgetAmount = lead.rawAnswers?.strict_budget_amount
  const preferredTimes = lead.rawAnswers?.preferred_times || lead.preferredTimes || []
  
  // Map time slot keys to labels
  const timeLabels: Record<string, string> = {
    morning: "Morning (9am - 12pm)",
    afternoon: "Afternoon (1pm - 6pm)",
    weekends: "Weekends (Sat - Sun)",
  }
  const preferredTimesLabels = preferredTimes.map((t: string) => timeLabels[t] || t)

  // Escape all user-supplied values for safe HTML embedding
  const safeClinicName = escapeHtml(clinicName || "")
  const safeFirstName = escapeHtml(lead.firstName || "")
  const safeLastName = escapeHtml(lead.lastName || "")
  const safeEmail = escapeHtml(lead.email || "")
  const safePhone = escapeHtml(lead.phone || "")
  const safeTreatment = escapeHtml(lead.treatment || "")
  const safePostcode = escapeHtml(lead.postcode || "")

  // Generate confirm/decline booking URLs
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
  const confirmUrl = lead.bookingToken ? `${appUrl}/booking/clinic-response?token=${lead.bookingToken}&action=confirm` : null
  const declineUrl = lead.bookingToken ? `${appUrl}/booking/clinic-response?token=${lead.bookingToken}&action=decline` : null

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; margin-bottom: 10px; }
          .urgent-badge { background: #fef3c7; color: #92400e; }
          .field { margin-bottom: 15px; }
          .label { font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          .value { font-size: 16px; color: #111827; margin-top: 4px; }
          .tag { display: inline-block; background: #f3f4f6; color: #374151; padding: 3px 10px; border-radius: 6px; font-size: 13px; margin: 2px 4px 2px 0; }
          .concern-tag { background: #fef2f2; color: #991b1b; }
          .section-title { font-size: 14px; font-weight: 700; color: #374151; margin: 25px 0 12px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .highlight-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">New Patient Lead</h1>
            <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">${safeClinicName}</p>
          </div>
          <div class="content">
            <div class="badge">${actionLabel}</div>
            ${timing === "asap" ? '<div class="badge urgent-badge" style="margin-left: 8px;">Urgent - ASAP</div>' : ""}
            
            <p style="font-size: 16px; color: #374151; margin: 10px 0 20px;">
              A patient from Pearlie has clicked "${actionLabel}" for your clinic. They're ready to take the next step.
            </p>
            
            <!-- Patient Details -->
            <div class="field">
              <div class="label">Patient Name</div>
              <div class="value">${safeFirstName} ${safeLastName}</div>
            </div>
            
            <div class="field">
              <div class="label">Contact</div>
              <div class="value">
                ${lead.email ? `Email: ${safeEmail}` : ""}${lead.email && lead.phone ? "<br>" : ""}${lead.phone ? `Phone: ${safePhone}` : ""}
              </div>
            </div>
            
            <div class="field">
              <div class="label">Treatment Interest</div>
              <div class="value">${safeTreatment}</div>
            </div>
            
            <div class="field">
              <div class="label">Location</div>
              <div class="value">${safePostcode}${locationPref ? ` — ${escapeHtml(LOCATION_PREFERENCE_LABELS[locationPref] || locationPref)}` : ""}</div>
            </div>
            
            <!-- Timing & Budget Section -->
            <div class="section-title">Timing & Budget</div>
            
            ${lead.bookingDate && lead.bookingTime ? `
            <div class="highlight-box" style="background: #dbeafe; border-color: #93c5fd; margin-bottom: 15px;">
              <strong style="color: #1e40af;">Requested Appointment</strong>
              <p style="margin: 8px 0 0; font-size: 18px; color: #1e3a8a; font-weight: 600;">
                ${new Date(lead.bookingDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} at ${lead.bookingTime}
              </p>
            </div>
            ` : ""}
            
            <div class="field">
              <div class="label">When do they want treatment?</div>
              <div class="value">${timing ? (TIMING_LABELS[timing] || timing) : "Not specified"}</div>
            </div>
            
            ${preferredTimesLabels.length > 0 ? `
            <div class="field">
              <div class="label">Preferred Appointment Times</div>
              <div class="value">
                ${preferredTimesLabels.map((t: string) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
              </div>
            </div>
            ` : ""}
            
            <div class="field">
              <div class="label">Cost Approach</div>
              <div class="value">${costApproach ? (COST_APPROACH_LABELS[costApproach] || costApproach) : "Not specified"}</div>
            </div>
            
            ${strictBudgetAmount ? `
            <div class="field">
              <div class="label">Budget Amount</div>
              <div class="value">£${strictBudgetAmount.toLocaleString()}</div>
            </div>
            ` : ""}
            
            <!-- What Matters to Them -->
            ${values.length > 0 ? `
            <div class="section-title">What Matters Most to This Patient</div>
            <div>
              ${values.map((v: string) => `<span class="tag">${escapeHtml(v)}</span>`).join("")}
            </div>
            ` : ""}
            
            <!-- Concerns/Blockers -->
            ${blockers.length > 0 ? `
            <div class="section-title">Their Concerns</div>
            <div>
              ${blockers.map((b: string) => `<span class="tag concern-tag">${escapeHtml(b)}</span>`).join("")}
            </div>
            ` : ""}
            
            <!-- Anxiety Level -->
            ${anxiety ? `
            <div class="field" style="margin-top: 15px;">
              <div class="label">Anxiety Level</div>
              <div class="value">${ANXIETY_LEVEL_LABELS[anxiety] || anxiety}</div>
            </div>
            ` : ""}
            
            <div class="highlight-box">
              <strong>Conversion Tips:</strong>
              <ul style="margin: 10px 0 0; padding-left: 20px; color: #166534;">
                ${timing === "asap" ? "<li>This patient wants treatment ASAP - respond quickly!</li>" : ""}
                ${anxiety && anxiety !== "not_anxious" ? "<li>Patient has dental anxiety - be gentle and reassuring</li>" : ""}
                ${costApproach === "payments_preferred" ? "<li>Mention your finance options early in the conversation</li>" : ""}
                ${values.includes("Clear pricing before treatment") ? "<li>Be upfront about costs - transparency is important to them</li>" : ""}
                <li>Reach out within 24 hours for best conversion rates</li>
              </ul>
            </div>
            
            <div class="field" style="margin-top: 20px;">
              <div class="label">Submitted</div>
              <div class="value">${date}</div>
            </div>
            
            ${confirmUrl && declineUrl ? `
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin-bottom: 15px; color: #374151; font-weight: 500;">Once you've contacted this patient, please update the booking status:</p>
              <div style="display: inline-block;">
                <a href="${confirmUrl}" style="display: inline-block; background: #166534; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin-right: 12px;">
                  Confirm Booking
                </a>
                <a href="${declineUrl}" style="display: inline-block; background: #f3f4f6; color: #374151; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; border: 1px solid #d1d5db;">
                  Decline
                </a>
              </div>
              <p style="margin-top: 15px; font-size: 13px; color: #6b7280;">This helps us track conversions and improve patient matching</p>
            </div>
            ` : ""}
          </div>
          
          <div class="footer">
            <p>This lead was generated by <strong>Pearlie</strong></p>
            <p style="font-size: 12px;">pearlie.org</p>
          </div>
        </div>
      </body>
    </html>
  `
}
