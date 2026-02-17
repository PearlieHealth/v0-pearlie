"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
  MapPin,
  Star,
  CheckCircle2,
  Sparkles,
  Info,
  Shield,
  Clock,
  Globe,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Zap,
  Stethoscope,
  PoundSterling,
  Accessibility,
  CarFront,
  CalendarCheck,
  ArrowLeft,
  Check,
} from "lucide-react"
import Image from "next/image"
import { getChipData } from "@/lib/chipData"

interface Clinic {
  id: string
  slug?: string
  name: string
  address: string
  postcode: string
  phone: string
  rating: number
  review_count: number
  treatments: string[]
  price_range: string
  description: string
  website?: string
  latitude?: number
  longitude?: number
  images?: string[]
  verified?: boolean
  accepts_nhs?: boolean
  wheelchair_accessible?: boolean
  parking_available?: boolean
  distance_miles?: number
  match_percentage?: number
  match_reasons?: string[]
  match_reasons_composed?: string[]
  match_breakdown?: Array<{
    category: string
    points: number
    maxPoints: number
  }>
  tier?: string
  card_title?: string
  is_directory_listing?: boolean
  is_emergency?: boolean
  offers_free_consultation?: boolean
  highlight_chips?: string[]
  available_days?: string[]
  available_hours?: string[]
  accepts_same_day?: boolean
  languages_spoken?: string[]
  opening_hours?: Record<string, any>
}

interface BookingCardProps {
  clinic: Clinic
  isTopMatch: boolean
  onMessageClick: () => void
  /** Called when patient confirms an appointment request — receives the pre-filled message */
  onRequestAppointment?: (message: string) => void
  /** Whether an appointment has already been requested for this clinic */
  appointmentRequested?: boolean
  /** Ref to the CTA buttons container so the parent can track scroll visibility */
  ctaRef?: React.RefObject<HTMLDivElement | null>
}

const CANONICAL_DAYS = [
  { keys: ["monday", "mon"], label: "Mon" },
  { keys: ["tuesday", "tue"], label: "Tue" },
  { keys: ["wednesday", "wed"], label: "Wed" },
  { keys: ["thursday", "thu"], label: "Thu" },
  { keys: ["friday", "fri"], label: "Fri" },
  { keys: ["saturday", "sat"], label: "Sat" },
  { keys: ["sunday", "sun"], label: "Sun" },
]

function getTodayHours(openingHours?: Record<string, any>): string | null {
  if (!openingHours) return null
  const dayIndex = new Date().getDay()
  const todayIdx = dayIndex === 0 ? 6 : dayIndex - 1
  const todayKeys = CANONICAL_DAYS[todayIdx]?.keys || []

  const lowerKeyMap: Record<string, string> = {}
  for (const key of Object.keys(openingHours)) {
    lowerKeyMap[key.toLowerCase()] = key
  }

  const matchedKey = todayKeys.find((k) => lowerKeyMap[k] !== undefined)
  if (!matchedKey) return null

  const hours = openingHours[lowerKeyMap[matchedKey]]
  if (!hours) return null
  if (typeof hours === "string") return hours
  if (typeof hours === "object") {
    return hours.closed ? "Closed today" : `${hours.open} – ${hours.close}`
  }
  return null
}

function getShortArea(postcode: string): string {
  if (!postcode) return ""
  const parts = postcode.trim().split(" ")
  return parts[0] || postcode
}

function formatPriceRange(range: string): string {
  if (range === "budget") return "Budget-friendly"
  if (range === "mid") return "Mid-range"
  if (range === "premium") return "Premium"
  return range || "Mid-range"
}

const categoryLabels: Record<string, string> = {
  treatment: "Treatment match",
  priorities: "Your priorities",
  blockers: "Concerns addressed",
  anxiety: "Anxiety support",
  cost: "Cost & value fit",
  distance: "Location",
  availability: "Appointment times",
}

function MatchBreakdownContent({
  breakdown,
  percentage,
}: {
  breakdown: Array<{ category: string; points: number; maxPoints: number }>
  percentage: number
}) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-sm text-foreground">How we calculated your match</h4>
        <p className="text-xs text-muted-foreground mt-1">
          This shows how well this clinic fits <span className="font-medium">your preferences</span>.
        </p>
      </div>
      <div className="space-y-2.5">
        {breakdown.map((item) => {
          const ratio = item.maxPoints > 0 ? item.points / item.maxPoints : 0
          const stars = Math.round(ratio * 5)
          return (
            <div key={item.category} className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {categoryLabels[item.category] || item.category}
              </span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3 h-3 ${
                      s <= stars ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="pt-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          More stars = stronger match to what you told us matters.
        </p>
      </div>
    </div>
  )
}

const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

interface AvailableDate {
  date: Date
  dayLabel: string     // "Mon"
  dayFull: string      // "Monday"
  dateStr: string      // "17 Feb"
  dateSuffix: string   // "17th February"
  isToday: boolean
  openTime: string | null
  closeTime: string | null
}

function getAvailableDates(clinic: Clinic): AvailableDate[] {
  const dates: AvailableDate[] = []
  const now = new Date()

  for (let i = 0; i < 14 && dates.length < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    const jsDayIndex = d.getDay()
    const canonicalIdx = jsDayIndex === 0 ? 6 : jsDayIndex - 1
    const canonical = CANONICAL_DAYS[canonicalIdx]
    if (!canonical) continue

    let isOpen = true
    let openTime: string | null = null
    let closeTime: string | null = null

    if (clinic.opening_hours && Object.keys(clinic.opening_hours).length > 0) {
      const lowerKeyMap: Record<string, string> = {}
      for (const key of Object.keys(clinic.opening_hours)) {
        lowerKeyMap[key.toLowerCase()] = key
      }
      const matchedKey = canonical.keys.find((k) => lowerKeyMap[k] !== undefined)
      if (!matchedKey) {
        isOpen = false
      } else {
        const hours = clinic.opening_hours[lowerKeyMap[matchedKey]]
        if (!hours || (typeof hours === "object" && hours.closed)) {
          isOpen = false
        } else if (typeof hours === "object") {
          openTime = hours.open || null
          closeTime = hours.close || null
        }
      }
    } else if (clinic.available_days && clinic.available_days.length > 0) {
      const dayLower = canonical.keys.map((k) => k.toLowerCase())
      const hasDay = clinic.available_days.some((ad) =>
        dayLower.includes(ad.toLowerCase())
      )
      if (!hasDay) isOpen = false
    }

    if (!isOpen) continue

    const dayNum = d.getDate()
    const suffix = dayNum === 1 || dayNum === 21 || dayNum === 31 ? "st"
      : dayNum === 2 || dayNum === 22 ? "nd"
      : dayNum === 3 || dayNum === 23 ? "rd"
      : "th"
    const monthFull = d.toLocaleDateString("en-GB", { month: "long" })

    dates.push({
      date: d,
      dayLabel: canonical.label,
      dayFull: DAY_NAMES_FULL[jsDayIndex],
      dateStr: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      dateSuffix: `${dayNum}${suffix} ${monthFull}`,
      isToday: i === 0,
      openTime,
      closeTime,
    })
  }
  return dates
}

function generateTimeSlots(
  openTime: string | null,
  closeTime: string | null,
  availableHours?: string[]
): string[] {
  if (availableHours && availableHours.length > 0) {
    return availableHours
  }

  const parseTime = (t: string): number => {
    const parts = t.replace(/\s/g, "").match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i)
    if (!parts) return -1
    let h = parseInt(parts[1], 10)
    const m = parseInt(parts[2] || "0", 10)
    if (parts[3]) {
      if (parts[3].toLowerCase() === "pm" && h !== 12) h += 12
      if (parts[3].toLowerCase() === "am" && h === 12) h = 0
    }
    return h * 60 + m
  }

  const startMinutes = openTime ? parseTime(openTime) : 9 * 60
  const endMinutes = closeTime ? parseTime(closeTime) : 17 * 60
  const start = startMinutes >= 0 ? startMinutes : 9 * 60
  const end = endMinutes > start ? endMinutes : 17 * 60

  const slots: string[] = []
  for (let m = start; m < end; m += 60) {
    const h = Math.floor(m / 60)
    const min = m % 60
    const period = h >= 12 ? "pm" : "am"
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
    slots.push(`${displayH}:${min.toString().padStart(2, "0")}${period}`)
  }
  return slots
}

function AppointmentPicker({
  clinic,
  step,
  selectedDay,
  selectedTime,
  onSelectDay,
  onSelectTime,
  onBack,
  onConfirm,
}: {
  clinic: Clinic
  step: "day" | "time" | "confirm"
  selectedDay: AvailableDate | null
  selectedTime: string | null
  onSelectDay: (day: AvailableDate) => void
  onSelectTime: (time: string) => void
  onBack: () => void
  onConfirm: () => void
}) {
  const availableDates = getAvailableDates(clinic)
  const timeSlots = selectedDay
    ? generateTimeSlots(selectedDay.openTime, selectedDay.closeTime, clinic.available_hours)
    : []

  return (
    <div className="border border-[#907EFF]/20 rounded-xl bg-[#faf9ff] p-3 animate-in slide-in-from-top-2 duration-200">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-3">
        {step !== "day" && (
          <button
            type="button"
            onClick={onBack}
            className="text-[#907EFF] hover:text-[#7C6AE8] p-0.5 -ml-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <CalendarCheck className="w-3.5 h-3.5 text-[#907EFF]" />
          <span className="text-xs font-semibold text-[#323141]/70">
            {step === "day" && "Select a day"}
            {step === "time" && `${selectedDay?.dayLabel} ${selectedDay?.dateStr} — pick a time`}
            {step === "confirm" && "Confirm your request"}
          </span>
        </div>
      </div>

      {/* Day selection */}
      {step === "day" && (
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          {availableDates.map((day) => (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => onSelectDay(day)}
              className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border border-border/40 bg-white hover:border-[#907EFF]/50 hover:bg-[#907EFF]/5 active:scale-95 transition-all text-center"
            >
              <span className="text-[10px] font-medium text-muted-foreground">
                {day.isToday ? "Today" : day.dayLabel}
              </span>
              <span className="text-xs font-semibold text-[#323141]">
                {day.date.getDate()}
              </span>
              <span className="text-[9px] text-muted-foreground">
                {day.date.toLocaleDateString("en-GB", { month: "short" })}
              </span>
            </button>
          ))}
          {availableDates.length === 0 && (
            <p className="col-span-full text-xs text-muted-foreground text-center py-3">
              No available days found. Try messaging the clinic directly.
            </p>
          )}
        </div>
      )}

      {/* Time selection */}
      {step === "time" && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {timeSlots.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => onSelectTime(time)}
              className="py-2 px-2 rounded-lg border border-border/40 bg-white hover:border-[#907EFF]/50 hover:bg-[#907EFF]/5 active:scale-95 transition-all text-xs font-medium text-[#323141] text-center"
            >
              {time}
            </button>
          ))}
          {timeSlots.length === 0 && (
            <p className="col-span-full text-xs text-muted-foreground text-center py-3">
              No time slots available. Try messaging the clinic directly.
            </p>
          )}
        </div>
      )}

      {/* Confirmation */}
      {step === "confirm" && selectedDay && selectedTime && (
        <div className="space-y-3">
          <div className="bg-white rounded-lg border border-border/40 p-3 text-center">
            <p className="text-sm font-semibold text-[#323141]">
              {selectedDay.dayFull} {selectedDay.dateSuffix}
            </p>
            <p className="text-lg font-bold text-[#907EFF] mt-0.5">{selectedTime}</p>
            <p className="text-[11px] text-muted-foreground mt-1">at {clinic.name}</p>
          </div>
          <Button
            className="w-full h-10 bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white border-0 font-semibold text-sm rounded-xl active:scale-[0.98] transition-transform"
            onClick={onConfirm}
          >
            <Check className="w-4 h-4 mr-2" />
            Confirm and send request
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">
            This sends a message to the clinic — they&apos;ll confirm availability.
          </p>
        </div>
      )}
    </div>
  )
}

export function BookingCard({
  clinic,
  isTopMatch,
  onMessageClick,
  onRequestAppointment,
  appointmentRequested,
  ctaRef,
}: BookingCardProps) {
  const [showMoreDetails, setShowMoreDetails] = useState(false)
  const [showMatchBreakdown, setShowMatchBreakdown] = useState(false)

  // Appointment picker state
  const [showApptPicker, setShowApptPicker] = useState(false)
  const [apptStep, setApptStep] = useState<"day" | "time" | "confirm">("day")
  const [selectedApptDay, setSelectedApptDay] = useState<AvailableDate | null>(null)
  const [selectedApptTime, setSelectedApptTime] = useState<string | null>(null)

  const todayHours = getTodayHours(clinic.opening_hours)
  const shortArea = getShortArea(clinic.postcode)
  const badge = isTopMatch ? "Top match" : "Selected clinic"
  const badgeStyle = isTopMatch
    ? "bg-primary text-primary-foreground"
    : "bg-muted text-muted-foreground"

  const reasons = clinic.match_reasons_composed?.length
    ? clinic.match_reasons_composed
    : clinic.match_reasons?.length
      ? clinic.match_reasons
      : []
  const maxReasons = clinic.is_emergency ? 2 : 3

  return (
    <Card className="overflow-hidden transition-all duration-300 shadow-sm">
      {/* Top section: image left, details right */}
      <div className="flex flex-col sm:flex-row">
        {/* Image + badge */}
        <div className="relative flex-shrink-0 w-full sm:w-40 md:w-48 h-40 sm:h-auto sm:min-h-[220px] bg-muted">
          {clinic.images && clinic.images.length > 0 ? (
            <Image
              src={clinic.images[0] || "/placeholder.svg"}
              alt={clinic.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 200px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          {/* Badge overlay */}
          <div className="absolute top-2.5 left-2.5 sm:top-2 sm:left-2">
            <span className={`inline-block px-2.5 py-1 sm:py-0.5 rounded-full text-[11px] sm:text-xs font-semibold shadow-sm ${badgeStyle}`}>
              {badge}
            </span>
          </div>
          {/* Match % overlay */}
          {clinic.match_percentage && clinic.tier !== "directory" && !clinic.is_directory_listing && (
            <div className="absolute bottom-2.5 left-2.5 sm:bottom-2 sm:left-2">
              <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm text-primary font-semibold text-xs px-2.5 py-1 sm:py-0.5 rounded-full shadow-sm">
                <Sparkles className="w-3 h-3" />
                {clinic.match_percentage}%
              </span>
            </div>
          )}
        </div>

        {/* Right side: details */}
        <div className="flex-1 px-3.5 py-3 sm:p-5 space-y-2.5 sm:space-y-3">
          {/* Name + meta */}
          <div>
            <h2 className="text-base sm:text-xl font-bold text-foreground leading-tight mb-1">
              {clinic.name}
            </h2>
            <div className="flex items-center gap-2 sm:gap-2.5 text-xs text-muted-foreground flex-wrap">
              {clinic.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{clinic.rating}</span>
                  <span className="text-muted-foreground/60">({clinic.review_count})</span>
                </div>
              )}
              {clinic.verified && (
                <div className="flex items-center gap-0.5 text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="font-medium">Verified</span>
                </div>
              )}
              {clinic.distance_miles !== undefined && (
                <div className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  <span>~{clinic.distance_miles.toFixed(1)} mi</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick details grid */}
          <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1.5 text-xs">
            {clinic.languages_spoken && clinic.languages_spoken.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0" />
                <span className="text-muted-foreground truncate">
                  {clinic.languages_spoken.slice(0, 2).join(", ")}
                  {clinic.languages_spoken.length > 2 && ` +${clinic.languages_spoken.length - 2}`}
                </span>
              </div>
            )}

            {todayHours && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0" />
                <span className="text-muted-foreground truncate">{todayHours}</span>
              </div>
            )}

            {shortArea && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0" />
                <span className="text-muted-foreground">{shortArea}</span>
              </div>
            )}

            {clinic.accepts_same_day && (
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-muted-foreground">Same-day</span>
              </div>
            )}

            {clinic.offers_free_consultation && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <span className="text-muted-foreground">Free consult</span>
              </div>
            )}

            {clinic.accepts_nhs && (
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span className="text-muted-foreground">NHS available</span>
              </div>
            )}

            {clinic.price_range && (
              <div className="flex items-center gap-1.5">
                <PoundSterling className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0" />
                <span className="text-muted-foreground">{formatPriceRange(clinic.price_range)}</span>
              </div>
            )}

            {clinic.treatments && clinic.treatments.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0" />
                <span className="text-muted-foreground truncate">
                  {clinic.treatments.slice(0, 2).join(", ")}
                  {clinic.treatments.length > 2 && ` +${clinic.treatments.length - 2}`}
                </span>
              </div>
            )}
          </div>

          {/* Feature chips */}
          {clinic.highlight_chips && clinic.highlight_chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {clinic.highlight_chips.slice(0, 3).map((chip) => {
                const chipData = getChipData(chip)
                return (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/30"
                  >
                    {chipData.icon}
                    {chipData.label}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom section: CTAs, match info, reasons, details */}
      <div className="px-3.5 sm:px-5 pb-3.5 sm:pb-5 space-y-3 sm:space-y-4">

        {/* ── MOBILE CTA: Message + Request appointment ── */}
        <div ref={ctaRef} className="sm:hidden space-y-2">
          <Button
            className="w-full h-11 bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white border-0 font-semibold text-sm rounded-xl shadow-sm active:scale-[0.98] transition-transform"
            onClick={onMessageClick}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Message clinic
          </Button>
          {onRequestAppointment && !appointmentRequested && (
            <Button
              variant="outline"
              className="w-full h-10 rounded-xl text-sm font-medium border-[#907EFF]/30 text-[#907EFF] hover:bg-[#907EFF]/5 active:scale-[0.98] transition-transform"
              onClick={() => {
                setShowApptPicker(!showApptPicker)
                setApptStep("day")
                setSelectedApptDay(null)
                setSelectedApptTime(null)
              }}
            >
              <CalendarCheck className="w-4 h-4 mr-2" />
              {showApptPicker ? "Cancel" : "Request appointment"}
            </Button>
          )}
          {appointmentRequested && (
            <p className="text-[11px] text-center text-green-600 font-medium flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Appointment request sent
            </p>
          )}
        </div>

        {/* ── MOBILE: Appointment picker ── */}
        {showApptPicker && onRequestAppointment && (
          <AppointmentPicker
            clinic={clinic}
            step={apptStep}
            selectedDay={selectedApptDay}
            selectedTime={selectedApptTime}
            onSelectDay={(day) => { setSelectedApptDay(day); setApptStep("time") }}
            onSelectTime={(time) => { setSelectedApptTime(time); setApptStep("confirm") }}
            onBack={() => {
              if (apptStep === "confirm") { setApptStep("time"); setSelectedApptTime(null) }
              else if (apptStep === "time") { setApptStep("day"); setSelectedApptDay(null) }
              else { setShowApptPicker(false) }
            }}
            onConfirm={() => {
              if (selectedApptDay && selectedApptTime) {
                const msg = `Hi! I'd like to request an appointment on ${selectedApptDay.dayFull} ${selectedApptDay.dateSuffix} at ${selectedApptTime}. Would this time be available?`
                setShowApptPicker(false)
                setApptStep("day")
                setSelectedApptDay(null)
                setSelectedApptTime(null)
                onRequestAppointment(msg)
              }
            }}
          />
        )}

        {/* ── Match breakdown ── */}
        {clinic.match_percentage && clinic.match_breakdown && clinic.match_breakdown.length > 0 && (
          <>
            {/* Desktop: popover */}
            <div className="hidden sm:block">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-primary font-semibold text-sm cursor-pointer px-2 py-1.5 -mx-2 rounded-md hover:bg-primary/10 active:bg-primary/20 transition-colors touch-manipulation"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{clinic.match_percentage}% match — see breakdown</span>
                    <Info className="w-4 h-4 text-primary/70" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4" align="start" side="bottom">
                  <MatchBreakdownContent breakdown={clinic.match_breakdown} percentage={clinic.match_percentage} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Mobile: collapsible accordion (collapsed by default) */}
            <div className="sm:hidden">
              <button
                type="button"
                onClick={() => setShowMatchBreakdown(!showMatchBreakdown)}
                className="flex items-center gap-1.5 text-primary font-semibold text-sm cursor-pointer px-2 py-1.5 -mx-2 rounded-md hover:bg-primary/10 active:bg-primary/20 transition-colors touch-manipulation w-full"
              >
                <Sparkles className="w-4 h-4" />
                <span className="flex-1 text-left">{clinic.match_percentage}% match</span>
                {showMatchBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showMatchBreakdown && (
                <div className="px-2 pt-2 pb-1 animate-in slide-in-from-top-2 duration-200">
                  <MatchBreakdownContent breakdown={clinic.match_breakdown} percentage={clinic.match_percentage} />
                </div>
              )}
            </div>
          </>
        )}

        {/* Why we matched you */}
        {reasons.length > 0 && clinic.tier !== "directory" && !clinic.is_directory_listing && (
          <div className="border border-border/40 rounded-xl p-3 bg-gradient-to-br from-white to-[#faf9ff]">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#907EFF]/60" />
              <h3 className="font-semibold text-xs sm:text-sm text-foreground">
                {clinic.card_title || "Why we matched you"}
              </h3>
            </div>
            <div className="space-y-1 sm:space-y-1.5 text-xs sm:text-sm text-foreground/80 leading-relaxed">
              {reasons.slice(0, maxReasons).map((sentence, i) => (
                <p key={i}>{sentence}</p>
              ))}
            </div>
          </div>
        )}

        {/* More details accordion */}
        <div>
          <button
            type="button"
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1.5"
          >
            {showMoreDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>{showMoreDetails ? "Less details" : "More details"}</span>
          </button>

          {showMoreDetails && (
            <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-200">
              {/* Description */}
              {clinic.description && (
                <p className="text-muted-foreground text-sm leading-relaxed">{clinic.description}</p>
              )}

              {/* Full opening hours */}
              {clinic.opening_hours && Object.keys(clinic.opening_hours).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Opening Hours
                  </h4>
                  <div className="space-y-1">
                    {CANONICAL_DAYS.map(({ keys, label }) => {
                      const lowerKeyMap: Record<string, string> = {}
                      for (const key of Object.keys(clinic.opening_hours!)) {
                        lowerKeyMap[key.toLowerCase()] = key
                      }
                      const matchedKey = keys.find((k) => lowerKeyMap[k] !== undefined)
                      if (!matchedKey) return null
                      const hours = clinic.opening_hours![lowerKeyMap[matchedKey]]
                      const formatted =
                        typeof hours === "string"
                          ? hours
                          : typeof hours === "object"
                            ? hours.closed
                              ? "Closed"
                              : `${hours.open} – ${hours.close}`
                            : "—"

                      const dayIndex = new Date().getDay()
                      const todayIdx = dayIndex === 0 ? 6 : dayIndex - 1
                      const isToday = CANONICAL_DAYS.findIndex((d) => d.label === label) === todayIdx

                      return (
                        <div
                          key={label}
                          className={`flex justify-between text-sm py-1 ${isToday ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                        >
                          <span>
                            {label}
                            {isToday && (
                              <span className="ml-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                Today
                              </span>
                            )}
                          </span>
                          <span>{formatted}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Treatments */}
              {clinic.treatments && clinic.treatments.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-muted-foreground" />
                    Treatments
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {clinic.treatments.map((t) => (
                      <span key={t} className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground capitalize">
                        {t.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Accessibility & facilities */}
              {(clinic.wheelchair_accessible || clinic.parking_available) && (
                <div className="flex flex-wrap gap-2">
                  {clinic.wheelchair_accessible && (
                    <span className="inline-flex items-center gap-1.5 text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                      <Accessibility className="w-3 h-3" />
                      Wheelchair accessible
                    </span>
                  )}
                  {clinic.parking_available && (
                    <span className="inline-flex items-center gap-1.5 text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                      <CarFront className="w-3 h-3" />
                      Parking available
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CTA — Desktop: Message + Request appointment */}
        <div className="hidden sm:block space-y-2 pt-3 border-t border-border/40">
          <div className="flex gap-2">
            <Button
              className="flex-1 h-11 bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white border-0 font-semibold text-sm rounded-xl"
              onClick={onMessageClick}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message clinic
            </Button>
            {onRequestAppointment && !appointmentRequested && (
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl text-sm font-medium border-[#907EFF]/30 text-[#907EFF] hover:bg-[#907EFF]/5"
                onClick={() => {
                  setShowApptPicker(!showApptPicker)
                  setApptStep("day")
                  setSelectedApptDay(null)
                  setSelectedApptTime(null)
                }}
              >
                <CalendarCheck className="w-4 h-4 mr-2" />
                {showApptPicker ? "Cancel" : "Request appointment"}
              </Button>
            )}
          </div>
          {appointmentRequested ? (
            <p className="text-xs text-center text-green-600 font-medium flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Appointment request sent — the clinic will confirm availability.
            </p>
          ) : (
            <p className="text-xs text-center text-muted-foreground">
              No pressure — ask a question or request an appointment.
            </p>
          )}

          {/* Desktop: Appointment picker */}
          {showApptPicker && onRequestAppointment && (
            <AppointmentPicker
              clinic={clinic}
              step={apptStep}
              selectedDay={selectedApptDay}
              selectedTime={selectedApptTime}
              onSelectDay={(day) => { setSelectedApptDay(day); setApptStep("time") }}
              onSelectTime={(time) => { setSelectedApptTime(time); setApptStep("confirm") }}
              onBack={() => {
                if (apptStep === "confirm") { setApptStep("time"); setSelectedApptTime(null) }
                else if (apptStep === "time") { setApptStep("day"); setSelectedApptDay(null) }
                else { setShowApptPicker(false) }
              }}
              onConfirm={() => {
                if (selectedApptDay && selectedApptTime) {
                  const msg = `Hi! I'd like to request an appointment on ${selectedApptDay.dayFull} ${selectedApptDay.dateSuffix} at ${selectedApptTime}. Would this time be available?`
                  setShowApptPicker(false)
                  setApptStep("day")
                  setSelectedApptDay(null)
                  setSelectedApptTime(null)
                  onRequestAppointment(msg)
                }
              }}
            />
          )}
        </div>
      </div>
    </Card>
  )
}
