"use client"

import { Card } from "@/components/ui/card"
import { ShieldAlert } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { safeArray, safeString } from "@/lib/analytics/safe"
import {
  BLOCKER_OPTIONS,
  BLOCKER_SHORT_LABELS,
  parseRawAnswers,
} from "@/lib/intake-form-config"

interface Lead {
  id?: string
  treatment_interest?: string | null
  raw_answers?: Record<string, any> | null
  [key: string]: unknown
}

interface BlockerAnalysisCardProps {
  leads?: Lead[]
}

/**
 * Shows what's stopping patients from booking, broken down by treatment type.
 * Uses centralized intake-form-config for labels so it auto-updates when form changes.
 * Only applies to planning flow leads (emergency leads skip the blocker question).
 */
export function BlockerAnalysisCard({ leads }: BlockerAnalysisCardProps) {
  const [selectedTreatment, setSelectedTreatment] = useState<string>("all")

  const safeLeads = safeArray<Lead>(leads)

  // Get leads with blocker data (planning flow only)
  const leadsWithBlockers = safeLeads.filter((l) => {
    const parsed = parseRawAnswers(l?.raw_answers)
    const codes = parsed?.blockerCodes || []
    return codes.length > 0
  })

  // Get unique treatments
  const treatments = Array.from(
    new Set(
      leadsWithBlockers
        .flatMap((l) => {
          const interest = safeString(l.treatment_interest)
          return interest.split(",").map((t) => t.trim()).filter(Boolean)
        })
    )
  ).sort()

  // Filter by selected treatment
  const filteredLeads =
    selectedTreatment === "all"
      ? leadsWithBlockers
      : leadsWithBlockers.filter((l) => {
          const interest = safeString(l.treatment_interest)
          return interest.toLowerCase().includes(selectedTreatment.toLowerCase())
        })

  // Count blocker codes
  const blockerCounts: Record<string, number> = {}
  filteredLeads.forEach((lead) => {
    const parsed = parseRawAnswers(lead?.raw_answers)
    const codes = parsed?.blockerCodes || []
    codes.forEach((code: string) => {
      if (code) {
        blockerCounts[code] = (blockerCounts[code] || 0) + 1
      }
    })
  })

  // Sort by count
  const topBlockers = Object.entries(blockerCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([code, count]) => ({
      code,
      shortLabel: BLOCKER_SHORT_LABELS[code] || code,
      count,
      percentage: filteredLeads.length > 0 ? (count / filteredLeads.length) * 100 : 0,
    }))

  // Severity coloring
  const getSeverityColor = (code: string) => {
    if (code === "NOT_WORTH_COST") return "bg-red-500"
    if (code === "WORRIED_COMPLEX") return "bg-orange-500"
    if (code === "UNSURE_OPTION") return "bg-amber-500"
    if (code === "NEED_MORE_TIME") return "bg-blue-500"
    if (code === "BAD_EXPERIENCE") return "bg-purple-500"
    return "bg-green-500"
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-semibold">What&apos;s Blocking Patients</h3>
        </div>
        <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select treatment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Treatments</SelectItem>
            {treatments.map((treatment) => (
              <SelectItem key={treatment} value={treatment}>
                {treatment}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredLeads.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No blocker data yet</p>
          <p className="text-sm mt-1">
            This shows what concerns patients express before booking (planning flow only)
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{filteredLeads.length}</div>
            <div className="text-sm text-muted-foreground">
              {selectedTreatment === "all" ? "Patients with concerns" : `${selectedTreatment} patients`}
            </div>
          </div>

          <div className="space-y-4">
            {topBlockers.map((item, index) => (
              <div key={item.code} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">#{index + 1}</span>
                    <span className="font-medium">{item.shortLabel}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="text-muted-foreground">{item.count} leads</span>
                    <span className="font-semibold text-primary">{item.percentage.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getSeverityColor(item.code)}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Show all available options for reference */}
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Available options in form:</p>
            <div className="flex flex-wrap gap-1">
              {BLOCKER_OPTIONS.map((option) => (
                <span
                  key={option.code}
                  className={`text-xs px-2 py-0.5 rounded ${
                    blockerCounts[option.code] ? "bg-red-100 text-red-800" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {BLOCKER_SHORT_LABELS[option.code] || option.label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
