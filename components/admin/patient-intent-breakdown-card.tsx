"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, Wallet, Clock } from "lucide-react"
import {
  ANXIETY_LEVEL_SHORT_LABELS,
  ANXIETY_LEVEL_OPTIONS,
  COST_APPROACH_SHORT_LABELS,
  COST_APPROACH_OPTIONS,
  TIMING_SHORT_LABELS,
  TIMING_OPTIONS,
  parseRawAnswers,
} from "@/lib/intake-form-config"

interface Lead {
  id: string
  raw_answers?: Record<string, unknown>
  [key: string]: unknown
}

interface PatientIntentBreakdownCardProps {
  leads: Lead[]
}

export function PatientIntentBreakdownCard({ leads }: PatientIntentBreakdownCardProps) {
  // Calculate breakdowns using centralized parseRawAnswers
  const anxietyCounts: Record<string, number> = {}
  const budgetCounts: Record<string, number> = {}
  const urgencyCounts: Record<string, number> = {}

  leads.forEach((lead) => {
    const parsed = parseRawAnswers(lead.raw_answers as Record<string, any> | null | undefined)
    if (!parsed) return

    const anxiety = parsed.anxietyLevel
    const cost = parsed.costApproach
    const timing = parsed.timing

    if (anxiety) anxietyCounts[anxiety] = (anxietyCounts[anxiety] || 0) + 1
    if (cost) budgetCounts[cost] = (budgetCounts[cost] || 0) + 1
    if (timing) urgencyCounts[timing] = (urgencyCounts[timing] || 0) + 1
  })

  const anxietyData = Object.entries(anxietyCounts)
    .map(([key, value]) => ({
      name: ANXIETY_LEVEL_SHORT_LABELS[key] || key.replace(/_/g, " "),
      value,
      key
    }))
    .sort((a, b) => b.value - a.value)

  const budgetData = Object.entries(budgetCounts)
    .map(([key, value]) => ({
      name: COST_APPROACH_SHORT_LABELS[key] || key.replace(/_/g, " "),
      value,
      key
    }))
    .sort((a, b) => b.value - a.value)

  const urgencyData = Object.entries(urgencyCounts)
    .map(([key, value]) => ({
      name: TIMING_SHORT_LABELS[key] || key.replace(/_/g, " "),
      value,
      key
    }))
    .sort((a, b) => b.value - a.value)

  const renderBreakdown = (
    data: { name: string; value: number; key: string }[],
    colors: string[],
    emptyMessage: string,
    allOptions: { value: string; label: string }[],
    shortLabels: Record<string, string>,
    activeCounts: Record<string, number>,
  ) => {
    if (data.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>
    }

    const total = data.reduce((sum, item) => sum + item.value, 0)

    return (
      <div className="space-y-3">
        {data.map((item, idx) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0
          return (
            <div key={item.key} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium">{item.value} ({percent.toFixed(0)}%)</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-500`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )
        })}
        <div className="pt-2 border-t mt-4">
          <p className="text-xs text-muted-foreground mb-2">Total responses: {total}</p>
          <div className="flex flex-wrap gap-1">
            {allOptions.map((option) => (
              <span
                key={option.value}
                className={`text-xs px-2 py-0.5 rounded ${
                  activeCounts[option.value] ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {shortLabels[option.value] || option.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const anxietyColors = ["bg-green-500", "bg-yellow-500", "bg-orange-500", "bg-red-500"]
  const budgetColors = ["bg-blue-500", "bg-indigo-500", "bg-cyan-500", "bg-teal-500"]
  const urgencyColors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500"]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Patient Intent Breakdown
        </CardTitle>
        <CardDescription>
          Aggregated patient preferences across all leads ({leads.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="anxiety" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="anxiety" className="text-xs">
              <Brain className="w-3 h-3 mr-1" />
              Anxiety
            </TabsTrigger>
            <TabsTrigger value="budget" className="text-xs">
              <Wallet className="w-3 h-3 mr-1" />
              Cost Approach
            </TabsTrigger>
            <TabsTrigger value="urgency" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Timing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anxiety">
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-4">How anxious are patients about dental treatment?</p>
              {renderBreakdown(
                anxietyData,
                anxietyColors,
                "No anxiety data available",
                ANXIETY_LEVEL_OPTIONS as unknown as { value: string; label: string }[],
                ANXIETY_LEVEL_SHORT_LABELS,
                anxietyCounts,
              )}
            </div>
          </TabsContent>

          <TabsContent value="budget">
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-4">How do patients want to handle costs?</p>
              {renderBreakdown(
                budgetData,
                budgetColors,
                "No cost approach data available",
                COST_APPROACH_OPTIONS as unknown as { value: string; label: string }[],
                COST_APPROACH_SHORT_LABELS,
                budgetCounts,
              )}
            </div>
          </TabsContent>

          <TabsContent value="urgency">
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-4">When do patients want to start treatment?</p>
              {renderBreakdown(
                urgencyData,
                urgencyColors,
                "No timing data available",
                TIMING_OPTIONS as unknown as { value: string; label: string }[],
                TIMING_SHORT_LABELS,
                urgencyCounts,
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
