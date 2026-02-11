"use client"

import { Card } from "@/components/ui/card"
import { Heart } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { safeArray, safeString } from "@/lib/analytics/safe"
import { 
  DECISION_VALUE_OPTIONS, 
  DECISION_VALUE_SHORT_LABELS,
  parseRawAnswers 
} from "@/lib/intake-form-config"

interface Lead {
  id?: string
  treatment_interest?: string | null
  decision_values?: string[] | null
  raw_answers?: Record<string, any> | null
  [key: string]: unknown
}

interface DecisionValuesByTreatmentCardProps {
  leads?: Lead[]
}

/**
 * Shows what patients value most, broken down by treatment type.
 * Uses centralized intake-form-config for labels so it auto-updates when form changes.
 */
export function OutcomePrioritiesCard({ leads }: DecisionValuesByTreatmentCardProps) {
  const [selectedTreatment, setSelectedTreatment] = useState<string>("all")

  const safeLeads = safeArray(leads)

  // Get leads with decision values data
  const leadsWithValues = safeLeads.filter((l) => {
    const values = l?.decision_values || parseRawAnswers(l?.raw_answers)?.decisionValues || []
    return values.length > 0
  })

  // Get unique treatments from treatment_interest field
  const treatments = Array.from(
    new Set(
      leadsWithValues
        .flatMap((l) => {
          const interest = safeString(l.treatment_interest)
          // treatment_interest is stored as comma-separated string
          return interest.split(",").map((t) => t.trim()).filter(Boolean)
        })
    )
  ).sort()

  // Filter leads by selected treatment
  const filteredLeads =
    selectedTreatment === "all"
      ? leadsWithValues
      : leadsWithValues.filter((l) => {
          const interest = safeString(l.treatment_interest)
          return interest.toLowerCase().includes(selectedTreatment.toLowerCase())
        })

  // Count decision values
  const valueCounts: Record<string, number> = {}
  filteredLeads.forEach((lead) => {
    const values = lead?.decision_values || parseRawAnswers(lead?.raw_answers)?.decisionValues || []
    values.forEach((value: string) => {
      if (value) {
        valueCounts[value] = (valueCounts[value] || 0) + 1
      }
    })
  })

  // Sort by count and get top values
  const topValues = Object.entries(valueCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([value, count]) => ({
      value,
      shortLabel: DECISION_VALUE_SHORT_LABELS[value] || value,
      count,
      percentage: filteredLeads.length > 0 ? (count / filteredLeads.length) * 100 : 0,
    }))

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">What Patients Value Most</h3>
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
          <p>No decision values data yet</p>
          <p className="text-sm mt-1">
            This shows what matters most to patients based on their questionnaire responses
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{filteredLeads.length}</div>
            <div className="text-sm text-muted-foreground">
              {selectedTreatment === "all" ? "Total responses" : `${selectedTreatment} patients`}
            </div>
          </div>

          <div className="space-y-4">
            {topValues.map((item, index) => (
              <div key={item.value} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">#{index + 1}</span>
                    <span className="font-medium line-clamp-1" title={item.value}>
                      {item.shortLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="text-muted-foreground">{item.count} leads</span>
                    <span className="font-semibold text-primary">{item.percentage.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Show all available options for reference */}
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Available options in form:</p>
            <div className="flex flex-wrap gap-1">
              {DECISION_VALUE_OPTIONS.map((option) => (
                <span
                  key={option}
                  className={`text-xs px-2 py-0.5 rounded ${
                    valueCounts[option] ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {DECISION_VALUE_SHORT_LABELS[option] || option}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
