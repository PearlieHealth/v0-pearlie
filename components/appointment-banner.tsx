"use client"

import { Calendar, Clock, CheckCircle2, Loader2 } from "lucide-react"
import { HOURLY_SLOTS } from "@/lib/constants"

interface AppointmentBannerProps {
  bookingDate?: string | null
  bookingTime?: string | null
  bookingStatus?: string | null // "pending" | "confirmed" | "declined"
  clinicName?: string
  compact?: boolean // smaller variant for inline use in chat panels
}

export function AppointmentBanner({
  bookingDate,
  bookingTime,
  bookingStatus,
  clinicName,
  compact = false,
}: AppointmentBannerProps) {
  if (!bookingDate && !bookingTime) return null

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

  const status = bookingStatus || "pending"
  const isConfirmed = status === "confirmed"
  const isDeclined = status === "declined"

  const statusConfig = isConfirmed
    ? { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />, label: "Confirmed" }
    : isDeclined
    ? { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: null, label: "Declined" }
    : { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: <Loader2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 animate-none" />, label: "Pending" }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${statusConfig.bg} ${statusConfig.border} border`}>
        <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="font-medium text-foreground truncate">
          {formattedDate}{formattedTime ? ` · ${formattedTime}` : ""}
        </span>
        <span className={`ml-auto text-[10px] font-semibold uppercase tracking-wide ${statusConfig.text} flex-shrink-0`}>
          {statusConfig.label}
        </span>
      </div>
    )
  }

  return (
    <div className={`rounded-xl ${statusConfig.bg} ${statusConfig.border} border p-3.5`}>
      <div className="flex items-start gap-2.5">
        {statusConfig.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-semibold ${statusConfig.text}`}>
              Appointment {statusConfig.label.toLowerCase()}
            </p>
          </div>
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
          {clinicName && (
            <p className="text-xs text-muted-foreground mt-1">at {clinicName}</p>
          )}
        </div>
      </div>
    </div>
  )
}
