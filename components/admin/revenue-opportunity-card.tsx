"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getTreatmentValue } from "@/lib/analytics/treatment-values"

interface RevenueOpportunityCardProps {
  bookedTreatmentCounts?: Record<string, number>
  totalPotentialMin?: number
  totalPotentialMax?: number
  bookedLeadsCount?: number
}

export function RevenueOpportunityCard({
  bookedTreatmentCounts = {},
  totalPotentialMin = 0,
  totalPotentialMax = 0,
  bookedLeadsCount = 0,
}: RevenueOpportunityCardProps) {
  // Calculate breakdown by treatment with min/max
  const treatmentBreakdown = Object.entries(bookedTreatmentCounts)
    .map(([treatment, count]) => {
      const value = getTreatmentValue(treatment)
      return {
        treatment,
        count,
        unitMin: value.minPence / 100, // Per-treatment cost in pounds
        unitMax: value.maxPence / 100,
        minValue: (count * value.minPence) / 100, // Total in pounds
        maxValue: (count * value.maxPence) / 100,
      }
    })
    .sort((a, b) => b.maxValue - a.maxValue)

  const hasBookedLeads = bookedLeadsCount > 0

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base md:text-lg">Revenue Breakdown by Treatment</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Based on patients who clicked &quot;Book&quot; only
              </CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Revenue is only counted when a patient clicks &quot;Book clinic&quot; - not just form completion. 
                  Shows min/max range based on typical UK private dental costs.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {!hasBookedLeads ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No booked leads yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Revenue will appear when patients click &quot;Book clinic&quot;
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary totals */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Total Revenue Range</span>
                  <span className="text-xs text-muted-foreground">{bookedLeadsCount} booked lead{bookedLeadsCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl md:text-3xl font-bold text-[#1a2332]">
                    £{Math.round(totalPotentialMin).toLocaleString()}
                  </span>
                  <span className="text-lg text-muted-foreground">—</span>
                  <span className="text-2xl md:text-3xl font-bold text-[#1a2332]">
                    £{Math.round(totalPotentialMax).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Treatment breakdown table */}
              {treatmentBreakdown.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Breakdown by Treatment</p>
                  
                  {/* Table header */}
                  <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                    <span>Treatment</span>
                    <span className="text-center">Leads</span>
                    <span className="text-right">Cost Range</span>
                    <span className="text-right">Min Total</span>
                    <span className="text-right">Max Total</span>
                  </div>

                  {/* Table rows */}
                  {treatmentBreakdown.map(({ treatment, count, unitMin, unitMax, minValue, maxValue }) => (
                    <div
                      key={treatment}
                      className="grid grid-cols-5 gap-2 text-xs md:text-sm py-2 border-b border-border/50 last:border-0"
                    >
                      <span className="font-medium truncate" title={treatment}>{treatment}</span>
                      <span className="text-center text-muted-foreground">{count}</span>
                      <span className="text-right text-muted-foreground">£{Math.round(unitMin).toLocaleString()}-£{Math.round(unitMax).toLocaleString()}</span>
                      <span className="text-right">£{Math.round(minValue).toLocaleString()}</span>
                      <span className="text-right font-semibold">£{Math.round(maxValue).toLocaleString()}</span>
                    </div>
                  ))}

                  {/* Table totals */}
                  <div className="grid grid-cols-5 gap-2 text-xs md:text-sm pt-2 border-t-2 font-semibold">
                    <span>Total</span>
                    <span className="text-center">{bookedLeadsCount}</span>
                    <span></span>
                    <span className="text-right">£{Math.round(totalPotentialMin).toLocaleString()}</span>
                    <span className="text-right">£{Math.round(totalPotentialMax).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
