"use client"

import { Card } from "@/components/ui/card"
import { Users, Eye, MousePointer, TrendingUp, Activity, CheckCircle2, Calendar, ArrowUp, ArrowDown, Minus } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface PrevPeriod {
  totalLeads?: number
  matchesShown?: number
  bookingClicks?: number
  bookingsConfirmed?: number
  revenueMin?: number
}

interface ExecutiveSnapshotProps {
  totalLeads?: number
  matchesShown?: number
  clinicClicks?: number
  bookingClicks?: number
  bookingsConfirmed?: number
  bookingsPending?: number
  bookingsDeclined?: number
  revenueMin?: number
  avgClinicsViewed?: number
  prevPeriod?: PrevPeriod
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null
  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-green-600">
        <ArrowUp className="h-2.5 w-2.5" />new
      </span>
    )
  }

  const pctChange = ((current - previous) / previous) * 100
  const rounded = Math.round(pctChange)

  if (rounded === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
        <Minus className="h-2.5 w-2.5" />0%
      </span>
    )
  }

  const isUp = rounded > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isUp ? "text-green-600" : "text-red-500"}`}>
      {isUp ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
      {isUp ? "+" : ""}{rounded}%
    </span>
  )
}

export function ExecutiveSnapshot({
  totalLeads = 0,
  matchesShown = 0,
  clinicClicks = 0,
  bookingClicks = 0,
  bookingsConfirmed = 0,
  bookingsPending = 0,
  bookingsDeclined = 0,
  revenueMin = 0,
  avgClinicsViewed = 0,
  prevPeriod,
}: ExecutiveSnapshotProps) {
  // Calculate conversion rate: booked / leads
  const conversionRate = totalLeads > 0 ? (bookingClicks / totalLeads) * 100 : 0
  // Calculate confirmation rate: confirmed / booking requests
  const confirmationRate = bookingClicks > 0 ? (bookingsConfirmed / bookingClicks) * 100 : 0

  // Map metric keys to previous period values for delta display
  const prevValues: Record<string, number> | null = prevPeriod ? {
    "Total Leads": prevPeriod.totalLeads ?? 0,
    "Matches Shown": prevPeriod.matchesShown ?? 0,
    "Booking Requests": prevPeriod.bookingClicks ?? 0,
    "Confirmed Bookings": prevPeriod.bookingsConfirmed ?? 0,
    "Revenue Opportunity": prevPeriod.revenueMin ?? 0,
  } : null

  const currentValues: Record<string, number> = {
    "Total Leads": totalLeads,
    "Matches Shown": matchesShown,
    "Booking Requests": bookingClicks,
    "Confirmed Bookings": bookingsConfirmed,
    "Revenue Opportunity": revenueMin,
  }

  const metrics = [
    {
      label: "Total Leads",
      value: (totalLeads ?? 0).toLocaleString(),
      icon: Users,
      color: "text-blue-600",
      tooltip: "Total patients who completed the matching questionnaire",
    },
    {
      label: "Matches Shown",
      value: (matchesShown ?? 0).toLocaleString(),
      icon: Eye,
      color: "text-purple-600",
      tooltip: "Unique patients who were shown clinic matches",
    },
    {
      label: "Booking Requests",
      value: (bookingClicks ?? 0).toLocaleString(),
      subtext: bookingsPending > 0 ? `${bookingsPending} pending` : undefined,
      icon: Calendar,
      color: "text-amber-600",
      tooltip: "Total appointment requests submitted by patients",
    },
    {
      label: "Confirmed Bookings",
      value: (bookingsConfirmed ?? 0).toLocaleString(),
      subtext: confirmationRate > 0 ? `${confirmationRate.toFixed(0)}% confirmed` : undefined,
      icon: CheckCircle2,
      color: "text-green-600",
      tooltip: `Appointments confirmed by clinics${bookingsDeclined > 0 ? ` (${bookingsDeclined} declined)` : ""}`,
    },
    {
      label: "Revenue Opportunity",
      value: `£${Math.round(revenueMin ?? 0).toLocaleString()}`,
      subtext: "(min)",
      icon: TrendingUp,
      color: "text-emerald-600",
      tooltip: "Minimum revenue based on confirmed bookings",
    },
  ]

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#004443]">Executive Snapshot</h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            High-intent patient demand and conversion signals — updated in real time
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <Tooltip key={metric.label}>
                <TooltipTrigger asChild>
                  <Card className="p-3 md:p-5 cursor-help">
                    <div className="flex items-start justify-between mb-1 md:mb-2">
                      <div className="text-xs md:text-sm font-medium text-muted-foreground">{metric.label}</div>
                      <Icon className={`h-3 w-3 md:h-4 md:w-4 ${metric.color}`} />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg md:text-2xl font-bold text-[#004443]">{metric.value}</span>
                      {metric.subtext && (
                        <span className="text-xs text-muted-foreground">{metric.subtext}</span>
                      )}
                    </div>
                    {prevValues && prevValues[metric.label] !== undefined && (
                      <div className="mt-1">
                        <DeltaBadge
                          current={currentValues[metric.label]}
                          previous={prevValues[metric.label]}
                        />
                      </div>
                    )}
                  </Card>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">{metric.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
