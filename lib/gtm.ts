// Google Tag Manager dataLayer helper
// Pushes custom events to GTM's dataLayer with deduplication

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
  }
}

type GTMEvent = "lead_submit" | "chat_start" | "booking_request"

// lead_submit uses localStorage (once per user, ever)
// chat_start and booking_request use sessionStorage (once per visit)
const PERSISTENT_EVENTS: GTMEvent[] = ["lead_submit"]

function getDedupeKey(event: GTMEvent): string {
  return `pearlie_gtm_${event}`
}

function hasAlreadyFired(event: GTMEvent): boolean {
  if (typeof window === "undefined") return true

  const key = getDedupeKey(event)
  if (PERSISTENT_EVENTS.includes(event)) {
    return localStorage.getItem(key) === "1"
  }
  return sessionStorage.getItem(key) === "1"
}

function markAsFired(event: GTMEvent): void {
  if (typeof window === "undefined") return

  const key = getDedupeKey(event)
  if (PERSISTENT_EVENTS.includes(event)) {
    localStorage.setItem(key, "1")
  } else {
    sessionStorage.setItem(key, "1")
  }
}

export function pushToDataLayer(event: GTMEvent): void {
  if (typeof window === "undefined") return
  if (hasAlreadyFired(event)) return

  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event })
  markAsFired(event)
}
