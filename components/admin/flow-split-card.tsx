"use client"

import { Card } from "@/components/ui/card"
import { GitBranch, Zap, Calendar } from "lucide-react"
import { safeArray } from "@/lib/analytics/safe"
import {
  URGENCY_LABELS,
  TIMING_SHORT_LABELS,
  parseRawAnswers,
} from "@/lib/intake-form-config"

interface Lead {
  id?: string
  treatment_interest?: string | null
  raw_answers?: Record<string, any> | null
  [key: string]: unknown
}

interface FlowSplitCardProps {
  leads?: Lead[]
}

/**
 * Shows the split between emergency and planning flow leads,
 * with top insights for each flow type.
 */
export function FlowSplitCard({ leads }: FlowSplitCardProps) {
  const safeLeads = safeArray<Lead>(leads)

  let emergencyCount = 0
  let planningCount = 0
  const emergencyTreatments: Record<string, number> = {}
  const planningTreatments: Record<string, number> = {}
  const urgencyCounts: Record<string, number> = {}
  const timingCounts: Record<string, number> = {}

  safeLeads.forEach((lead) => {
    const parsed = parseRawAnswers(lead?.raw_answers)
    if (!parsed) return

    const treatments = parsed.treatments || []

    if (parsed.isEmergency) {
      emergencyCount++
      treatments.forEach((t: string) => {
        if (t) emergencyTreatments[t] = (emergencyTreatments[t] || 0) + 1
      })
      if (parsed.urgency) {
        urgencyCounts[parsed.urgency] = (urgencyCounts[parsed.urgency] || 0) + 1
      }
    } else {
      planningCount++
      treatments.forEach((t: string) => {
        if (t) planningTreatments[t] = (planningTreatments[t] || 0) + 1
      })
      if (parsed.timing) {
        timingCounts[parsed.timing] = (timingCounts[parsed.timing] || 0) + 1
      }
    }
  })

  const total = emergencyCount + planningCount
  const emergencyPct = total > 0 ? (emergencyCount / total) * 100 : 0
  const planningPct = total > 0 ? (planningCount / total) * 100 : 0

  // Top urgency for emergency
  const topUrgency = Object.entries(urgencyCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([key, count]) => ({ label: URGENCY_LABELS[key] || key, count }))

  // Top timing for planning
  const topTiming = Object.entries(timingCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([key, count]) => ({ label: TIMING_SHORT_LABELS[key] || key, count }))

  // Top treatments per flow
  const topEmergencyTreatments = Object.entries(emergencyTreatments)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  const topPlanningTreatments = Object.entries(planningTreatments)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  if (total === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Emergency vs Planning</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">No lead data available yet</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <GitBranch className="h-5 w-5 text-foreground" />
        <h3 className="text-lg font-semibold">Emergency vs Planning</h3>
      </div>

      {/* Split bar */}
      <div className="mb-6">
        <div className="flex h-8 rounded-lg overflow-hidden">
          {planningPct > 0 && (
            <div
              className="bg-[#0d1019] flex items-center justify-center text-white text-xs font-medium transition-all"
              style={{ width: `${planningPct}%` }}
            >
              {planningPct >= 15 && `${planningPct.toFixed(0)}%`}
            </div>
          )}
          {emergencyPct > 0 && (
            <div
              className="bg-red-500 flex items-center justify-center text-white text-xs font-medium transition-all"
              style={{ width: `${emergencyPct}%` }}
            >
              {emergencyPct >= 15 && `${emergencyPct.toFixed(0)}%`}
            </div>
          )}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Planning ({planningCount})
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" /> Emergency ({emergencyCount})
          </span>
        </div>
      </div>

      {/* Side-by-side insights */}
      <div className="grid grid-cols-2 gap-4">
        {/* Planning column */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Planning
          </h4>

          {topPlanningTreatments.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Top treatments</p>
              {topPlanningTreatments.map(([treatment, count]) => (
                <div key={treatment} className="flex justify-between text-xs py-0.5">
                  <span className="truncate mr-2">{treatment}</span>
                  <span className="text-muted-foreground flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}

          {topTiming.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">When they want to start</p>
              {topTiming.map((item) => (
                <div key={item.label} className="flex justify-between text-xs py-0.5">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency column */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-1 text-red-700">
            <Zap className="h-3.5 w-3.5" /> Emergency
          </h4>

          {topEmergencyTreatments.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Top treatments</p>
              {topEmergencyTreatments.map(([treatment, count]) => (
                <div key={treatment} className="flex justify-between text-xs py-0.5">
                  <span className="truncate mr-2">{treatment}</span>
                  <span className="text-muted-foreground flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}

          {topUrgency.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">How urgently</p>
              {topUrgency.map((item) => (
                <div key={item.label} className="flex justify-between text-xs py-0.5">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
