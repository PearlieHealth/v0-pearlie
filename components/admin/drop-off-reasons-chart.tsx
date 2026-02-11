"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

type DropOffData = {
  reason: string
  count: number
}

export function DropOffReasonsChart({ leads }: { leads: any[] }) {
  // Analyze cosmetic_concern as conversion blockers
  const blockerCounts: Record<string, number> = {}

  leads.forEach((lead) => {
    if (lead.cosmetic_concern) {
      blockerCounts[lead.cosmetic_concern] = (blockerCounts[lead.cosmetic_concern] || 0) + 1
    }
  })

  const chartData = Object.entries(blockerCounts)
    .map(([reason, count]) => ({
      reason: reason.length > 20 ? reason.substring(0, 20) + "..." : reason,
      fullReason: reason,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Conversion Blockers</CardTitle>
          <CardDescription>Main concerns preventing immediate booking</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No blocker data available yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Conversion Blockers</CardTitle>
        <CardDescription>Main concerns preventing immediate booking</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            count: {
              label: "Patients",
              color: "#1a2332",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="reason" angle={-45} textAnchor="end" height={80} className="text-xs" />
              <YAxis />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
