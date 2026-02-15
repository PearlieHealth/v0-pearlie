"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Layers } from "lucide-react"
import { safeArray } from "@/lib/analytics/safe"
import {
  parseRawAnswers,
  COST_APPROACH_SHORT_LABELS,
  COST_APPROACH_OPTIONS,
  ANXIETY_LEVEL_SHORT_LABELS,
  ANXIETY_LEVEL_OPTIONS,
  BLOCKER_SHORT_LABELS,
  BLOCKER_OPTIONS,
} from "@/lib/intake-form-config"

interface CrossSegmentCardProps {
  leads?: any[]
}

type HeatmapCell = { count: number; pctOfRow: number; pctOfTotal: number }

function buildHeatmap(
  data: { row: string; col: string }[],
): { rowKeys: string[]; colKeys: string[]; cells: Record<string, Record<string, HeatmapCell>>; total: number } {
  const rowCounts: Record<string, number> = {}
  const colCounts: Record<string, number> = {}
  const cellCounts: Record<string, Record<string, number>> = {}

  data.forEach(({ row, col }) => {
    rowCounts[row] = (rowCounts[row] || 0) + 1
    colCounts[col] = (colCounts[col] || 0) + 1
    if (!cellCounts[row]) cellCounts[row] = {}
    cellCounts[row][col] = (cellCounts[row][col] || 0) + 1
  })

  const total = data.length
  const rowKeys = Object.keys(rowCounts).sort((a, b) => (rowCounts[b] || 0) - (rowCounts[a] || 0))
  const colKeys = Object.keys(colCounts).sort((a, b) => (colCounts[b] || 0) - (colCounts[a] || 0))

  const cells: Record<string, Record<string, HeatmapCell>> = {}
  rowKeys.forEach((row) => {
    cells[row] = {}
    colKeys.forEach((col) => {
      const count = cellCounts[row]?.[col] || 0
      cells[row][col] = {
        count,
        pctOfRow: rowCounts[row] > 0 ? (count / rowCounts[row]) * 100 : 0,
        pctOfTotal: total > 0 ? (count / total) * 100 : 0,
      }
    })
  })

  return { rowKeys, colKeys, cells, total }
}

function HeatmapTable({
  rowKeys,
  colKeys,
  cells,
  rowLabels,
  colLabels,
  emptyMessage,
}: {
  rowKeys: string[]
  colKeys: string[]
  cells: Record<string, Record<string, HeatmapCell>>
  rowLabels: Record<string, string>
  colLabels: Record<string, string>
  emptyMessage: string
}) {
  if (rowKeys.length === 0 || colKeys.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">{emptyMessage}</p>
  }

  // Find max count for color intensity
  let maxCount = 0
  rowKeys.forEach((r) => colKeys.forEach((c) => {
    maxCount = Math.max(maxCount, cells[r]?.[c]?.count || 0)
  }))

  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left py-1.5 px-2 font-medium text-muted-foreground sticky left-0 bg-white min-w-[100px]" />
            {colKeys.map((col) => (
              <th key={col} className="text-center py-1.5 px-1.5 font-medium text-muted-foreground min-w-[60px]">
                {colLabels[col] || col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowKeys.map((row) => (
            <tr key={row}>
              <td className="py-1.5 px-2 font-medium text-muted-foreground sticky left-0 bg-white truncate max-w-[140px]" title={rowLabels[row] || row}>
                {rowLabels[row] || row}
              </td>
              {colKeys.map((col) => {
                const cell = cells[row]?.[col]
                const count = cell?.count || 0
                const intensity = maxCount > 0 ? count / maxCount : 0
                return (
                  <td key={col} className="py-1.5 px-1.5 text-center">
                    {count > 0 ? (
                      <div
                        className="rounded px-1.5 py-1 font-medium"
                        style={{
                          backgroundColor: `rgba(26, 35, 50, ${0.06 + intensity * 0.35})`,
                          color: intensity > 0.5 ? "white" : "#1a2332",
                        }}
                      >
                        {count}
                        <span className="block text-[9px] font-normal opacity-80">
                          {cell.pctOfRow.toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CrossSegmentCard({ leads }: CrossSegmentCardProps) {
  const safeLeads = safeArray(leads)

  // Parse all leads once
  const parsed = safeLeads
    .map((lead) => ({
      id: lead?.id,
      bookingStatus: lead?.booking_status || null,
      ...parseRawAnswers(lead?.raw_answers),
    }))
    .filter((p) => p.treatments) // Only include leads with parsed data

  // === Tab 1: Cost × Treatment ===
  const costTreatmentPairs: { row: string; col: string }[] = []
  parsed.forEach((p) => {
    if (!p.costApproach) return
    const treatments = p.treatments || []
    treatments.forEach((t: string) => {
      if (t) costTreatmentPairs.push({ row: t, col: p.costApproach! })
    })
  })
  const costTreatmentHeatmap = buildHeatmap(costTreatmentPairs)

  // === Tab 2: Anxiety × Booking ===
  const anxietyBookingData: { level: string; booked: boolean }[] = []
  parsed.forEach((p) => {
    if (!p.anxietyLevel) return
    anxietyBookingData.push({
      level: p.anxietyLevel,
      booked: p.bookingStatus === "confirmed" || p.bookingStatus === "requested" || p.bookingStatus === "pending",
    })
  })

  const anxietyConversion: { level: string; label: string; total: number; booked: number; rate: number }[] = []
  const anxietyLevels = ANXIETY_LEVEL_OPTIONS.map((o) => o.value)
  anxietyLevels.forEach((level) => {
    const matching = anxietyBookingData.filter((d) => d.level === level)
    const total = matching.length
    const booked = matching.filter((d) => d.booked).length
    if (total > 0) {
      anxietyConversion.push({
        level,
        label: ANXIETY_LEVEL_SHORT_LABELS[level] || level,
        total,
        booked,
        rate: (booked / total) * 100,
      })
    }
  })

  // === Tab 3: Blocker × Treatment ===
  const blockerTreatmentPairs: { row: string; col: string }[] = []
  parsed.forEach((p) => {
    const blockers = p.blockerCodes || []
    const treatments = p.treatments || []
    blockers.forEach((blocker: string) => {
      treatments.forEach((t: string) => {
        if (t && blocker) blockerTreatmentPairs.push({ row: t, col: blocker })
      })
    })
  })
  const blockerTreatmentHeatmap = buildHeatmap(blockerTreatmentPairs)

  const hasData = parsed.length > 0

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Layers className="w-5 h-5" />
            Cross-Segment Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No data available yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cross-references patient preferences to reveal hidden patterns
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Find most interesting insight
  const topInsight = (() => {
    // Find treatment with highest single cost approach concentration
    let bestRow = ""
    let bestCol = ""
    let bestPct = 0
    costTreatmentHeatmap.rowKeys.forEach((row) => {
      costTreatmentHeatmap.colKeys.forEach((col) => {
        const pct = costTreatmentHeatmap.cells[row]?.[col]?.pctOfRow || 0
        if (pct > bestPct && (costTreatmentHeatmap.cells[row]?.[col]?.count || 0) >= 2) {
          bestPct = pct
          bestRow = row
          bestCol = col
        }
      })
    })
    if (bestPct > 40 && bestRow && bestCol) {
      return `${bestPct.toFixed(0)}% of ${bestRow} patients prefer "${COST_APPROACH_SHORT_LABELS[bestCol] || bestCol}" — tailor clinic recommendations for this segment.`
    }
    return `${parsed.length} leads analysed across ${costTreatmentHeatmap.rowKeys.length} treatments and ${costTreatmentHeatmap.colKeys.length} cost approaches.`
  })()

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <Layers className="w-5 h-5" />
          Cross-Segment Intelligence
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Cross-reference patient decisions to find hidden patterns ({parsed.length} leads)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        <Tabs defaultValue="cost-treatment" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="cost-treatment" className="text-[11px] md:text-xs">
              Cost × Treatment
            </TabsTrigger>
            <TabsTrigger value="anxiety-booking" className="text-[11px] md:text-xs">
              Anxiety × Booking
            </TabsTrigger>
            <TabsTrigger value="blocker-treatment" className="text-[11px] md:text-xs">
              Blocker × Treatment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cost-treatment">
            <p className="text-xs text-muted-foreground mb-3">
              How each treatment&apos;s patients prefer to handle costs (% is row percentage)
            </p>
            <HeatmapTable
              rowKeys={costTreatmentHeatmap.rowKeys}
              colKeys={costTreatmentHeatmap.colKeys}
              cells={costTreatmentHeatmap.cells}
              rowLabels={{}}
              colLabels={COST_APPROACH_SHORT_LABELS}
              emptyMessage="No cost approach data available"
            />
          </TabsContent>

          <TabsContent value="anxiety-booking">
            <p className="text-xs text-muted-foreground mb-3">
              How anxiety level affects booking conversion
            </p>
            {anxietyConversion.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No anxiety data available</p>
            ) : (
              <div className="space-y-3">
                {anxietyConversion.map((item) => (
                  <div key={item.level} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">
                        {item.booked}/{item.total} booked ({item.rate.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1a2332] rounded-full transition-all duration-500"
                        style={{ width: `${item.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Total patients with anxiety data: {anxietyBookingData.length}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="blocker-treatment">
            <p className="text-xs text-muted-foreground mb-3">
              What concerns patients most by treatment type (% is row percentage)
            </p>
            <HeatmapTable
              rowKeys={blockerTreatmentHeatmap.rowKeys}
              colKeys={blockerTreatmentHeatmap.colKeys}
              cells={blockerTreatmentHeatmap.cells}
              rowLabels={{}}
              colLabels={BLOCKER_SHORT_LABELS}
              emptyMessage="No blocker data available"
            />
          </TabsContent>
        </Tabs>

        {/* Insight callout */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mt-4">
          <p className="text-xs text-indigo-800">
            <strong>Insight:</strong> {topInsight}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
