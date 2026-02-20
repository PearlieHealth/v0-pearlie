"use client"

import { Card } from "@/components/ui/card"
import { Map } from "lucide-react"
import { safeArray, safeString } from "@/lib/analytics/safe"
import { getTreatmentsFromLead } from "@/lib/intake-form-config"
import { useState } from "react"

interface Lead {
  id?: string
  postcode?: string | null
  treatment_interest?: string | null
  booking_status?: string | null
  [key: string]: unknown
}

interface PostcodeDemandCardProps {
  leads?: Lead[]
}

/**
 * Aggregates lead demand by postcode outward code (e.g. "SE5", "W1G").
 * Shows where demand is coming from and highlights underserved areas.
 */
export function PostcodeDemandCard({ leads }: PostcodeDemandCardProps) {
  const [showAll, setShowAll] = useState(false)
  const safeLeads = safeArray<Lead>(leads)

  // Extract outward code from postcode (everything before the space, or first 3-4 chars)
  const extractOutwardCode = (postcode: string): string => {
    const clean = postcode.trim().toUpperCase()
    const parts = clean.split(" ")
    if (parts.length >= 2) return parts[0]
    // No space — take first 3 or 4 chars depending on pattern
    if (clean.length >= 4 && /^[A-Z]{2}\d/.test(clean)) {
      return clean.match(/^[A-Z]+\d+/)?.[0] || clean.slice(0, 3)
    }
    return clean.slice(0, Math.min(clean.length, 4))
  }

  // Aggregate by outward code
  const areaCounts: Record<string, { total: number; booked: number; treatments: Record<string, number> }> = {}

  safeLeads.forEach((lead) => {
    const postcode = safeString(lead?.postcode)
    if (!postcode) return

    const outward = extractOutwardCode(postcode)
    if (!outward) return

    if (!areaCounts[outward]) {
      areaCounts[outward] = { total: 0, booked: 0, treatments: {} }
    }

    areaCounts[outward].total++

    if (lead?.booking_status === "confirmed" || lead?.booking_status === "pending") {
      areaCounts[outward].booked++
    }

    // Count treatments per area
    getTreatmentsFromLead(lead).forEach((treatment) => {
      areaCounts[outward].treatments[treatment] = (areaCounts[outward].treatments[treatment] || 0) + 1
    })
  })

  // Sort by total leads descending
  const sortedAreas = Object.entries(areaCounts)
    .map(([code, data]) => {
      const topTreatment = Object.entries(data.treatments)
        .sort(([, a], [, b]) => b - a)[0]
      return {
        code,
        total: data.total,
        booked: data.booked,
        bookingRate: data.total > 0 ? (data.booked / data.total) * 100 : 0,
        topTreatment: topTreatment ? topTreatment[0] : "—",
      }
    })
    .sort((a, b) => b.total - a.total)

  const displayAreas = showAll ? sortedAreas : sortedAreas.slice(0, 10)
  const totalLeads = safeLeads.filter((l) => safeString(l?.postcode)).length
  const uniqueAreas = sortedAreas.length

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Map className="h-5 w-5 text-[#004443]" />
          <h3 className="text-lg font-semibold">Demand by Area</h3>
        </div>
        <div className="text-xs text-muted-foreground">
          {uniqueAreas} postcode areas
        </div>
      </div>

      {sortedAreas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No postcode data available yet</p>
          <p className="text-sm mt-1">Shows where patient demand is coming from</p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
            <span>Area</span>
            <span className="text-center">Leads</span>
            <span className="text-center">Booked</span>
            <span className="text-center">Rate</span>
            <span className="text-right">Top Treatment</span>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-border/50">
            {displayAreas.map((area, index) => (
              <div key={area.code} className="grid grid-cols-5 gap-2 text-xs md:text-sm py-2.5 items-center">
                <span className="font-mono font-semibold">{area.code}</span>
                <span className="text-center">{area.total}</span>
                <span className="text-center">{area.booked}</span>
                <span className={`text-center font-medium ${
                  area.bookingRate > 0 ? "text-green-600" : "text-muted-foreground"
                }`}>
                  {area.bookingRate > 0 ? `${area.bookingRate.toFixed(0)}%` : "—"}
                </span>
                <span className="text-right truncate text-muted-foreground" title={area.topTreatment}>
                  {area.topTreatment}
                </span>
              </div>
            ))}
          </div>

          {/* Show more / less */}
          {sortedAreas.length > 10 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full mt-3 py-2 text-xs text-primary hover:underline"
            >
              {showAll ? "Show less" : `Show all ${sortedAreas.length} areas`}
            </button>
          )}

          {/* Summary */}
          <div className="mt-4 pt-3 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold">{totalLeads}</div>
                <div className="text-xs text-muted-foreground">Total leads</div>
              </div>
              <div>
                <div className="text-lg font-bold">{uniqueAreas}</div>
                <div className="text-xs text-muted-foreground">Unique areas</div>
              </div>
              <div>
                <div className="text-lg font-bold">
                  {sortedAreas.length > 0 ? sortedAreas[0].code : "—"}
                </div>
                <div className="text-xs text-muted-foreground">Hottest area</div>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
