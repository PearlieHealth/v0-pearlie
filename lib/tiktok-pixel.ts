import { hasConsentForMarketing } from "@/lib/cookie-consent"

declare global {
  interface Window {
    ttq: {
      load: (pixelId: string) => void
      page: () => void
      track: (event: string, params?: Record<string, unknown>) => void
      identify: (params: { email?: string; phone_number?: string; external_id?: string }) => void
    }
  }
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase())
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

function normaliseUKPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("0")) {
    return "+44" + digits.slice(1)
  }
  return phone.trim()
}

export async function identifyForTikTok({
  email,
  phone,
  externalId,
}: {
  email?: string | null
  phone?: string | null
  externalId?: string | null
}): Promise<void> {
  if (typeof window === "undefined") return
  if (!hasConsentForMarketing() || !window.ttq) return

  const identity: { email?: string; phone_number?: string; external_id?: string } = {}

  if (email) {
    identity.email = await sha256(email)
  }
  if (phone) {
    identity.phone_number = await sha256(normaliseUKPhone(phone))
  }
  if (externalId) {
    identity.external_id = await sha256(externalId)
  }

  if (Object.keys(identity).length > 0) {
    window.ttq.identify(identity)
  }
}

export function trackTikTokEvent(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return
  if (!hasConsentForMarketing() || !window.ttq) return
  window.ttq.track(event, params)
}
