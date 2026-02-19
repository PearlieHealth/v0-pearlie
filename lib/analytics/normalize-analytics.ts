/**
 * Centralized analytics data normalization
 * Ensures all analytics data has safe default values
 * to prevent runtime crashes from undefined/null values
 */

import { TREATMENT_VALUES as TREATMENT_VALUE_MAP, getTreatmentValue } from "./treatment-values"
import { parseRawAnswers } from "@/lib/intake-form-config"

export interface NormalizedAnalytics {
  // Funnel metrics
  funnel: {
    formStarted: number
    leadsSubmitted: number
    matchesShown: number
    clinicClicks: number
    bookedConsults: number
  }
  
  // Booking confirmation stats
  bookingsConfirmed: number
  bookingsPending: number
  bookingsDeclined: number

  // Event arrays
  events: any[]
  leads: any[]
  matches: any[]
  clinics: any[]
  matchResults: any[]

  // Computed maps
  clinicMap: Map<string, string>

  // Treatment data
  treatmentCounts: Record<string, number> // All leads
  bookedTreatmentCounts: Record<string, number> // Only booked leads
  totalRevenuePotential: number
  totalRevenuePotentialMin: number
  totalRevenuePotentialMax: number
  bookedLeadsCount: number

  // Session metrics
  avgClinicsViewed: number
  pctBookFromFirst: number

  // Match metrics
  avgMatchCount: number

  // Rates (as display strings)
  formCompletionRate: string
  clinicClickRate: string
  bookingRate: string
}

export interface RawAnalyticsInput {
  leads?: any[] | null
  matches?: any[] | null
  events?: any[] | null
  clinics?: any[] | null
  matchResults?: any[] | null
}

/**
 * Safe percentage calculation that returns a display string
 * Never returns NaN, Infinity, or values outside 0-100
 */
function safePercentDisplay(numerator: number, denominator: number): string {
  if (!denominator || denominator === 0) return "—"
  if (!numerator || numerator < 0) return "0%"
  const pct = Math.min(100, Math.max(0, (numerator / denominator) * 100))
  return `${Math.round(pct)}%`
}

/**
 * Safe percentage calculation that returns a number
 * Never returns NaN, Infinity, or values outside 0-100
 */
function safePercentValue(numerator: number, denominator: number): number {
  if (!denominator || denominator === 0) return 0
  if (!numerator || numerator < 0) return 0
  return Math.min(100, Math.max(0, (numerator / denominator) * 100))
}

/**
 * Normalize raw analytics data into a safe, fully-typed shape
 * All fields have guaranteed defaults - no undefined values
 */
export function normalizeAnalyticsData(raw: RawAnalyticsInput): NormalizedAnalytics {
  // Safe arrays with defaults
  const events = Array.isArray(raw.events) ? raw.events : []
  const leads = Array.isArray(raw.leads) ? raw.leads : []
  const matches = Array.isArray(raw.matches) ? raw.matches : []
  const clinics = Array.isArray(raw.clinics) ? raw.clinics : []
  const matchResults = Array.isArray(raw.matchResults) ? raw.matchResults : []

  // Build clinic map
  const clinicMap = new Map<string, string>()
  clinics.forEach((c) => {
    if (c?.id && c?.name) {
      clinicMap.set(c.id, c.name)
    }
  })

  // Dedupe events by dedupe_key when available, otherwise use old logic
  const dedupeKeys = new Set<string>()
  const deduplicatedEvents = events.filter((e) => {
    if (e?.dedupe_key) {
      if (dedupeKeys.has(e.dedupe_key)) return false
      dedupeKeys.add(e.dedupe_key)
      return true
    }
    return true // Keep events without dedupe_key
  })

  // Calculate event-based metrics safely using deduplicated events
  const formStartedEvents = deduplicatedEvents.filter((e) => e?.event_name === "form_started")
  const leadSubmittedEvents = deduplicatedEvents.filter((e) => e?.event_name === "lead_submitted")
  const uniqueLeadsSubmitted = new Set(leadSubmittedEvents.map((e) => e?.lead_id).filter(Boolean)).size

  // Count both matches_shown AND match_page_viewed as "Matches Shown"
  // (match_page_viewed is the same thing - patient seeing their results)
  const matchesShownEvents = deduplicatedEvents.filter(
    (e) => e?.event_name === "matches_shown" || e?.event_name === "match_page_viewed"
  )
  const uniqueMatchesShown = new Set(matchesShownEvents.map((e) => e?.lead_id).filter(Boolean)).size
  
  // Calculate average match count from matches_shown events
  const matchCounts = matchesShownEvents
    .map((e) => e?.match_count)
    .filter((count) => typeof count === "number" && count > 0)
  const avgMatchCount = matchCounts.length > 0
    ? matchCounts.reduce((sum, count) => sum + count, 0) / matchCounts.length
    : 0

  const clinicOpensEvents = deduplicatedEvents.filter((e) => e?.event_name === "clinic_opened")
  const uniqueClinicClicks = new Set(
    clinicOpensEvents.map((e) => e?.lead_id).filter(Boolean),
  ).size

  const bookClicksEvents = deduplicatedEvents.filter((e) => e?.event_name === "book_clicked")
  const uniqueBookClicks = new Set(
    bookClicksEvents.map((e) => e?.lead_id).filter(Boolean),
  ).size

  // Session analysis
  const sessionsWithBook = new Map<string, { clinicsViewed: Set<string>; booked: boolean }>()
  deduplicatedEvents.forEach((event) => {
    if (!event?.session_id) return

    if (!sessionsWithBook.has(event.session_id)) {
      sessionsWithBook.set(event.session_id, { clinicsViewed: new Set(), booked: false })
    }

    const session = sessionsWithBook.get(event.session_id)!

    if (event.event_name === "clinic_opened" && event.clinic_id) {
      session.clinicsViewed.add(event.clinic_id)
    } else if (event.event_name === "book_clicked") {
      session.booked = true
    }
  })

  const bookedSessions = Array.from(sessionsWithBook.values()).filter((s) => s.booked)
  const avgClinicsViewed =
    bookedSessions.length > 0
      ? bookedSessions.reduce((sum, s) => sum + s.clinicsViewed.size, 0) / bookedSessions.length
      : 0

  const bookFromFirst = bookedSessions.filter((s) => s.clinicsViewed.size <= 1).length
  const pctBookFromFirst = safePercentValue(bookFromFirst, bookedSessions.length)

  // Treatment counts and revenue estimation - ONLY from book_clicked events
  const treatmentCounts: Record<string, number> = {}
  const bookedTreatmentCounts: Record<string, number> = {}
  let totalRevenuePotentialMin = 0
  let totalRevenuePotentialMax = 0
  let totalRevenuePotentialMid = 0
  
  // Calculate booking confirmation stats from leads
  let bookingsConfirmed = 0
  let bookingsPending = 0
  let bookingsDeclined = 0
  
  leads.forEach((lead) => {
    if (lead?.booking_status === "confirmed") {
      bookingsConfirmed++
    } else if (lead?.booking_status === "pending") {
      bookingsPending++
    } else if (lead?.booking_status === "declined") {
      bookingsDeclined++
    }
  })
  
  // Revenue from ALL leads (potential)
  leads.forEach((lead) => {
    const parsed = parseRawAnswers(lead?.raw_answers)
    const treatments = parsed?.treatments || []
    treatments.forEach((t: string) => {
      if (t) {
        treatmentCounts[t] = (treatmentCounts[t] || 0) + 1
      }
    })
  })

  // Revenue ONLY from book_clicked events (actual opportunity)
  // Get unique lead IDs that clicked book
  const bookedLeadIds = new Set(
    bookClicksEvents.map((e) => e?.lead_id).filter(Boolean)
  )

  // For each booked lead, calculate revenue based on their treatments
  leads.forEach((lead) => {
    if (!bookedLeadIds.has(lead?.id)) return

    const parsed = parseRawAnswers(lead?.raw_answers)
    const treatments = parsed?.treatments || []
    treatments.forEach((t: string) => {
      if (t) {
        bookedTreatmentCounts[t] = (bookedTreatmentCounts[t] || 0) + 1
        const value = getTreatmentValue(t)
        totalRevenuePotentialMin += value.minPence
        totalRevenuePotentialMax += value.maxPence
        totalRevenuePotentialMid += value.midPence
      }
    })
  })

  return {
    funnel: {
      formStarted: formStartedEvents.length,
      leadsSubmitted: uniqueLeadsSubmitted,
      matchesShown: uniqueMatchesShown,
      clinicClicks: uniqueClinicClicks,
      bookedConsults: uniqueBookClicks,
    },
    bookingsConfirmed,
    bookingsPending,
    bookingsDeclined,
    events: deduplicatedEvents,
    leads,
    matches,
    clinics,
    matchResults,
    clinicMap,
    treatmentCounts, // All leads treatment counts (for potential)
    bookedTreatmentCounts, // Only booked leads treatment counts (for actual revenue)
    totalRevenuePotential: totalRevenuePotentialMid / 100, // Convert pence to pounds
    totalRevenuePotentialMin: totalRevenuePotentialMin / 100,
    totalRevenuePotentialMax: totalRevenuePotentialMax / 100,
    bookedLeadsCount: bookedLeadIds.size,
    avgClinicsViewed,
    pctBookFromFirst,
    avgMatchCount,
    formCompletionRate: safePercentDisplay(uniqueLeadsSubmitted, formStartedEvents.length),
    clinicClickRate: safePercentDisplay(uniqueClinicClicks, uniqueMatchesShown),
    bookingRate: safePercentDisplay(uniqueBookClicks, uniqueClinicClicks),
  }
}
