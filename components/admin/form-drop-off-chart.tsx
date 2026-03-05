"use client"

import { Card } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

interface Event {
  id: string
  session_id: string
  event_name: string
  metadata: Record<string, any>
  created_at: string
}

interface FormDropOffChartProps {
  events: Event[]
}

export function FormDropOffChart({ events = [] }: FormDropOffChartProps) {
  const formEvents = (events ?? []).filter((e) =>
    [
      "form_started",
      "form_step_viewed",
      "form_step_completed",
      "form_abandoned",
      "lead_submitted",
      "outcome_step_viewed",
      "outcome_step_completed",
    ].includes(e.event_name),
  )

  const formStarted = new Set(formEvents.filter((e) => e.event_name === "form_started").map((e) => e.session_id)).size

  // Separate planning and emergency flows — step names must match getStepName() in intake/page.tsx
  const planningSteps = [
    { step: 1, name: "Treatment Selection" },
    { step: 2, name: "Postcode" },
    { step: 2.5, name: "Travel Distance" },
    { step: 3, name: "Clinic Priorities" },
    { step: 3.5, name: "Dental Anxiety" },
    { step: 5, name: "Concerns" },
    { step: 5.5, name: "Best Time" },
    { step: 6, name: "When to Start" },
    { step: 7, name: "Cost Mindset" },
    { step: 7.5, name: "Monthly Payments" },
    { step: 7.6, name: "Budget Handling" },
    { step: 8, name: "Contact Details" },
  ]

  const emergencySteps = [
    { step: 1, name: "Treatment Selection" },
    { step: 2, name: "Postcode" },
    { step: 2.5, name: "Urgency" },
    { step: 3.5, name: "Dental Anxiety" },
    { step: 5.5, name: "Best Time" },
    { step: 8, name: "Contact Details" },
  ]

  // Determine which sessions are emergency vs planning based on step names
  const emergencyOnlySteps = new Set(["Urgency"])
  const planningOnlySteps = new Set(["Travel Distance", "Clinic Priorities", "Concerns", "When to Start", "Cost Mindset", "Monthly Payments", "Budget Handling"])

  const emergencySessions = new Set(
    formEvents
      .filter((e) => e.event_name === "form_step_viewed" && emergencyOnlySteps.has(e.metadata?.step_name))
      .map((e) => e.session_id),
  )
  const planningSessions = new Set(
    formEvents
      .filter((e) => e.event_name === "form_step_viewed" && planningOnlySteps.has(e.metadata?.step_name))
      .map((e) => e.session_id),
  )

  // Also check flow metadata on form_started or any event
  formEvents.forEach((e) => {
    if (e.metadata?.flow === "emergency") emergencySessions.add(e.session_id)
    else if (e.metadata?.flow === "planning") planningSessions.add(e.session_id)
  })

  const hasEmergency = emergencySessions.size > 0
  const hasPlanning = planningSessions.size > 0 || !hasEmergency // default to planning if no flow detected

  // Build combined step list: all unique steps sorted by step number
  const stepsData = [
    ...planningSteps,
    ...emergencySteps.filter((s) => !planningSteps.some((p) => p.name === s.name)),
  ].sort((a, b) => a.step - b.step)

  // Track which flow each step belongs to for labelling
  const planningStepNames = new Set(planningSteps.map((s) => s.name))
  const emergencyStepNames = new Set(emergencySteps.map((s) => s.name))

  const stepStats = stepsData.map((stepData) => {
    // Match by step_name for accuracy (database stores step_number as string)
    const viewed = new Set(
      formEvents
        .filter((e) => {
          if (e.event_name !== "form_step_viewed") return false
          // Match by step_name OR step_number (as string)
          const stepName = e.metadata?.step_name
          const stepNum = String(e.metadata?.step_number)
          return stepName === stepData.name || stepNum === String(stepData.step)
        })
        .map((e) => e.session_id),
    ).size

    const completed = new Set(
      formEvents
        .filter((e) => {
          if (e.event_name !== "form_step_completed") return false
          const stepName = e.metadata?.step_name
          const stepNum = String(e.metadata?.step_number)
          return stepName === stepData.name || stepNum === String(stepData.step)
        })
        .map((e) => e.session_id),
    ).size

    const abandoned = formEvents.filter((e) => {
      if (e.event_name !== "form_abandoned") return false
      const lastStep = e.metadata?.last_step
      const stepName = e.metadata?.step_name
      return lastStep === stepData.step || lastStep === String(stepData.step) || lastStep === stepData.name || stepName === stepData.name
    }).length

    const dropOffRate = viewed > 0 ? ((viewed - completed) / viewed) * 100 : 0

    return {
      ...stepData,
      viewed,
      completed,
      abandoned,
      dropOffRate,
    }
  })

  const leadsSubmitted = new Set(formEvents.filter((e) => e.event_name === "lead_submitted").map((e) => e.session_id))
    .size
  const overallConversion = formStarted > 0 ? (leadsSubmitted / formStarted) * 100 : 0

  // Find step with highest drop-off rate (not just abandoned count)
  const stepsWithDropOff = stepStats.filter((s) => s.viewed > 0 && s.dropOffRate > 0)
  const highestDropOff = stepsWithDropOff.length > 0 
    ? stepsWithDropOff.reduce((max, step) => (step.dropOffRate > max.dropOffRate ? step : max))
    : null

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <h3 className="text-base font-semibold">Where patients drop off</h3>
      </div>

      <div className="mb-4 p-3 bg-muted rounded-lg">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xl font-bold">{formStarted}</div>
            <div className="text-xs text-muted-foreground">Forms started</div>
          </div>
          <div>
            <div className="text-xl font-bold">{leadsSubmitted}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div>
            <div className="text-xl font-bold text-orange-600">{overallConversion.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Conversion rate</div>
          </div>
        </div>
      </div>

      {hasPlanning && hasEmergency && (
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Planning ({planningSessions.size})</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Emergency ({emergencySessions.size})</span>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {stepStats.filter((s) => s.viewed > 0).map((step) => {
          const isPlanningOnly = planningStepNames.has(step.name) && !emergencyStepNames.has(step.name)
          const isEmergencyOnly = emergencyStepNames.has(step.name) && !planningStepNames.has(step.name)
          return (
            <div key={step.step} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">
                  {step.name}
                  {isPlanningOnly && hasEmergency && <span className="ml-1 text-blue-500 text-[10px]">(planning)</span>}
                  {isEmergencyOnly && hasPlanning && <span className="ml-1 text-red-500 text-[10px]">(emergency)</span>}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {step.viewed} → {step.completed}
                  </span>
                  {step.dropOffRate > 0 && (
                    <span
                      className={`font-semibold ${step.dropOffRate > 30 ? "text-red-600" : step.dropOffRate > 15 ? "text-orange-600" : "text-muted-foreground"}`}
                    >
                      {step.dropOffRate.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${step.dropOffRate > 30 ? "bg-red-600" : step.dropOffRate > 15 ? "bg-orange-600" : "bg-green-600"}`}
                  style={{ width: `${step.viewed > 0 ? (step.completed / step.viewed) * 100 : 0}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {highestDropOff && highestDropOff.dropOffRate > 10 && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-orange-900 mb-0.5">Highest drop-off point</div>
              <div className="text-xs text-orange-800">
                <strong>{highestDropOff.dropOffRate.toFixed(1)}%</strong> of patients drop off at{" "}
                <strong>{highestDropOff.name}</strong>
                {" "}({highestDropOff.viewed - highestDropOff.completed} patients)
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
