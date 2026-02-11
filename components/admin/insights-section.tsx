"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb, TrendingUp, AlertCircle, Target } from "lucide-react"

export function InsightsSection({ leads, events }: { leads: any[]; events: any[] }) {
  const generateInsights = () => {
    const insights = []

    // Top treatment demand
    const treatmentCounts: Record<string, number> = {}
    leads.forEach((lead) => {
      if (lead.treatment_interest) {
        treatmentCounts[lead.treatment_interest] = (treatmentCounts[lead.treatment_interest] || 0) + 1
      }
    })
    const topTreatment = Object.entries(treatmentCounts).sort((a, b) => b[1] - a[1])[0]
    if (topTreatment) {
      insights.push({
        icon: TrendingUp,
        text: `${topTreatment[0]} is the most requested treatment with ${topTreatment[1]} leads (${((topTreatment[1] / leads.length) * 100).toFixed(0)}% of total).`,
        type: "trend",
      })
    }

    // Main blocker
    const blockerCounts: Record<string, number> = {}
    leads.forEach((lead) => {
      if (lead.cosmetic_concern) {
        blockerCounts[lead.cosmetic_concern] = (blockerCounts[lead.cosmetic_concern] || 0) + 1
      }
    })
    const mainBlocker = Object.entries(blockerCounts).sort((a, b) => b[1] - a[1])[0]
    if (mainBlocker) {
      insights.push({
        icon: AlertCircle,
        text: `${mainBlocker[1]} patients cite "${mainBlocker[0]}" as their main concern. Consider addressing this in clinic profiles.`,
        type: "blocker",
      })
    }

    // Budget preference
    const budgetCounts: Record<string, number> = {}
    leads.forEach((lead) => {
      if (lead.budget_range) {
        budgetCounts[lead.budget_range] = (budgetCounts[lead.budget_range] || 0) + 1
      }
    })
    const topBudget = Object.entries(budgetCounts).sort((a, b) => b[1] - a[1])[0]
    if (topBudget) {
      insights.push({
        icon: Target,
        text: `Most patients (${topBudget[1]}) are looking for treatments in the ${topBudget[0]} range.`,
        type: "target",
      })
    }

    // Click-through rate
    const clickRate = leads.length > 0 ? ((events.length / leads.length) * 100).toFixed(1) : 0
    insights.push({
      icon: Lightbulb,
      text: `${clickRate}% of leads clicked on at least one clinic. ${Number(clickRate) < 50 ? "Consider improving clinic match quality." : "Great engagement rate!"}`,
      type: "insight",
    })

    return insights
  }

  const insights = generateInsights()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Key Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <insight.icon className="w-5 h-5 text-[#1a2332] mt-0.5 flex-shrink-0" />
              <p className="text-sm leading-relaxed">{insight.text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
