/**
 * Chat bot auto-responder messages.
 * These are inserted as sender_type: "bot" messages to keep the patient
 * engaged while waiting for a clinic reply.
 */

export function getBotGreeting(patientFirstName: string, clinicName: string): string {
  return `Hi${patientFirstName ? ` ${patientFirstName}` : ""}! Thanks for reaching out to ${clinicName}. Your message has been received and the clinic team will get back to you shortly.\n\nWhile you wait, feel free to share any details about your needs — it helps the clinic prepare for your enquiry.`
}

export function getBotSuggestions(clinicName: string): string {
  return `Here are some things you might want to ask ${clinicName}:\n\n• What appointment times are available?\n• Do you offer payment plans or finance options?\n• What should I expect at my first visit?\n• How long does the treatment typically take?`
}

export function getBotClinicReplied(clinicName: string): string {
  return `${clinicName} has replied! You're now chatting directly with the clinic team.`
}

export function getBotFollowUp(clinicName: string): string {
  return `Thanks for the extra detail — ${clinicName} will see all your messages when they come online. No need to wait here; we'll email you as soon as they reply.`
}

export function getBotNoReplyYet(clinicName: string): string {
  return `Just a heads up — ${clinicName} typically responds within a few hours. We'll notify you by email when they reply, so you don't need to stay on this page.`
}
