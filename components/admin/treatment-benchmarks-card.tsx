"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, ArrowUp, ArrowDown } from "lucide-react"
import { safeArray } from "@/lib/analytics/safe"
import { parseRawAnswers } from "@/lib/intake-form-config"
import { getTreatmentValue } from "@/lib/analytics/treatment-values"

interface TreatmentBenchmarksCardProps {
  leads?: any[]
  events?: any[]
}

interface TreatmentRow {
  treatment: string
  leads: number
  matchesShown: number
  clinicClicks: number
  bookRequests: number
  confirmed: number
  conversionPct: number
  avgValueMin: number
  avgValueMax: number
}

export function TreatmentBenchmarksCard({ leads, events }: TreatmentBenchmarksCardProps) {
  const safeLeads = safeArray<any>(leads)
  const safeEvents = safeArray<any>(events)

  // Build a map of lead_id → treatments from raw_answers
  const leadTreatments = new Map<string, string[]>()
  safeLeads.forEach((lead) => {
    if (!lead?.id) return
    const parsed = parseRawAnswers(lead?.raw_answers)
    if (parsed?.treatments?.length) {
      leadTreatments.set(lead.id, parsed.treatments)
    }
  })

  // Build lead_id → booking_status map
  const leadBookingStatus = new Map<string, string>()
  safeLeads.forEach((lead) => {
    if (lead?.id && lead?.booking_status) {
      leadBookingStatus.set(lead.id, lead.booking_status)
    }
  })

  // For each treatment, count funnel metrics
  const treatmentData: Record<string, {
    leads: Set<string>
    matchesShown: Set<string>
    clinicClicks: Set<string>
    bookRequests: Set<string>
    confirmed: Set<string>
  }> = {}

  function ensureTreatment(t: string) {
    if (!treatmentData[t]) {
      treatmentData[t] = {
        leads: new Set(),
        matchesShown: new Set(),
        clinicClicks: new Set(),
        bookRequests: new Set(),
        confirmed: new Set(),
      }
    }
  }

  // Count leads per treatment
  leadTreatments.forEach((treatments, leadId) => {
    treatments.forEach((t: string) => {
      ensureTreatment(t)
      treatmentData[t].leads.add(leadId)
    })
  })

  // Count events per treatment (join via lead_id)
  safeEvents.forEach((event) => {
    const leadId = event?.lead_id
    if (!leadId) return
    const treatments = leadTreatments.get(leadId)
    if (!treatments) return

    treatments.forEach((t: string) => {
      ensureTreatment(t)
      if (event.event_name === "matches_shown" || event.event_name === "match_page_viewed") {
        treatmentData[t].matchesShown.add(leadId)
      } else if (event.event_name === "clinic_opened") {
        treatmentData[t].clinicClicks.add(leadId)
      } else if (event.event_name === "book_clicked") {
        treatmentData[t].bookRequests.add(leadId)
      }
    })
  })

  // Count confirmed from leads table
  leadTreatments.forEach((treatments, leadId) => {
    if (leadBookingStatus.get(leadId) === "confirmed") {
      treatments.forEach((t: string) => {
        ensureTreatment(t)
        treatmentData[t].confirmed.add(leadId)
      })
    }
  })

  // Build rows
  const rows: TreatmentRow[] = Object.entries(treatmentData)
    .map(([treatment, data]) => {
      const leadCount = data.leads.size
      const bookCount = data.bookRequests.size
      const value = getTreatmentValue(treatment)
      return {
        treatment,
        leads: leadCount,
        matchesShown: data.matchesShown.size,
        clinicClicks: data.clinicClicks.size,
        bookRequests: bookCount,
        confirmed: data.confirmed.size,
        conversionPct: leadCount > 0 ? (bookCount / leadCount) * 100 : 0,
        avgValueMin: value.minPence / 100,
        avgValueMax: value.maxPence / 100,
      }
    })
    .filter((r) => r.leads > 0)
    .sort((a, b) => b.leads - a.leads)

  const avgConversion = rows.length > 0
    ? rows.reduce((sum, r) => sum + r.conversionPct, 0) / rows.length
    : 0

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <BarChart3 className="w-5 h-5" />
            Treatment Conversion Benchmarks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No treatment data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Shows per-treatment conversion funnel when leads arrive
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <BarChart3 className="w-5 h-5" />
          Treatment Conversion Benchmarks
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Per-treatment conversion funnel — which treatments convert best?
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2 pr-3 font-medium">Treatment</th>
                <th className="text-center py-2 px-2 font-medium">Leads</th>
                <th className="text-center py-2 px-2 font-medium">Shown</th>
                <th className="text-center py-2 px-2 font-medium">Clicks</th>
                <th className="text-center py-2 px-2 font-medium">Booked</th>
                <th className="text-center py-2 px-2 font-medium">Confirmed</th>
                <th className="text-right py-2 px-2 font-medium">Conv %</th>
                <th className="text-right py-2 pl-2 font-medium">Value Range</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isAboveAvg = row.conversionPct > avgConversion
                return (
                  <tr key={row.treatment} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-3 font-medium truncate max-w-[200px]" title={row.treatment}>
                      {row.treatment}
                    </td>
                    <td className="py-2.5 px-2 text-center">{row.leads}</td>
                    <td className="py-2.5 px-2 text-center text-muted-foreground">{row.matchesShown}</td>
                    <td className="py-2.5 px-2 text-center text-muted-foreground">{row.clinicClicks}</td>
                    <td className="py-2.5 px-2 text-center">{row.bookRequests}</td>
                    <td className="py-2.5 px-2 text-center">
                      {row.confirmed > 0 ? (
                        <span className="text-green-600 font-medium">{row.confirmed}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <span className={`inline-flex items-center gap-0.5 font-medium ${
                        row.conversionPct === 0
                          ? "text-muted-foreground"
                          : isAboveAvg
                            ? "text-green-600"
                            : "text-amber-600"
                      }`}>
                        {row.conversionPct > 0 && (
                          isAboveAvg
                            ? <ArrowUp className="h-3 w-3" />
                            : <ArrowDown className="h-3 w-3" />
                        )}
                        {row.conversionPct.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-2.5 pl-2 text-right text-xs text-muted-foreground">
                      £{Math.round(row.avgValueMin).toLocaleString()}-£{Math.round(row.avgValueMax).toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {rows.map((row) => {
            const isAboveAvg = row.conversionPct > avgConversion
            return (
              <div key={row.treatment} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-sm truncate mr-2">{row.treatment}</span>
                  <span className={`text-sm font-medium ${
                    row.conversionPct === 0
                      ? "text-muted-foreground"
                      : isAboveAvg
                        ? "text-green-600"
                        : "text-amber-600"
                  }`}>
                    {row.conversionPct.toFixed(0)}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Leads</p>
                    <p className="text-sm font-medium">{row.leads}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clicks</p>
                    <p className="text-sm font-medium">{row.clinicClicks}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Booked</p>
                    <p className="text-sm font-medium">{row.bookRequests}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conf.</p>
                    <p className="text-sm font-medium">{row.confirmed || "—"}</p>
                  </div>
                </div>
                {/* Mini funnel bar */}
                <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                  {row.leads > 0 && (
                    <>
                      <div className="bg-[#004443] transition-all" style={{ width: "100%" }} />
                      <div className="bg-[#1a6361] transition-all" style={{ width: `${(row.matchesShown / row.leads) * 100}%` }} />
                      <div className="bg-[#3c8481] transition-all" style={{ width: `${(row.clinicClicks / row.leads) * 100}%` }} />
                      <div className="bg-[#5ea5a2] transition-all" style={{ width: `${(row.bookRequests / row.leads) * 100}%` }} />
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Platform average callout */}
        <div className="mt-4 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            Platform average conversion: <strong className="text-[#004443]">{avgConversion.toFixed(0)}%</strong>
            {" · "}Treatments above average are highlighted in green
          </p>
        </div>

        {/* Insight callout */}
        {rows.length >= 2 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
            <p className="text-xs text-green-800">
              <strong>Insight:</strong>{" "}
              {(() => {
                const sorted = [...rows].sort((a, b) => b.conversionPct - a.conversionPct)
                const best = sorted[0]
                return best.conversionPct > 0
                  ? `${best.treatment} converts at ${best.conversionPct.toFixed(0)}% — your highest converting treatment with ${best.leads} leads.`
                  : `Your top treatment by volume is ${rows[0].treatment} with ${rows[0].leads} leads. Bookings will reveal conversion rates.`
              })()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
