"use client"

import { Card } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { safeArray } from "@/lib/analytics/safe"
import {
  PREFERRED_TIME_OPTIONS,
  parseRawAnswers,
} from "@/lib/intake-form-config"

interface Lead {
  id?: string
  raw_answers?: Record<string, any> | null
  [key: string]: unknown
}

interface PreferredTimesCardProps {
  leads?: Lead[]
}

/**
 * Shows when patients prefer their appointments — morning, afternoon, or weekends.
 * Directly actionable for clinics: helps optimize scheduling.
 */
export function PreferredTimesCard({ leads }: PreferredTimesCardProps) {
  const safeLeads = safeArray(leads)

  const timeCounts: Record<string, number> = {}
  let totalResponders = 0

  safeLeads.forEach((lead) => {
    const parsed = parseRawAnswers(lead?.raw_answers)
    if (!parsed) return

    const times = parsed.preferredTimes || []
    if (times.length > 0) {
      totalResponders++
      times.forEach((time: string) => {
        if (time) {
          timeCounts[time] = (timeCounts[time] || 0) + 1
        }
      })
    }
  })

  const timeData = PREFERRED_TIME_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    time: option.time,
    count: timeCounts[option.value] || 0,
    percentage: totalResponders > 0 ? ((timeCounts[option.value] || 0) / totalResponders) * 100 : 0,
  }))

  const colors: Record<string, string> = {
    morning: "bg-amber-500",
    afternoon: "bg-blue-500",
    weekend: "bg-purple-500",
  }

  const icons: Record<string, string> = {
    morning: "🌅",
    afternoon: "☀️",
    weekend: "🗓️",
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="h-5 w-5 text-[#1a2332]" />
        <h3 className="text-lg font-semibold">Preferred Appointment Times</h3>
      </div>

      {totalResponders === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No time preference data yet</p>
          <p className="text-sm mt-1">Shows when patients prefer their appointments</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-xs text-muted-foreground">
            {totalResponders} patients responded (multi-select — percentages may exceed 100%)
          </div>

          <div className="space-y-4">
            {timeData.map((item) => (
              <div key={item.value} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{icons[item.value]}</span>
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">({item.time})</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-muted-foreground">{item.count}</span>
                    <span className="font-semibold w-10 text-right">{item.percentage.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors[item.value] || "bg-primary"} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Actionable insight */}
          {timeData.length > 0 && (
            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-900">
                {(() => {
                  const top = timeData.reduce((a, b) => (a.count > b.count ? a : b))
                  if (top.count === 0) return "Collect more data to see scheduling insights."
                  return (
                    <>
                      <strong>{top.percentage.toFixed(0)}%</strong> of patients prefer{" "}
                      <strong>{top.label.toLowerCase()}</strong> appointments. Clinics with{" "}
                      {top.value === "weekend" ? "weekend" : top.label.toLowerCase()} availability may convert more leads.
                    </>
                  )
                })()}
              </p>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
