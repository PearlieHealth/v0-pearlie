// This file exists for backwards compatibility
// Patient notification emails have been removed

export async function sendPatientNotificationEmail(_params: {
  patientEmail: string
  patientName: string
  clinicName: string
  clinicPhone: string | null
  clinicAddress: string | null
  bookingDate: string | null
  bookingTime: string | null
  action: "confirm" | "decline"
}): Promise<void> {
  // No-op: Patient notification emails are disabled
  return
}
