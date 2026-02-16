"use client"


import { useState, useEffect, useRef, Suspense, lazy } from "react"
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
  Shield,
  Clock,
  MessageCircle,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import Image from "next/image"
import { ClinicCardSkeleton } from "@/components/clinic-card-skeleton"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { trackEvent, setMatchContext, setMatchId } from "@/lib/analytics"
import { MatchFiltersPanel } from "@/components/match-filters-panel"
import { OTPVerification } from "@/components/otp-verification"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { createClient } from "@/lib/supabase/client"
import { getChipData } from "@/lib/chipData"
import { ClinicDatePicker } from "@/components/clinic-date-picker"

const ClinicsMap = lazy(() => import("@/components/clinics-map").then((mod) => ({ default: mod.ClinicsMap })))

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
  const [visibleClinicsCount, setVisibleClinicsCount] = useState(2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "map">("list")
  const [highlightedClinicId, setHighlightedClinicId] = useState<string | null>(null)
  const clinicRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [showExpansionBanner, setShowExpansionBanner] = useState(false)
  const [minDistanceMiles, setMinDistanceMiles] = useState<number | null>(null)
  const [notifyingClinics, setNotifyingClinics] = useState<Set<string>>(new Set())
  const [leadId, setLeadId] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState<boolean | null>(null)
  const [leadEmail, setLeadEmail] = useState<string | null>(null)
  const [filters, setFilters] = useState<any>({
    distanceMiles: null,
    priceRanges: [],
    verifiedOnly: false,
    highRatingOnly: false,
    acceptsNhs: false,
    wheelchairAccessible: false,
    parkingAvailable: false,
    freeConsultation: false,
    prioritiseDistance: false,
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

      if (!data.match || !data.clinics) {
        throw new Error("Invalid response structure")
      }

      if (data.match.lead_id) {
        setLeadId(data.match.lead_id)
        console.log("[v0] Set leadId from match:", data.match.lead_id)
      }

      setIsVerified(data.lead?.isVerified ?? false)
      setLeadEmail(data.lead?.email ?? null)

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

  const filteredAndRankedClinics = (() => {
    let clinics = [...allClinicsData]

    if (filters.distanceMiles !== null) {
      clinics = clinics.filter((c) => !c.distance_miles || c.distance_miles <= filters.distanceMiles!)
    }

    if (filters.priceRanges.length > 0) {
      clinics = clinics.filter((c) => filters.priceRanges.includes(c.price_range))
    }

    if (filters.verifiedOnly) {
      clinics = clinics.filter((c) => c.verified === true)
    }

    if (filters.highRatingOnly) {
      clinics = clinics.filter((c) => c.rating >= 4.6 && c.review_count >= 50)
    }

    if (filters.acceptsNhs) {
      clinics = clinics.filter((c) => c.accepts_nhs === true)
    }

    if (filters.wheelchairAccessible) {
      clinics = clinics.filter((c) => c.wheelchair_accessible === true)
    }

    if (filters.parkingAvailable) {
      clinics = clinics.filter((c) => c.parking_available === true)
    }

    if (filters.freeConsultation) {
      clinics = clinics.filter((c) => c.offers_free_consultation === true)
    }

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

  const needsExpansion =
    filters.distanceMiles !== null && filteredAndRankedClinics.length < 2 && allClinicsData.length > 2

  const displayedClinics = needsExpansion
    ? [...allClinicsData].sort((a, b) => (a.distance_miles ?? 999) - (b.distance_miles ?? 999)).slice(0, 3)
    : filteredAndRankedClinics

  const visibleClinics = displayedClinics.slice(0, visibleClinicsCount)
  const hasMoreClinics = displayedClinics.length > visibleClinicsCount

  const getClinicLabel = (clinic: Clinic, index: number) => {
    if (clinic.tier === "directory" || clinic.is_directory_listing) {
      return clinic.verified === false ? "Unverified clinic" : "In our directory"
    }
    if (clinic.tier === "nearby") return "Nearby option"
    if (index === 0) return "Top match"
    if (index === 1) return "Strong alternative"
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

  const handleVerificationSuccess = () => {
    setIsVerified(true)
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
  }

  // Check for existing Supabase auth session (e.g. returning from Google OAuth)
  // If the user is authenticated via Google, auto-verify the lead
  const [googleVerifying, setGoogleVerifying] = useState(false)

  useEffect(() => {
    if (isVerified !== false || !leadId || !leadEmail || googleVerifying) return

    async function checkGoogleSession() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user?.email) return
        if (user.email.toLowerCase() !== leadEmail?.toLowerCase()) return

        // Google user email matches lead email - auto-verify
        setGoogleVerifying(true)
        const res = await fetch(`/api/leads/${leadId}/verify-google`, { method: "POST" })

        if (res.ok) {
          setIsVerified(true)
          trackEvent("email_verified", { leadId, matchId, meta: { method: "google" } })
        }
      } catch {
        // Silently fail - user can still use OTP
      } finally {
        setGoogleVerifying(false)
      }
    }

    checkGoogleSession()
  }, [isVerified, leadId, leadEmail, matchId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4]">
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
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4">
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
    // Show loading if Google auto-verify is in progress
    if (googleVerifying) {
      return (
        <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Verifying your Google account...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-[#f8f7f4]">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center justify-center gap-2.5 mb-6">
              <div className="rounded-full bg-black p-2">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-semibold text-xl">Pearlie</span>
            </Link>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Verify your email to see your matches</h1>
            <p className="text-muted-foreground">
              We found clinics that match your needs. Verify your email to view your personalised results.
            </p>
          </div>

          {/* Google sign-in option */}
          <div className="mb-6">
            <GoogleSignInButton
              redirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=/match/${matchId}`}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground font-medium">or verify with email code</span>
            <div className="flex-1 h-px bg-border" />
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
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="rounded-full bg-black p-1.5 sm:p-2">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white" />
            </div>
            <span className="font-semibold text-lg sm:text-xl">Pearlie</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
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
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <EmptyTitle>Unable to load matches</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
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
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto mb-4">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
              <EmptyTitle>No matching clinics found</EmptyTitle>
              <EmptyDescription>
                We couldn't find clinics matching your criteria right now. We're growing our network — check back soon or try a different postcode.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="default">
                <Link href="/intake">Start a new search</Link>
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {!loading && !error && allClinicsData.length > 0 && (
          <>
            {showExpansionBanner && (
              <Alert className="mb-8 border-primary/20 bg-primary/5">
                <Info className="h-5 w-5 text-primary" />
                <AlertDescription className="ml-2">
                  <div className="space-y-2">
                    <p className="font-semibold text-lg text-foreground">We're expanding to your area</p>
                    <p className="text-sm text-muted-foreground">
                      We're launching London first. You can still explore clinics nearby
                      {minDistanceMiles && <> (closest is ~{minDistanceMiles.toFixed(1)} miles away)</>}
                      and we'll notify you as we expand.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Desktop Sidebar - Hidden on mobile */}
              <aside className="hidden lg:block w-full lg:w-80 flex-shrink-0">
                <MatchFiltersPanel filters={filters} onFiltersChange={setFilters} />
              </aside>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0">
                {/* Mobile Filter Button */}
                <div className="mb-6 lg:hidden">
                  <MatchFiltersPanel filters={filters} onFiltersChange={setFilters} isMobile />
                </div>

                {/* View Toggle */}
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2 bg-card rounded-lg p-1 border">
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="gap-2"
                    >
                      <List className="w-4 h-4" />
                      List
                    </Button>
                    {userLocation && (
                      <Button
                        variant={viewMode === "map" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("map")}
                        className="gap-2"
                      >
                        <Map className="w-4 h-4" />
                        Map
                      </Button>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {visibleClinics.length} of {displayedClinics.length}{" "}
                    {displayedClinics.length === 1 ? "clinic" : "clinics"}
                  </p>
                </div>

                {/* List View */}
                {viewMode === "list" && (
                  <div className="space-y-6">
                    {visibleClinics.map((clinic, index) => {
                      // Check if this is the first non-verified clinic to show divider
                      const isFirstNonVerified = 
                        !clinic.verified && 
                        (index === 0 || visibleClinics.slice(0, index).every(c => c.verified));
                      
                      return (
                        <div key={clinic.id}>
                          {isFirstNonVerified && (
                            <div className="py-4 border-t border-border">
                              <p className="text-sm text-muted-foreground text-center">
                                Other clinics (not verified by Pearlie)
                              </p>
                            </div>
                          )}
                          <Card
                            ref={(el) => (clinicRefs.current[clinic.id] = el)}
                            data-clinic-id={clinic.id}
                            className="p-6 transition-all duration-200 ease-out hover:shadow-lg"
                          >
                            {getClinicLabel(clinic, index) && (
                              <div className="mb-4">
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
clinic.tier === "directory" || clinic.tier === "nearby" || clinic.is_directory_listing
                                      ? "bg-muted text-muted-foreground"
                                      : "bg-primary text-primary-foreground"
                                }`}>
                                  {getClinicLabel(clinic, index)}
                                </span>
                              </div>
                            )}

                            <div className="flex flex-col md:flex-row gap-6">
                              <div className="flex-shrink-0 space-y-3">
                                {clinic.images && clinic.images.length > 0 ? (
                                  <Image
                                    src={clinic.images[0] || "/placeholder.svg"}
                                    alt={clinic.name}
                                    width={200}
                                    height={150}
                                    className="rounded-lg object-cover w-full md:w-[200px] h-[120px] sm:h-[150px]"
                                    sizes="(max-width: 768px) 100vw, 200px"
                                  />
                                ) : (
                                  <div className="w-full md:w-[200px] h-[150px] bg-muted rounded-lg flex items-center justify-center">
                                    <MapPin className="w-12 h-12 text-muted-foreground" />
                                  </div>
                                )}
                                
                                {/* Feature highlights - vertical column */}
                                {clinic.highlight_chips && clinic.highlight_chips.length > 0 && (
                                  <div className="flex flex-wrap sm:flex-col gap-2 mt-4">
                                    {clinic.highlight_chips.slice(0, 4).map((chip: string) => {
                                      const chipData = getChipData(chip)
                                      return (
                                        <div key={chip} className="flex items-center gap-2.5">
                                          <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0">
                                            {chipData.icon}
                                          </div>
                                          <span className="text-xs font-medium text-muted-foreground">
                                            {chipData.label}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 space-y-4">
                                <div>
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <h2 
                                        onClick={() => handleClinicClick(clinic.id, index)}
                                        className="text-xl sm:text-2xl font-bold mb-1 cursor-pointer text-foreground hover:text-primary transition-colors duration-200 underline decoration-primary/30 decoration-2 underline-offset-4 hover:decoration-primary"
                                      >
                                        {clinic.name}
                                      </h2>
                                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                        <div className="flex items-center gap-1">
                                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                          <span className="font-medium">{clinic.rating}</span>
                                          <span>({clinic.review_count} reviews)</span>
                                        </div>
                                        {clinic.verified ? (
                                          <div className="flex items-center gap-1 text-green-600">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span className="font-medium">Verified partner</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1 text-muted-foreground">
                                            <span className="text-xs">Directory listing</span>
                                          </div>
                                        )}
                                        {clinic.offers_free_consultation && (
                                          <div className="flex items-center gap-1 text-indigo-600">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span className="font-medium">Free consultation</span>
                                          </div>
                                        )}
                                        {clinic.distance_miles !== undefined && (
                                          <div className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            <span>~{clinic.distance_miles.toFixed(1)} miles away</span>
                                          </div>
                                        )}
                                        {clinic.match_percentage && clinic.tier !== "directory" && !clinic.is_directory_listing && (
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <button 
                                                type="button"
                                                className="flex items-center gap-1.5 text-primary font-semibold cursor-pointer px-2 py-2.5 -mx-2 -my-2.5 rounded-md hover:bg-primary/10 active:bg-primary/20 transition-colors touch-manipulation"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <Sparkles className="w-4 h-4" />
                                                <span>{clinic.match_percentage}% match</span>
                                                <Info className="w-4 h-4 text-primary/70" />
                                              </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-72 p-4" align="end" side="bottom">
                                              <div className="space-y-3">
                                                <div>
                                                  <h4 className="font-semibold text-sm text-foreground">How we calculated your match</h4>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    This shows how well this clinic fits <span className="font-medium">your preferences</span>, not a quality rating.
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
                                    </div>
                                  </div>
                                </div>

                                {/* Why we matched you section */}
                                <div className="border border-border/50 rounded-lg p-4 bg-background">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Shield className="w-5 h-5 text-muted-foreground" />
                                    <h3 className="font-semibold text-foreground">
                                      {clinic.card_title || (clinic.tier === "directory"
                                        ? "About this clinic"
                                        : clinic.tier === "nearby"
                                          ? "Other option in your area"
                                          : clinic.is_emergency
                                            ? "Why this clinic"
                                            : index < 2
                                              ? "Why we matched you"
                                              : "Could also be a good match")}
                                    </h3>
                                  </div>

                                  {/* Match reasons - Use composed sentences if available, fallback to raw */}
                                  <div className="space-y-3 text-sm text-foreground leading-relaxed">
                                    {clinic.tier === "directory" || clinic.is_directory_listing ? (
                                      <>
                                        <p>This clinic is listed in our directory and may be able to help with your dental needs.</p>
                                        {clinic.distance_miles && (
                                          <p>Located approximately {clinic.distance_miles.toFixed(1)} miles from your location.</p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-2">
                                          {clinic.verified === false 
                                            ? "This clinic hasn't been verified yet, so we can't show personalised match information."
                                            : "This clinic hasn't completed our matching profile yet."}
                                        </p>
                                      </>
                                    ) : clinic.tier === "nearby" ? (
                                      <>
                                        <p>This clinic is located nearby and may be able to help with your dental needs.</p>
                                        {clinic.distance_miles && (
                                          <p>Located approximately {clinic.distance_miles.toFixed(1)} miles from your location.</p>
                                        )}
                                      </>
                                    ) : (
                                      (() => {
                                        // Get reasons from the engine (already correct count: 2 for emergency, 3 for planning)
                                        const reasons = clinic.match_reasons_composed && clinic.match_reasons_composed.length > 0
                                          ? clinic.match_reasons_composed
                                          : clinic.match_reasons && clinic.match_reasons.length > 0
                                            ? clinic.match_reasons
                                            : []

                                        // Max reasons: 2 for emergency, 3 for planning
                                        const maxReasons = clinic.is_emergency ? 2 : 3

                                        return reasons.slice(0, maxReasons).map((sentence: string, i: number) => (
                                          <p key={i}>{sentence}</p>
                                        ))
                                      })()
                                    )}
                                  </div>

                                  {/* Social proof message */}
                                  <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50">
                                    Most patients book one of these clinics
                                  </p>
                                </div>

                                {/* Clinic description */}
                                {clinic.description && (
                                  <p className="text-muted-foreground text-sm leading-relaxed">{clinic.description}</p>
                                )}

                                {/* Date Picker for Appointment Booking */}
                                <div className="pt-2 border-t border-border/50">
                                  <ClinicDatePicker
                                    availableDays={clinic.available_days || ["mon", "tue", "wed", "thu", "fri"]}
                                    availableHours={clinic.available_hours || ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]}
                                    acceptsSameDay={clinic.accepts_same_day || false}
                                    onSelectSlot={(date, time) => {
                                      // Navigate to booking confirmation page
                                      const dateStr = date.toISOString().split("T")[0]
                                      window.location.href = `/booking/confirm?clinicId=${clinic.id}&leadId=${match.lead_id}&date=${dateStr}&time=${time}`
                                    }}
                                  />
                                </div>

                                {/* Bottom Actions */}
                                <div className="pt-3 border-t border-border/50 flex items-center gap-3">
                                  <Button
                                    variant="outline"
                                    className="flex-1 h-11 bg-transparent"
                                    asChild
                                  >
                                    <Link href={`/clinic/${clinic.slug || clinic.id}?matchId=${matchId}&leadId=${leadId || match.lead_id}`}>
                                      View Profile
                                    </Link>
                                  </Button>
                                  {clinic.phone && (
                                    <Button
                                      onClick={() =>
                                        handleClinicAction(clinic.id, match.lead_id, "click_call", undefined, clinic.phone)
                                      }
                                      variant="outline"
                                      className="flex-1 h-11 bg-transparent"
                                    >
                                      <Phone className="w-4 h-4" />
                                      Call Clinic
                                    </Button>
                                  )}
                                  {clinic.tier !== "directory" && (
                                    <Button
                                      variant="outline"
                                      className="flex-1 bg-transparent"
                                      asChild
                                    >
                                      <Link href={`/clinic/${clinic.slug || clinic.id}?matchId=${matchId}&leadId=${leadId || match.lead_id}&chat=open`}>
                                        <MessageCircle className="w-4 h-4" />
                                        Message
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        </div>
                      )
                    })}
                    {hasMoreClinics && viewMode === "list" && (
                      <div className="flex justify-center mt-6">
                        <Button onClick={() => setVisibleClinicsCount((prev) => prev + 1)} variant="outline" size="lg">
                          Show more clinics
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Map View */}
                {viewMode === "map" && (
                  <Suspense fallback={<div>Loading map...</div>}>
                    <ClinicsMap clinics={allClinicsData} onClinicClick={handleMapClinicClick} />
                  </Suspense>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
