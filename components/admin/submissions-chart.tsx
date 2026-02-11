"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { useMemo } from "react"

type Lead = {
  id: string
  created_at: string
  [key: string]: any
}

export function SubmissionsChart({ leads }: { leads: Lead[] }) {
  // Process data for daily submissions
  const dailyData = useMemo(() => {
    const groupedByDate = leads.reduce(
      (acc, lead) => {
        const date = new Date(lead.created_at).toLocaleDateString("en-GB")
        if (!acc[date]) {
          acc[date] = 0
        }
        acc[date]++
        return acc
      },
      {} as Record<string, number>,
    )

    // Get last 14 days
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (13 - i))
      return date.toLocaleDateString("en-GB")
    })

    return last14Days.map((date) => ({
      date,
      submissions: groupedByDate[date] || 0,
    }))
  }, [leads])

  // Process data for treatment types
  const treatmentData = useMemo(() => {
    const treatmentCounts: Record<string, number> = {}
    leads.forEach((lead) => {
      if (lead.treatment_interest) {
        const treatments = lead.treatment_interest.split(",").map((t: string) => t.trim())
        treatments.forEach((treatment: string) => {
          if (!treatmentCounts[treatment]) {
            treatmentCounts[treatment] = 0
          }
          treatmentCounts[treatment]++
        })
      }
    })

    return Object.entries(treatmentCounts)
      .map(([treatment, count]) => ({ treatment, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [leads])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Form Submissions (Last 14 Days)</CardTitle>
          <CardDescription>Daily patient intake form submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              submissions: {
                label: "Submissions",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const [day, month] = value.split("/")
                    return `${day}/${month}`
                  }}
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  stroke="var(--color-submissions)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Treatment Interests</CardTitle>
          <CardDescription>Most requested dental treatments</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              count: {
                label: "Count",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[300px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={treatmentData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="treatment"
                  tickFormatter={(value) => {
                    return value.length > 15 ? value.substring(0, 15) + "..." : value
                  }}
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  )
}
