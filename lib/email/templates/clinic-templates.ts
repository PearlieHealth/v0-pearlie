/**
 * Clinic management email templates: invite, waitlist approval/rejection/confirmation.
 */
import { wrapInBaseLayout } from "./base-layout"
import { escapeHtml } from "@/lib/escape-html"

// ---------------------------------------------------------------------------
// 5 & 6 & 7. Clinic Invite (used by clinic-users, provision-clinic, waitlist approval)
// ---------------------------------------------------------------------------

export interface ClinicInvitePayload {
  clinicName: string
  contactName?: string
  inviteUrl: string
  expiresAt: Date
}

export function renderClinicInviteEmail(data: ClinicInvitePayload): string {
  const expiryDate = data.expiresAt.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return wrapInBaseLayout({
    title: "Welcome to Pearlie",
    subtitle: "Your clinic portal is ready",
    body: `
      <p style="font-size: 18px; color: #111827; margin-bottom: 20px;">Hi${data.contactName ? ` ${escapeHtml(data.contactName)}` : ""},</p>
      <p style="color: #4b5563; font-size: 16px; margin-bottom: 20px;">
        You've been invited to manage <strong>${escapeHtml(data.clinicName)}</strong> on Pearlie.
        Our platform connects you with patients who are actively looking for dental care
        and have already expressed interest in clinics like yours.
      </p>
      <p style="color: #4b5563; font-size: 16px; margin-bottom: 30px;">
        Click the button below to set up your account and start receiving patient leads.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.inviteUrl}" style="display: inline-block; background: #0fbcb0; color: white !important; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Set Up Your Account</a>
      </div>
      <div style="margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px; font-size: 14px; color: #6b7280; word-break: break-all;">
        <strong>Or copy this link:</strong><br>
        ${data.inviteUrl}
      </div>
      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #9ca3af;">
        This invite link expires on <strong>${expiryDate}</strong>.
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    `,
  })
}

// ---------------------------------------------------------------------------
// 8. Waitlist Rejection
// ---------------------------------------------------------------------------

export interface WaitlistRejectionPayload {
  ownerName: string
  clinicName: string
}

export function renderWaitlistRejectionEmail(data: WaitlistRejectionPayload): string {
  return wrapInBaseLayout({
    title: "Thank you for applying",
    subtitle: "Pearlie Clinic Network",
    body: `
      <p style="font-size: 16px; color: #4b5563; margin-bottom: 16px;">Hi ${escapeHtml(data.ownerName)},</p>
      <p style="color: #4b5563; font-size: 16px; margin-bottom: 16px;">
        Thank you for your interest in joining Pearlie with ${escapeHtml(data.clinicName)}.
      </p>
      <p style="color: #4b5563; font-size: 16px; margin-bottom: 16px;">
        Unfortunately, we're unable to include your clinic in this cohort. This may be due to:
      </p>
      <ul style="color: #4b5563; font-size: 16px; margin-bottom: 16px;">
        <li>Geographic coverage priorities for this phase</li>
        <li>Treatment specialization focus</li>
        <li>Capacity constraints in your area</li>
      </ul>
      <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">
        We're continuously expanding and would love to reconsider your application in the future.
        We'll keep your details on file and reach out when we open up more spots.
      </p>
      <p style="margin-top: 24px; color: #666; font-size: 14px;">
        Best regards,<br/>The Pearlie Team
      </p>
    `,
  })
}

// ---------------------------------------------------------------------------
// 9. Waitlist Confirmation (submitted application)
// ---------------------------------------------------------------------------

export interface WaitlistConfirmationPayload {
  ownerName: string
  clinicName: string
}

export function renderWaitlistConfirmationEmail(data: WaitlistConfirmationPayload): string {
  return wrapInBaseLayout({
    title: "Application Received",
    subtitle: "Pearlie Clinic Network",
    body: `
      <p style="font-size: 16px; color: #4b5563; margin-bottom: 16px;">Hi ${escapeHtml(data.ownerName)},</p>
      <p style="color: #4b5563; font-size: 16px; margin-bottom: 16px;">
        Thank you for applying to join Pearlie with <strong>${escapeHtml(data.clinicName)}</strong>.
      </p>
      <p style="color: #4b5563; font-size: 16px; margin-bottom: 16px;">
        We're reviewing applications for our founding clinic cohort and will be in touch soon with next steps.
      </p>
      <p style="color: #4b5563; font-size: 16px; margin-bottom: 8px;">What happens next:</p>
      <ul style="color: #4b5563; font-size: 16px; margin-bottom: 16px;">
        <li>We review your application (typically 2-3 business days)</li>
        <li>If approved, you'll receive setup instructions</li>
        <li>Complete your clinic profile and start receiving matched patients</li>
      </ul>
      <p style="margin-top: 24px; color: #666; font-size: 14px;">
        Questions? Reply to this email and we'll get back to you.
      </p>
      <p style="color: #666; font-size: 14px;">&mdash; The Pearlie Team</p>
    `,
  })
}
