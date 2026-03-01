"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PoundSterling } from "lucide-react"
import {
  COST_APPROACH_OPTIONS,
  COST_APPROACH_SHORT_LABELS,
  parseRawAnswers,
} from "@/lib/intake-form-config"
import { safeArray } from "@/lib/analytics/safe"

interface Lead {
  id?: string
  raw_answers?: Record<string, any> | null
  [key: string]: unknown
}

interface FinanceInsightsCardProps {
  leads?: Lead[]
}

const BAR_COLORS = [
  "bg-emerald-500",
  "bg-teal-500",
  "bg-teal-500",
  "bg-violet-500",
  "bg-slate-400",
]

export function FinanceInsightsCard({ leads }: FinanceInsightsCardProps) {
  const safeLeads = safeArray<Lead>(leads)

  // Aggregate cost approach data from raw_answers
  const costApproachCounts: Record<string, number> = {}
  let comfortRangeCount = 0
  let strictBudgetCount = 0
  let budgetDiscussCount = 0
  let budgetShareRangeCount = 0
  let budgetTotal = 0
  const budgetAmounts: number[] = []
  let monthlyYes = 0
  let monthlyNo = 0
  const treatmentCostSensitive: Record<string, number> = {}

  safeLeads.forEach((lead) => {
    const parsed = parseRawAnswers(lead?.raw_answers)
    if (!parsed) return

    if (parsed.costApproach) {
      costApproachCounts[parsed.costApproach] = (costApproachCounts[parsed.costApproach] || 0) + 1
    }

    // comfort_range patients get asked about monthly payments
    if (parsed.costApproach === "comfort_range") {
      comfortRangeCount++
      if (parsed.monthlyPaymentRange === "yes") {
        monthlyYes++
      } else if (parsed.monthlyPaymentRange === "no") {
        monthlyNo++
      }
      // Track which treatments are from cost-conscious patients
      const treatments = parsed.treatments || []
      treatments.forEach((t: string) => {
        if (t) treatmentCostSensitive[t] = (treatmentCostSensitive[t] || 0) + 1
      })
    }

    // strict_budget patients
    if (parsed.costApproach === "strict_budget") {
      strictBudgetCount++
      if (parsed.strictBudgetMode === "discuss_with_clinic") {
        budgetDiscussCount++
      } else if (parsed.strictBudgetMode === "share_range") {
        budgetShareRangeCount++
        const amount = Number(parsed.strictBudgetAmount)
        if (amount > 0) {
          budgetAmounts.push(amount)
          budgetTotal += amount
        }
      }
      // Also track treatments
      const treatments = parsed.treatments || []
      treatments.forEach((t: string) => {
        if (t) treatmentCostSensitive[t] = (treatmentCostSensitive[t] || 0) + 1
      })
    }
  })

  const totalCostSensitive = comfortRangeCount + strictBudgetCount
  const totalParsed = safeLeads.filter((l) => parseRawAnswers(l?.raw_answers)).length
  const costSensitivePct = totalParsed > 0 ? (totalCostSensitive / totalParsed) * 100 : 0

  // Cost approach distribution in form order
  const costApproachData = COST_APPROACH_OPTIONS
    .filter((opt) => costApproachCounts[opt.value])
    .map((opt) => ({
      key: opt.value,
      label: COST_APPROACH_SHORT_LABELS[opt.value] || opt.value,
      count: costApproachCounts[opt.value],
      percentage: totalParsed > 0 ? (costApproachCounts[opt.value] / totalParsed) * 100 : 0,
    }))

  // Top treatments from cost-sensitive patients
  const topCostTreatments = Object.entries(treatmentCostSensitive)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)

  // Average entered budget
  const avgBudget = budgetAmounts.length > 0 ? budgetTotal / budgetAmounts.length : 0

  if (totalParsed === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <PoundSterling className="w-5 h-5" />
            Finance & Budget Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <PoundSterling className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No lead data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Shows how patients want to handle costs when leads arrive
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <PoundSterling className="w-5 h-5" />
          Finance & Budget Insights
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          How patients want to handle treatment costs ({totalParsed} leads analysed)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-5">
        {/* Headline stat */}
        <div className="bg-teal-50 rounded-lg p-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{costSensitivePct.toFixed(0)}%</span>
            <span className="text-sm text-muted-foreground">
              of patients are cost-conscious
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{comfortRangeCount}</strong> have a flexible range
            </span>
            <span>
              <strong className="text-foreground">{strictBudgetCount}</strong> have strict budgets
            </span>
          </div>
        </div>

        {/* Cost approach distribution */}
        {costApproachData.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-3">Cost Approach Distribution</p>
            <div className="space-y-2">
              {costApproachData.map((item, idx) => (
                <div key={item.key} className="space-y-1">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">
                      {item.count} ({item.percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${BAR_COLORS[idx % BAR_COLORS.length]} rounded-full transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly payment interest (from comfort_range patients) */}
        {comfortRangeCount > 0 && (monthlyYes > 0 || monthlyNo > 0) && (
          <div>
            <p className="text-sm font-medium mb-2">Monthly Payment Interest</p>
            <p className="text-xs text-muted-foreground mb-3">
              From {comfortRangeCount} patients with a flexible range
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-green-600">{monthlyYes}</p>
                <p className="text-[11px] text-muted-foreground">Would like monthly payments</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-foreground">{monthlyNo}</p>
                <p className="text-[11px] text-muted-foreground">Not important to them</p>
              </div>
            </div>
          </div>
        )}

        {/* Strict budget breakdown */}
        {strictBudgetCount > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Strict Budget Patients</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-foreground">{budgetDiscussCount}</p>
                <p className="text-[11px] text-muted-foreground">Prefer to discuss with clinic</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-foreground">{budgetShareRangeCount}</p>
                <p className="text-[11px] text-muted-foreground">Shared a budget range</p>
              </div>
            </div>
            {avgBudget > 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Average entered budget: <strong className="text-foreground">£{Math.round(avgBudget).toLocaleString()}</strong>
              </p>
            )}
          </div>
        )}

        {/* Top treatments from cost-sensitive patients */}
        {topCostTreatments.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Cost-Sensitive Treatments</p>
            <div className="space-y-1">
              {topCostTreatments.map(([treatment, count]) => (
                <div key={treatment} className="flex justify-between text-xs py-1">
                  <span className="truncate mr-2 text-muted-foreground">{treatment}</span>
                  <span className="font-medium flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insight callout */}
        {totalCostSensitive > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Insight:</strong>{" "}
              {monthlyYes > 0 && comfortRangeCount > 0
                ? `${((monthlyYes / comfortRangeCount) * 100).toFixed(0)}% of flexible-range patients want monthly payments — clinics offering finance plans will convert more of these leads.`
                : strictBudgetCount > 0
                  ? `${strictBudgetCount} patient${strictBudgetCount !== 1 ? "s" : ""} have strict budgets. Clinics that display clear pricing information convert budget-conscious patients better.`
                  : `${costSensitivePct.toFixed(0)}% of patients are cost-conscious. Transparent pricing helps convert these leads.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
