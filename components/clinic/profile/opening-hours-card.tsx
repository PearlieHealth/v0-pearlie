"use client"

import { Clock } from "lucide-react"

interface OpeningHoursCardProps {
  openingHours: Record<string, string | { open: string; close: string; closed: boolean }>
}

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
}

function formatHours(hours: string | { open: string; close: string; closed: boolean } | null | undefined): string {
  if (!hours) return "\u2014"
  if (typeof hours === "string") return hours
  if (typeof hours === "object") {
    return hours.closed ? "Closed" : `${hours.open} \u2013 ${hours.close}`
  }
  return "\u2014"
}

function getTodayKey(): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  return days[new Date().getDay()]
}

function getShortTodayKey(): string {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
  return days[new Date().getDay()]
}

export function OpeningHoursCard({ openingHours }: OpeningHoursCardProps) {
  if (!openingHours || Object.keys(openingHours).length === 0) return null

  const todayFull = getTodayKey()
  const todayShort = getShortTodayKey()

  // Determine if keys are short (mon/tue) or long (monday/tuesday)
  const keys = Object.keys(openingHours)
  const usesShortKeys = keys.some((k) => ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(k.toLowerCase()))
  const shortOrder = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  const orderToUse = usesShortKeys ? shortOrder : DAY_ORDER

  // Sort entries in day order
  const sortedEntries = orderToUse
    .filter((day) => openingHours[day] !== undefined || openingHours[day.toLowerCase()] !== undefined)
    .map((day) => {
      const key = openingHours[day] !== undefined ? day : day.toLowerCase()
      return [key, openingHours[key]] as [string, typeof openingHours[string]]
    })

  // If no ordered entries matched, fall back to raw order
  const entries = sortedEntries.length > 0 ? sortedEntries : Object.entries(openingHours)

  return (
    <div className="border border-[#e5e5e5] rounded-xl p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <Clock className="h-[18px] w-[18px] text-[#999]" />
        <h3 className="font-bold text-[#1a1a1a] text-[15px]">Opening Hours</h3>
      </div>
      <div className="space-y-0">
        {entries.map(([day, hours]) => {
          const isToday = day.toLowerCase() === todayFull || day.toLowerCase() === todayShort
          const isClosed = typeof hours === "object" && hours.closed
          const label = DAY_LABELS[day.toLowerCase()] || day

          return (
            <div
              key={day}
              className={`flex justify-between items-center py-2 border-b border-[#f0f0f0] last:border-b-0 ${isToday ? "font-semibold" : ""}`}
            >
              <span className={`text-sm capitalize ${isToday ? "text-[#1a1a1a]" : "text-[#666]"}`}>
                {label}
                {isToday && (
                  <span className="ml-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    Today
                  </span>
                )}
              </span>
              <span className={`text-sm ${isClosed ? "text-[#999]" : isToday ? "text-[#1a1a1a]" : "text-[#444]"}`}>
                {formatHours(hours)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
