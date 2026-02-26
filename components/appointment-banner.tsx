"use client"

import { Calendar, Clock, CalendarCheck } from "lucide-react"
import { HOURLY_SLOTS } from "@/lib/constants"

interface AppointmentBannerProps {
  bookingDate?: string | null
  bookingTime?: string | null
  requestedAt?: string | null // ISO timestamp of when the appointment was requested
  clinicName?: string
  compact?: boolean // smaller variant for inline use in chat panels
}

export function AppointmentBanner({
  bookingDate,
  bookingTime,
  requestedAt,
  clinicName,
  compact = false,
}: AppointmentBannerProps) {
  if (!bookingDate && !requestedAt) return null

  const formattedDate = bookingDate
    ? new Date(bookingDate).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : null

  const formattedTime = bookingTime
    ? HOURLY_SLOTS.find((s) => s.key === bookingTime)?.label || bookingTime
    : null

  const formattedRequestedAt = requestedAt
    ? new Date(requestedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs bg-blue-500/10 border-blue-500/20 border">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-blue-500/30 bg-blue-500/15 text-[10px] font-semibold text-blue-600 flex-shrink-0">
          <CalendarCheck className="w-3 h-3" />
          Pending
        </span>
        <span className="text-xs text-blue-600 truncate">
          {formattedDate && <>{formattedDate}</>}
          {formattedTime && <> at {formattedTime}</>}
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-blue-500/30 bg-blue-500/15 text-[11px] font-semibold text-blue-600">
          <CalendarCheck className="w-3 h-3" />
          Pending confirmation
        </span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {formattedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formattedDate}
            </span>
          )}
          {formattedTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formattedTime}
            </span>
          )}
        </div>
      </div>
      {clinicName && (
        <p className="text-[11px] text-muted-foreground mt-1">
          at {clinicName}
        </p>
      )}
    </div>
  )
}
