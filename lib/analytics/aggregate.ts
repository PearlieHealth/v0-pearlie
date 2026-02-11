import { createAdminClient } from "@/lib/supabase/admin"

export type AnalyticsMetrics = {
  // Core funnel metrics
  leadsSubmitted: number
  matchesShownLeads: number
  clinicClickers: number
  clinicClicksTotal: number
  bookedConsults: number
  treatmentAccepted: number

  // Conversion rates
  conversionRatePct: number
  matchesToClicksPct: number

  // Revenue data
  totalRevenue: number
  treatmentBreakdown: Record<string, { count: number; value: number }>

  // Form analytics
  formStarted: number
  formConversionPct: number
  dropOffByStep: Record<string, number>

  // Blockers
  blockers: Array<{ reason: string; count: number; percentage: number }>

  // Booking behavior
  avgClinicsViewed: number
  pctBookFromFirst: number

  // Raw data for tables
  leads: any[]
  clinicClicks: any[]
  events: any[]
}

const TREATMENT_VALUES: Record<string, number> = {
  "Dental Implants": 2500,
  Invisalign: 3500,
  "Composite Bonding": 800,
  Veneers: 6000,
  "Teeth Whitening": 400,
  "Dental Hygiene": 80,
  "General Dentistry": 150,
}

export async function aggregateAnalytics(dateFrom?: Date, dateTo?: Date): Promise<AnalyticsMetrics> {
  const supabase = createAdminClient()

  const dateFilter = dateFrom && dateTo ? { gte: dateFrom.toISOString(), lte: dateTo.toISOString() } : undefined

  // Fetch all data with consistent date filtering
  const [leadsRes, eventsRes, clinicsRes, matchResultsRes] = await Promise.all([
    dateFilter
      ? supabase.from("leads").select("*").gte("created_at", dateFilter.gte).lte("created_at", dateFilter.lte)
      : supabase.from("leads").select("*"),
    dateFilter
      ? supabase
          .from("analytics_events")
          .select("*")
          .gte("created_at", dateFilter.gte)
          .lte("created_at", dateFilter.lte)
      : supabase.from("analytics_events").select("*"),
    supabase.from("clinics").select("id, name"),
    supabase.from("match_results").select("*"),
  ])

  const leads = leadsRes.data || []
  const events = eventsRes.data || []
  const clinics = clinicsRes.data || []
  const matchResults = matchResultsRes.data || []

  const clinicMap = new Map(clinics.map((c) => [c.id, c.name]))

  const leadSubmittedEvents = events.filter((e) => e.event_name === "lead_submitted" && e.lead_id)
  const leadsSubmitted = new Set(leadSubmittedEvents.map((e) => e.lead_id)).size

  const matchesShownEvents = events.filter((e) => e.event_name === "matches_shown" && e.lead_id)
  const matchesShownLeads = new Set(matchesShownEvents.map((e) => e.lead_id)).size

  // Clinic clickers = distinct leads who clicked ANY clinic (book OR call OR open)
  const clinicInteractionEvents = events.filter(
    (e) =>
      (e.event_name === "clinic_opened" || e.event_name === "book_clicked" || e.event_name === "call_clicked") &&
      e.lead_id &&
      e.clinic_id,
  )
  const clinicClickers = new Set(clinicInteractionEvents.map((e) => e.lead_id)).size
  const clinicClicksTotal = clinicInteractionEvents.length

  const bookEvents = events.filter((e) => e.event_name === "book_clicked" && e.lead_id)
  const bookedConsults = new Set(bookEvents.map((e) => e.lead_id)).size

  const treatmentAccepted = 0 // Placeholder for future

  let conversionRatePct = 0
  if (leadsSubmitted > 0) {
    conversionRatePct = Math.min(100, Math.max(0, (clinicClickers / leadsSubmitted) * 100))
  }

  let matchesToClicksPct = 0
  if (matchesShownLeads > 0) {
    matchesToClicksPct = Math.min(100, Math.max(0, (clinicClickers / matchesShownLeads) * 100))
  }

  // Revenue calculation
  const treatmentBreakdown: Record<string, { count: number; value: number }> = {}
  let totalRevenue = 0

  leads.forEach((lead) => {
    const treatment = lead.treatment_interest
    if (treatment && TREATMENT_VALUES[treatment]) {
      const value = TREATMENT_VALUES[treatment]
      totalRevenue += value

      if (!treatmentBreakdown[treatment]) {
        treatmentBreakdown[treatment] = { count: 0, value: 0 }
      }
      treatmentBreakdown[treatment].count++
      treatmentBreakdown[treatment].value += value
    }
  })

  // Form analytics
  const formStartedEvents = events.filter((e) => e.event_name === "form_started")
  const formStarted = new Set(formStartedEvents.map((e) => e.session_id)).size

  const formConversionPct = formStarted > 0 ? (leadsSubmitted / formStarted) * 100 : 0

  // Drop-off by step
  const stepEvents = events.filter((e) => e.event_name === "form_step_viewed")
  const dropOffByStep: Record<string, number> = {}

  stepEvents.forEach((event) => {
    const step = event.metadata?.step || "unknown"
    dropOffByStep[step] = (dropOffByStep[step] || 0) + 1
  })

  // Blockers
  const blockerCounts: Record<string, number> = {}
  leads.forEach((lead) => {
    if (lead.conversion_blocker) {
      blockerCounts[lead.conversion_blocker] = (blockerCounts[lead.conversion_blocker] || 0) + 1
    }
  })

  const totalBlockers = Object.values(blockerCounts).reduce((sum, count) => sum + count, 0)
  const blockers = Object.entries(blockerCounts)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: totalBlockers > 0 ? (count / totalBlockers) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // Booking behavior
  const sessionsWithBook = new Map<string, { clinicsViewed: Set<string>; booked: boolean }>()

  events.forEach((event) => {
    if (!event.session_id) return

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
  const pctBookFromFirst = bookedSessions.length > 0 ? (bookFromFirst / bookedSessions.length) * 100 : 0

  // Clinic clicks for table
  const clinicClicks = clinicInteractionEvents
    .filter((event) => event.clinic_id)
    .map((event) => {
      const lead = leads.find((l) => l.id === event.lead_id)
      return {
        id: event.id,
        patientName: lead?.contact_value || "Unknown",
        clinicName: clinicMap.get(event.clinic_id) || "Unknown Clinic",
        clinicId: event.clinic_id,
        eventType: event.event_name,
        createdAt: event.created_at,
      }
    })

  return {
    leadsSubmitted,
    matchesShownLeads,
    clinicClickers,
    clinicClicksTotal,
    bookedConsults,
    treatmentAccepted,
    conversionRatePct,
    matchesToClicksPct,
    totalRevenue,
    treatmentBreakdown,
    formStarted,
    formConversionPct,
    dropOffByStep,
    blockers,
    avgClinicsViewed,
    pctBookFromFirst,
    leads,
    clinicClicks,
    events,
  }
}
