// Get or create session ID
export function getSessionId(): string {
  if (typeof window === "undefined") return ""

  let sessionId = sessionStorage.getItem("pearlie_session_id")
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem("pearlie_session_id", sessionId)
  }
  return sessionId
}

// Get lead ID from localStorage (persists across sessions)
export function getLeadId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("pearlie_lead_id")
}

// Set lead ID in localStorage
export function setLeadId(leadId: string) {
  if (typeof window === "undefined") return
  localStorage.setItem("pearlie_lead_id", leadId)
}

// Get match ID from current context
export function getMatchId(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem("pearlie_match_id")
}

// Set match ID in session
export function setMatchId(matchId: string) {
  if (typeof window === "undefined") return
  sessionStorage.setItem("pearlie_match_id", matchId)
}

type ValidEventName =
  | "form_started"
  | "form_step_viewed"
  | "form_step_completed"
  | "lead_submitted"
  | "matches_shown"
  | "match_page_viewed"
  | "clinic_card_viewed"
  | "clinic_opened"
  | "book_clicked"
  | "call_clicked"
  | "load_more_clicked"
  | "outcome_step_viewed"
  | "outcome_step_completed"
  | "email_verified"
  | "otp_sent"
  | "otp_resent"
  | "postcode_outside_london"

type TrackEventOptions = {
  leadId?: string | null
  clinicId?: string | null
  matchId?: string | null
  matchCount?: number | null
  meta?: Record<string, unknown>
}

export async function trackEvent(
  eventName: ValidEventName,
  options: TrackEventOptions = {},
) {
  // Only run on client-side - server-side tracking should use direct DB calls
  if (typeof window === "undefined") return

  const sessionId = getSessionId()
  const leadId = options.leadId || getLeadId()
  const matchId = options.matchId || getMatchId()

  const payload = {
    session_id: sessionId,
    event_name: eventName,
    lead_id: leadId,
    clinic_id: options.clinicId || null,
    match_id: matchId,
    match_count: options.matchCount || null,
    page: window.location.pathname + window.location.search,
    meta: options.meta || {},
  }

  try {
    // Use absolute URL constructed from window.location for client-side fetch
    const baseUrl = window.location.origin
    
    // Use navigator.sendBeacon for more reliable tracking that survives page navigation
    // Fall back to fetch if sendBeacon is not available
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
      const sent = navigator.sendBeacon(`${baseUrl}/api/track`, blob)
      if (!sent) {
        // Beacon failed, try fetch as fallback (non-blocking)
        fetch(`${baseUrl}/api/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {
          // Silent fail - analytics should not affect the app
        })
      }
    } else {
      // Fallback to regular fetch with keepalive for older browsers
      fetch(`${baseUrl}/api/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Silent fail
      })
    }
  } catch {
    // Silent fail - analytics errors should not affect the app
  }
}

// Legacy helper functions kept for backward compatibility
export function setMatchContext(matchId: string, clinicIds: string[]) {
  setMatchId(matchId)
}

export function addOpenedClinic(matchId: string, clinicId: string) {
  // No-op: tracking is now handled via trackEvent
}
