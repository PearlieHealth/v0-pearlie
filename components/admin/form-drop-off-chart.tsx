"use client"

import { Card } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { useState } from "react"

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

// Step definitions matching getStepName() in app/intake/page.tsx (v4 form)
const PLANNING_STEPS = [
  { step: 1, name: "Treatment Selection" },
  { step: 2, name: "Postcode" },
  { step: 2.5, name: "Travel Distance" },
  { step: 3, name: "Clinic Priorities" },
  { step: 3.5, name: "Dental Anxiety" },
  { step: 5, name: "Biggest Concern" },
  { step: 5.5, name: "Best Time" },
  { step: 6, name: "When to Start" },
  { step: 7, name: "Cost Mindset" },
  { step: 8, name: "Contact Details" },
]

const EMERGENCY_STEPS = [
  { step: 1, name: "Treatment Selection" },
  { step: 2, name: "Postcode" },
  { step: 2.5, name: "Urgency" },
  { step: 3.5, name: "Dental Anxiety" },
  { step: 5.5, name: "Best Time" },
  { step: 8, name: "Contact Details" },
]

export function FormDropOffChart({ events = [] }: FormDropOffChartProps) {
  const [flow, setFlow] = useState<"planning" | "emergency">("planning")

  const formEvents = (events ?? []).filter((e) =>
    [
      "form_started",
      "form_step_viewed",
      "form_step_completed",
      "form_abandoned",
      "lead_submitted",
    ].includes(e.event_name),
  )

  // Split sessions by flow type using event metadata
  const planningSessionIds = new Set<string>()
  const emergencySessionIds = new Set<string>()

  formEvents.forEach((e) => {
    if (e.metadata?.flow === "emergency") {
      emergencySessionIds.add(e.session_id)
    } else if (e.metadata?.flow === "planning") {
      planningSessionIds.add(e.session_id)
    }
  })

  // For sessions with no flow metadata, count towards planning (default)
  const allSessionIds = new Set(formEvents.map((e) => e.session_id))
  allSessionIds.forEach((sid) => {
    if (!planningSessionIds.has(sid) && !emergencySessionIds.has(sid)) {
      planningSessionIds.add(sid)
    }
  })

  const currentSteps = flow === "emergency" ? EMERGENCY_STEPS : PLANNING_STEPS
  const currentSessionIds = flow === "emergency" ? emergencySessionIds : planningSessionIds
  const flowEvents = formEvents.filter((e) => currentSessionIds.has(e.session_id))

  const formStarted = new Set(
    flowEvents.filter((e) => e.event_name === "form_started").map((e) => e.session_id)
  ).size

  const stepStats = currentSteps.map((stepData) => {
    const viewed = new Set(
      flowEvents
        .filter((e) => {
          if (e.event_name !== "form_step_viewed") return false
          const stepName = e.metadata?.step_name
          const stepNum = String(e.metadata?.step_number)
          return stepName === stepData.name || stepNum === String(stepData.step)
        })
        .map((e) => e.session_id),
    ).size

    const completed = new Set(
      flowEvents
        .filter((e) => {
          if (e.event_name !== "form_step_completed") return false
          const stepName = e.metadata?.step_name
          const stepNum = String(e.metadata?.step_number)
          return stepName === stepData.name || stepNum === String(stepData.step)
        })
        .map((e) => e.session_id),
    ).size

    const abandoned = flowEvents.filter((e) => {
      if (e.event_name !== "form_abandoned") return false
      const lastStep = e.metadata?.last_step
      return (
        lastStep === stepData.step ||
        String(lastStep) === String(stepData.step) ||
        lastStep === stepData.name
      )
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

  const leadsSubmitted = new Set(
    flowEvents.filter((e) => e.event_name === "lead_submitted").map((e) => e.session_id)
  ).size
  const overallConversion = formStarted > 0 ? (leadsSubmitted / formStarted) * 100 : 0

  const stepsWithDropOff = stepStats.filter((s) => s.viewed > 0 && s.dropOffRate > 0)
  const highestDropOff = stepsWithDropOff.length > 0
    ? stepsWithDropOff.reduce((max, step) => (step.dropOffRate > max.dropOffRate ? step : max))
    : null

  const emergencyCount = emergencySessionIds.size
  const planningCount = planningSessionIds.size

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <h3 className="text-base font-semibold">Where patients drop off</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFlow("planning")}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              flow === "planning"
                ? "bg-[#1a2332] text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Planning ({planningCount})
          </button>
          <button
            onClick={() => setFlow("emergency")}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              flow === "emergency"
                ? "bg-red-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Emergency ({emergencyCount})
          </button>
        </div>
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

      <div className="space-y-2 mb-4">
        {stepStats.map((step, index) => (
          <div key={`${step.step}-${step.name}`} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                {index + 1}. {step.name}
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
        ))}
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
