"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
  MapPin,
  Star,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Stethoscope,
  CalendarCheck,
  UserRound,
  ExternalLink,
  X,
  GraduationCap,
  Award,
  Loader2,
} from "lucide-react"
import Image from "next/image"
import { getChipData } from "@/lib/chipData"
import { ClinicDatePicker } from "@/components/clinic-date-picker"
import { HOURLY_SLOTS } from "@/lib/constants"

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
  google_place_id?: string
  google_rating?: number
  google_review_count?: number
  google_maps_url?: string
  featured_review?: string
}

interface ProviderProfile {
  id: string
  name: string
  photo_url: string | null
  bio?: string | null
  education?: { degree: string; institution: string }[]
  certifications?: { name: string; date?: string }[]
}

interface BookingCardProps {
  clinic: Clinic
  isTopMatch: boolean
  onMessageClick: () => void
  onRequestAppointment?: (message: string, opts?: { date?: string; time?: string }) => void | Promise<void>
  appointmentRequested?: boolean
  appointmentRequestedAt?: string | null // ISO timestamp
  bookingDate?: string | null
  bookingTime?: string | null
  bookingStatus?: string | null
  bookingDeclineReason?: string | null
  bookingCancelReason?: string | null
  ctaRef?: React.RefObject<HTMLDivElement | null>
  providers?: ProviderProfile[]
  treatmentInterest?: string
  postcode?: string
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

const categoryLabels: Record<string, string> = {
  treatment: "Treatment match",
  priorities: "Your priorities",
  blockers: "Concerns addressed",
  anxiety: "Anxiety support",
  cost: "Cost & value fit",
  distance: "Location",
  availability: "Appointment times",
}

export function BookingCard({
  clinic,
  isTopMatch,
  onMessageClick,
  onRequestAppointment,
  appointmentRequested,
  appointmentRequestedAt,
  bookingDate,
  bookingTime,
  bookingStatus,
  bookingDeclineReason,
  bookingCancelReason,
  ctaRef,
  providers = [],
  treatmentInterest,
  postcode,
}: BookingCardProps) {
  const [showMoreDetails, setShowMoreDetails] = useState(false)
  const [showAllProviders, setShowAllProviders] = useState(false)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [pendingAppointment, setPendingAppointment] = useState<{
    message: string
    dateLabel?: string
    timeLabel?: string
    isoDate?: string  // YYYY-MM-DD for structured booking
    slotTime?: string // HH:MM key for structured booking
  } | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)

  const badge = isTopMatch ? "Top match" : "Selected clinic"
  const badgeStyle = isTopMatch
    ? "bg-[#0fbcb0] text-white"
    : "bg-white/90 text-muted-foreground"

  const reasons = clinic.match_reasons_composed?.length
    ? clinic.match_reasons_composed
    : clinic.match_reasons?.length
      ? clinic.match_reasons
      : []
  const maxReasons = clinic.is_emergency ? 2 : 3

  return (
    <Card className="overflow-hidden transition-all duration-200 ease-out hover:shadow-md border border-[#004443] shadow-sm bg-white rounded">
      {/* Recommended for you banner */}
      {isTopMatch && treatmentInterest && (
        <div className="bg-[#004443] px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-[#0fbcb0] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-[#0fbcb0] uppercase tracking-wide leading-tight">Recommended for you</p>
              <p className="text-xs font-semibold text-white leading-snug mt-0.5 truncate">
                {treatmentInterest}{postcode ? ` near ${postcode}` : ""}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-white/50 flex-shrink-0 hidden sm:block">Based on your preferences</p>
        </div>
      )}

      {/* Map header — compact */}
      <div className="relative w-full h-[100px] sm:h-[110px] bg-[#e5e5e5]">
        {clinic.latitude && clinic.longitude && process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY ? (
          <>
            <iframe
              title={`${clinic.name} location`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY}&q=${encodeURIComponent(clinic.address + ", " + clinic.postcode)}&zoom=15`}
            />
            {/* Block clicks on map iframe to prevent navigation to Google Maps */}
            <div className="absolute inset-0" />
          </>
        ) : clinic.images && clinic.images.length > 0 ? (
          <Image
            src={clinic.images[0] || "/placeholder.svg"}
            alt={clinic.name}
            width={600}
            height={200}
            className="w-full h-full object-cover"
            sizes="(max-width: 768px) 100vw, 600px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#faf8f3]">
            <MapPin className="w-10 h-10 text-[#004443]/20" />
          </div>
        )}
        {/* Badge overlay — top left */}
        <div className="absolute top-2 left-2">
          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold shadow-sm ${badgeStyle}`}>
            {badge}
          </span>
        </div>
        {/* Clinic photo — bottom left, overlapping into body */}
        <div className="absolute -bottom-5 left-3 sm:left-4 z-10">
          <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded overflow-hidden border-2 border-white shadow-md bg-white">
            {clinic.images && clinic.images.length > 0 ? (
              <Image
                src={clinic.images[0] || "/placeholder.svg"}
                alt={clinic.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#004443]">
                <span className="text-white text-lg font-bold">
                  {clinic.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3 pt-8 sm:p-4 sm:pt-9 space-y-2.5">
        {/* Clinic name + match % inline */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm sm:text-base font-bold text-[#004443] leading-tight">
            {clinic.name}
          </h2>
          {clinic.match_percentage && clinic.tier !== "directory" && !clinic.is_directory_listing && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex-shrink-0 flex items-center gap-1 font-bold text-xs cursor-pointer px-2 py-0.5 rounded bg-[#0fbcb0]/10 text-[#004443] hover:bg-[#0fbcb0]/20 transition-colors touch-manipulation"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#0fbcb0]" />
                  <span>{clinic.match_percentage}%</span>
                  <Info className="w-3 h-3 text-[#004443]/40" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="end" side="bottom">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm text-[#004443]">How we calculated your match</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      This shows how well this clinic fits <span className="font-medium">your preferences</span>, not a quality rating.
                    </p>
                  </div>
                  {clinic.match_breakdown && clinic.match_breakdown.length > 0 ? (
                    <div className="space-y-2.5">
                      {clinic.match_breakdown.map((item) => {
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
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Based on your answers about treatment, priorities, and preferences.
                    </p>
                  )}
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] text-muted-foreground">
                      More stars = stronger match to what you told us matters.
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Rating, verified, distance */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          {clinic.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="font-medium text-foreground">{clinic.rating}</span>
              <span>({clinic.review_count})</span>
            </div>
          )}
          {clinic.verified && (
            <div className="flex items-center gap-1 text-[#0fbcb0]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="font-medium">Verified</span>
            </div>
          )}
          {clinic.distance_miles !== undefined && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#004443]" />
              <span>~{clinic.distance_miles.toFixed(1)} mi</span>
            </div>
          )}
        </div>

        {/* Feature chips */}
        {clinic.highlight_chips && clinic.highlight_chips.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {clinic.highlight_chips.slice(0, 4).map((chip: string) => {
              const chipData = getChipData(chip)
              return (
                <span key={chip} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-[#004443]/15 text-[#004443] bg-[#004443]/5">
                  {chipData.icon}
                  {chipData.label}
                </span>
              )
            })}
          </div>
        )}

        {/* Why we matched you — collapsible */}
        {reasons.length > 0 && clinic.tier !== "directory" && !clinic.is_directory_listing && (
          <details className="rounded border border-[#0fbcb0]/30 group">
            <summary className="px-3 py-2 cursor-pointer text-xs font-semibold text-[#0fbcb0] flex items-center justify-between list-none">
              {clinic.card_title || "Why we matched you"}
              <ChevronDown className="w-3.5 h-3.5 text-[#0fbcb0]/50 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="px-3 pb-2.5 space-y-1 text-xs text-[#1a1a1a] leading-relaxed">
              {reasons.slice(0, maxReasons).map((sentence, i) => (
                <p key={i}>{sentence}</p>
              ))}
            </div>
          </details>
        )}

        {/* Availability — ClinicDatePicker always visible */}
        <div className="space-y-3">
          {(!appointmentRequested || bookingStatus === "declined" || bookingStatus === "cancelled") && (
            <ClinicDatePicker
              availableDays={clinic.available_days || ["mon", "tue", "wed", "thu", "fri"]}
              availableHours={clinic.available_hours || ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]}
              acceptsSameDay={clinic.accepts_same_day || false}
              onSelectSlot={(date, time) => {
                const dateLabel = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
                const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                const msg = `Hi! I'd like to request an appointment on ${dateLabel} at ${time}. Would this time be available?`
                setPendingAppointment({ message: msg, dateLabel, timeLabel: time, isoDate, slotTime: time })
              }}
            />
          )}

          {/* Confirmation step */}
          {pendingAppointment && (!appointmentRequested || bookingStatus === "declined" || bookingStatus === "cancelled") && (
            <div className="rounded border-2 border-[#0fbcb0] bg-[#0fbcb0]/5 p-3 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-[10px] font-semibold text-[#004443] uppercase tracking-wide">Confirm your request</p>
                  {pendingAppointment.dateLabel && pendingAppointment.timeLabel ? (
                    <p className="text-xs text-[#1a1a1a] mt-0.5">
                      <span className="font-semibold">{pendingAppointment.dateLabel}</span> at <span className="font-semibold">{pendingAppointment.timeLabel}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-[#1a1a1a] mt-0.5">General appointment request</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPendingAppointment(null)}
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-black/5 transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">
                This will send a message to {clinic.name} requesting this appointment.
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 h-8 rounded text-xs font-semibold bg-[#004443] hover:bg-[#004443]/90 text-white border-0"
                  disabled={isRequesting}
                  onClick={async () => {
                    if (onRequestAppointment) {
                      setIsRequesting(true)
                      await onRequestAppointment(
                        pendingAppointment.message,
                        pendingAppointment.isoDate && pendingAppointment.slotTime
                          ? { date: pendingAppointment.isoDate, time: pendingAppointment.slotTime }
                          : undefined
                      )
                      setIsRequesting(false)
                      setPendingAppointment(null)
                    }
                  }}
                >
                  {isRequesting ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <CalendarCheck className="w-3.5 h-3.5 mr-1" />
                  )}
                  {isRequesting ? "Sending..." : "Confirm request"}
                </Button>
                <Button
                  variant="outline"
                  className="h-8 rounded text-xs px-3"
                  onClick={() => setPendingAppointment(null)}
                  disabled={isRequesting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Appointment status banner */}
          {(appointmentRequested || bookingStatus === "confirmed" || bookingStatus === "declined" || bookingStatus === "cancelled" || bookingStatus === "completed") && (() => {
            const formattedBookingDate = bookingDate
              ? new Date(bookingDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
              : null
            const formattedBookingTime = bookingTime
              ? (HOURLY_SLOTS.find((s) => s.key === bookingTime)?.label || bookingTime)
              : null
            const formattedRequestedAt = appointmentRequestedAt
              ? new Date(appointmentRequestedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
              : null

            // Confirmed
            if (bookingStatus === "confirmed") {
              return (
                <div className="rounded border border-green-200 bg-green-50 p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-green-300 bg-green-100 text-[11px] font-semibold text-green-700">
                      <CheckCircle2 className="w-3 h-3" />
                      Confirmed
                    </span>
                    {formattedBookingDate && (
                      <span className="text-xs text-green-700">
                        {formattedBookingDate}{formattedBookingTime && <> at {formattedBookingTime}</>}
                      </span>
                    )}
                  </div>
                  <Button
                    className="w-full h-8 rounded text-xs font-semibold bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0"
                    onClick={onMessageClick}
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    Message Clinic
                  </Button>
                </div>
              )
            }

            // Declined
            if (bookingStatus === "declined") {
              return (
                <div className="rounded border border-red-200 bg-red-50 p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-red-300 bg-red-100 text-[11px] font-semibold text-red-700">
                      <X className="w-3 h-3" />
                      Declined
                    </span>
                  </div>
                  {bookingDeclineReason && (
                    <p className="text-[11px] text-red-600/80">{bookingDeclineReason}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">You can request a new appointment time.</p>
                  <Button
                    className="w-full h-8 rounded text-xs font-semibold bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0"
                    onClick={onMessageClick}
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    Message Clinic
                  </Button>
                </div>
              )
            }

            // Cancelled
            if (bookingStatus === "cancelled") {
              return (
                <div className="rounded border border-gray-200 bg-gray-50 p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gray-300 bg-gray-100 text-[11px] font-semibold text-gray-700">
                      <X className="w-3 h-3" />
                      Cancelled
                    </span>
                  </div>
                  {bookingCancelReason && (
                    <p className="text-[11px] text-gray-600/80">{bookingCancelReason}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">You can request a new appointment time.</p>
                  <Button
                    className="w-full h-8 rounded text-xs font-semibold bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0"
                    onClick={onMessageClick}
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    Message Clinic
                  </Button>
                </div>
              )
            }

            // Completed
            if (bookingStatus === "completed") {
              return (
                <div className="rounded border border-green-200 bg-green-50 p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-green-300 bg-green-100 text-[11px] font-semibold text-green-700">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed
                    </span>
                    {formattedBookingDate && (
                      <span className="text-xs text-green-700">on {formattedBookingDate}</span>
                    )}
                  </div>
                  <Button
                    className="w-full h-8 rounded text-xs font-semibold bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0"
                    onClick={onMessageClick}
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    Message Clinic
                  </Button>
                </div>
              )
            }

            // Default: Pending/requested
            return (
              <div className="rounded border border-blue-200 bg-blue-50 p-2.5 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-blue-300 bg-blue-100 text-[11px] font-semibold text-blue-700">
                    <CalendarCheck className="w-3 h-3" />
                    Pending confirmation
                  </span>
                  {formattedBookingDate && (
                    <span className="text-xs text-blue-700">
                      {formattedBookingDate}{formattedBookingTime && <> at {formattedBookingTime}</>}
                    </span>
                  )}
                </div>
                {formattedRequestedAt && (
                  <p className="text-[11px] text-blue-600/70">Requested {formattedRequestedAt}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  The clinic will get back to you shortly.
                </p>
                <Button
                  className="w-full h-8 rounded text-xs font-semibold bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0"
                  onClick={onMessageClick}
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1" />
                  Message Clinic
                </Button>
              </div>
            )
          })()}
        </div>

        {/* More details accordion */}
        <div>
          <button
            type="button"
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#004443] hover:text-[#004443]/80 transition-colors w-full py-2 rounded bg-[#faf3e6] hover:bg-[#faf3e6]/80"
          >
            {showMoreDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>{showMoreDetails ? "Less details" : "More details"}</span>
          </button>

          {showMoreDetails && (
            <div className="grid grid-cols-2 gap-2 pt-2.5 animate-in slide-in-from-top-2 duration-200">

              {/* Top-left: Opening Hours */}
              <div className="rounded border border-border/40 p-2.5 bg-white">
                <h4 className="text-xs font-semibold text-[#004443] flex items-center gap-1.5 mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  Opening Hours
                </h4>
                {clinic.opening_hours && Object.keys(clinic.opening_hours).length > 0 ? (
                  <div className="space-y-0.5">
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
                          className={`flex justify-between text-[11px] py-0.5 ${isToday ? "font-semibold text-[#004443]" : "text-muted-foreground"}`}
                        >
                          <span>
                            {label}
                            {isToday && (
                              <span className="ml-1 text-[9px] font-medium text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-full">
                                Today
                              </span>
                            )}
                          </span>
                          <span>{formatted}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Hours not available</p>
                )}
              </div>

              {/* Top-right: Providers */}
              <div className="rounded border border-border/40 p-2.5 bg-white">
                <button
                  type="button"
                  onClick={() => providers.length > 0 && setShowAllProviders(!showAllProviders)}
                  className="w-full text-left flex items-center justify-between mb-2"
                >
                  <h4 className="text-xs font-semibold text-[#004443] flex items-center gap-1.5">
                    <UserRound className="w-3.5 h-3.5" />
                    Providers {providers.length > 0 && <span className="text-muted-foreground font-normal">({providers.length})</span>}
                  </h4>
                  {providers.length > 0 && (
                    <ChevronDown className={`w-3.5 h-3.5 text-[#004443]/50 transition-transform duration-200 ${showAllProviders ? "rotate-180" : ""}`} />
                  )}
                </button>
                {providers.length > 0 ? (
                  <div className="space-y-2">
                    {(showAllProviders ? providers : providers.slice(0, 2)).map((provider) => {
                      const isExpanded = expandedProvider === provider.id
                      const hasBio = !!provider.bio
                      const hasEducation = provider.education && provider.education.length > 0
                      const hasCerts = provider.certifications && provider.certifications.length > 0
                      const hasDetails = hasBio || hasEducation || hasCerts

                      return (
                        <div key={provider.id} className="rounded-lg border border-border/30 overflow-hidden">
                          <div className="flex items-center justify-between px-2.5 py-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-9 w-9 rounded-full overflow-hidden bg-[#f0f0f0] flex-shrink-0 ring-1 ring-border/30">
                                {provider.photo_url ? (
                                  <img src={provider.photo_url} alt={provider.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center bg-[#004443]/10">
                                    <UserRound className="h-4 w-4 text-[#004443]/50" />
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-[#1a1a1a] font-medium truncate">{provider.name}</span>
                            </div>
                            {hasDetails && (
                              <button
                                type="button"
                                onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                                className="text-[10px] font-medium text-muted-foreground border border-border/50 rounded-full px-2 py-0.5 hover:bg-muted/40 transition-colors flex items-center gap-0.5 flex-shrink-0"
                              >
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {isExpanded ? "Less" : "More"}
                              </button>
                            )}
                          </div>

                          {isExpanded && (
                            <div className="px-2.5 pb-2.5 border-t border-border/20 pt-2 space-y-2 animate-in slide-in-from-top-1 duration-150">
                              {hasBio && (
                                <p className="text-[11px] text-[#444] leading-relaxed line-clamp-3">{provider.bio}</p>
                              )}
                              {(hasEducation || hasCerts) && (
                                <div className="space-y-1.5">
                                  {(provider.education || []).map((edu, i) => (
                                    <div key={`edu-${i}`} className="flex items-start gap-1.5">
                                      <div className="rounded bg-[#f0f5ff] p-1 flex-shrink-0 mt-0.5">
                                        <GraduationCap className="h-3 w-3 text-[#3b6fcf]" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-[#1a1a1a]">{edu.degree}</p>
                                        {edu.institution && <p className="text-[10px] text-muted-foreground">{edu.institution}</p>}
                                      </div>
                                    </div>
                                  ))}
                                  {(provider.certifications || []).map((cert, i) => (
                                    <div key={`cert-${i}`} className="flex items-start gap-1.5">
                                      <div className="rounded bg-[#f0f5ff] p-1 flex-shrink-0 mt-0.5">
                                        <Award className="h-3 w-3 text-[#3b6fcf]" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-[#1a1a1a]">{cert.name}</p>
                                        {cert.date && <p className="text-[10px] text-muted-foreground">{cert.date}</p>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {!showAllProviders && providers.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setShowAllProviders(true)}
                        className="text-[11px] text-[#0fbcb0] font-medium hover:underline"
                      >
                        View all {providers.length} providers
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Team info coming soon</p>
                )}
              </div>

              {/* Bottom-left: Treatments */}
              <div className="rounded border border-border/40 p-2.5 bg-white">
                <h4 className="text-xs font-semibold text-[#004443] flex items-center gap-1.5 mb-2">
                  <Stethoscope className="w-3.5 h-3.5" />
                  Treatments
                </h4>
                {clinic.treatments && clinic.treatments.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {clinic.treatments.map((t) => (
                      <span key={t} className="text-[11px] bg-[#004443]/5 px-2 py-0.5 rounded-full text-[#004443] capitalize">
                        {t.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Not listed</p>
                )}
              </div>

              {/* Bottom-right: Reviews */}
              <div className="rounded border border-border/40 p-2.5 bg-white">
                <h4 className="text-xs font-semibold text-[#004443] flex items-center gap-1.5 mb-2">
                  <Star className="w-3.5 h-3.5" />
                  Reviews
                </h4>
                {/* Pearlie rating */}
                {clinic.rating > 0 && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-lg font-bold text-[#1a1a1a]">{clinic.rating}</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${s <= Math.round(clinic.rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground">({clinic.review_count})</span>
                  </div>
                )}
                {/* Featured review */}
                {clinic.featured_review && (
                  <p className="text-[11px] text-[#444] italic leading-relaxed line-clamp-2 mb-2">
                    &ldquo;{clinic.featured_review}&rdquo;
                  </p>
                )}
                {/* Google rating bar */}
                {(clinic.google_rating || clinic.google_review_count) && (
                  <div className="flex items-center gap-2 bg-[#f8f8f8] rounded-md px-2 py-1.5">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold text-[#1a1a1a]">{clinic.google_rating}</span>
                        <span className="text-[10px] text-muted-foreground">({clinic.google_review_count})</span>
                      </div>
                    </div>
                    {clinic.google_place_id && (
                      <a
                        href={`https://search.google.com/local/reviews?placeid=${clinic.google_place_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-medium text-[#4285F4] hover:text-[#1a73e8] flex items-center gap-0.5"
                      >
                        See
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                )}
                {!clinic.rating && !clinic.google_rating && (
                  <p className="text-xs text-muted-foreground">No reviews yet</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CTA: Message + Request appointment */}
        <div ref={ctaRef} className="pt-2 border-t border-border/40">
          {(!appointmentRequested || bookingStatus === "declined" || bookingStatus === "cancelled") && (
            <div className="flex items-center gap-2">
              <Button
                className="flex-1 h-8 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded font-medium text-xs border-0"
                onClick={onMessageClick}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1" />
                Message Clinic
              </Button>
              {onRequestAppointment && !pendingAppointment && (
                <Button
                  className="flex-1 h-8 rounded text-xs font-medium bg-[#004443] hover:bg-[#004443]/90 text-white border-0"
                  onClick={() => {
                    setPendingAppointment({
                      message: "Hi! I'd like to request an appointment. What times do you have available?",
                    })
                  }}
                >
                  <CalendarCheck className="w-3.5 h-3.5 mr-1" />
                  Request Appointment
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
