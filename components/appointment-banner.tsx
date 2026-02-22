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
  if (!bookingDate && !bookingTime && !requestedAt) return null

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
      <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-blue-50 border-blue-200 border">
        <CalendarCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
        <span className="font-medium text-foreground truncate">
          Appointment requested
          {formattedDate && <> &middot; {formattedDate}</>}
          {formattedTime && <> &middot; {formattedTime}</>}
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-blue-50 border-blue-200 border p-3.5">
      <div className="flex items-start gap-2.5">
        <CalendarCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-700">
            Appointment requested
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            {formattedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
            )}
            {formattedTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formattedTime}
              </span>
            )}
          </div>
          {(clinicName || formattedRequestedAt) && (
            <p className="text-xs text-muted-foreground mt-1">
              {clinicName && <>at {clinicName}</>}
              {clinicName && formattedRequestedAt && <> &middot; </>}
              {formattedRequestedAt && <>requested {formattedRequestedAt}</>}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
