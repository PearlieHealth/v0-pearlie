// Cookie consent management for UK PECR compliance
export type CookieConsent = {
  essential: boolean
  analytics: boolean
  marketing: boolean
  timestamp: number
}

const CONSENT_COOKIE_NAME = "pearlie_cookie_consent"

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null

  try {
    const stored = localStorage.getItem(CONSENT_COOKIE_NAME)
    if (!stored) return null
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function saveCookieConsent(consent: Omit<CookieConsent, "timestamp">): void {
  const consentWithTimestamp: CookieConsent = {
    ...consent,
    timestamp: Date.now(),
  }
  localStorage.setItem(CONSENT_COOKIE_NAME, JSON.stringify(consentWithTimestamp))

  // Dispatch custom event to notify components
  window.dispatchEvent(new CustomEvent("cookieConsentChanged", { detail: consentWithTimestamp }))
}

export function hasConsentForAnalytics(): boolean {
  const consent = getCookieConsent()
  // Implied consent: default to true if user hasn't explicitly opted out
  return consent?.analytics ?? true
}

export function hasConsentForMarketing(): boolean {
  const consent = getCookieConsent()
  // Implied consent: default to true if user hasn't explicitly opted out
  return consent?.marketing ?? true
}
