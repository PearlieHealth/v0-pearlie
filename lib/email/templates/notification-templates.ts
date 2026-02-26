/**
 * Notification email templates: lead action, booking confirmation, chat notifications.
 * These are the most complex templates, containing the rich patient-lead data.
 */
import { escapeHtml } from "@/lib/escape-html"
import { portalUrl } from "@/lib/clinic-url"
import {
  TIMING_LABELS,
  COST_APPROACH_LABELS,
  LOCATION_PREFERENCE_LABELS,
  ANXIETY_LEVEL_LABELS,
} from "@/lib/intake-form-config"
import { TIME_SLOT_OPTIONS, URGENCY_OPTIONS } from "@/lib/constants"

// ---------------------------------------------------------------------------
// 9. Match Nudge (to patient — "Your clinic matches are waiting")
// ---------------------------------------------------------------------------

export interface MatchNudgePayload {
  firstName: string
  clinicCount: number
  postcode: string
  matchLink: string
  unsubscribeFooterHtml: string
}

export function renderMatchNudgeEmail(data: MatchNudgePayload): string {
  return `<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">Your matches are waiting</h1>
  </div>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
    Hi ${data.firstName}, you matched with <strong>${data.clinicCount} clinic${data.clinicCount !== 1 ? "s" : ""}</strong> near <strong>${data.postcode}</strong>. Your personalised matches are ready to view.
  </p>
  <div style="text-align: center; margin-bottom: 32px;">
    <a href="${data.matchLink}" style="display: inline-block; background: #0fbcb0; color: white; padding: 14px 36px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 16px;">
      View matches
    </a>
  </div>
  <p style="font-size: 14px; color: #666; line-height: 1.5;">
    Message a clinic to ask about treatments, availability, or anything else. They typically reply within a few hours.
  </p>
  <p style="font-size: 12px; color: #999; text-align: center; margin-top: 32px;">
    Pearlie &mdash; Finding your perfect dental match
  </p>
  ${data.unsubscribeFooterHtml}
</div>`
}

// ---------------------------------------------------------------------------
// 10. Lead Action Notification (to clinic)
// ---------------------------------------------------------------------------

export interface LeadActionPayload {
  clinicName: string
  clinicId: string
  actionType: string
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

export function renderLeadActionEmail(data: LeadActionPayload): string {
  const actionLabel = data.actionType === "click_book" ? "Book Consultation" : "Call Clinic"
  const date = new Date(data.submittedAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  const timing = data.rawAnswers?.timing || data.timing
  const costApproach = data.rawAnswers?.cost_approach || data.budget
  const locationPref = data.rawAnswers?.location_preference || data.locationPreference
  const anxiety = data.rawAnswers?.anxiety_level || data.anxietyLevel
  const values = data.rawAnswers?.values || data.decisionValues || []
  const blockers = data.rawAnswers?.blocker_labels || (data.conversionBlocker ? [data.conversionBlocker] : [])
  const strictBudgetAmount = data.rawAnswers?.strict_budget_amount
  const preferredTimes = data.rawAnswers?.preferred_times || data.preferredTimes || []

  const timeLabels: Record<string, string> = {
    morning: "Morning (9am - 12pm)",
    afternoon: "Afternoon (1pm - 6pm)",
    weekends: "Weekends (Sat - Sun)",
  }
  const preferredTimesLabels = preferredTimes.map((t: string) => timeLabels[t] || t)

  const safeClinicName = escapeHtml(data.clinicName || "")
  const safeFirstName = escapeHtml(data.firstName || "")
  const safeLastName = escapeHtml(data.lastName || "")
  const safeEmail = escapeHtml(data.email || "")
  const safePhone = escapeHtml(data.phone || "")
  const safeTreatment = escapeHtml(data.treatment || "")
  const safePostcode = escapeHtml(data.postcode || "")

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #0fbcb0 0%, #0da399 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
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

        <div class="field">
          <div class="label">Patient Name</div>
          <div class="value">${safeFirstName} ${safeLastName}</div>
        </div>

        <div class="field">
          <div class="label">Contact</div>
          <div class="value">
            ${data.email ? `Email: ${safeEmail}` : ""}${data.email && data.phone ? "<br>" : ""}${data.phone ? `Phone: ${safePhone}` : ""}
          </div>
        </div>

        <div class="field">
          <div class="label">Treatment Interest</div>
          <div class="value">${safeTreatment}</div>
        </div>

        <div class="field">
          <div class="label">Location</div>
          <div class="value">${safePostcode}${locationPref ? ` &mdash; ${escapeHtml(LOCATION_PREFERENCE_LABELS[locationPref] || locationPref)}` : ""}</div>
        </div>

        <div class="section-title">Timing &amp; Budget</div>

        ${data.bookingDate ? `
        <div class="highlight-box" style="background: #dbeafe; border-color: #93c5fd; margin-bottom: 15px;">
          <strong style="color: #1e40af;">Requested Appointment Date</strong>
          <p style="margin: 8px 0 0; font-size: 18px; color: #1e3a8a; font-weight: 600;">
            ${new Date(data.bookingDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
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
          <div class="value">&pound;${strictBudgetAmount.toLocaleString()}</div>
        </div>
        ` : ""}

        ${values.length > 0 ? `
        <div class="section-title">What Matters Most to This Patient</div>
        <div>
          ${values.map((v: string) => `<span class="tag">${escapeHtml(v)}</span>`).join("")}
        </div>
        ` : ""}

        ${blockers.length > 0 ? `
        <div class="section-title">Their Concerns</div>
        <div>
          ${blockers.map((b: string) => `<span class="tag concern-tag">${escapeHtml(b)}</span>`).join("")}
        </div>
        ` : ""}

        ${anxiety ? `
        <div class="field" style="margin-top: 15px;">
          <div class="label">Anxiety Level</div>
          <div class="value">${ANXIETY_LEVEL_LABELS[anxiety] || anxiety}</div>
        </div>
        ` : ""}

        <div class="highlight-box">
          <strong>Conversion Tips:</strong>
          <ul style="margin: 10px 0 0; padding-left: 20px; color: #0f766e;">
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

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <a href="${portalUrl("/clinic/leads")}" style="display: inline-block; background: #0fbcb0; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Manage Lead
          </a>
          <p style="margin-top: 15px; font-size: 13px; color: #6b7280;">Log in to your clinic dashboard to respond to this patient</p>
        </div>
      </div>

      <div class="footer">
        <p>This lead was generated by <strong>Pearlie</strong></p>
        <p style="font-size: 12px;">pearlie.org</p>
      </div>
    </div>
  </body>
</html>`
}

// ---------------------------------------------------------------------------
// 11. Booking Confirmation (to clinic)
// ---------------------------------------------------------------------------

export interface BookingConfirmationPayload {
  clinicName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  treatment: string
  postcode: string
  preferredTiming: string
  preferredTimes: string[]
  createdAt: string
  rawAnswers: Record<string, any>
}

export function renderBookingConfirmationEmail(data: BookingConfirmationPayload): string {
  const date = new Date(data.createdAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  const timing = data.rawAnswers?.timing || data.preferredTiming
  const preferredTimes = data.preferredTimes || data.rawAnswers?.preferred_times || []

  const formattedTimes = preferredTimes
    .map((key: string) => {
      const slot = TIME_SLOT_OPTIONS.find(s => s.key === key)
      return slot ? `${slot.label} (${slot.time})` : key
    })
    .join(", ")

  const urgencyOption = URGENCY_OPTIONS.find(u => u.key === timing)
  const urgencyLabel = urgencyOption?.label || timing || "Flexible"
  const isUrgent = timing === "asap" || timing === "1_week"

  const safeFirstName = escapeHtml(data.firstName || "")
  const safeLastName = escapeHtml(data.lastName || "")
  const safeEmail = escapeHtml(data.email || "")
  const safePhone = escapeHtml(data.phone || "")
  const safeTreatment = escapeHtml(data.treatment || "")
  const safePostcode = escapeHtml(data.postcode || "")
  const safeClinicName = escapeHtml(data.clinicName || "")

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #0fbcb0 0%, #0da399 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
      .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
      .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; margin-bottom: 10px; }
      .urgent-badge { background: #fef3c7; color: #92400e; }
      .time-badge { background: #f0fdfa; color: #0f766e; margin-right: 8px; margin-bottom: 8px; }
      .field { margin-bottom: 15px; }
      .label { font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
      .value { font-size: 16px; color: #111827; margin-top: 4px; }
      .cta-box { background: #f0fdfa; border: 2px solid #99f6e4; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center; }
      .cta-button { display: inline-block; background: #0fbcb0; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
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

        <div class="field">
          <div class="label">Patient Name</div>
          <div class="value">${safeFirstName} ${safeLastName}</div>
        </div>

        <div class="field">
          <div class="label">Contact Details</div>
          <div class="value">
            ${data.email ? `<strong>Email:</strong> ${safeEmail}` : ""}
            ${data.email && data.phone ? "<br>" : ""}
            ${data.phone ? `<strong>Phone:</strong> ${safePhone}` : ""}
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
          <h3 style="margin: 0 0 10px; color: #0f766e;">Ready to Book?</h3>
          <p style="margin: 0 0 15px; color: #0da399;">Contact ${safeFirstName} to schedule their appointment</p>
          ${data.phone ? `<a href="tel:${safePhone}" class="cta-button">Call ${safePhone}</a>` : ""}
          ${data.email && !data.phone ? `<a href="mailto:${safeEmail}" class="cta-button">Email ${safeFirstName}</a>` : ""}
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
</html>`
}

// ---------------------------------------------------------------------------
// 12. Chat Notification (patient message → clinic)
// ---------------------------------------------------------------------------

export interface ChatToClinicPayload {
  patientName: string
  messagePreview: string
  inboxUrl: string
  unsubscribeFooterHtml: string
}

export function renderChatToClinicEmail(data: ChatToClinicPayload): string {
  return `<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #0fbcb0; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0;">New Patient Message</h1>
  </div>
  <div style="padding: 30px; background-color: #f9fafb;">
    <p style="color: #374151; font-size: 16px;">
      You have received a new message from <strong>${data.patientName}</strong>:
    </p>
    <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #0fbcb0;">
      <p style="color: #4b5563; margin: 0; white-space: pre-wrap;">${data.messagePreview}</p>
    </div>
    <div style="text-align: center; margin-top: 30px;">
      <a href="${data.inboxUrl}"
         style="background-color: #0fbcb0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
        View in Inbox
      </a>
    </div>
  </div>
  <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
    <p>This is an automated message from Pearlie</p>
    ${data.unsubscribeFooterHtml}
  </div>
</div>`
}

// ---------------------------------------------------------------------------
// 13. Clinic Reply Notification (clinic message → patient)
// ---------------------------------------------------------------------------

export interface ClinicReplyToPatientPayload {
  patientFirstName: string
  clinicName: string
  messagePreview: string
  viewReplyUrl: string
  unsubscribeFooterHtml: string
}

// ---------------------------------------------------------------------------
// 14–17. Appointment Lifecycle Notifications (to patient)
// ---------------------------------------------------------------------------

export interface AppointmentNotificationPayload {
  patientFirstName: string
  clinicName: string
  bookingDate: string
  bookingTime?: string | null // set by clinic on confirm/reschedule, null for pending requests
  reason?: string | null
  viewUrl: string
  unsubscribeFooterHtml: string
}

export function renderAppointmentConfirmedEmail(data: AppointmentNotificationPayload): string {
  const safeFirstName = data.patientFirstName ? ` ${data.patientFirstName}` : ""
  return `<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">Appointment Confirmed</h1>
  </div>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 8px;">
    Hi${safeFirstName},
  </p>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
    Great news! <strong>${data.clinicName}</strong> has confirmed your appointment.
  </p>
  <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
    <p style="margin: 0 0 8px 0; font-size: 14px; color: #166534;">Date${data.bookingTime ? " & time" : ""}</p>
    <p style="margin: 0; font-size: 18px; font-weight: 600; color: #14532d;">${data.bookingDate}${data.bookingTime ? ` &middot; ${data.bookingTime}` : ""}</p>
  </div>
  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${data.viewUrl}" style="display: inline-block; background: #0fbcb0; color: white; padding: 12px 32px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 14px;">
      View your dashboard
    </a>
  </div>
  <p style="font-size: 12px; color: #999; text-align: center;">Pearlie &mdash; Finding your perfect dental match</p>
  ${data.unsubscribeFooterHtml}
</div>`
}

export function renderAppointmentDeclinedEmail(data: AppointmentNotificationPayload): string {
  const safeFirstName = data.patientFirstName ? ` ${data.patientFirstName}` : ""
  return `<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">Appointment Update</h1>
  </div>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 8px;">
    Hi${safeFirstName},
  </p>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
    Unfortunately, <strong>${data.clinicName}</strong> was unable to accommodate your requested appointment date.
  </p>
  ${data.reason ? `
  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
    <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.5;">${data.reason}</p>
  </div>` : ""}
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
    You can request a new appointment date or message the clinic directly.
  </p>
  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${data.viewUrl}" style="display: inline-block; background: #0fbcb0; color: white; padding: 12px 32px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 14px;">
      View your dashboard
    </a>
  </div>
  <p style="font-size: 12px; color: #999; text-align: center;">Pearlie &mdash; Finding your perfect dental match</p>
  ${data.unsubscribeFooterHtml}
</div>`
}

export function renderAppointmentRescheduledEmail(data: AppointmentNotificationPayload): string {
  const safeFirstName = data.patientFirstName ? ` ${data.patientFirstName}` : ""
  return `<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">Appointment Rescheduled</h1>
  </div>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 8px;">
    Hi${safeFirstName},
  </p>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
    <strong>${data.clinicName}</strong> has rescheduled your appointment to a new time.
  </p>
  <div style="background: #eff6ff; border: 1px solid #93c5fd; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
    <p style="margin: 0 0 8px 0; font-size: 14px; color: #1e40af;">New date${data.bookingTime ? " & time" : ""}</p>
    <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e3a8a;">${data.bookingDate}${data.bookingTime ? ` &middot; ${data.bookingTime}` : ""}</p>
  </div>
  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${data.viewUrl}" style="display: inline-block; background: #0fbcb0; color: white; padding: 12px 32px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 14px;">
      View your dashboard
    </a>
  </div>
  <p style="font-size: 12px; color: #999; text-align: center;">Pearlie &mdash; Finding your perfect dental match</p>
  ${data.unsubscribeFooterHtml}
</div>`
}

export function renderAppointmentCancelledEmail(data: AppointmentNotificationPayload): string {
  const safeFirstName = data.patientFirstName ? ` ${data.patientFirstName}` : ""
  return `<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">Appointment Cancelled</h1>
  </div>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 8px;">
    Hi${safeFirstName},
  </p>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
    Your appointment at <strong>${data.clinicName}</strong> has been cancelled.
  </p>
  ${data.reason ? `
  <div style="background: #f5f5f5; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
    <p style="margin: 0 0 4px 0; font-size: 13px; color: #666;">Reason</p>
    <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.5;">${data.reason}</p>
  </div>` : ""}
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
    You can request a new appointment date or explore other clinics.
  </p>
  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${data.viewUrl}" style="display: inline-block; background: #0fbcb0; color: white; padding: 12px 32px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 14px;">
      View your dashboard
    </a>
  </div>
  <p style="font-size: 12px; color: #999; text-align: center;">Pearlie &mdash; Finding your perfect dental match</p>
  ${data.unsubscribeFooterHtml}
</div>`
}

// ---------------------------------------------------------------------------
// 18. Booking Charge Finalised (to clinic — cron: finalise-bookings)
// ---------------------------------------------------------------------------

export interface BookingChargeFinalisedPayload {
  clinicName: string
  charges: { patientName: string; treatment: string; amount: string }[]
  totalAmount: string
  billingUrl: string
  unsubscribeFooterHtml: string
}

export function renderBookingChargeFinalisedEmail(data: BookingChargeFinalisedPayload): string {
  const chargeRows = data.charges.map(c =>
    `<tr>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${c.patientName}</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${c.treatment}</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${c.amount}</td>
    </tr>`
  ).join("")

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
  <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0 0 16px;">Charges Confirmed</h1>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
    Hi ${data.clinicName}, the following booking charges have been finalised after the 7-day dispute window closed:
  </p>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px;">
    <thead>
      <tr style="background: #f8f9fa;">
        <th style="padding: 6px 12px; text-align: left;">Patient</th>
        <th style="padding: 6px 12px; text-align: left;">Treatment</th>
        <th style="padding: 6px 12px; text-align: left;">Amount</th>
      </tr>
    </thead>
    <tbody>${chargeRows}</tbody>
    <tfoot>
      <tr style="font-weight: 700;">
        <td colspan="2" style="padding: 8px 12px;">Total</td>
        <td style="padding: 8px 12px;">${data.totalAmount}</td>
      </tr>
    </tfoot>
  </table>
  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${data.billingUrl}" style="display: inline-block; background: #1a1a1a; color: white; padding: 12px 28px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 14px;">
      View Billing Dashboard
    </a>
  </div>
  <p style="font-size: 12px; color: #999; text-align: center;">
    Pearlie &mdash; Your dental clinic partner
  </p>
  ${data.unsubscribeFooterHtml}
</div>`
}

// ---------------------------------------------------------------------------
// 19. Billing Reminder (to clinic — cron: billing-reminders)
// ---------------------------------------------------------------------------

export interface BillingReminderPayload {
  clinicName: string
  totalAmount: string
  chargeCount: number
  daysUntilBilling: number
  billingUrl: string
  unsubscribeFooterHtml: string
}

export function renderBillingReminderEmail(data: BillingReminderPayload): string {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">Billing Reminder</h1>
  </div>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px;">
    Hi ${data.clinicName},
  </p>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
    Your next billing date is <strong>the 6th of this month</strong> (${data.daysUntilBilling} days away).
  </p>
  <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
    <p style="font-size: 14px; color: #666; margin: 0 0 8px;">This period's charges:</p>
    <p style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0;">
      ${data.totalAmount}
    </p>
    <p style="font-size: 14px; color: #666; margin: 4px 0 0;">
      ${data.chargeCount} confirmed appointment${data.chargeCount !== 1 ? "s" : ""}
    </p>
  </div>
  <p style="font-size: 14px; color: #666; line-height: 1.5; margin-bottom: 24px;">
    If any appointments were not attended, you can dispute them within 7 days of the charge in your billing dashboard.
  </p>
  <div style="text-align: center; margin-bottom: 32px;">
    <a href="${data.billingUrl}" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 36px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 16px;">
      View Billing
    </a>
  </div>
  <p style="font-size: 12px; color: #999; text-align: center; margin-top: 32px;">
    Pearlie &mdash; Your dental clinic partner
  </p>
  ${data.unsubscribeFooterHtml}
</div>`
}

// ---------------------------------------------------------------------------
// 20. Dispute Reminder (to clinic — cron: dispute-reminders)
// ---------------------------------------------------------------------------

export interface DisputeReminderPayload {
  clinicName: string
  charges: { patientName: string; treatment: string; amount: string; daysLeft: string }[]
  totalAmount: string
  reviewUrl: string
  unsubscribeFooterHtml: string
}

export function renderDisputeReminderEmail(data: DisputeReminderPayload): string {
  const chargeRows = data.charges.map(c =>
    `<tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${c.patientName}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${c.treatment}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${c.amount}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #c05621; font-weight: 600;">${c.daysLeft}</td>
    </tr>`
  ).join("")

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
  <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0 0 16px;">Dispute Window Closing Soon</h1>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px;">
    Hi ${data.clinicName},
  </p>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
    You have <strong>${data.charges.length} booking charge${data.charges.length !== 1 ? "s" : ""}</strong> totalling <strong>${data.totalAmount}</strong> with dispute windows closing soon. If any patients did not attend, please report it now.
  </p>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
    <thead>
      <tr style="background: #f8f9fa;">
        <th style="padding: 8px 12px; text-align: left;">Patient</th>
        <th style="padding: 8px 12px; text-align: left;">Treatment</th>
        <th style="padding: 8px 12px; text-align: left;">Amount</th>
        <th style="padding: 8px 12px; text-align: left;">Time Left</th>
      </tr>
    </thead>
    <tbody>${chargeRows}</tbody>
  </table>
  <div style="text-align: center; margin-bottom: 32px;">
    <a href="${data.reviewUrl}" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 36px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 16px;">
      Review Charges
    </a>
  </div>
  <p style="font-size: 14px; color: #666; line-height: 1.5;">
    After the dispute window closes, charges are automatically finalised and cannot be reversed. If a patient didn't attend, mark it as "Not Attended" for a full refund.
  </p>
  <p style="font-size: 12px; color: #999; text-align: center; margin-top: 32px;">
    Pearlie &mdash; Your dental clinic partner
  </p>
  ${data.unsubscribeFooterHtml}
</div>`
}

// ---------------------------------------------------------------------------
// 21. Booking Request Sent (to patient — booking/request confirmation)
// ---------------------------------------------------------------------------

export interface BookingRequestSentPayload {
  firstName: string
  clinicName: string
  formattedDate: string
  timeLabel?: string // no longer sent by patient, kept for backward compat
  dashboardUrl: string
  unsubscribeFooterHtml: string
}

export function renderBookingRequestSentEmail(data: BookingRequestSentPayload): string {
  return `<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">Appointment Request Sent</h1>
  </div>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 8px;">
    Hi ${data.firstName},
  </p>
  <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
    Your appointment request has been sent to <strong>${data.clinicName}</strong>.
  </p>
  <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
    <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Clinic</p>
    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">${data.clinicName}</p>
    <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Requested date</p>
    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">${data.formattedDate}</p>
  </div>
  <div style="background: #FFF8E1; border: 1px solid #FFE082; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
    <p style="margin: 0; font-size: 14px; color: #6D4C00; line-height: 1.5;">
      The clinic will confirm your appointment shortly. They typically respond within 24&ndash;48 hours.
    </p>
  </div>
  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${data.dashboardUrl}" style="display: inline-block; background: #0fbcb0; color: white; padding: 12px 32px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 14px;">
      View your dashboard
    </a>
  </div>
  <p style="font-size: 12px; color: #999; text-align: center;">
    Pearlie &mdash; Finding your perfect dental match
  </p>
  ${data.unsubscribeFooterHtml}
</div>`
}

export function renderClinicReplyToPatientEmail(data: ClinicReplyToPatientPayload): string {
  const safeFirstName = data.patientFirstName ? ` ${data.patientFirstName}` : ""

  return `<div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #0fbcb0; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0;">You've Got a Reply!</h1>
  </div>
  <div style="padding: 30px; background-color: #f9fafb;">
    <p style="color: #374151; font-size: 16px;">
      Hi${safeFirstName}, <strong>${data.clinicName}</strong> has replied to your message:
    </p>
    <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #0fbcb0;">
      <p style="color: #4b5563; margin: 0; white-space: pre-wrap;">${data.messagePreview}</p>
    </div>
    <div style="text-align: center; margin-top: 30px;">
      <a href="${data.viewReplyUrl}"
         style="background-color: #0fbcb0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
        View &amp; Reply
      </a>
    </div>
  </div>
  <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
    <p>This is an automated message from Pearlie</p>
    ${data.unsubscribeFooterHtml}
  </div>
</div>`
}
