// Google Ads conversion tracking helper
// Fires gtag conversion events with deduplication (once per session)

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

type ConversionEvent = "chat_start" | "booking_request"

function getDedupeKey(event: ConversionEvent): string {
  return `pearlie_gads_${event}`
}

function hasAlreadyFired(event: ConversionEvent): boolean {
  if (typeof window === "undefined") return true
  return sessionStorage.getItem(getDedupeKey(event)) === "1"
}

function markAsFired(event: ConversionEvent): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(getDedupeKey(event), "1")
}

/**
 * Fire a Google Ads conversion event via gtag.
 * Requires NEXT_PUBLIC_GOOGLE_ADS_ID env var and a conversion label
 * set in NEXT_PUBLIC_GADS_LABEL_CHAT / NEXT_PUBLIC_GADS_LABEL_BOOK.
 *
 * Deduplicated per session — only fires once per visit.
 */
export function trackGoogleAdsConversion(event: ConversionEvent): void {
  if (typeof window === "undefined") return
  if (!window.gtag) return
  if (hasAlreadyFired(event)) return

  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
  if (!adsId) return

  const labelMap: Record<ConversionEvent, string | undefined> = {
    chat_start: process.env.NEXT_PUBLIC_GADS_LABEL_CHAT,
    booking_request: process.env.NEXT_PUBLIC_GADS_LABEL_BOOK,
  }

  const label = labelMap[event]
  if (!label) return

  window.gtag("event", "conversion", {
    send_to: `${adsId}/${label}`,
  })
  markAsFired(event)
}
