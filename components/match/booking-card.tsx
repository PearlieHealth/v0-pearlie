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
  Shield,
  Clock,
  Globe,
  ChevronDown,
  ChevronUp,
  Calendar,
  MessageCircle,
  Users,
  Zap,
} from "lucide-react"
import Image from "next/image"
import { getChipData } from "@/lib/chipData"
import { ClinicDatePicker } from "@/components/clinic-date-picker"

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
  matchId: string
  leadId: string | null
  onMessageClick: () => void
  onBookSlot: (date: Date, time: string) => void
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
  // UK postcodes: extract outward code (e.g., "W14" from "W14 8QZ")
  const parts = postcode.trim().split(" ")
  return parts[0] || postcode
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

export function BookingCard({
  clinic,
  isTopMatch,
  matchId,
  leadId,
  onMessageClick,
  onBookSlot,
}: BookingCardProps) {
  const [showMoreDetails, setShowMoreDetails] = useState(false)

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
    <Card className="overflow-hidden transition-all duration-300">
      {/* Top: Smaller image banner */}
      <div className="relative h-32 sm:h-40 w-full bg-muted">
        {clinic.images && clinic.images.length > 0 ? (
          <Image
            src={clinic.images[0] || "/placeholder.svg"}
            alt={clinic.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 600px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        {/* Badge overlay */}
        <div className="absolute top-3 left-3">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${badgeStyle}`}>
            {badge}
          </span>
        </div>
        {/* Match % overlay */}
        {clinic.match_percentage && clinic.tier !== "directory" && !clinic.is_directory_listing && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-primary font-semibold text-sm px-3 py-1 rounded-full shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              {clinic.match_percentage}% match
            </span>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Clinic name + meta */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
            {clinic.name}
          </h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            {clinic.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{clinic.rating}</span>
                <span>({clinic.review_count})</span>
              </div>
            )}
            {clinic.verified && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">Verified</span>
              </div>
            )}
            {clinic.distance_miles !== undefined && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>~{clinic.distance_miles.toFixed(1)} mi</span>
              </div>
            )}
          </div>
        </div>

        {/* Clinic at a glance */}
        <div className="border border-border/60 rounded-xl p-4 bg-muted/20 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Clinic at a glance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Languages */}
            {clinic.languages_spoken && clinic.languages_spoken.length > 0 && (
              <div className="flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Languages</p>
                  <p className="text-sm font-medium text-foreground">
                    {clinic.languages_spoken.slice(0, 3).join(", ")}
                    {clinic.languages_spoken.length > 3 && ` +${clinic.languages_spoken.length - 3}`}
                  </p>
                </div>
              </div>
            )}

            {/* Opening times today */}
            {todayHours && (
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Today</p>
                  <p className="text-sm font-medium text-foreground">{todayHours}</p>
                </div>
              </div>
            )}

            {/* Address area */}
            {shortArea && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Area</p>
                  <p className="text-sm font-medium text-foreground">{shortArea}</p>
                </div>
              </div>
            )}

            {/* Same-day emergency */}
            {clinic.accepts_same_day && (
              <div className="flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Availability</p>
                  <p className="text-sm font-medium text-foreground">Same-day appointments</p>
                </div>
              </div>
            )}

            {/* Free consultation */}
            {clinic.offers_free_consultation && (
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Consultation</p>
                  <p className="text-sm font-medium text-foreground">Free consultation</p>
                </div>
              </div>
            )}

            {/* NHS */}
            {clinic.accepts_nhs && (
              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">NHS</p>
                  <p className="text-sm font-medium text-foreground">NHS available</p>
                </div>
              </div>
            )}
          </div>

          {/* Feature chips */}
          {clinic.highlight_chips && clinic.highlight_chips.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
              {clinic.highlight_chips.slice(0, 4).map((chip) => {
                const chipData = getChipData(chip)
                return (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-background px-2.5 py-1 rounded-full border border-border/50"
                  >
                    {chipData.icon}
                    {chipData.label}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Match breakdown popover */}
        {clinic.match_percentage && clinic.match_breakdown && clinic.match_breakdown.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 text-primary font-semibold text-sm cursor-pointer px-2 py-2 -mx-2 rounded-md hover:bg-primary/10 active:bg-primary/20 transition-colors touch-manipulation"
              >
                <Sparkles className="w-4 h-4" />
                <span>{clinic.match_percentage}% match — see breakdown</span>
                <Info className="w-4 h-4 text-primary/70" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="start" side="bottom">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm text-foreground">How we calculated your match</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    This shows how well this clinic fits <span className="font-medium">your preferences</span>.
                  </p>
                </div>
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
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground">
                    More stars = stronger match to what you told us matters.
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Why we matched you */}
        {reasons.length > 0 && clinic.tier !== "directory" && !clinic.is_directory_listing && (
          <div className="border border-border/50 rounded-lg p-4 bg-background">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">
                {clinic.card_title || "Why we matched you"}
              </h3>
            </div>
            <div className="space-y-2 text-sm text-foreground leading-relaxed">
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
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2"
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

              {/* Accessibility */}
              <div className="flex flex-wrap gap-2">
                {clinic.wheelchair_accessible && (
                  <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                    Wheelchair accessible
                  </span>
                )}
                {clinic.parking_available && (
                  <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                    Parking available
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Date Picker */}
        <div className="pt-2 border-t border-border/50">
          <ClinicDatePicker
            availableDays={clinic.available_days || ["mon", "tue", "wed", "thu", "fri"]}
            availableHours={
              clinic.available_hours || [
                "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
              ]
            }
            acceptsSameDay={clinic.accepts_same_day || false}
            onSelectSlot={onBookSlot}
          />
        </div>

        {/* CTAs — Booking-first */}
        <div className="space-y-3 pt-3 border-t border-border/50">
          <div className="flex gap-3">
            <Button
              className="flex-1 h-12 bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white border-0 font-semibold text-base"
              onClick={() =>
                onBookSlot(new Date(), clinic.available_hours?.[0] || "09:00")
              }
            >
              <Calendar className="w-4 h-4 mr-2" />
              Book appointment
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12 bg-transparent"
              onClick={onMessageClick}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message clinic
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            No pressure — message first if you prefer.
          </p>
        </div>
      </div>
    </Card>
  )
}
