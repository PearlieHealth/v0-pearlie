/**
 * Email Registry — Single source of truth for all Pearlie emails.
 *
 * Every email type the system can send is defined here with:
 * - Type constant and metadata
 * - Zod payload schema (validates before rendering)
 * - Template render function
 * - Idempotency key generation
 * - Unsubscribe / notification preference config
 */
import { z } from "zod"
import type { EMAIL_FROM } from "@/lib/email-config"

import {
  renderMagicLinkEmail,
  renderPatientLoginOtpEmail,
  renderIntakeOtpEmail,
  renderPasswordResetEmail,
} from "./templates/auth-templates"

import {
  renderClinicInviteEmail,
  renderWaitlistRejectionEmail,
  renderWaitlistConfirmationEmail,
} from "./templates/clinic-templates"

import {
  renderLeadActionEmail,
  renderBookingConfirmationEmail,
  renderChatToClinicEmail,
  renderClinicReplyToPatientEmail,
} from "./templates/notification-templates"

import {
  renderAffiliateConversionEmail,
  renderAffiliatePayoutEmail,
} from "./templates/affiliate-templates"

// ---------------------------------------------------------------------------
// Email type constants
// ---------------------------------------------------------------------------

export const EMAIL_TYPE = {
  PATIENT_MAGIC_LINK: "patient_magic_link",
  PATIENT_LOGIN_OTP: "patient_login_otp",
  INTAKE_OTP: "intake_otp",
  PASSWORD_RESET: "password_reset",
  CLINIC_INVITE: "clinic_invite",
  CLINIC_PROVISION_INVITE: "clinic_provision_invite",
  WAITLIST_APPROVAL: "waitlist_approval",
  WAITLIST_REJECTION: "waitlist_rejection",
  WAITLIST_CONFIRMATION: "waitlist_confirmation",
  LEAD_ACTION_NOTIFICATION: "lead_action_notification",
  BOOKING_CONFIRMATION: "booking_confirmation",
  CHAT_NOTIFICATION_TO_CLINIC: "chat_notification_to_clinic",
  CLINIC_REPLY_TO_PATIENT: "clinic_reply_to_patient",
  AFFILIATE_CONVERSION: "affiliate_conversion",
  AFFILIATE_PAYOUT: "affiliate_payout",
} as const

export type EmailType = (typeof EMAIL_TYPE)[keyof typeof EMAIL_TYPE]

// ---------------------------------------------------------------------------
// Registry entry interface
// ---------------------------------------------------------------------------

export interface EmailRegistryEntry {
  type: EmailType
  fromAddress: keyof typeof EMAIL_FROM
  category: "transactional" | "notification"
  /** If set, checks email_preferences before sending. null = always send (transactional). */
  unsubscribeCategory: string | null
  /** Key in clinics.notification_preferences to check. null = no preference check. */
  notificationPreferenceKey: string | null
  defaultSubject: string | ((data: any) => string)
  payloadSchema: z.ZodSchema
  generateHtml: (data: any) => string
  /** Generates a deterministic idempotency key from the payload. null means no dedup. */
  idempotencyKey: ((data: any) => string) | null
}

// ---------------------------------------------------------------------------
// Helper: time-bucket for hourly dedup windows
// ---------------------------------------------------------------------------

function hourBucket(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`
}

function tenMinBucket(): string {
  const now = new Date()
  const slot = Math.floor(now.getUTCMinutes() / 10)
  return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}-${slot}`
}

// ---------------------------------------------------------------------------
// Zod schemas for each email's payload
// ---------------------------------------------------------------------------

const magicLinkSchema = z.object({
  greeting: z.string(),
  magicLink: z.string().url(),
})

const patientOtpSchema = z.object({
  otp: z.string().length(6),
})

const intakeOtpSchema = z.object({
  otp: z.string().length(6),
})

const passwordResetSchema = z.object({
  resetUrl: z.string().url(),
  expiresAt: z.coerce.date(),
})

const clinicInviteSchema = z.object({
  clinicName: z.string().min(1),
  contactName: z.string().optional(),
  inviteUrl: z.string().url(),
  expiresAt: z.coerce.date(),
})

const waitlistRejectionSchema = z.object({
  ownerName: z.string().min(1),
  clinicName: z.string().min(1),
})

const waitlistConfirmationSchema = z.object({
  ownerName: z.string().min(1),
  clinicName: z.string().min(1),
})

const leadActionSchema = z.object({
  clinicName: z.string(),
  clinicId: z.string(),
  actionType: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  treatment: z.string(),
  postcode: z.string(),
  budget: z.string(),
  timing: z.string(),
  preferredTimes: z.array(z.string()),
  bookingToken: z.string(),
  bookingDate: z.string().nullable().optional(),
  bookingTime: z.string().nullable().optional(),
  submittedAt: z.string(),
  locationPreference: z.string(),
  anxietyLevel: z.string(),
  decisionValues: z.array(z.string()),
  conversionBlocker: z.string(),
  rawAnswers: z.record(z.any()),
})

const bookingConfirmationSchema = z.object({
  clinicName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  treatment: z.string(),
  postcode: z.string(),
  preferredTiming: z.string(),
  preferredTimes: z.array(z.string()),
  createdAt: z.string(),
  rawAnswers: z.record(z.any()),
})

const chatToClinicSchema = z.object({
  patientName: z.string(),
  messagePreview: z.string(),
  inboxUrl: z.string(),
  unsubscribeFooterHtml: z.string(),
})

const clinicReplySchema = z.object({
  patientFirstName: z.string(),
  clinicName: z.string(),
  messagePreview: z.string(),
  viewReplyUrl: z.string(),
  unsubscribeFooterHtml: z.string(),
})

const affiliateConversionSchema = z.object({
  affiliateName: z.string(),
  commissionAmount: z.number(),
  patientFirstName: z.string(),
})

const affiliatePayoutSchema = z.object({
  affiliateName: z.string(),
  amount: z.number(),
  periodStart: z.string(),
  periodEnd: z.string(),
})

// ---------------------------------------------------------------------------
// The Registry
// ---------------------------------------------------------------------------

export const EMAIL_REGISTRY: Record<EmailType, EmailRegistryEntry> = {
  // --- Auth / Transactional ---

  [EMAIL_TYPE.PATIENT_MAGIC_LINK]: {
    type: EMAIL_TYPE.PATIENT_MAGIC_LINK,
    fromAddress: "NOREPLY",
    category: "transactional",
    unsubscribeCategory: null,
    notificationPreferenceKey: null,
    defaultSubject: "Your Pearlie login link",
    payloadSchema: magicLinkSchema,
    generateHtml: renderMagicLinkEmail,
    idempotencyKey: (data) => `magic_link:${data._email}:${hourBucket()}`,
  },

  [EMAIL_TYPE.PATIENT_LOGIN_OTP]: {
    type: EMAIL_TYPE.PATIENT_LOGIN_OTP,
    fromAddress: "NOREPLY",
    category: "transactional",
    unsubscribeCategory: null,
    notificationPreferenceKey: null,
    defaultSubject: "Your Pearlie login code",
    payloadSchema: patientOtpSchema,
    generateHtml: renderPatientLoginOtpEmail,
    idempotencyKey: (data) => `patient_otp:${data._email}:${data.otp}`,
  },

  [EMAIL_TYPE.INTAKE_OTP]: {
    type: EMAIL_TYPE.INTAKE_OTP,
    fromAddress: "NOREPLY",
    category: "transactional",
    unsubscribeCategory: null,
    notificationPreferenceKey: null,
    defaultSubject: "Your Pearlie verification code",
    payloadSchema: intakeOtpSchema,
    generateHtml: renderIntakeOtpEmail,
    idempotencyKey: (data) => `intake_otp:${data._leadId}:${data.otp}`,
  },

  [EMAIL_TYPE.PASSWORD_RESET]: {
    type: EMAIL_TYPE.PASSWORD_RESET,
    fromAddress: "NOREPLY",
    category: "transactional",
    unsubscribeCategory: null,
    notificationPreferenceKey: null,
    defaultSubject: "Reset your Pearlie password",
    payloadSchema: passwordResetSchema,
    generateHtml: renderPasswordResetEmail,
    idempotencyKey: (data) => `reset:${data._email}:${hourBucket()}`,
  },

  // --- Clinic Management ---

  [EMAIL_TYPE.CLINIC_INVITE]: {
    type: EMAIL_TYPE.CLINIC_INVITE,
    fromAddress: "CLINICS",
    category: "transactional",
    unsubscribeCategory: null,
    notificationPreferenceKey: null,
    defaultSubject: (data) => `You're invited to join ${data.clinicName} on Pearlie`,
    payloadSchema: clinicInviteSchema,
    generateHtml: renderClinicInviteEmail,
    idempotencyKey: (data) => `invite:${data._clinicId}:${data._email}`,
  },

  [EMAIL_TYPE.CLINIC_PROVISION_INVITE]: {
    type: EMAIL_TYPE.CLINIC_PROVISION_INVITE,
    fromAddress: "CLINICS",
    category: "transactional",
    unsubscribeCategory: null,
    notificationPreferenceKey: null,
    defaultSubject: (data) => `You're invited to join ${data.clinicName} on Pearlie`,
    payloadSchema: clinicInviteSchema,
    generateHtml: renderClinicInviteEmail,
    idempotencyKey: (data) => `provision:${data._clinicId}:${data._email}`,
  },

  [EMAIL_TYPE.WAITLIST_APPROVAL]: {
    type: EMAIL_TYPE.WAITLIST_APPROVAL,
    fromAddress: "CLINICS",
    category: "transactional",
    unsubscribeCategory: null,
    notificationPreferenceKey: null,
    defaultSubject: (data) => `You're invited to join ${data.clinicName} on Pearlie`,
    payloadSchema: clinicInviteSchema,
    generateHtml: renderClinicInviteEmail,
    idempotencyKey: (data) => `waitlist_approve:${data._waitlistId}`,
  },

  [EMAIL_TYPE.WAITLIST_REJECTION]: {
    type: EMAIL_TYPE.WAITLIST_REJECTION,
    fromAddress: "CLINICS",
    category: "transactional",
    unsubscribeCategory: null,
    notificationPreferenceKey: null,
    defaultSubject: "Your Pearlie application",
    payloadSchema: waitlistRejectionSchema,
    generateHtml: renderWaitlistRejectionEmail,
    idempotencyKey: (data) => `waitlist_reject:${data._waitlistId}`,
  },

  [EMAIL_TYPE.WAITLIST_CONFIRMATION]: {
    type: EMAIL_TYPE.WAITLIST_CONFIRMATION,
    fromAddress: "CLINICS",
    category: "transactional",
    unsubscribeCategory: null,
    notificationPreferenceKey: null,
    defaultSubject: "We received your application",
    payloadSchema: waitlistConfirmationSchema,
    generateHtml: renderWaitlistConfirmationEmail,
    idempotencyKey: (data) => `waitlist_confirm:${data._email}`,
  },

  // --- Notifications ---

  [EMAIL_TYPE.LEAD_ACTION_NOTIFICATION]: {
    type: EMAIL_TYPE.LEAD_ACTION_NOTIFICATION,
    fromAddress: "NOTIFICATIONS",
    category: "notification",
    unsubscribeCategory: null, // Controlled by notification_preferences instead
    notificationPreferenceKey: "new_leads",
    defaultSubject: (data) => {
      const actionLabel = data.actionType === "click_book" ? "Book Consultation" : "Call Clinic"
      return `New ${actionLabel} Request - ${data.firstName} ${data.lastName}`
    },
    payloadSchema: leadActionSchema,
    generateHtml: renderLeadActionEmail,
    idempotencyKey: (data) => `lead_action:${data._leadId}:${data._clinicId}:${data.actionType}`,
  },

  [EMAIL_TYPE.BOOKING_CONFIRMATION]: {
    type: EMAIL_TYPE.BOOKING_CONFIRMATION,
    fromAddress: "NOTIFICATIONS",
    category: "notification",
    unsubscribeCategory: null,
    notificationPreferenceKey: "booking_confirmations",
    defaultSubject: (data) => `Booking Request from ${data.firstName} ${data.lastName}`,
    payloadSchema: bookingConfirmationSchema,
    generateHtml: renderBookingConfirmationEmail,
    idempotencyKey: (data) => `booking:${data._leadId}:${data._clinicId}`,
  },

  [EMAIL_TYPE.CHAT_NOTIFICATION_TO_CLINIC]: {
    type: EMAIL_TYPE.CHAT_NOTIFICATION_TO_CLINIC,
    fromAddress: "NOTIFICATIONS",
    category: "notification",
    unsubscribeCategory: "clinic_notifications",
    notificationPreferenceKey: null,
    defaultSubject: (data) => `New message from ${data.patientName}`,
    payloadSchema: chatToClinicSchema,
    generateHtml: renderChatToClinicEmail,
    idempotencyKey: (data) => `chat_clinic:${data._conversationId}:${tenMinBucket()}`,
  },

  [EMAIL_TYPE.CLINIC_REPLY_TO_PATIENT]: {
    type: EMAIL_TYPE.CLINIC_REPLY_TO_PATIENT,
    fromAddress: "NOTIFICATIONS",
    category: "notification",
    unsubscribeCategory: "patient_notifications",
    notificationPreferenceKey: null,
    defaultSubject: (data) => `${data.clinicName} has replied to your message`,
    payloadSchema: clinicReplySchema,
    generateHtml: renderClinicReplyToPatientEmail,
    idempotencyKey: (data) => `clinic_reply:${data._conversationId}:${tenMinBucket()}`,
  },

  // --- Affiliate ---

  [EMAIL_TYPE.AFFILIATE_CONVERSION]: {
    type: EMAIL_TYPE.AFFILIATE_CONVERSION,
    fromAddress: "NOTIFICATIONS",
    category: "notification",
    unsubscribeCategory: null,
    notificationPreferenceKey: null,
    defaultSubject: (data) => `You earned £${data.commissionAmount.toFixed(2)} from a referral!`,
    payloadSchema: affiliateConversionSchema,
    generateHtml: renderAffiliateConversionEmail,
    idempotencyKey: (data) => `aff_conversion:${data._conversionId}`,
  },

  [EMAIL_TYPE.AFFILIATE_PAYOUT]: {
    type: EMAIL_TYPE.AFFILIATE_PAYOUT,
    fromAddress: "NOTIFICATIONS",
    category: "notification",
    unsubscribeCategory: null,
    notificationPreferenceKey: null,
    defaultSubject: (data) => `Your Pearlie payout of £${data.amount.toFixed(2)} is being processed`,
    payloadSchema: affiliatePayoutSchema,
    generateHtml: renderAffiliatePayoutEmail,
    idempotencyKey: (data) => `aff_payout:${data._payoutId}`,
  },
}

/**
 * Human-readable labels for email types (used in admin dashboard).
 */
export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  [EMAIL_TYPE.PATIENT_MAGIC_LINK]: "Patient Magic Link",
  [EMAIL_TYPE.PATIENT_LOGIN_OTP]: "Patient Login OTP",
  [EMAIL_TYPE.INTAKE_OTP]: "Intake Verification OTP",
  [EMAIL_TYPE.PASSWORD_RESET]: "Password Reset",
  [EMAIL_TYPE.CLINIC_INVITE]: "Clinic Invite",
  [EMAIL_TYPE.CLINIC_PROVISION_INVITE]: "Clinic Provision Invite",
  [EMAIL_TYPE.WAITLIST_APPROVAL]: "Waitlist Approval",
  [EMAIL_TYPE.WAITLIST_REJECTION]: "Waitlist Rejection",
  [EMAIL_TYPE.WAITLIST_CONFIRMATION]: "Waitlist Confirmation",
  [EMAIL_TYPE.LEAD_ACTION_NOTIFICATION]: "New Lead Notification",
  [EMAIL_TYPE.BOOKING_CONFIRMATION]: "Booking Confirmation",
  [EMAIL_TYPE.CHAT_NOTIFICATION_TO_CLINIC]: "Chat → Clinic",
  [EMAIL_TYPE.CLINIC_REPLY_TO_PATIENT]: "Clinic Reply → Patient",
  [EMAIL_TYPE.AFFILIATE_CONVERSION]: "Affiliate Conversion",
  [EMAIL_TYPE.AFFILIATE_PAYOUT]: "Affiliate Payout",
}
