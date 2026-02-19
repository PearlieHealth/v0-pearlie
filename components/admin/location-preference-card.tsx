"use client"

import { Card } from "@/components/ui/card"
import { MapPin } from "lucide-react"
import { safeArray } from "@/lib/analytics/safe"
import {
  LOCATION_PREFERENCE_OPTIONS,
  LOCATION_PREFERENCE_LABELS,
  parseRawAnswers,
} from "@/lib/intake-form-config"

interface Lead {
  id?: string
  raw_answers?: Record<string, any> | null
  [key: string]: unknown
}

interface LocationPreferenceCardProps {
  leads?: Lead[]
}

/**
 * Shows how far patients are willing to travel to their clinic.
 * Planning flow only (emergency leads skip this question).
 * Tells clinics about their catchment potential.
 */
export function LocationPreferenceCard({ leads }: LocationPreferenceCardProps) {
  const safeLeads = safeArray<Lead>(leads)

  const locationCounts: Record<string, number> = {}
  let totalResponders = 0

  safeLeads.forEach((lead) => {
    const parsed = parseRawAnswers(lead?.raw_answers)
    if (!parsed) return

    // Only planning leads have location preference
    if (parsed.isEmergency) return

    const pref = parsed.locationPreference
    if (pref) {
      totalResponders++
      locationCounts[pref] = (locationCounts[pref] || 0) + 1
    }
  })

  const locationData = LOCATION_PREFERENCE_OPTIONS.map((option) => ({
    value: option.value,
    label: LOCATION_PREFERENCE_LABELS[option.value] || option.label,
    hint: option.hint,
    count: locationCounts[option.value] || 0,
    percentage: totalResponders > 0 ? ((locationCounts[option.value] || 0) / totalResponders) * 100 : 0,
  }))

  const colors = ["bg-green-500", "bg-teal-500", "bg-teal-500"]

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="h-5 w-5 text-[#004443]" />
        <h3 className="text-lg font-semibold">Travel Willingness</h3>
      </div>

      {totalResponders === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No location preference data yet</p>
          <p className="text-sm mt-1">Shows how far patients will travel (planning flow only)</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-xs text-muted-foreground">
            {totalResponders} planning patients responded
          </div>

          <div className="space-y-4">
            {locationData.map((item, index) => (
              <div key={item.value} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">({item.hint})</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-muted-foreground">{item.count}</span>
                    <span className="font-semibold w-10 text-right">{item.percentage.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors[index] || "bg-primary"} rounded-full transition-all duration-500`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Catchment insight */}
          {(() => {
            const willingToTravel = (locationCounts["travel_a_bit"] || 0) + (locationCounts["travel_further"] || 0)
            const travelPct = totalResponders > 0 ? (willingToTravel / totalResponders) * 100 : 0
            if (travelPct > 0) {
              return (
                <div className="mt-6 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <p className="text-xs text-teal-900">
                    <strong>{travelPct.toFixed(0)}%</strong> of patients are willing to travel beyond their immediate area.
                    Clinics outside dense postcodes can still attract these patients with the right proposition.
                  </p>
                </div>
              )
            }
            return null
          })()}
        </>
      )}
    </Card>
  )
}
