"use client"


import { useState, useEffect, useRef } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  MapPin,
  Phone,
  Star,
  CheckCircle2,
  Loader2,
  Map,
  List,
  AlertCircle,
  Heart,
  Calendar,
  Sparkles,
  Info,
  MessageCircle,
  CalendarCheck,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ClinicImage } from "@/components/match/clinic-image"
import { ClinicCardSkeleton } from "@/components/clinic-card-skeleton"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { trackEvent, setMatchContext, setMatchId } from "@/lib/analytics"
import { identifyForTikTok, trackTikTokEvent, trackTikTokServerRelay } from "@/lib/tiktok-pixel"
import { generateTikTokEventId } from "@/lib/tiktok-event-id"
import { MatchFiltersPanel } from "@/components/match-filters-panel"
import { OTPVerification } from "@/components/otp-verification"
import { getChipData } from "@/lib/chipData"
import { ClinicDatePicker } from "@/components/clinic-date-picker"

import { GoogleClinicsMap } from "@/components/google-clinics-map"
import { TrustBox } from "@/components/match/trust-box"

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
  distance?: number
  score?: number
  match_reasons?: string[]
  match_reasons_composed?: string[]  // Human-readable sentence paragraphs
  match_reasons_meta?: {
    tagsUsed: string[]
    templatesUsed: string[]
    confidence: number
  }
  match_breakdown?: Array<{
    category: string
    points: number
    maxPoints: number
  }>
  distance_miles?: number
  match_result_id?: string | null
  ai_explanation?: string | null
  ai_headline?: string | null
  ai_proof?: string | null
  match_percentage?: number
  available_this_week?: boolean
  tier?: string
  card_title?: string
  is_directory_listing?: boolean
  is_emergency?: boolean
  offers_free_consultation?: boolean
  highlight_chips?: string[]
  available_days?: string[]
  available_hours?: string[]
  accepts_same_day?: boolean
}

import { calculateHaversineDistance as calculateDistance } from "@/lib/utils/geo"

export default function MatchPage() {
  const params = useParams()
  const matchId = params?.matchId as string

  const [allClinicsData, setAllClinicsData] = useState<Clinic[]>([])
  const [visibleClinicsCount, setVisibleClinicsCount] = useState(3)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "map">("list")
  const [highlightedClinicId, setHighlightedClinicId] = useState<string | null>(null)
  const clinicRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [showExpansionBanner, setShowExpansionBanner] = useState(false)
  const [minDistanceMiles, setMinDistanceMiles] = useState<number | null>(null)
  const [notifyingClinics, setNotifyingClinics] = useState<Set<string>>(new Set())
  const [unreadCount, setUnreadCount] = useState(0)
  const [appointmentRequestedClinics, setAppointmentRequestedClinics] = useState<Record<string, string>>({}) // clinicId -> appointment_requested_at
  const [leadId, setLeadId] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState<boolean | null>(null)
  const [leadEmail, setLeadEmail] = useState<string | null>(null)
  const [leadPostcode, setLeadPostcode] = useState<string | null>(null)
  const [zeroMatchEmail, setZeroMatchEmail] = useState("")
  const [zeroMatchSubmitting, setZeroMatchSubmitting] = useState(false)
  const [zeroMatchWaitlistDone, setZeroMatchWaitlistDone] = useState(false)
  const [filters, setFilters] = useState<any>({
    distanceMiles: null,
    prioritiseDistance: false,
    financeAvailable: false,
    freeConsultation: false,
    sedationAvailable: false,
    verifiedOnly: false,
    highRatingOnly: false,
  })

  const handleClinicHover = (clinicId: string | null) => {
    setHighlightedClinicId(clinicId)
  }

  const handleMapClinicClick = (clinicId: string) => {
    const clinic = allClinicsData.find((c) => c.id === clinicId)
    if (clinic) {
      handleClinicClick(clinic.id, allClinicsData.indexOf(clinic))
    }
  }

  async function fetchInitialMatches() {
    try {
      console.log("[v0] Fetching initial matches for matchId:", matchId)
      const response = await fetch(`/api/matches/${matchId}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || `Failed to fetch matches (${response.status})`)
      }

      const data = await response.json()
      console.log("[v0] Initial matches response:", data)

      // Debug: log image data for each clinic
      if (data.clinics) {
        data.clinics.forEach((c: any, i: number) => {
          console.log(`[v0] Clinic ${i}: ${c.name} | images:`, c.images, `| count: ${c.images?.length || 0}`)
        })
      }

      if (!data.match || !data.clinics) {
        throw new Error("Invalid response structure")
      }

      if (data.match.lead_id) {
        setLeadId(data.match.lead_id)
        console.log("[v0] Set leadId from match:", data.match.lead_id)
      }

      setIsVerified(data.lead?.isVerified ?? false)
      setLeadEmail(data.lead?.email ?? null)
      setLeadPostcode(data.lead?.postcode ?? null)

      if (data.lead?.latitude && data.lead?.longitude) {
        const location = { lat: data.lead.latitude, lon: data.lead.longitude }
        setUserLocation(location)
        console.log("[v0] User location set:", location)

        const clinicsWithDistances = data.clinics.map((clinic: Clinic) => {
          const updatedClinic = { ...clinic }

          if (clinic.latitude && clinic.longitude) {
            const distance = calculateDistance(location.lat, location.lon, clinic.latitude, clinic.longitude)
            updatedClinic.distance_miles = distance
          }

          return updatedClinic
        })

        const distances = clinicsWithDistances
          .map((c: Clinic) => c.distance_miles)
          .filter((d: number | undefined): d is number => d !== undefined)

        if (distances.length > 0) {
          const minDist = Math.min(...distances)
          setMinDistanceMiles(minDist)
          console.log("[v0] Minimum distance to any clinic:", minDist.toFixed(1), "miles")

          if (minDist > 5) {
            setShowExpansionBanner(true)
            console.log("[v0] Showing expansion banner (nearest clinic >5 miles)")
          }
        }

        setAllClinicsData(clinicsWithDistances)
      } else {
        setAllClinicsData(data.clinics)
      }

      setMatchContext(data.match.id, data.match.lead_id)
      setMatchId(data.match.id)
      
      // Track matches shown with clinic count for analytics
      await trackEvent("matches_shown", {
        matchId: data.match.id,
        leadId: data.match.lead_id,
        matchCount: data.clinics.length,
      })
      
      await trackEvent("match_page_viewed", {
        matchId: data.match.id,
        leadId: data.match.lead_id,
        matchCount: data.clinics.length,
      })

      // Save match info to localStorage so landing page can offer "return to matches"
      if (data.lead?.isVerified) {
        try {
          localStorage.setItem("pearlie_last_match", JSON.stringify({
            matchId: data.match.id,
            clinicCount: data.clinics.length,
            treatment: data.lead?.treatmentInterest || "",
            createdAt: new Date().toISOString(),
          }))
        } catch {}
      }
    } catch (err) {
      console.error("[v0] Error fetching initial matches:", err)
      setError(err instanceof Error ? err.message : "Failed to load matches")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (matchId) {
      fetchInitialMatches()
    }
  }, [matchId]) // Remove userLocation dependency since API handles distance now

  // Fetch unread message count and appointment request status for the messages badge
  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await fetch("/api/patient/conversations")
        if (res.ok) {
          const data = await res.json()
          const conversations = data.conversations || []
          const total = conversations.reduce(
            (sum: number, c: { unread_count_patient?: number }) => sum + (c.unread_count_patient || 0),
            0
          )
          setUnreadCount(total)

          // Track which clinics already have appointment requests
          const requested: Record<string, string> = {}
          conversations.forEach((c: { clinic_id: string; appointment_requested_at?: string | null }) => {
            if (c.appointment_requested_at) {
              requested[c.clinic_id] = c.appointment_requested_at
            }
          })
          setAppointmentRequestedClinics(requested)
        }
      } catch {}
    }
    fetchConversations()
  }, [])

  const filteredAndRankedClinics = (() => {
    let clinics = [...allClinicsData]

    // Location
    if (filters.distanceMiles !== null) {
      clinics = clinics.filter((c) => !c.distance_miles || c.distance_miles <= filters.distanceMiles!)
    }

    // Payment
    if (filters.financeAvailable) {
      clinics = clinics.filter((c) =>
        c.highlight_chips?.includes("finance_available") ||
        c.highlight_chips?.includes("finance_0_percent") ||
        c.highlight_chips?.includes("payment_plans")
      )
    }

    if (filters.freeConsultation) {
      clinics = clinics.filter((c) => c.offers_free_consultation === true)
    }

    // Comfort
    if (filters.sedationAvailable) {
      clinics = clinics.filter((c) => c.highlight_chips?.includes("sedation_available"))
    }

    // Trust
    if (filters.verifiedOnly) {
      clinics = clinics.filter((c) => c.verified === true)
    }

    if (filters.highRatingOnly) {
      clinics = clinics.filter((c) => c.rating >= 4.6 && c.review_count >= 50)
    }

    // Sorting
    if (filters.prioritiseDistance && clinics.length > 0) {
      clinics.sort((a, b) => {
        const distA = a.distance_miles ?? 999
        const distB = b.distance_miles ?? 999
        if (distA !== distB) return distA - distB

        const scoreA = a.rating * Math.log(a.review_count + 1)
        const scoreB = b.rating * Math.log(b.review_count + 1)
        return scoreB - scoreA
      })
    }

    return clinics
  })()

  const hasActiveFilters = filters.distanceMiles !== null || filters.financeAvailable || filters.freeConsultation || filters.sedationAvailable || filters.verifiedOnly || filters.highRatingOnly

  const filtersReducedResults = hasActiveFilters && filteredAndRankedClinics.length === 0 && allClinicsData.length > 0

  const displayedClinics = filteredAndRankedClinics

  const visibleClinics = displayedClinics.slice(0, visibleClinicsCount)
  const hasMoreClinics = displayedClinics.length > visibleClinicsCount

  const getClinicLabel = (clinic: Clinic, index: number) => {
    if (clinic.tier === "directory" || clinic.is_directory_listing) {
      return "Listed clinic"
    }
    if (clinic.tier === "nearby") return "Nearby option"
    if (index === 0) return "Top match"
    if (index === 1) return "Strong alternative"
    if (index === 2) return "Great option"
    return null
  }

  const handleClinicClick = (clinicId: string, index: number) => {
    const clinic = displayedClinics.find((c) => c.id === clinicId)
    const positionInList = displayedClinics.findIndex((c) => c.id === clinicId)

    trackEvent("clinic_opened", {
      clinicId,
      meta: {
        match_id: matchId,
        position_in_list: positionInList + 1,
        total_shown: displayedClinics.length,
      },
    })

    // Navigate to clinic detail page within Pearlie (prefer slug for clean URLs)
    const clinicSlug = clinic?.slug || clinicId
    window.location.href = `/clinic/${clinicSlug}?matchId=${matchId}&leadId=${leadId || ''}`
  }

  async function handleClinicAction(
    clinicId: string,
    leadIdParam: string,
    actionType: "click_book" | "click_call",
    website?: string,
    phone?: string,
  ) {
    console.log("[v0] Clinic action:", { clinicId, leadIdParam, actionType })

    const actualLeadId = leadId || leadIdParam

    if (!actualLeadId) {
      console.error("[v0] No leadId available for tracking action")
      return
    }

    // Track in background
    fetch("/api/lead-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: actualLeadId,
        clinicId,
        actionType,
      }),
    }).catch((err) => console.error("[v0] Failed to track clinic action:", err))

    // Navigate
    if (actionType === "click_call" && phone) {
      window.location.href = `tel:${phone}`
    }
  }

  const formatPriceRange = (range: string) => {
    if (range === "budget") return "£"
    if (range === "mid") return "££"
    if (range === "premium") return "£££"
    return "££"
  }

  const observerRef = useRef<IntersectionObserver | null>(null)
  const [trackedCardViews, setTrackedCardViews] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const clinicId = entry.target.getAttribute("data-clinic-id")
            if (clinicId && !trackedCardViews.has(clinicId)) {
              const positionInList = displayedClinics.findIndex((c) => c.id === clinicId)

              trackEvent("clinic_card_viewed", {
                clinicId,
                meta: {
                  match_id: matchId,
                  position_in_list: positionInList,
                  total_shown: displayedClinics.length,
                },
              })

              setTrackedCardViews((prev) => new Set([...prev, clinicId]))
            }
          }
        })
      },
      {
        threshold: 0.5,
      },
    )

    const currentVisibleRefs = Object.entries(clinicRefs.current).filter(([id]) =>
      visibleClinics.some((c) => c.id === id),
    )

    currentVisibleRefs.forEach(([_, ref]) => {
      if (ref) {
        observerRef.current?.observe(ref)
      }
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [visibleClinics, matchId, trackedCardViews, displayedClinics]) // Depend on visibleClinics and displayedClinics

  const handleVerificationSuccess = async (data?: { sessionToken?: string; sessionEstablished?: boolean }) => {
    setIsVerified(true)
    await identifyForTikTok({ email: leadEmail || undefined, externalId: leadId || undefined })
    trackTikTokEvent("CompleteRegistration", { content_name: "otp_verified_match" })
    trackEvent("email_verified", { leadId, matchId })
    // Save match for "return to matches" on landing page
    try {
      localStorage.setItem("pearlie_last_match", JSON.stringify({
        matchId,
        clinicCount: allClinicsData.length,
        treatment: "",
        createdAt: new Date().toISOString(),
      }))
    } catch {}
    // Session is already established by OTPVerification component (await + confirm).
    // Re-fetch matches now that the user is authenticated — the API will return
    // lead location data (lat/lon/postcode) for the owner, enabling the map.
    if (data?.sessionEstablished) {
      fetchInitialMatches()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f3]">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="space-y-4 mt-8">
              <ClinicCardSkeleton />
              <ClinicCardSkeleton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center p-4">
        <Empty>
          <EmptyHeader>
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <EmptyTitle>Unable to load matches</EmptyTitle>
            <EmptyDescription>{error}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/">Start a new search</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  if (isVerified === false && leadId && leadEmail) {
    return (
      <div className="min-h-screen bg-[#faf8f3]">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center justify-center gap-2.5 mb-6">
              <div className="rounded-full bg-[#0fbcb0] p-2">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-semibold text-xl text-[#0fbcb0]">Pearlie</span>
            </Link>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Verify your email to see your matches</h1>
            <p className="text-muted-foreground">
              We found clinics that match your needs. Verify your email to view your personalised results.
            </p>
          </div>

          <OTPVerification leadId={leadId} email={leadEmail} onVerified={handleVerificationSuccess} />
          <p className="text-center text-sm text-muted-foreground mt-6">
            This helps us ensure you receive accurate information and protects your privacy.
          </p>
        </div>
      </div>
    )
  }

  const match = { lead_id: leadId } // Assuming match object is needed for clinic actions

  return (
    <div className="min-h-screen bg-[#faf8f3]">
      {/* Glass nav matching landing page */}
      <header className="fixed top-3 left-3 right-3 md:top-5 md:left-8 md:right-8 z-50">
        <div className="rounded-[3.4vw] bg-white/70 backdrop-blur-[40px] backdrop-saturate-[1.4] border border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] px-4 sm:px-6 py-2.5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="rounded-full bg-[#0fbcb0] p-1.5">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#0fbcb0]">Pearlie</span>
            </Link>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground hidden sm:block">
                {displayedClinics.length} {displayedClinics.length === 1 ? "clinic" : "clinics"} matched
              </p>
              <Link href="/patient/dashboard" className="relative p-2 rounded-full hover:bg-black/5 transition-colors">
                <MessageCircle className="w-5 h-5 text-[#0fbcb0]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <Button
                size="sm"
                className="text-sm px-5 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full shadow-sm hover:shadow-md transition-all border-0"
                asChild
              >
                <Link href="/intake">New search</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-20 md:pt-24 pb-8">
        {loading && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-[#004443] mb-4" />
              <p className="text-muted-foreground text-lg">Finding your clinic matches...</p>
            </div>
            <div className="grid gap-6">
              {[1, 2, 3].map((i) => (
                <ClinicCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <Empty>
            <EmptyHeader>
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <EmptyTitle className="text-[#004443]">Unable to load matches</EmptyTitle>
              <EmptyDescription className="text-muted-foreground">{error}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => window.location.reload()} variant="default">
                Try again
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {!loading && !error && allClinicsData.length === 0 && (
          <Empty>
            <EmptyHeader>
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#004443]/10 mx-auto mb-4">
                <MapPin className="w-8 h-8 text-[#004443]/50" />
              </div>
              <EmptyTitle className="text-[#004443]">No matching clinics found</EmptyTitle>
              <EmptyDescription className="text-muted-foreground">
                We couldn&apos;t find clinics matching your criteria right now. We&apos;re growing our network — try one of the options below.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant="default" className="bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0">
                  <Link href="/intake">Try a different postcode</Link>
                </Button>
              </div>

              {/* Waitlist email capture */}
              {!zeroMatchWaitlistDone ? (
                <div className="mt-6 max-w-sm mx-auto">
                  <p className="text-sm text-muted-foreground mb-2">
                    Get notified when we add clinics in your area:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={zeroMatchEmail}
                      onChange={(e) => setZeroMatchEmail(e.target.value)}
                      className="flex-1 h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#0fbcb0]/40"
                    />
                    <Button
                      size="sm"
                      disabled={!zeroMatchEmail.includes("@") || zeroMatchSubmitting}
                      className="bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0"
                      onClick={async () => {
                        setZeroMatchSubmitting(true)
                        try {
                          await fetch("/api/waitlist", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              email: zeroMatchEmail,
                              postcode: leadPostcode || "unknown",
                              area: "zero_matches",
                            }),
                          })
                          setZeroMatchWaitlistDone(true)
                        } catch {
                          // Silently fail
                        } finally {
                          setZeroMatchSubmitting(false)
                        }
                      }}
                    >
                      {zeroMatchSubmitting ? "..." : "Notify me"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#0fbcb0] font-medium">
                  We&apos;ll notify you when clinics are available in your area.
                </p>
              )}
            </EmptyContent>
          </Empty>
        )}

        {!loading && !error && allClinicsData.length > 0 && (
          <>
            {showExpansionBanner && (
              <Alert className="mb-8 border-[#004443]/20 bg-white shadow-sm">
                <Info className="h-5 w-5 text-[#004443]" />
                <AlertDescription className="ml-2">
                  <div className="space-y-2">
                    <p className="font-semibold text-lg text-[#004443]">We're expanding to your area</p>
                    <p className="text-sm text-muted-foreground">
                      We're launching London first. You can still explore clinics nearby
                      {minDistanceMiles && <> (closest is ~{minDistanceMiles.toFixed(1)} miles away)</>}
                      and we'll notify you as we expand.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">
              {/* LEFT: Clinic Cards */}
              <div className="flex-1 min-w-0 order-2 lg:order-1">
                {/* Mobile: filter button + map toggle */}
                <div className="flex items-center gap-2 mb-4 lg:hidden">
                  <MatchFiltersPanel filters={filters} onFiltersChange={setFilters} isMobile />
                  {allClinicsData.some(c => c.latitude && c.longitude) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
                      className="gap-1.5 text-[#004443] border border-[#004443]/20 hover:bg-[#004443]/5"
                    >
                      {viewMode === "map" ? <><List className="w-4 h-4" /> List</> : <><Map className="w-4 h-4" /> Map</>}
                    </Button>
                  )}
                </div>

                {/* Mobile map view */}
                {viewMode === "map" && (
                  <div className="lg:hidden mb-4">
                    <div className="h-[300px] rounded-2xl overflow-hidden shadow-sm border border-border/50">
                      <GoogleClinicsMap clinics={allClinicsData} highlightedClinicId={highlightedClinicId} onClinicHover={handleClinicHover} onClinicClick={handleMapClinicClick} />
                    </div>
                  </div>
                )}

                {/* Filter empty state */}
                {filtersReducedResults && (
                  <div className="rounded-2xl border border-[#004443]/10 bg-white p-6 text-center mb-4">
                    <MapPin className="w-8 h-8 text-[#004443]/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-[#004443] mb-1">No clinics match your current filters</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Try widening your search — {allClinicsData.length} {allClinicsData.length === 1 ? "clinic is" : "clinics are"} available without filters.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-[#004443]/20 text-[#004443] hover:bg-[#004443]/5"
                      onClick={() => setFilters({
                        distanceMiles: null,
                        prioritiseDistance: false,
                        financeAvailable: false,
                        freeConsultation: false,
                        sedationAvailable: false,
                        verifiedOnly: false,
                        highRatingOnly: false,
                      })}
                    >
                      Clear all filters
                    </Button>
                  </div>
                )}

                {/* Clinic cards list */}
                <div className="space-y-4">
                  {visibleClinics.map((clinic, index) => {
                    const isFirstNonVerified =
                      !clinic.verified &&
                      (index === 0 || visibleClinics.slice(0, index).every(c => c.verified));

                    return (
                      <div key={clinic.id}>
                        {isFirstNonVerified && (
                          <div className="py-3 border-t border-[#004443]/10">
                            <p className="text-xs text-muted-foreground text-center">
                              Other clinics (not verified by Pearlie)
                            </p>
                          </div>
                        )}
                          <Card
                            ref={(el) => { clinicRefs.current[clinic.id] = el }}
                            data-clinic-id={clinic.id}
                            onMouseEnter={() => handleClinicHover(clinic.id)}
                            onMouseLeave={() => handleClinicHover(null)}
                            className={`overflow-hidden transition-all duration-200 ease-out hover:shadow-lg border-0 shadow-sm bg-white rounded-2xl ${
                              highlightedClinicId === clinic.id ? "ring-2 ring-[#0fbcb0] shadow-lg" : ""
                            }`}
                          >
                            {/* Photo banner — flush on mobile, inset with rounded edges on desktop */}
                            <div className="lg:px-4 lg:pt-4">
                              <div className="relative">
                              {clinic.images && clinic.images.length > 0 ? (
                                <ClinicImage
                                  src={clinic.images[0]}
                                  alt={clinic.name}
                                  width={600}
                                  height={200}
                                  className="w-full h-[140px] sm:h-[180px] lg:h-[135px] object-cover lg:rounded-xl"
                                  fallbackClassName="w-full h-[140px] sm:h-[180px] lg:h-[135px] flex items-center justify-center lg:rounded-xl bg-[#004443]"
                                  sizes="(max-width: 768px) 100vw, 600px"
                                />
                              ) : (
                                <div className="w-full h-[140px] sm:h-[180px] lg:h-[135px] bg-[#faf8f3] flex items-center justify-center lg:rounded-xl">
                                  <MapPin className="w-10 h-10 text-[#004443]/20" />
                                </div>
                              )}
                              {/* Label overlay on image */}
                              {getClinicLabel(clinic, index) && (
                                <div className="absolute top-3 left-3">
                                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${
clinic.tier === "directory" || clinic.tier === "nearby" || clinic.is_directory_listing
                                        ? "bg-white/90 text-muted-foreground"
                                        : "bg-[#0fbcb0] text-white"
                                  }`}>
                                    {getClinicLabel(clinic, index)}
                                  </span>
                                </div>
                              )}
                              </div>
                            </div>

                            {/* Card body */}
                            <div className="p-5 sm:p-6 lg:p-4 lg:pt-3">
                              {/* Clinic name + match % inline */}
                              <div className="flex items-start justify-between gap-3 mb-2 lg:mb-1">
                                <h2
                                  onClick={() => handleClinicClick(clinic.id, index)}
                                  className="text-lg sm:text-xl lg:text-lg font-bold cursor-pointer text-[#004443] hover:text-[#004443]/80 transition-colors duration-200 leading-tight"
                                >
                                  {clinic.name}
                                </h2>
                                {clinic.match_percentage != null && clinic.match_percentage > 0 && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button
                                        type="button"
                                        className={`flex-shrink-0 flex items-center gap-1 font-bold text-sm cursor-pointer px-2.5 py-1 rounded-full transition-colors touch-manipulation ${
                                          clinic.is_directory_listing || clinic.tier === "directory"
                                            ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            : "bg-[#0fbcb0]/10 text-[#004443] hover:bg-[#0fbcb0]/20"
                                        }`}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {clinic.is_directory_listing || clinic.tier === "directory" ? (
                                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                        ) : (
                                          <Sparkles className="w-3.5 h-3.5 text-[#0fbcb0]" />
                                        )}
                                        <span>{clinic.match_percentage}%</span>
                                        <Info className="w-3 h-3 text-[#004443]/40" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-4" align="end" side="bottom">
                                      <div className="space-y-3">
                                        <div>
                                          <h4 className="font-semibold text-sm text-[#004443]">
                                            {clinic.is_directory_listing || clinic.tier === "directory"
                                              ? "Relevance score"
                                              : "How we calculated your match"}
                                          </h4>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {clinic.is_directory_listing || clinic.tier === "directory"
                                              ? "Based on proximity and reviews. This clinic hasn't been verified by Pearlie yet."
                                              : <>This shows how well this clinic fits <span className="font-medium">your preferences</span>, not a quality rating.</>}
                                          </p>
                                        </div>
                                        {clinic.match_breakdown && clinic.match_breakdown.length > 0 ? (
                                          <div className="space-y-2.5">
                                            {clinic.match_breakdown.map((item) => {
                                              const ratio = item.maxPoints > 0 ? item.points / item.maxPoints : 0
                                              const stars = Math.round(ratio * 5)
                                              const categoryLabels: Record<string, string> = {
                                                treatment: "Treatment match",
                                                priorities: "Your priorities",
                                                blockers: "Concerns addressed",
                                                anxiety: "Anxiety support",
                                                cost: "Cost & value fit",
                                                distance: "Location",
                                                availability: "Appointment times",
                                                reviews: "Patient reviews",
                                                completeness: "Profile detail",
                                              }
                                              return (
                                                <div key={item.category} className="flex items-center justify-between gap-2">
                                                  <span className="text-xs text-muted-foreground">
                                                    {categoryLabels[item.category] || item.category}
                                                  </span>
                                                  <div className="flex items-center gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                      <Star
                                                        key={star}
                                                        className={`w-3 h-3 ${
                                                          star <= stars
                                                            ? "fill-amber-400 text-amber-400"
                                                            : "fill-muted text-muted"
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
                              <div className="flex items-center gap-3 text-sm lg:text-xs text-muted-foreground flex-wrap mb-3 lg:mb-2">
                                <div className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                  <span className="font-medium text-foreground">{clinic.rating}</span>
                                  <span>({clinic.review_count})</span>
                                </div>
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
                                <div className="flex flex-wrap gap-1.5 mb-4 lg:mb-3">
                                  {clinic.highlight_chips.slice(0, 4).map((chip: string) => {
                                    const chipData = getChipData(chip)
                                    return (
                                      <span key={chip} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-[#004443]/15 text-[#004443] bg-[#004443]/5">
                                        {chipData.icon}
                                        {chipData.label}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}

                              {/* Why we matched you - teal border only, no fill */}
                              <div className="rounded-xl p-3.5 lg:p-3 border border-[#0fbcb0]/30 mb-4 lg:mb-3">
                                <h3 className="font-semibold text-xs lg:text-sm text-[#0fbcb0] mb-1.5">
                                  {clinic.card_title || (clinic.tier === "directory"
                                    ? "About this clinic"
                                    : clinic.tier === "nearby"
                                      ? "Other option in your area"
                                      : "Why we matched you")}
                                </h3>
                                <div className="space-y-1.5 text-xs lg:text-sm text-[#1a1a1a] leading-relaxed">
                                  {clinic.tier === "directory" || clinic.is_directory_listing ? (
                                    (() => {
                                      const reasons = clinic.match_reasons_composed && clinic.match_reasons_composed.length > 0
                                        ? clinic.match_reasons_composed
                                        : clinic.match_reasons && clinic.match_reasons.length > 0
                                          ? clinic.match_reasons
                                          : []
                                      if (reasons.length > 0) {
                                        return reasons.slice(0, 2).map((sentence: string, i: number) => (
                                          <p key={i}>{sentence}</p>
                                        ))
                                      }
                                      return (
                                        <>
                                          <p>This clinic is listed in our directory and may be able to help with your dental needs.</p>
                                          {clinic.distance_miles && (
                                            <p>Located approximately {clinic.distance_miles.toFixed(1)} miles from your location.</p>
                                          )}
                                        </>
                                      )
                                    })()
                                  ) : clinic.tier === "nearby" ? (
                                    <>
                                      <p>This clinic is located nearby and may be able to help with your dental needs.</p>
                                      {clinic.distance_miles && (
                                        <p>Located approximately {clinic.distance_miles.toFixed(1)} miles from your location.</p>
                                      )}
                                    </>
                                  ) : (
                                    (() => {
                                      const reasons = clinic.match_reasons_composed && clinic.match_reasons_composed.length > 0
                                        ? clinic.match_reasons_composed
                                        : clinic.match_reasons && clinic.match_reasons.length > 0
                                          ? clinic.match_reasons
                                          : []
                                      const maxReasons = clinic.is_emergency ? 2 : 3
                                      return reasons.slice(0, maxReasons).map((sentence: string, i: number) => (
                                        <p key={i}>{sentence}</p>
                                      ))
                                    })()
                                  )}
                                </div>
                              </div>

                              {/* Availability / Already Requested */}
                              <div className="mb-4 lg:mb-3">
                                {appointmentRequestedClinics[clinic.id] ? (
                                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5">
                                    <div className="flex items-start gap-2.5">
                                      <CalendarCheck className="w-[18px] h-[18px] text-blue-600 flex-shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-sm font-medium text-blue-700">Appointment already requested</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          Requested {new Date(appointmentRequestedClinics[clinic.id]).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          The clinic will get back to you shortly.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <ClinicDatePicker
                                    availableDays={clinic.available_days || ["mon", "tue", "wed", "thu", "fri"]}
                                    acceptsSameDay={clinic.accepts_same_day || false}
                                    onSelectDate={(date) => {
                                      trackTikTokEvent("InitiateCheckout", { content_name: "select_date" })
                                      const dateStr = date.toISOString().split("T")[0]
                                      window.location.href = `/booking/confirm?clinicId=${clinic.id}&leadId=${match.lead_id}&date=${dateStr}&matchId=${matchId}`
                                    }}
                                  />
                                )}
                              </div>

                              {/* CTA */}
                              <div className="flex items-center gap-3">
                                {clinic.tier === "directory" || clinic.is_directory_listing ? (
                                  /* Directory listings: Call button (if phone available) + View Profile */
                                  <>
                                    {clinic.phone && (
                                      <Button
                                        className="flex-1 h-11 lg:h-10 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full font-medium text-sm border-0"
                                        onClick={() => handleClinicAction(clinic.id, leadId || match.lead_id || "", "click_call", undefined, clinic.phone)}
                                      >
                                        <Phone className="w-4 h-4 mr-1.5" />
                                        Call Clinic
                                      </Button>
                                    )}
                                  </>
                                ) : (
                                  <Button
                                    className="flex-1 h-11 lg:h-10 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full font-medium text-sm border-0"
                                    asChild
                                    onClick={() => {
                                      const contactEventId = generateTikTokEventId()
                                      trackTikTokEvent("Contact", { content_name: "message_clinic_match_page" }, contactEventId)
                                      trackTikTokServerRelay("Contact", {
                                        event_id: contactEventId,
                                        lead_id: leadId || match.lead_id,
                                        clinic_id: clinic.id,
                                        properties: { content_name: "message_clinic_match_page" },
                                      })
                                    }}
                                  >
                                    <Link href={`/clinic/${clinic.slug || clinic.id}?matchId=${matchId}&leadId=${leadId || match.lead_id}&chat=open`}>
                                      <MessageCircle className="w-4 h-4 mr-1.5" />
                                      Message Clinic
                                    </Link>
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  className="flex-1 h-11 lg:h-10 rounded-full font-medium text-sm text-[#004443] border-[#004443]/20 hover:bg-[#004443]/5"
                                  asChild
                                >
                                  <Link href={`/clinic/${clinic.slug || clinic.id}?matchId=${matchId}&leadId=${leadId || match.lead_id}`}>
                                    View Profile
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </Card>

                        {/* Mobile trust box — shown after 4th clinic */}
                        {index === 3 && (
                          <div className="lg:hidden mt-4">
                            <TrustBox />
                          </div>
                        )}
                        </div>
                      )
                    })}
                  {hasMoreClinics && (
                    <div className="flex justify-center mt-4">
                      <Button onClick={() => setVisibleClinicsCount((prev) => prev + 3)} variant="outline" size="sm" className="border-[#004443]/20 text-[#004443] hover:bg-[#004443]/5 bg-white rounded-full text-sm">
                        Show more clinics
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Map + Filters + Trust (desktop only) */}
              <aside className="hidden lg:block flex-1 max-w-[480px] order-2">
                <div className="sticky top-24 space-y-4">
                  {/* Map - square (show whenever we have clinics with coordinates) */}
                  {allClinicsData.some(c => c.latitude && c.longitude) && (
                    <div className="aspect-square rounded-2xl overflow-hidden shadow-sm border border-border/50">
                      <GoogleClinicsMap clinics={allClinicsData} highlightedClinicId={highlightedClinicId} onClinicHover={handleClinicHover} onClinicClick={handleMapClinicClick} />
                    </div>
                  )}

                  {/* Filters - compact under map */}
                  <MatchFiltersPanel filters={filters} onFiltersChange={setFilters} />

                  {/* Trust & Standards */}
                  <TrustBox />
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
