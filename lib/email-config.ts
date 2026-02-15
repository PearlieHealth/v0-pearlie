/**
 * Centralized email configuration.
 * All email from-addresses must use these constants to ensure consistency.
 */
export const EMAIL_FROM = {
  /** Auth/transactional emails (OTP, magic links, provisioning credentials) */
  NOREPLY: "Pearlie <noreply@pearlie.org>",
  /** Automated notification emails (chat, lead alerts, booking confirmations) */
  NOTIFICATIONS: "Pearlie <notifications@pearlie.org>",
  /** Clinic-facing communications (waitlist, invites) */
  CLINICS: "Pearlie <clinics@pearlie.org>",
} as const
