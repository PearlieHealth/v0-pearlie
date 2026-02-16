"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, Clock, CalendarCheck } from "lucide-react"
import { safeArray } from "@/lib/analytics/safe"

interface BookingOutcomesCardProps {
  leads?: any[]
  clinicMap?: Map<string, string>
}

export function BookingOutcomesCard({ leads, clinicMap }: BookingOutcomesCardProps) {
  const safeLeads = safeArray<any>(leads)
  const safeClinicMap = clinicMap instanceof Map ? clinicMap : new Map<string, string>()

  // Count booking statuses
  let requested = 0
  let confirmed = 0
  let declined = 0
  let pending = 0
  const declineReasons: Record<string, number> = {}
  const clinicConfirmCounts: Record<string, { confirmed: number; declined: number; pending: number; name: string }> = {}
  const confirmTimes: number[] = []

  safeLeads.forEach((lead) => {
    const status = lead?.booking_status
    if (!status) return

    const clinicId = lead?.booking_clinic_id
    const clinicName = (clinicId && safeClinicMap.get(clinicId)) || "Unknown Clinic"

    if (status === "requested" || status === "pending") {
      pending++
      requested++
    } else if (status === "confirmed") {
      confirmed++
      requested++
      // Calculate time to confirm
      if (lead?.booking_confirmed_at && lead?.created_at) {
        const created = new Date(lead.created_at).getTime()
        const confirmedAt = new Date(lead.booking_confirmed_at).getTime()
        if (!isNaN(created) && !isNaN(confirmedAt) && confirmedAt > created) {
          confirmTimes.push(confirmedAt - created)
        }
      }
    } else if (status === "declined" || status === "cancelled") {
      declined++
      requested++
      if (lead?.booking_decline_reason) {
        declineReasons[lead.booking_decline_reason] = (declineReasons[lead.booking_decline_reason] || 0) + 1
      }
    }

    // Per-clinic stats
    if (clinicId) {
      if (!clinicConfirmCounts[clinicId]) {
        clinicConfirmCounts[clinicId] = { confirmed: 0, declined: 0, pending: 0, name: clinicName }
      }
      if (status === "confirmed") {
        clinicConfirmCounts[clinicId].confirmed++
      } else if (status === "declined" || status === "cancelled") {
        clinicConfirmCounts[clinicId].declined++
      } else {
        clinicConfirmCounts[clinicId].pending++
      }
    }
  })

  const confirmationRate = requested > 0 ? (confirmed / requested) * 100 : 0
  const declineRate = requested > 0 ? (declined / requested) * 100 : 0

  // Average time to confirm
  const avgConfirmMs = confirmTimes.length > 0
    ? confirmTimes.reduce((s, t) => s + t, 0) / confirmTimes.length
    : 0
  const avgConfirmHours = avgConfirmMs / (1000 * 60 * 60)

  // Top decline reasons
  const topDeclineReasons = Object.entries(declineReasons)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  // Per-clinic breakdown (top 5)
  const clinicBreakdown = Object.entries(clinicConfirmCounts)
    .map(([id, data]) => ({
      id,
      name: data.name,
      confirmed: data.confirmed,
      declined: data.declined,
      pending: data.pending,
      total: data.confirmed + data.declined + data.pending,
      rate: (data.confirmed + data.declined + data.pending) > 0
        ? (data.confirmed / (data.confirmed + data.declined + data.pending)) * 100
        : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  if (requested === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <CalendarCheck className="w-5 h-5" />
            Booking Outcomes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CalendarCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No booking requests yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Shows confirmation rates and decline reasons when patients request bookings
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
          <CalendarCheck className="w-5 h-5" />
          Booking Outcomes
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Tracking {requested} booking request{requested !== 1 ? "s" : ""} from request to confirmation
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-5">
        {/* Outcome bar */}
        <div>
          <div className="flex h-8 rounded-lg overflow-hidden">
            {confirmed > 0 && (
              <div
                className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${confirmationRate}%` }}
              >
                {confirmationRate >= 15 && `${confirmationRate.toFixed(0)}%`}
              </div>
            )}
            {pending > 0 && (
              <div
                className="bg-amber-400 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${(pending / requested) * 100}%` }}
              >
                {(pending / requested) * 100 >= 15 && `${((pending / requested) * 100).toFixed(0)}%`}
              </div>
            )}
            {declined > 0 && (
              <div
                className="bg-red-400 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${declineRate}%` }}
              >
                {declineRate >= 15 && `${declineRate.toFixed(0)}%`}
              </div>
            )}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" /> Confirmed ({confirmed})
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-400" /> Pending ({pending})
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-400" /> Declined ({declined})
            </span>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-green-600">{confirmationRate.toFixed(0)}%</p>
            <p className="text-[11px] text-muted-foreground">Confirmation Rate</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-[#1a2332]">
              {avgConfirmHours > 0
                ? avgConfirmHours < 1
                  ? `${Math.round(avgConfirmHours * 60)}m`
                  : avgConfirmHours < 24
                    ? `${avgConfirmHours.toFixed(1)}h`
                    : `${(avgConfirmHours / 24).toFixed(1)}d`
                : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">Avg. Time to Confirm</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-red-500">{declineRate.toFixed(0)}%</p>
            <p className="text-[11px] text-muted-foreground">Decline Rate</p>
          </div>
        </div>

        {/* Decline reasons */}
        {topDeclineReasons.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Decline Reasons</p>
            <div className="space-y-1.5">
              {topDeclineReasons.map(([reason, count]) => (
                <div key={reason} className="flex justify-between items-center text-xs py-1">
                  <span className="text-muted-foreground capitalize">
                    {reason.replace(/_/g, " ")}
                  </span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-clinic breakdown */}
        {clinicBreakdown.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">By Clinic</p>
            <div className="space-y-2">
              {clinicBreakdown.map((clinic) => (
                <div key={clinic.id} className="flex items-center justify-between text-xs">
                  <span className="truncate mr-2 text-muted-foreground">{clinic.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-green-600">{clinic.confirmed}✓</span>
                    {clinic.pending > 0 && <span className="text-amber-500">{clinic.pending}…</span>}
                    {clinic.declined > 0 && <span className="text-red-400">{clinic.declined}✕</span>}
                    <span className="font-medium w-10 text-right">{clinic.rate.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insight callout */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800">
            <strong>Insight:</strong>{" "}
            {avgConfirmHours > 0 && avgConfirmHours < 48
              ? `Average confirmation time is ${avgConfirmHours < 1 ? `${Math.round(avgConfirmHours * 60)} minutes` : `${avgConfirmHours.toFixed(1)} hours`}. Fast-responding clinics see higher patient retention.`
              : confirmed > 0
                ? `${confirmationRate.toFixed(0)}% of booking requests are confirmed. ${pending > 0 ? `${pending} request${pending !== 1 ? "s" : ""} still pending.` : ""}`
                : `${requested} booking request${requested !== 1 ? "s" : ""} received. Confirmation data will build up as clinics respond.`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
