import { createAdminClient } from "@/lib/supabase/admin"
import { aggregateAnalytics } from "./aggregate"

export type DiagnosticCheck = {
  id: string
  name: string
  status: "pass" | "fail" | "warning"
  message: string
  details?: any
  sql?: string
  sampleRows?: any[]
}

export async function runDiagnostics(): Promise<DiagnosticCheck[]> {
  const checks: DiagnosticCheck[] = []
  const supabase = createAdminClient()

  // Get aggregated metrics
  const metrics = await aggregateAnalytics()

  // Check A: conversionRatePct within [0,100]
  checks.push({
    id: "conversion_rate_range",
    name: "Conversion Rate Range",
    status: metrics.conversionRatePct >= 0 && metrics.conversionRatePct <= 100 ? "pass" : "fail",
    message:
      metrics.conversionRatePct >= 0 && metrics.conversionRatePct <= 100
        ? `Conversion rate is ${metrics.conversionRatePct.toFixed(1)}% (within valid range 0-100%)`
        : `Conversion rate is ${metrics.conversionRatePct.toFixed(1)}% (INVALID: must be between 0-100%)`,
    details: {
      conversionRate: metrics.conversionRatePct,
      clinicClickers: metrics.clinicClickers,
      leadsSubmitted: metrics.leadsSubmitted,
    },
  })

  // Check B: clinicClickers <= leadsSubmitted
  checks.push({
    id: "clickers_vs_leads",
    name: "Clickers vs Leads Submitted",
    status: metrics.clinicClickers <= metrics.leadsSubmitted ? "pass" : "fail",
    message:
      metrics.clinicClickers <= metrics.leadsSubmitted
        ? `Clinic clickers (${metrics.clinicClickers}) ≤ leads submitted (${metrics.leadsSubmitted})`
        : `FAIL: Clinic clickers (${metrics.clinicClickers}) > leads submitted (${metrics.leadsSubmitted})`,
    details: {
      clinicClickers: metrics.clinicClickers,
      leadsSubmitted: metrics.leadsSubmitted,
    },
    sql: `SELECT COUNT(DISTINCT lead_id) FROM analytics_events WHERE event_name IN ('clinic_opened', 'book_clicked', 'call_clicked') AND lead_id IS NOT NULL`,
  })

  // Check C: matchesShownLeads <= leadsSubmitted
  checks.push({
    id: "matches_vs_leads",
    name: "Matches Shown vs Leads Submitted",
    status: metrics.matchesShownLeads <= metrics.leadsSubmitted ? "pass" : "fail",
    message:
      metrics.matchesShownLeads <= metrics.leadsSubmitted
        ? `Matches shown (${metrics.matchesShownLeads}) ≤ leads submitted (${metrics.leadsSubmitted})`
        : `FAIL: Matches shown (${metrics.matchesShownLeads}) > leads submitted (${metrics.leadsSubmitted})`,
    details: {
      matchesShownLeads: metrics.matchesShownLeads,
      leadsSubmitted: metrics.leadsSubmitted,
    },
  })

  // Check D: events missing lead_id
  const eventsWithoutLeadId = metrics.events.filter(
    (e) =>
      !e.lead_id &&
      ["lead_submitted", "matches_shown", "clinic_opened", "book_clicked", "call_clicked"].includes(e.event_name),
  )

  checks.push({
    id: "missing_lead_ids",
    name: "Events Missing lead_id",
    status: eventsWithoutLeadId.length === 0 ? "pass" : "warning",
    message:
      eventsWithoutLeadId.length === 0
        ? "All critical events have lead_id"
        : `${eventsWithoutLeadId.length} events are missing lead_id`,
    details: {
      count: eventsWithoutLeadId.length,
      eventTypes: [...new Set(eventsWithoutLeadId.map((e) => e.event_name))],
    },
    sampleRows: eventsWithoutLeadId.slice(0, 5),
  })

  // Check E: duplicate clicks per lead
  const clicksByLead = new Map<string, number>()
  metrics.events
    .filter((e) => (e.event_name === "clinic_opened" || e.event_name === "book_clicked") && e.lead_id)
    .forEach((e) => {
      const count = clicksByLead.get(e.lead_id!) || 0
      clicksByLead.set(e.lead_id!, count + 1)
    })

  const leadsWithManyClicks = Array.from(clicksByLead.entries())
    .filter(([_, count]) => count > 10)
    .sort((a, b) => b[1] - a[1])

  checks.push({
    id: "excessive_clicks",
    name: "Leads with Excessive Clicks",
    status: leadsWithManyClicks.length === 0 ? "pass" : "warning",
    message:
      leadsWithManyClicks.length === 0
        ? "No leads with excessive clicks (>10)"
        : `${leadsWithManyClicks.length} leads have >10 clicks`,
    details: {
      count: leadsWithManyClicks.length,
      topOffenders: leadsWithManyClicks.slice(0, 5),
    },
  })

  // Check F: events before lead_created timestamp
  const { data: outOfOrderEvents } = await supabase.rpc("check_out_of_order_events" as any).limit(10)

  // If RPC doesn't exist, do manual check
  let outOfOrderCount = 0
  if (!outOfOrderEvents) {
    metrics.events.forEach((event) => {
      if (event.lead_id && event.event_name !== "lead_submitted") {
        const lead = metrics.leads.find((l) => l.id === event.lead_id)
        if (lead && new Date(event.created_at) < new Date(lead.created_at)) {
          outOfOrderCount++
        }
      }
    })
  } else {
    outOfOrderCount = outOfOrderEvents.length
  }

  checks.push({
    id: "timestamp_ordering",
    name: "Event Timestamp Ordering",
    status: outOfOrderCount === 0 ? "pass" : "warning",
    message:
      outOfOrderCount === 0
        ? "All events have timestamps after lead creation"
        : `${outOfOrderCount} events have timestamps before lead creation`,
    details: {
      count: outOfOrderCount,
    },
  })

  return checks
}
