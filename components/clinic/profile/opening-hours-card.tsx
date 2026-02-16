"use client"

import { Clock } from "lucide-react"

interface OpeningHoursCardProps {
  openingHours: Record<string, string | { open: string; close: string; closed: boolean }>
}

const CANONICAL_ORDER = [
  { keys: ["monday", "mon"], label: "Monday" },
  { keys: ["tuesday", "tue"], label: "Tuesday" },
  { keys: ["wednesday", "wed"], label: "Wednesday" },
  { keys: ["thursday", "thu"], label: "Thursday" },
  { keys: ["friday", "fri"], label: "Friday" },
  { keys: ["saturday", "sat"], label: "Saturday" },
  { keys: ["sunday", "sun"], label: "Sunday" },
]

function formatHours(hours: string | { open: string; close: string; closed: boolean } | null | undefined): string {
  if (!hours) return "\u2014"
  if (typeof hours === "string") return hours
  if (typeof hours === "object") {
    return hours.closed ? "Closed" : `${hours.open} \u2013 ${hours.close}`
  }
  return "\u2014"
}

function getTodayIndex(): number {
  // getDay: 0=Sunday, we need Monday=0
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
}

export function OpeningHoursCard({ openingHours }: OpeningHoursCardProps) {
  if (!openingHours || Object.keys(openingHours).length === 0) return null

  const todayIndex = getTodayIndex()

  // Build a case-insensitive lookup from the actual data keys
  const lowerKeyMap: Record<string, string> = {}
  for (const key of Object.keys(openingHours)) {
    lowerKeyMap[key.toLowerCase()] = key
  }

  // Match canonical days to actual data keys (case-insensitive)
  const entries: { label: string; hours: typeof openingHours[string]; isToday: boolean }[] = []
  for (let i = 0; i < CANONICAL_ORDER.length; i++) {
    const { keys, label } = CANONICAL_ORDER[i]
    const matchedKey = keys.find((k) => lowerKeyMap[k] !== undefined)
    if (matchedKey) {
      const actualKey = lowerKeyMap[matchedKey]
      entries.push({ label, hours: openingHours[actualKey], isToday: i === todayIndex })
    }
  }

  if (entries.length === 0) return null

  return (
    <div className="border border-[#e5e5e5] rounded-xl p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <Clock className="h-[18px] w-[18px] text-[#999]" />
        <h3 className="font-bold text-[#1a1a1a] text-[15px]">Opening Hours</h3>
      </div>
      <div className="space-y-0">
        {entries.map(({ label, hours, isToday }) => {
          const isClosed = typeof hours === "object" && hours.closed

          return (
            <div
              key={label}
              className={`flex justify-between items-center py-2 border-b border-[#f0f0f0] last:border-b-0 ${isToday ? "font-semibold" : ""}`}
            >
              <span className={`text-sm ${isToday ? "text-[#1a1a1a]" : "text-[#666]"}`}>
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
