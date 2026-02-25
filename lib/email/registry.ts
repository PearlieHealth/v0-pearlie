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
  renderMatchNudgeEmail,
  renderLeadActionEmail,
  renderBookingConfirmationEmail,
  renderChatToClinicEmail,
  renderClinicReplyToPatientEmail,
  renderAppointmentConfirmedEmail,
  renderAppointmentDeclinedEmail,
  renderAppointmentRescheduledEmail,
  renderAppointmentCancelledEmail,
  renderBookingChargeFinalisedEmail,
  renderBillingReminderEmail,
  renderDisputeReminderEmail,
  renderBookingRequestSentEmail,
} from "./templates/notification-templates"

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
  APPOINTMENT_CONFIRMED: "appointment_confirmed",
  APPOINTMENT_DECLINED: "appointment_declined",
  APPOINTMENT_RESCHEDULED: "appointment_rescheduled",
  APPOINTMENT_CANCELLED: "appointment_cancelled",
  MATCH_NUDGE: "match_nudge",
  BOOKING_CHARGE_FINALISED: "booking_charge_finalised",
  BILLING_REMINDER: "billing_reminder",
  DISPUTE_REMINDER: "dispute_reminder",
  BOOKING_REQUEST_SENT: "booking_request_sent",
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

function dayBucket(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`
}

function monthBucket(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${now.getUTCMonth()}`
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

const matchNudgeSchema = z.object({
  firstName: z.string(),
  clinicCount: z.number(),
  postcode: z.string(),
  matchLink: z.string(),
  unsubscribeFooterHtml: z.string(),
})

const bookingChargeFinalisedSchema = z.object({
  clinicName: z.string(),
  charges: z.array(z.object({
    patientName: z.string(),
    treatment: z.string(),
    amount: z.string(),
  })),
  totalAmount: z.string(),
  billingUrl: z.string(),
  unsubscribeFooterHtml: z.string(),
})

const billingReminderSchema = z.object({
  clinicName: z.string(),
  totalAmount: z.string(),
  chargeCount: z.number(),
  daysUntilBilling: z.number(),
  billingUrl: z.string(),
  unsubscribeFooterHtml: z.string(),
})

const disputeReminderSchema = z.object({
  clinicName: z.string(),
  charges: z.array(z.object({
    patientName: z.string(),
    treatment: z.string(),
    amount: z.string(),
    daysLeft: z.string(),
  })),
  totalAmount: z.string(),
  reviewUrl: z.string(),
  unsubscribeFooterHtml: z.string(),
})

const bookingRequestSentSchema = z.object({
  firstName: z.string(),
  clinicName: z.string(),
  formattedDate: z.string(),
  timeLabel: z.string(),
  dashboardUrl: z.string(),
  unsubscribeFooterHtml: z.string(),
})

const appointmentNotificationSchema = z.object({
  patientFirstName: z.string(),
  clinicName: z.string(),
  bookingDate: z.string(),
  bookingTime: z.string(),
  reason: z.string().nullable().optional(),
  viewUrl: z.string(),
  unsubscribeFooterHtml: z.string(),
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
    idempotencyKey: (data) => `chat_clinic:${data._conversationId}:${hourBucket()}`,
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
    idempotencyKey: (data) => `clinic_reply:${data._conversationId}:${hourBucket()}`,
  },

  // --- Appointment Lifecycle (to patient) ---

  [EMAIL_TYPE.APPOINTMENT_CONFIRMED]: {
    type: EMAIL_TYPE.APPOINTMENT_CONFIRMED,
    fromAddress: "NOTIFICATIONS",
    category: "notification",
    unsubscribeCategory: "patient_notifications",
    notificationPreferenceKey: null,
    defaultSubject: (data) => `Your appointment at ${data.clinicName} is confirmed`,
    payloadSchema: appointmentNotificationSchema,
    generateHtml: renderAppointmentConfirmedEmail,
    idempotencyKey: (data) => `appt_confirmed:${data._conversationId}:${hourBucket()}`,
  },

  [EMAIL_TYPE.APPOINTMENT_DECLINED]: {
    type: EMAIL_TYPE.APPOINTMENT_DECLINED,
    fromAddress: "NOTIFICATIONS",
    category: "notification",
    unsubscribeCategory: "patient_notifications",
    notificationPreferenceKey: null,
    defaultSubject: (data) => `${data.clinicName} couldn't accommodate your request`,
    payloadSchema: appointmentNotificationSchema,
    generateHtml: renderAppointmentDeclinedEmail,
    idempotencyKey: (data) => `appt_declined:${data._conversationId}:${hourBucket()}`,
  },

  [EMAIL_TYPE.APPOINTMENT_RESCHEDULED]: {
    type: EMAIL_TYPE.APPOINTMENT_RESCHEDULED,
    fromAddress: "NOTIFICATIONS",
    category: "notification",
    unsubscribeCategory: "patient_notifications",
    notificationPreferenceKey: null,
    defaultSubject: (data) => `${data.clinicName} has rescheduled your appointment`,
    payloadSchema: appointmentNotificationSchema,
    generateHtml: renderAppointmentRescheduledEmail,
    idempotencyKey: (data) => `appt_rescheduled:${data._conversationId}:${hourBucket()}`,
  },

  [EMAIL_TYPE.APPOINTMENT_CANCELLED]: {
    type: EMAIL_TYPE.APPOINTMENT_CANCELLED,
    fromAddress: "NOTIFICATIONS",
    category: "notification",
    unsubscribeCategory: "patient_notifications",
    notificationPreferenceKey: null,
    defaultSubject: (data) => `Your appointment at ${data.clinicName} has been cancelled`,
    payloadSchema: appointmentNotificationSchema,
    generateHtml: renderAppointmentCancelledEmail,
    idempotencyKey: (data) => `appt_cancelled:${data._conversationId}:${hourBucket()}`,
  },

  // --- Match Nudge (to patient) ---

  [EMAIL_TYPE.MATCH_NUDGE]: {
    type: EMAIL_TYPE.MATCH_NUDGE,
    fromAddress: "NOTIFICATIONS",
    category: "notification",
    unsubscribeCategory: "patient_notifications",
    notificationPreferenceKey: null,
    defaultSubject: "Your clinic matches are waiting",
    payloadSchema: matchNudgeSchema,
    generateHtml: renderMatchNudgeEmail,
    idempotencyKey: (data) => `match_nudge:${data._email}`,
  },

  // --- Clinic Billing Notifications ---

  [EMAIL_TYPE.BOOKING_CHARGE_FINALISED]: {
    type: EMAIL_TYPE.BOOKING_CHARGE_FINALISED,
    fromAddress: "NOTIFICATIONS",
    category: "notification",
    unsubscribeCategory: "clinic_notifications",
    notificationPreferenceKey: null,
    defaultSubject: (data) =>
      `${data.charges.length} booking charge${data.charges.length !== 1 ? "s" : ""} confirmed (${data.totalAmount})`,
    payloadSchema: bookingChargeFinalisedSchema,
    generateHtml: renderBookingChargeFinalisedEmail,
    idempotencyKey: (data) => `charge_finalised:${data._clinicId}:${dayBucket()}`,
  },

  [EMAIL_TYPE.BILLING_REMINDER]: {
    type: EMAIL_TYPE.BILLING_REMINDER,
    fromAddress: "NOTIFICATIONS",
    category: "notification",
    unsubscribeCategory: "clinic_notifications",
    notificationPreferenceKey: null,
    defaultSubject: (data) => `Billing reminder: ${data.totalAmount} due on the 6th`,
    payloadSchema: billingReminderSchema,
    generateHtml: renderBillingReminderEmail,
    idempotencyKey: (data) => `billing_reminder:${data._clinicId}:${monthBucket()}`,
  },

  [EMAIL_TYPE.DISPUTE_REMINDER]: {
    type: EMAIL_TYPE.DISPUTE_REMINDER,
    fromAddress: "NOTIFICATIONS",
    category: "notification",
    unsubscribeCategory: "clinic_notifications",
    notificationPreferenceKey: null,
    defaultSubject: (data) =>
      `Dispute window closing soon for ${data.charges.length} booking charge${data.charges.length !== 1 ? "s" : ""}`,
    payloadSchema: disputeReminderSchema,
    generateHtml: renderDisputeReminderEmail,
    idempotencyKey: (data) => `dispute_reminder:${data._clinicId}:${dayBucket()}`,
  },

  // --- Booking Request Confirmation (to patient) ---

  [EMAIL_TYPE.BOOKING_REQUEST_SENT]: {
    type: EMAIL_TYPE.BOOKING_REQUEST_SENT,
    fromAddress: "NOTIFICATIONS",
    category: "notification",
    unsubscribeCategory: "patient_notifications",
    notificationPreferenceKey: null,
    defaultSubject: (data) => `Appointment request sent to ${data.clinicName}`,
    payloadSchema: bookingRequestSentSchema,
    generateHtml: renderBookingRequestSentEmail,
    idempotencyKey: (data) => `booking_request:${data._leadId}:${data._clinicId}`,
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
  [EMAIL_TYPE.APPOINTMENT_CONFIRMED]: "Appointment Confirmed → Patient",
  [EMAIL_TYPE.APPOINTMENT_DECLINED]: "Appointment Declined → Patient",
  [EMAIL_TYPE.APPOINTMENT_RESCHEDULED]: "Appointment Rescheduled → Patient",
  [EMAIL_TYPE.APPOINTMENT_CANCELLED]: "Appointment Cancelled → Patient",
  [EMAIL_TYPE.MATCH_NUDGE]: "Match Nudge → Patient",
  [EMAIL_TYPE.BOOKING_CHARGE_FINALISED]: "Charges Finalised → Clinic",
  [EMAIL_TYPE.BILLING_REMINDER]: "Billing Reminder → Clinic",
  [EMAIL_TYPE.DISPUTE_REMINDER]: "Dispute Reminder → Clinic",
  [EMAIL_TYPE.BOOKING_REQUEST_SENT]: "Booking Request Sent → Patient",
}
