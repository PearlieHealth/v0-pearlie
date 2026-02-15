"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PoundSterling, Info } from "lucide-react"
import {
  MONTHLY_PAYMENT_OPTIONS,
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

const PAYMENT_LABELS: Record<string, string> = Object.fromEntries(
  MONTHLY_PAYMENT_OPTIONS.map((o) => [o.value, o.label])
)

const PAYMENT_ORDER = MONTHLY_PAYMENT_OPTIONS.map((o) => o.value)

const BAR_COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-slate-400",
]

export function FinanceInsightsCard({ leads }: FinanceInsightsCardProps) {
  const safeLeads = safeArray(leads)

  // Aggregate finance data from raw_answers
  let financeCount = 0
  let strictBudgetCount = 0
  let budgetDiscussCount = 0
  let budgetEnteredCount = 0
  let budgetTotal = 0
  const paymentRangeCounts: Record<string, number> = {}
  const budgetAmounts: number[] = []
  const treatmentFinanceCounts: Record<string, number> = {}

  safeLeads.forEach((lead) => {
    const parsed = parseRawAnswers(lead?.raw_answers)
    if (!parsed) return

    if (parsed.costApproach === "finance_preferred") {
      financeCount++
      const range = parsed.monthlyPaymentRange
      if (range) {
        paymentRangeCounts[range] = (paymentRangeCounts[range] || 0) + 1
      }
      // Track which treatments want finance
      const treatments = parsed.treatments || []
      treatments.forEach((t: string) => {
        if (t) treatmentFinanceCounts[t] = (treatmentFinanceCounts[t] || 0) + 1
      })
    }

    if (parsed.costApproach === "strict_budget") {
      strictBudgetCount++
      if (parsed.strictBudgetMode === "discuss_with_clinic") {
        budgetDiscussCount++
      } else if (parsed.strictBudgetMode === "enter_amount") {
        budgetEnteredCount++
        const amount = Number(parsed.strictBudgetAmount)
        if (amount > 0) {
          budgetAmounts.push(amount)
          budgetTotal += amount
        }
      }
    }
  })

  const totalWithFinanceOrBudget = financeCount + strictBudgetCount
  const totalParsed = safeLeads.filter((l) => parseRawAnswers(l?.raw_answers)).length
  const financePct = totalParsed > 0 ? (totalWithFinanceOrBudget / totalParsed) * 100 : 0

  // Sorted payment ranges in form order
  const paymentRangeData = PAYMENT_ORDER
    .filter((key) => paymentRangeCounts[key])
    .map((key) => ({
      key,
      label: PAYMENT_LABELS[key] || key,
      count: paymentRangeCounts[key],
    }))

  const totalPaymentResponses = paymentRangeData.reduce((s, d) => s + d.count, 0)

  // Top treatments wanting finance
  const topFinanceTreatments = Object.entries(treatmentFinanceCounts)
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
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1a2332]">{financePct.toFixed(0)}%</span>
            <span className="text-sm text-muted-foreground">
              of patients want finance or have a strict budget
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>
              <strong className="text-[#1a2332]">{financeCount}</strong> want payment plans
            </span>
            <span>
              <strong className="text-[#1a2332]">{strictBudgetCount}</strong> have fixed budgets
            </span>
          </div>
        </div>

        {/* Monthly payment range distribution */}
        {paymentRangeData.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-3">Monthly Payment Preferences</p>
            <div className="space-y-2">
              {paymentRangeData.map((item, idx) => {
                const pct = totalPaymentResponses > 0
                  ? (item.count / totalPaymentResponses) * 100
                  : 0
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">
                        {item.count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${BAR_COLORS[idx % BAR_COLORS.length]} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Strict budget breakdown */}
        {strictBudgetCount > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Fixed Budget Patients</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-[#1a2332]">{budgetDiscussCount}</p>
                <p className="text-[11px] text-muted-foreground">Prefer to discuss with clinic</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-[#1a2332]">{budgetEnteredCount}</p>
                <p className="text-[11px] text-muted-foreground">Entered a budget amount</p>
              </div>
            </div>
            {avgBudget > 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Average entered budget: <strong className="text-[#1a2332]">£{Math.round(avgBudget).toLocaleString()}</strong>
              </p>
            )}
          </div>
        )}

        {/* Top treatments wanting finance */}
        {topFinanceTreatments.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Treatments Wanting Finance</p>
            <div className="space-y-1">
              {topFinanceTreatments.map(([treatment, count]) => (
                <div key={treatment} className="flex justify-between text-xs py-1">
                  <span className="truncate mr-2 text-muted-foreground">{treatment}</span>
                  <span className="font-medium flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insight callout */}
        {financeCount > 0 && totalPaymentResponses > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Insight:</strong>{" "}
              {(() => {
                const over100 = (paymentRangeCounts["100_200"] || 0) + (paymentRangeCounts["over_200"] || 0)
                const over100Pct = totalPaymentResponses > 0 ? (over100 / totalPaymentResponses) * 100 : 0
                return over100Pct > 30
                  ? `${over100Pct.toFixed(0)}% of finance patients can afford £100+/month — clinics offering this threshold capture more bookings.`
                  : `Most finance patients prefer lower monthly payments — clinics with flexible plans under £100/month will convert better.`
              })()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
