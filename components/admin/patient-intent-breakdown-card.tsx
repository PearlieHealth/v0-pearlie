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
import { safeArray } from "@/lib/analytics/safe"

interface Lead {
  id?: string
  raw_answers?: Record<string, unknown>
  [key: string]: unknown
}

interface PatientIntentBreakdownCardProps {
  leads?: Lead[]
}

export function PatientIntentBreakdownCard({ leads }: PatientIntentBreakdownCardProps) {
  const safeLeads = safeArray<Lead>(leads)

  // Calculate breakdowns using parseRawAnswers
  const anxietyCounts: Record<string, number> = {}
  const costCounts: Record<string, number> = {}
  const timingCounts: Record<string, number> = {}

  safeLeads.forEach((lead) => {
    const parsed = parseRawAnswers(lead?.raw_answers as Record<string, any> | null | undefined)
    if (!parsed) return

    if (parsed.anxietyLevel) anxietyCounts[parsed.anxietyLevel] = (anxietyCounts[parsed.anxietyLevel] || 0) + 1
    if (parsed.costApproach) costCounts[parsed.costApproach] = (costCounts[parsed.costApproach] || 0) + 1
    if (parsed.timing) timingCounts[parsed.timing] = (timingCounts[parsed.timing] || 0) + 1
  })

  const makeData = (counts: Record<string, number>, labels: Record<string, string>) =>
    Object.entries(counts)
      .map(([key, value]) => ({
        name: labels[key] || key.replace(/_/g, " "),
        value,
        key,
      }))
      .sort((a, b) => b.value - a.value)

  const anxietyData = makeData(anxietyCounts, ANXIETY_LEVEL_SHORT_LABELS)
  const costData = makeData(costCounts, COST_APPROACH_SHORT_LABELS)
  const timingData = makeData(timingCounts, TIMING_SHORT_LABELS)

  const renderBreakdown = (
    data: { name: string; value: number; key: string }[],
    colors: string[],
    emptyMessage: string,
    allOptions?: { value: string; label: string }[],
    shortLabels?: Record<string, string>,
    activeCounts?: Record<string, number>,
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
          <p className="text-xs text-muted-foreground">Total responses: {total}</p>
        </div>
        {/* Reference pills showing all available form options */}
        {allOptions && shortLabels && activeCounts && (
          <div className="pt-2">
            <p className="text-[10px] text-muted-foreground mb-1">Available options in form:</p>
            <div className="flex flex-wrap gap-1">
              {allOptions.map((opt) => (
                <span
                  key={opt.value}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    activeCounts[opt.value]
                      ? "bg-muted text-foreground"
                      : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {shortLabels[opt.value] || opt.value}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const anxietyColors = ["bg-green-500", "bg-yellow-500", "bg-orange-500", "bg-red-500"]
  const costColors = ["bg-blue-500", "bg-indigo-500", "bg-cyan-500", "bg-teal-500"]
  const timingColors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500"]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Patient Intent Breakdown
        </CardTitle>
        <CardDescription>
          Aggregated patient preferences across all leads ({safeLeads.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="anxiety" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="anxiety" className="text-xs">
              <Brain className="w-3 h-3 mr-1" />
              Anxiety
            </TabsTrigger>
            <TabsTrigger value="cost" className="text-xs">
              <Wallet className="w-3 h-3 mr-1" />
              Cost Approach
            </TabsTrigger>
            <TabsTrigger value="timing" className="text-xs">
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
                ANXIETY_LEVEL_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                ANXIETY_LEVEL_SHORT_LABELS,
                anxietyCounts,
              )}
            </div>
          </TabsContent>

          <TabsContent value="cost">
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-4">How do patients want to handle costs?</p>
              {renderBreakdown(
                costData,
                costColors,
                "No cost approach data available",
                COST_APPROACH_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                COST_APPROACH_SHORT_LABELS,
                costCounts,
              )}
            </div>
          </TabsContent>

          <TabsContent value="timing">
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-4">When do patients want treatment?</p>
              {renderBreakdown(
                timingData,
                timingColors,
                "No timing data available",
                TIMING_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                TIMING_SHORT_LABELS,
                timingCounts,
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
