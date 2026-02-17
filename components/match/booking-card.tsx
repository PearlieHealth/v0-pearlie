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
  MessageCircle,
  Zap,
  Stethoscope,
  PoundSterling,
  Accessibility,
  CarFront,
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

export function BookingCard({
  clinic,
  isTopMatch,
  onMessageClick,
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
      {/* Top section: image left, details right */}
      <div className="flex flex-col sm:flex-row">
        {/* Image + badge */}
        <div className="relative flex-shrink-0 w-full sm:w-40 md:w-48 h-44 sm:h-auto sm:min-h-[220px] bg-muted">
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
          <div className="absolute top-2 left-2">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeStyle}`}>
              {badge}
            </span>
          </div>
          {/* Match % overlay */}
          {clinic.match_percentage && clinic.tier !== "directory" && !clinic.is_directory_listing && (
            <div className="absolute bottom-2 left-2">
              <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-primary font-semibold text-xs px-2 py-0.5 rounded-full shadow-sm">
                <Sparkles className="w-3 h-3" />
                {clinic.match_percentage}%
              </span>
            </div>
          )}
        </div>

        {/* Right side: details */}
        <div className="flex-1 p-4 sm:p-5 space-y-3">
          {/* Name + meta */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight mb-1.5">
              {clinic.name}
            </h2>
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
              {clinic.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{clinic.rating}</span>
                  <span>({clinic.review_count})</span>
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
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {clinic.languages_spoken && clinic.languages_spoken.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground truncate">
                  {clinic.languages_spoken.slice(0, 2).join(", ")}
                  {clinic.languages_spoken.length > 2 && ` +${clinic.languages_spoken.length - 2}`}
                </span>
              </div>
            )}

            {todayHours && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground truncate">{todayHours}</span>
              </div>
            )}

            {shortArea && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
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
                <PoundSterling className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">{formatPriceRange(clinic.price_range)}</span>
              </div>
            )}

            {clinic.treatments && clinic.treatments.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
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
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/40"
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

      {/* Bottom section: match info, reasons, CTAs */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
        {/* Match breakdown popover */}
        {clinic.match_percentage && clinic.match_breakdown && clinic.match_breakdown.length > 0 && (
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
          <div className="border border-border/50 rounded-lg p-3 bg-background">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm text-foreground">
                {clinic.card_title || "Why we matched you"}
              </h3>
            </div>
            <div className="space-y-1.5 text-sm text-foreground leading-relaxed">
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

        {/* CTA — Message clinic */}
        <div className="space-y-2 pt-3 border-t border-border/50">
          <Button
            className="w-full h-11 bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white border-0 font-semibold text-sm"
            onClick={onMessageClick}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Message clinic
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            No pressure — ask a question or request an appointment.
          </p>
        </div>
      </div>
    </Card>
  )
}
