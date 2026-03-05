"use client"

import { Card } from "@/components/ui/card"
import { AlertCircle, TrendingDown, Eye, XCircle } from "lucide-react"

interface Event {
  id: string
  session_id: string
  event_name: string
  lead_id: string | null
  match_id: string | null
  clinic_id: string | null
  metadata: Record<string, any>
  created_at: string
}

interface ConversionBlockersPanelProps {
  events?: Event[] // Made optional with ?
}

export function ConversionBlockersPanel({ events = [] }: ConversionBlockersPanelProps) {
  // Infer blockers from behavior patterns
  const sessions = new Map<string, Event[]>()
  ;(events ?? []).forEach((event) => {
    if (!sessions.has(event.session_id)) {
      sessions.set(event.session_id, [])
    }
    sessions.get(event.session_id)!.push(event)
  })

  const blockers: {
    type: string
    description: string
    count: number
    icon: any
    severity: "high" | "medium" | "low"
  }[] = []

  // Blocker 1: Viewed clinics but did not book
  const viewedButDidNotBook = Array.from(sessions.values()).filter((sessionEvents) => {
    const hasClinicOpened = sessionEvents.some((e) => e.event_name === "clinic_opened")
    const hasBookClicked = sessionEvents.some((e) => e.event_name === "book_clicked")
    return hasClinicOpened && !hasBookClicked
  }).length

  if (viewedButDidNotBook > 0) {
    blockers.push({
      type: "viewed_no_book",
      description: "Viewed clinics but didn't book",
      count: viewedButDidNotBook,
      icon: Eye,
      severity: "high",
    })
  }

  // Blocker 2: Choice overload (viewed 5+ clinics without booking)
  const choiceOverload = Array.from(sessions.values()).filter((sessionEvents) => {
    const clinicsViewed = new Set(sessionEvents.filter((e) => e.event_name === "clinic_opened").map((e) => e.clinic_id))
      .size
    const hasBookClicked = sessionEvents.some((e) => e.event_name === "book_clicked")
    return clinicsViewed >= 5 && !hasBookClicked
  }).length

  if (choiceOverload > 0) {
    blockers.push({
      type: "choice_overload",
      description: "Viewed 5+ clinics without booking (choice overload)",
      count: choiceOverload,
      icon: TrendingDown,
      severity: "medium",
    })
  }

  // Blocker 3: Dropped off at cost/budget steps (Cost Mindset, Monthly Payments, or Budget Handling)
  const budgetStepNames = new Set(["Cost Mindset", "Monthly Payments", "Budget Handling"])
  const budgetDropOff = events.filter((e) => {
    if (e.event_name !== "form_abandoned") return false
    const stepName = e.metadata?.step_name
    const lastStep = e.metadata?.last_step
    return budgetStepNames.has(stepName) || lastStep === 7 || lastStep === "7" || lastStep === 7.5 || lastStep === "7.5" || lastStep === 7.6 || lastStep === "7.6"
  }).length

  if (budgetDropOff > 0) {
    blockers.push({
      type: "budget_drop_off",
      description: "Dropped off at cost/budget question",
      count: budgetDropOff,
      icon: XCircle,
      severity: "high",
    })
  }

  // Blocker 4: Saw matches but never clicked any clinic
  const matchesButNoClick = Array.from(sessions.values()).filter((sessionEvents) => {
    const hasMatchesShown = sessionEvents.some((e) => e.event_name === "matches_shown" || e.event_name === "match_page_viewed")
    const hasClinicOpened = sessionEvents.some((e) => e.event_name === "clinic_opened")
    return hasMatchesShown && !hasClinicOpened
  }).length

  if (matchesButNoClick > 0) {
    blockers.push({
      type: "matches_no_click",
      description: "Saw matches but didn't open any clinic",
      count: matchesButNoClick,
      icon: AlertCircle,
      severity: "high",
    })
  }

  // Blocker 5: Dropped off after seeing matches (within 30 seconds)
  const quickDropOffAfterMatches = Array.from(sessions.values()).filter((sessionEvents) => {
    const matchesEvent = sessionEvents.find((e) => e.event_name === "matches_shown" || e.event_name === "match_page_viewed")
    if (!matchesEvent) return false

    const matchesTime = new Date(matchesEvent.created_at).getTime()
    if (isNaN(matchesTime)) return false
    const hasSubsequentActivity = sessionEvents.some((e) => {
      const eventTime = new Date(e.created_at).getTime()
      if (isNaN(eventTime)) return false
      return eventTime > matchesTime && eventTime - matchesTime > 30000 // 30 seconds
    })

    return !hasSubsequentActivity
  }).length

  if (quickDropOffAfterMatches > 0) {
    blockers.push({
      type: "quick_drop_after_matches",
      description: "Left immediately after seeing matches (<30s)",
      count: quickDropOffAfterMatches,
      icon: XCircle,
      severity: "medium",
    })
  }

  // Sort by count descending
  blockers.sort((a, b) => b.count - a.count)

  const totalBlockers = blockers.reduce((sum, b) => sum + b.count, 0)

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4 md:mb-6">
        <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
        <h3 className="text-base md:text-lg font-semibold">Top Conversion Blockers</h3>
      </div>

      {blockers.length === 0 ? (
        <div className="text-center py-6 md:py-8 text-muted-foreground">
          <AlertCircle className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm md:text-base">No conversion blockers detected yet</p>
          <p className="text-xs md:text-sm mt-1">More data needed to identify patterns</p>
        </div>
      ) : (
        <>
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-red-700">{totalBlockers}</div>
              <div className="text-xs md:text-sm text-red-800 mt-1">Total inferred blockers</div>
            </div>
          </div>

          <div className="space-y-2 md:space-y-3">
            {blockers.map((blocker) => {
              const Icon = blocker.icon
              const severityColor =
                blocker.severity === "high"
                  ? "bg-red-50 border-red-200 text-red-900"
                  : blocker.severity === "medium"
                    ? "bg-orange-50 border-orange-200 text-orange-900"
                    : "bg-yellow-50 border-yellow-200 text-yellow-900"

              return (
                <div key={blocker.type} className={`p-3 md:p-4 border rounded-lg ${severityColor}`}>
                  <div className="flex items-start gap-2 md:gap-3">
                    <Icon
                      className={`h-4 w-4 md:h-5 md:w-5 flex-shrink-0 mt-0.5 ${blocker.severity === "high" ? "text-red-600" : blocker.severity === "medium" ? "text-orange-600" : "text-yellow-600"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 mb-1">
                        <span className="font-semibold text-xs md:text-sm break-words">{blocker.description}</span>
                        <span className="text-base md:text-lg font-bold">{blocker.count}</span>
                      </div>
                      <div className="text-[10px] md:text-xs opacity-75">
                        {blocker.severity === "high" && "High priority - significant conversion impact"}
                        {blocker.severity === "medium" && "Medium priority - worth investigating"}
                        {blocker.severity === "low" && "Low priority - monitor over time"}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 md:mt-6 p-3 md:p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <div className="text-xs md:text-sm text-teal-900">
              <strong>Note:</strong> These blockers are inferred from user behavior patterns. They don't reflect manual
              user input — they're based on actual actions taken (or not taken) during the journey.
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
