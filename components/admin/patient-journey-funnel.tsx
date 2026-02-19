"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, ArrowDown } from "lucide-react"
import { safeNumber } from "@/lib/analytics/safe"

type FunnelProps = {
  leadsSubmitted?: number
  matchesShown?: number
  clinicClicks?: number
  bookedConsults?: number
  bookingsConfirmed?: number
}

export function PatientJourneyFunnel(props: FunnelProps) {
  const stages = [
    { label: "Leads Submitted", value: safeNumber(props.leadsSubmitted), color: "bg-[#004443]" },
    { label: "Matches Shown", value: safeNumber(props.matchesShown), color: "bg-[#0a5c54]" },
    { label: "Clinic Clicks", value: safeNumber(props.clinicClicks), color: "bg-[#3f5166]" },
    { label: "Booking Requests", value: safeNumber(props.bookedConsults), color: "bg-[#51677d]" },
    { label: "Bookings Confirmed", value: safeNumber(props.bookingsConfirmed), color: "bg-[#637d94]" },
  ]

  const calculateConversion = (current: number, previous: number) => {
    if (previous === 0) return "0%"
    return `${((current / previous) * 100).toFixed(1)}%`
  }

  const leadsSubmitted = safeNumber(props.leadsSubmitted)

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base md:text-lg">Patient Journey Funnel</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Track patient conversion through the matching journey
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        <div className="space-y-2 md:space-y-3">
          {stages.map((stage, index) => {
            const previousValue = index > 0 ? stages[index - 1].value : stage.value
            const conversionRate = calculateConversion(stage.value, previousValue)
            const widthPercentage = leadsSubmitted > 0 ? (stage.value / leadsSubmitted) * 100 : 0

            return (
              <div key={stage.label} className="space-y-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between text-xs md:text-sm gap-0.5 md:gap-2">
                  <span className="font-medium">{stage.label}</span>
                  <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                    <span className="font-semibold">{stage.value}</span>
                    {index > 0 && (
                      <span className="text-[10px] md:text-xs text-muted-foreground">({conversionRate})</span>
                    )}
                  </div>
                </div>
                <div className="relative h-6 md:h-8 bg-muted rounded-md overflow-hidden">
                  <div
                    className={`h-full ${stage.color} transition-all duration-500 flex items-center justify-start px-2 md:px-3`}
                    style={{ width: `${Math.max(widthPercentage, 5)}%` }}
                  >
                    <span className="text-white text-[10px] md:text-xs font-medium">{stage.value}</span>
                  </div>
                </div>
                {index < stages.length - 1 && (
                  <div className="flex justify-center py-0.5 md:py-1">
                    <ArrowDown className="w-3 h-3 md:hidden text-muted-foreground" />
                    <ArrowRight className="hidden md:block w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
