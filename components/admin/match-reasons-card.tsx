"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare } from "lucide-react"
import { safeArray } from "@/lib/analytics/safe"

interface MatchReasonsCardProps {
  matchResults?: Array<{
    reasons?: string[] | null
    [key: string]: unknown
  }>
  clinicMap?: Map<string, string>
}

export function MatchReasonsCard({ matchResults, clinicMap }: MatchReasonsCardProps) {
  const safeMatchResults = safeArray(matchResults)

  // Explode all reasons and count occurrences
  const reasonCounts = new Map<string, number>()

  safeMatchResults.forEach((result) => {
    const reasons = safeArray(result?.reasons)
    reasons.forEach((reason) => {
      if (typeof reason === "string" && reason.trim()) {
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1)
      }
    })
  })

  // Sort by count desc and take top 5
  const topReasons = Array.from(reasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  if (topReasons.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Top Match Reasons</h3>
        </div>
        <p className="text-sm text-muted-foreground">No match reasons available yet</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-[#1a2332]" />
        <h3 className="text-lg font-semibold">Top Match Reasons</h3>
      </div>
      <div className="space-y-3">
        {topReasons.map(([reason, count], index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{reason}</span>
            <Badge variant="secondary">{count}</Badge>
          </div>
        ))}
      </div>
    </Card>
  )
}
