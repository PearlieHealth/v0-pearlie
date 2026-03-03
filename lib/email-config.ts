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
  /** Patient enquiry emails — dynamic name applied at send time via patientFromAddress() */
  PATIENT_ENQUIRY: "enquiries@pearlie.org",
} as const

/**
 * Build a from-address that displays the patient's name.
 * e.g. "Hannan Saleem <enquiries@pearlie.org>"
 */
export function patientFromAddress(firstName: string, lastName: string): string {
  const name = `${firstName} ${lastName}`.trim()
  // Sanitise: strip characters that could break email headers
  const safe = name.replace(/[<>"]/g, "").trim()
  return safe ? `${safe} <enquiries@pearlie.org>` : EMAIL_FROM.PATIENT_ENQUIRY
}
