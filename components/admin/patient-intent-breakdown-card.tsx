"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, Wallet, Clock } from "lucide-react"

interface Lead {
  id: string
  raw_answers?: Record<string, unknown>
  [key: string]: unknown
}

interface PatientIntentBreakdownCardProps {
  leads: Lead[]
}

export function PatientIntentBreakdownCard({ leads }: PatientIntentBreakdownCardProps) {
  // Label mappings
  const anxietyLabels: Record<string, string> = {
    "not_anxious": "Not anxious",
    "a_bit_nervous": "A bit nervous",
    "quite_anxious": "Quite anxious",
    "very_anxious": "Very anxious",
    "prefer-sedation": "Prefers sedation",
  }
  const budgetLabels: Record<string, string> = {
    "monthly_payments": "Monthly payments",
    "spread_cost": "Spread cost",
    "strict_budget": "Strict budget",
    "want_clarity": "Wants clear pricing",
    "flexible": "Flexible",
    "not_main_concern": "Not main concern",
  }
  const urgencyLabels: Record<string, string> = {
    "asap": "ASAP",
    "this_week": "This week",
    "this_month": "This month",
    "next_few_months": "Next few months",
    "just_exploring": "Just exploring",
  }

  // Calculate breakdowns
  const anxietyCounts: Record<string, number> = {}
  const budgetCounts: Record<string, number> = {}
  const urgencyCounts: Record<string, number> = {}

  leads.forEach((lead) => {
    const answers = lead.raw_answers || {}
    
    const anxiety = (answers.anxietyLevel as string) || (answers.anxiety_level as string)
    const budget = (answers.costApproach as string) || (answers.cost_approach as string)
    const urgency = (answers.treatment_timeline as string) || (answers.urgency as string)
    
    if (anxiety) anxietyCounts[anxiety] = (anxietyCounts[anxiety] || 0) + 1
    if (budget) budgetCounts[budget] = (budgetCounts[budget] || 0) + 1
    if (urgency) urgencyCounts[urgency] = (urgencyCounts[urgency] || 0) + 1
  })

  const anxietyData = Object.entries(anxietyCounts)
    .map(([key, value]) => ({ 
      name: anxietyLabels[key] || key.replace(/_/g, " "), 
      value,
      key
    }))
    .sort((a, b) => b.value - a.value)

  const budgetData = Object.entries(budgetCounts)
    .map(([key, value]) => ({ 
      name: budgetLabels[key] || key.replace(/_/g, " "), 
      value,
      key 
    }))
    .sort((a, b) => b.value - a.value)

  const urgencyData = Object.entries(urgencyCounts)
    .map(([key, value]) => ({ 
      name: urgencyLabels[key] || key.replace(/_/g, " "), 
      value,
      key 
    }))
    .sort((a, b) => b.value - a.value)

  const renderBreakdown = (
    data: { name: string; value: number; key: string }[], 
    colors: string[],
    emptyMessage: string
  ) => {
    if (data.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>
    }

    const total = data.reduce((sum, item) => sum + item.value, 0)

    return (
      <div className="space-y-3">
        {data.map((item, idx) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0
          return (
            <div key={item.key} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium">{item.value} ({percent.toFixed(0)}%)</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-500`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )
        })}
        <div className="pt-2 border-t mt-4">
          <p className="text-xs text-muted-foreground">Total responses: {total}</p>
        </div>
      </div>
    )
  }

  const anxietyColors = ["bg-green-500", "bg-yellow-500", "bg-orange-500", "bg-red-500", "bg-purple-500"]
  const budgetColors = ["bg-blue-500", "bg-indigo-500", "bg-cyan-500", "bg-teal-500", "bg-sky-500"]
  const urgencyColors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Patient Intent Breakdown
        </CardTitle>
        <CardDescription>
          Aggregated patient preferences across all leads ({leads.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="anxiety" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="anxiety" className="text-xs">
              <Brain className="w-3 h-3 mr-1" />
              Anxiety
            </TabsTrigger>
            <TabsTrigger value="budget" className="text-xs">
              <Wallet className="w-3 h-3 mr-1" />
              Budget
            </TabsTrigger>
            <TabsTrigger value="urgency" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Urgency
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anxiety">
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-4">How anxious are patients about dental treatment?</p>
              {renderBreakdown(anxietyData, anxietyColors, "No anxiety data available")}
            </div>
          </TabsContent>

          <TabsContent value="budget">
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-4">How do patients want to handle costs?</p>
              {renderBreakdown(budgetData, budgetColors, "No budget data available")}
            </div>
          </TabsContent>

          <TabsContent value="urgency">
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-4">When do patients want treatment?</p>
              {renderBreakdown(urgencyData, urgencyColors, "No urgency data available")}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
