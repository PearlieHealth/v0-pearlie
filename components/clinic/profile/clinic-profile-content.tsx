"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MapPin,
  ChevronLeft,
  ExternalLink,
  Calendar,
  CreditCard,
  UserRound,
  MessageCircle,
  X,
  Eye,
  Pencil,
  ImageIcon,
  Loader2,
  CalendarCheck,
  CheckCircle2,
} from "lucide-react"
import { calculateDistance } from "@/lib/matching/reasons"
import { trackEvent, addOpenedClinic } from "@/lib/analytics"
import { trackTikTokEvent, trackTikTokServerRelay } from "@/lib/tiktok-pixel"
import { generateTikTokEventId } from "@/lib/tiktok-event-id"
import { ClinicDatePicker } from "@/components/clinic-date-picker"
import { EmbeddedClinicChat } from "@/components/clinic/embedded-clinic-chat"
import { HOURLY_SLOTS } from "@/lib/constants"

import { HighlightBadgeStrip } from "./highlight-badge-strip"
import { PatientContextBanner } from "./patient-context-banner"
import { OverviewTab } from "./overview-tab"
import { ServicesTab } from "./services-tab"
import { ReviewsTab } from "./reviews-tab"
import { DetailsTab } from "./details-tab"
import type { Clinic, Lead, ProviderProfile } from "./types"

export function ClinicProfileContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const matchId = searchParams?.get("matchId")
  const leadIdParam = searchParams?.get("leadId")
  const isPreview = searchParams?.get("preview") === "true"
  const isReply = searchParams?.get("reply") === "1"

  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [lead, setLead] = useState<Lead | null>(null)
  const [matchReasons, setMatchReasons] = useState<string[]>([])
  const [distanceMiles, setDistanceMiles] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<ProviderProfile[]>([])
  const [showChat, setShowChat] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [showMobilePicker, setShowMobilePicker] = useState(false)
  const [directLeadId, setDirectLeadId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [pendingAppointment, setPendingAppointment] = useState<{
    date: Date
    time: string
    dateLabel: string
    timeLabel: string
  } | null>(null)
  const [isBookingRequesting, setIsBookingRequesting] = useState(false)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  const isChatOpen = searchParams?.get("chat") === "open"

  // Auto-open chat when patient arrives via email reply link or dashboard chat link
  useEffect(() => {
    if ((isReply || isChatOpen) && leadIdParam) {
      setShowChat(true)
      setShowMobileChat(true)
    }
  }, [isReply, isChatOpen, leadIdParam])

  useEffect(() => {
    const fetchData = async () => {
      const clinicId = params?.clinicId as string

      if (!clinicId) {
        setLoading(false)
        return
      }

      try {
        const clinicResponse = await fetch(`/api/clinics/${clinicId}${isPreview ? "?preview=true" : ""}`)

        if (!clinicResponse.ok) {
          setLoading(false)
          return
        }

        const clinicData = await clinicResponse.json()
        const resolvedClinic = clinicData.clinic
        const resolvedId = resolvedClinic.id
        setClinic(resolvedClinic)

        // Canonical redirect: if visited via UUID but clinic has a slug, replace URL for SEO
        if (resolvedClinic.slug && clinicId !== resolvedClinic.slug) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId)
          if (isUUID) {
            const queryString = searchParams?.toString()
            router.replace(`/clinic/${resolvedClinic.slug}${queryString ? `?${queryString}` : ""}`, { scroll: false })
          }
        }

        // Fetch providers
        try {
          const providersRes = await fetch(`/api/clinic/providers?clinicId=${resolvedId}`)
          if (providersRes.ok) {
            const { providers: providerData } = await providersRes.json()
            setProviders(providerData || [])
          }
        } catch {
          // Non-critical
        }

        if (matchId) {
          addOpenedClinic(matchId, resolvedId)

          const matchResponse = await fetch(`/api/matches/${matchId}`)

          if (matchResponse.ok) {
            const matchData = await matchResponse.json()

            if (matchData.match.clinic_ids.includes(resolvedId)) {
              setLead(matchData.lead)

              if (
                matchData.lead.latitude &&
                matchData.lead.longitude &&
                clinicData.clinic.latitude &&
                clinicData.clinic.longitude
              ) {
                const distance = calculateDistance(
                  matchData.lead.latitude,
                  matchData.lead.longitude,
                  clinicData.clinic.latitude,
                  clinicData.clinic.longitude,
                )
                setDistanceMiles(distance)
              }

              const matchedClinic = (matchData.clinics || []).find((c: any) => c.id === resolvedId)
              const preComputedReasons = matchedClinic?.match_reasons_composed || matchedClinic?.match_reasons || []
              const maxReasons = matchedClinic?.is_emergency ? 2 : 3
              setMatchReasons(preComputedReasons.slice(0, maxReasons))
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params, matchId])

  // Fire TikTok ViewContent when clinic profile loads
  const viewContentFired = useRef(false)
  useEffect(() => {
    if (!clinic || loading || isPreview || viewContentFired.current) return
    viewContentFired.current = true

    const eventId = generateTikTokEventId()
    trackTikTokEvent("ViewContent", {
      content_name: clinic.name,
      content_type: "clinic",
      content_id: clinic.id,
    }, eventId)
    trackTikTokServerRelay("ViewContent", {
      event_id: eventId,
      lead_id: lead?.id || leadIdParam,
      clinic_id: clinic.id,
      properties: {
        content_name: clinic.name,
        content_type: "clinic",
        content_id: clinic.id,
      },
    })
  }, [clinic, loading, isPreview, lead?.id, leadIdParam])

  // Check if an appointment was already requested for this clinic
  // (persists across refreshes via the conversation's appointment_requested_at field)
  useEffect(() => {
    const checkAppointmentStatus = async () => {
      const effectiveLeadId = lead?.id || leadIdParam || directLeadId
      const effectiveClinicId = clinic?.id
      if (!effectiveLeadId || !effectiveClinicId) return

      try {
        const res = await fetch(
          `/api/chat/messages?leadId=${effectiveLeadId}&clinicId=${effectiveClinicId}`
        )
        if (res.ok) {
          const data = await res.json()
          if (data.appointmentRequestedAt) {
            setBookingConfirmed(true)
          }
        }
      } catch {
        // Non-critical
      }
    }

    checkAppointmentStatus()
  }, [lead?.id, leadIdParam, directLeadId, clinic?.id])

  const handleBookAppointment = (date?: Date, time?: string) => {
    trackEvent("book_clicked", {
      leadId: lead?.id || null,
      clinicId: clinic?.id,
      meta: {
        match_id: matchId || undefined,
        source: "clinic_page",
        has_slot: !!(date && time),
      },
    })
    trackTikTokEvent("PlaceAnOrder", { content_name: "confirm_request" })

    if (date && time && (lead?.id || leadIdParam || directLeadId)) {
      const dateLabel = date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
      const timeLabel =
        HOURLY_SLOTS.find((s: { key: string; label: string }) => s.key === time)?.label || time
      setBookingError(null)
      setPendingAppointment({ date, time, dateLabel, timeLabel })
    } else if (lead?.id || leadIdParam || directLeadId) {
      const picker = document.getElementById("clinic-date-picker")
      if (picker) {
        picker.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    } else {
      // No lead — open chat/enquiry form instead of redirecting away
      setShowChat(true)
      setShowMobileChat(true)
    }
  }

  const handleConfirmBooking = async () => {
    if (!pendingAppointment || !clinic?.id) return
    const bookingLeadId = lead?.id || leadIdParam || directLeadId
    if (!bookingLeadId) return

    // Already requested — just show the success state
    if (bookingConfirmed) return

    setIsBookingRequesting(true)
    setBookingError(null)
    try {
      // Format date as YYYY-MM-DD using local date components (not toISOString which uses UTC)
      const d = pendingAppointment.date
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

      const response = await fetch("/api/booking/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: bookingLeadId,
          clinicId: clinic.id,
          date: dateStr,
          time: pendingAppointment.time,
        }),
      })

      if (response.status === 409) {
        // Already requested — just mark as confirmed
        setBookingConfirmed(true)
        setPendingAppointment(null)
        setShowChat(true)
        setShowMobileChat(true)
        return
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to submit booking request")
      }

      setBookingConfirmed(true)
      setPendingAppointment(null)

      // Open chat so user sees the appointment message
      setShowChat(true)
      setShowMobileChat(true)

      trackEvent("booking_confirmed_inline", {
        leadId: bookingLeadId,
        clinicId: clinic.id,
        meta: {
          match_id: matchId || undefined,
          source: "clinic_page_inline",
        },
      })
      trackTikTokEvent("PlaceAnOrder", { content_name: "booking_confirmed_inline" })
    } catch (error) {
      console.error("Error submitting booking:", error)
      setBookingError(
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      )
    } finally {
      setIsBookingRequesting(false)
    }
  }

  const handleCancelPendingBooking = () => {
    setPendingAppointment(null)
    setBookingError(null)
  }

  const handleCallClinic = () => {
    if (matchId) {
      trackEvent("call_clicked", {
        leadId: lead?.id || null,
        clinicId: clinic?.id,
        meta: {
          match_id: matchId || undefined,
          source: "clinic_page",
        },
      })
    }

    if (clinic?.phone) {
      window.location.href = `tel:${clinic.phone}`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a1a1a] mx-auto mb-4" />
          <p className="text-[#666]">Loading clinic details...</p>
        </div>
      </div>
    )
  }

  if (!clinic) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md bg-white border-[#e5e5e5]">
          <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Clinic not found</h1>
          <p className="text-[#666] mb-4">We couldn&apos;t find the clinic you&apos;re looking for</p>
          <Button onClick={() => router.back()} className="bg-[#1a1a1a] hover:bg-[#333] text-white">
            Go back
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-8">
      {/* Preview banner */}
      {isPreview && (
        <div className="bg-[#0fbcb0] text-white sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Preview Mode</span>
              <span className="text-sm text-white/70">— This is how patients see your profile</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs bg-white text-[#0fbcb0] hover:bg-white/90"
              onClick={() => { window.location.href = "/clinic/profile" }}
            >
              <Pencil className="h-3 w-3 mr-1.5" />
              Make Changes
            </Button>
          </div>
        </div>
      )}

      {/* Back button header */}
      <div className="bg-white border-b border-[#e5e5e5] sticky top-0 z-20" style={isPreview ? { top: "44px" } : undefined}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#666] hover:text-[#1a1a1a] transition-colors text-sm font-medium"
          >
            <ChevronLeft className="h-4 w-4" />
            {isPreview ? "Close preview" : "Back to results"}
          </button>
        </div>
      </div>

      {/* Map */}
      <section id="location">
        <div className="w-full h-[200px] lg:h-[250px] bg-[#e5e5e5]">
          {clinic.latitude && clinic.longitude && process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY ? (
            <iframe
              title={`${clinic.name} location`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY}&q=${encodeURIComponent(clinic.address + ", " + clinic.postcode)}&zoom=14`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address + ", " + clinic.postcode)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#666] hover:text-[#1a1a1a]"
              >
                <MapPin className="h-5 w-5" />
                <span>View on Google Maps</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Main content grid */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="grid lg:grid-cols-[1fr_380px] gap-6 md:gap-8">
          {/* LEFT COLUMN */}
          <div className="space-y-4 md:space-y-6">
            {/* Clinic Name + Address + Provider Photos */}
            <section className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1a1a1a] tracking-tight text-balance">{clinic.name}</h1>
                <p className="text-[#444] mt-1">{clinic.address}</p>
                <p className="text-[#444]">{clinic.city || ""}{clinic.city && clinic.postcode ? ", " : ""}{clinic.postcode}</p>
              </div>
              {providers.length > 0 && (
                <div className="hidden sm:flex items-center -space-x-3 flex-shrink-0">
                  {providers.slice(0, 3).map((provider) => (
                    <div key={provider.id} className="h-14 w-14 lg:h-16 lg:w-16 rounded-full border-2 border-white overflow-hidden bg-[#f0f0f0] shadow-sm">
                      {provider.photo_url ? (
                        <img src={provider.photo_url || "/placeholder.svg"} alt={provider.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <UserRound className="h-7 w-7 text-[#999]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Highlight Badge Strip */}
            {clinic.highlight_chips && clinic.highlight_chips.length > 0 && (
              <HighlightBadgeStrip chips={clinic.highlight_chips} />
            )}

            {/* Before & After Trust Badge */}
            {clinic.before_after_images && clinic.before_after_images.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#0fbcb0]/20 bg-[#0fbcb0]/5 text-sm font-medium text-[#004443] hover:bg-[#0fbcb0]/10 transition-colors"
              >
                <ImageIcon className="h-3.5 w-3.5 text-[#0fbcb0]" />
                Before &amp; After Cases Available
              </button>
            )}

            {/* Patient Context Banner */}
            {lead && (
              <PatientContextBanner
                treatmentInterest={lead.treatment_interest}
                distanceMiles={distanceMiles}
              />
            )}

            {/* Tab Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start bg-transparent border-b border-[#e5e5e5] rounded-none h-auto p-0 gap-0 overflow-x-auto">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1a1a1a] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 pb-3 pt-1 text-[#999] data-[state=active]:text-[#1a1a1a] font-medium text-sm"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="services"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1a1a1a] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 pb-3 pt-1 text-[#999] data-[state=active]:text-[#1a1a1a] font-medium text-sm"
                >
                  Fees
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1a1a1a] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 pb-3 pt-1 text-[#999] data-[state=active]:text-[#1a1a1a] font-medium text-sm"
                >
                  Reviews
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1a1a1a] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 pb-3 pt-1 text-[#999] data-[state=active]:text-[#1a1a1a] font-medium text-sm"
                >
                  Details
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="pt-6">
                <OverviewTab clinic={clinic} matchReasons={matchReasons} hasLead={!!lead} lead={lead} onSwitchToDetails={() => setActiveTab("details")} />
              </TabsContent>

              <TabsContent value="services" className="pt-6">
                <ServicesTab clinic={clinic} lead={lead} />
              </TabsContent>

              <TabsContent value="reviews" className="pt-6">
                <ReviewsTab clinic={clinic} clinicId={clinic.id} />
              </TabsContent>

              <TabsContent value="details" className="pt-6">
                <DetailsTab clinic={clinic} providers={providers} />
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT COLUMN - Sticky Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <Card className="bg-white border-[#e5e5e5] overflow-hidden shadow-sm">
                <div className="bg-[#004443] px-5 py-3.5">
                  <h2 className="text-base font-bold text-white text-center">
                    Request an appointment
                  </h2>
                  <p className="text-xs text-white/70 text-center mt-0.5">
                    No booking fees on Pearlie
                  </p>
                </div>

                {clinic.offers_free_consultation && (
                  <div className="bg-[#0fbcb0]/10 px-4 py-3 border-b border-[#0fbcb0]/20">
                    <div>
                      <p className="text-sm font-semibold text-[#004443]">Free Consultation</p>
                      <p className="text-xs text-[#004443]/70 mt-0.5 leading-relaxed">
                        Free initial consultation for cosmetic treatments and Invisalign.
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-4 space-y-3">
                  <div id="clinic-date-picker">
                    {!bookingConfirmed && !pendingAppointment && (
                      <ClinicDatePicker
                        availableDays={clinic.available_days || ["mon", "tue", "wed", "thu", "fri"]}
                        availableHours={clinic.available_hours || ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]}
                        acceptsSameDay={clinic.accepts_same_day || false}
                        onSelectSlot={(date, time) => handleBookAppointment(date, time)}
                        maxVisible={5}
                      />
                    )}

                    {/* Inline confirmation step */}
                    {pendingAppointment && !bookingConfirmed && (
                      <div className="rounded-xl border-2 border-[#0fbcb0] bg-[#0fbcb0]/5 p-4 animate-in fade-in duration-200">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="text-xs font-semibold text-[#004443] uppercase tracking-wide">
                              Confirm your request
                            </p>
                            <p className="text-sm text-[#1a1a1a] mt-1">
                              <span className="font-semibold">{pendingAppointment.dateLabel}</span>{" "}
                              at <span className="font-semibold">{pendingAppointment.timeLabel}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleCancelPendingBooking}
                            className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-black/5 transition-colors flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          This will send a message to {clinic.name} requesting this appointment.
                        </p>
                        {bookingError && (
                          <p className="text-xs text-red-600 mb-3">{bookingError}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            className="flex-1 h-10 rounded-full text-sm font-semibold bg-[#004443] hover:bg-[#004443]/90 text-white border-0"
                            disabled={isBookingRequesting}
                            onClick={handleConfirmBooking}
                          >
                            {isBookingRequesting ? (
                              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            ) : (
                              <CalendarCheck className="w-4 h-4 mr-1.5" />
                            )}
                            {isBookingRequesting ? "Sending..." : "Confirm request"}
                          </Button>
                          <Button
                            variant="outline"
                            className="h-10 rounded-full text-sm px-5"
                            onClick={handleCancelPendingBooking}
                            disabled={isBookingRequesting}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Success banner */}
                    {bookingConfirmed && (
                      <div className="rounded-xl bg-green-50 border border-green-200 p-3 flex items-center gap-2.5">
                        <CheckCircle2 className="w-4.5 h-4.5 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-700">Appointment request sent</p>
                          <p className="text-xs text-green-600/70">
                            The clinic will get back to you shortly
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-[#0fbcb0] hover:bg-[#0da399] text-white"
                    onClick={() => {
                      const contactEventId = generateTikTokEventId()
                      trackTikTokEvent("Contact", { content_name: "message_clinic_profile" }, contactEventId)
                      trackTikTokServerRelay("Contact", {
                        event_id: contactEventId,
                        lead_id: lead?.id || leadIdParam || directLeadId,
                        clinic_id: clinic?.id,
                        properties: { content_name: "message_clinic_profile" },
                      })
                      setShowChat(!showChat)
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {(lead?.id || leadIdParam || directLeadId) ? "Message Clinic" : "Enquire now"}
                  </Button>

                  <EmbeddedClinicChat
                    leadId={lead?.id || leadIdParam || directLeadId || null}
                    clinicId={clinic.id}
                    clinicName={clinic.name}
                    isOpen={showChat}
                    onToggle={() => setShowChat(false)}
                    onLeadCreated={(newLeadId) => setDirectLeadId(newLeadId)}
                    leadEmail={lead?.email || null}
                  />

                  {clinic.accepts_nhs && (
                    <div className="pt-3 border-t border-[#e5e5e5]">
                      <div className="flex items-center gap-2 text-sm text-[#666]">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <span>NHS patients accepted</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Match reasons card — mirrors match results page card */}
              {matchId && matchReasons.length > 0 && (
                <div className="rounded-xl p-3.5 border border-[#0fbcb0]/30">
                  <h3 className="font-semibold text-sm text-[#0fbcb0] mb-1.5">Why we matched you</h3>
                  <div className="space-y-1.5 text-sm text-[#1a1a1a] leading-relaxed">
                    {matchReasons.slice(0, 3).map((reason, idx) => (
                      <p key={idx}>{reason}</p>
                    ))}
                  </div>
                  <p className="text-xs text-[#999] mt-3 pt-2.5 border-t border-[#e5e5e5]">
                    Thoughtfully matched based on your answers.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Chat Bottom Sheet */}
      {showMobileChat && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMobileChat(false)}
            onKeyDown={() => {}}
            role="presentation"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[75dvh] h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5]">
              <h3 className="font-semibold text-[#1a1a1a]">Message {clinic.name}</h3>
              <button type="button" onClick={() => setShowMobileChat(false)} className="p-2 rounded-full hover:bg-[#f5f5f5]">
                <X className="h-5 w-5 text-[#666]" />
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <EmbeddedClinicChat
                leadId={lead?.id || leadIdParam || directLeadId || null}
                clinicId={clinic.id}
                clinicName={clinic.name}
                isOpen={true}
                onToggle={() => setShowMobileChat(false)}
                hideHeader
                onLeadCreated={(newLeadId) => setDirectLeadId(newLeadId)}
                leadEmail={lead?.email || null}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Date Picker Bottom Sheet */}
      {showMobilePicker && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMobilePicker(false)}
            onKeyDown={() => {}}
            role="presentation"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5]">
              <h3 className="font-semibold text-[#1a1a1a]">Request a Visit</h3>
              <button type="button" onClick={() => setShowMobilePicker(false)} className="p-1 rounded-full hover:bg-[#f5f5f5]">
                <X className="h-5 w-5 text-[#666]" />
              </button>
            </div>
            <div className="p-4">
              <ClinicDatePicker
                availableDays={clinic.available_days || ["mon", "tue", "wed", "thu", "fri"]}
                availableHours={clinic.available_hours || ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]}
                acceptsSameDay={clinic.accepts_same_day || false}
                onSelectSlot={(date, time) => {
                  setShowMobilePicker(false)
                  handleBookAppointment(date, time)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Booking Confirmation Bottom Sheet */}
      {pendingAppointment && !bookingConfirmed && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCancelPendingBooking}
            onKeyDown={() => {}}
            role="presentation"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5]">
              <h3 className="font-semibold text-[#1a1a1a]">Confirm Your Request</h3>
              <button
                type="button"
                onClick={handleCancelPendingBooking}
                className="p-1 rounded-full hover:bg-[#f5f5f5]"
              >
                <X className="h-5 w-5 text-[#666]" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="rounded-xl border-2 border-[#0fbcb0] bg-[#0fbcb0]/5 p-4">
                <p className="text-xs font-semibold text-[#004443] uppercase tracking-wide">
                  Appointment details
                </p>
                <p className="text-sm text-[#1a1a1a] mt-1">
                  <span className="font-semibold">{pendingAppointment.dateLabel}</span>{" "}
                  at <span className="font-semibold">{pendingAppointment.timeLabel}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  at {clinic.name}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                This will send a message to {clinic.name} requesting this appointment.
              </p>
              {bookingError && (
                <p className="text-xs text-red-600">{bookingError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  className="flex-1 h-12 rounded-full text-sm font-semibold bg-[#004443] hover:bg-[#004443]/90 text-white border-0 touch-manipulation"
                  disabled={isBookingRequesting}
                  onClick={handleConfirmBooking}
                >
                  {isBookingRequesting ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <CalendarCheck className="w-4 h-4 mr-1.5" />
                  )}
                  {isBookingRequesting ? "Sending..." : "Confirm request"}
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-full text-sm px-5 touch-manipulation"
                  onClick={handleCancelPendingBooking}
                  disabled={isBookingRequesting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sticky CTA */}
      {!showMobileChat && !showMobilePicker && !pendingAppointment && !bookingConfirmed && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-gradient-to-t from-[#faf3e6] to-white border-t border-[#0fbcb0]/20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-50 pointer-events-auto shadow-[0_-4px_20px_rgba(15,188,176,0.12)]">
          <p className="text-xs text-[#666] text-center mb-2">No booking fees on Pearlie</p>
          <div className="flex gap-3 max-w-lg mx-auto">
            <Button
              size="lg"
              className="flex-1 bg-[#0fbcb0] hover:bg-[#0da399] text-white min-h-[48px] touch-manipulation shadow-md"
              onClick={() => setShowMobileChat(true)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {(lead?.id || leadIdParam || directLeadId) ? "Message" : "Enquire"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 border-[#0fbcb0]/30 bg-white hover:bg-[#faf3e6] text-[#1a1a1a] min-h-[48px] touch-manipulation"
              onClick={() => setShowMobilePicker(true)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Request a Visit
            </Button>
          </div>
        </div>
      )}

      {/* Mobile sticky CTA - success state with message button */}
      {bookingConfirmed && !showMobileChat && !showMobilePicker && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-green-50 border-t border-green-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-50">
          <div className="flex items-center gap-2.5 max-w-lg mx-auto mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-700">Appointment request sent</p>
              <p className="text-xs text-green-600/70">The clinic will get back to you shortly</p>
            </div>
          </div>
          <div className="max-w-lg mx-auto">
            <Button
              size="lg"
              className="w-full bg-[#0fbcb0] hover:bg-[#0da399] text-white min-h-[48px] touch-manipulation shadow-md"
              onClick={() => {
                const contactEventId = generateTikTokEventId()
                trackTikTokEvent("Contact", { content_name: "message_clinic_profile_mobile" }, contactEventId)
                trackTikTokServerRelay("Contact", {
                  event_id: contactEventId,
                  lead_id: lead?.id || leadIdParam || directLeadId,
                  clinic_id: clinic?.id,
                  properties: { content_name: "message_clinic_profile_mobile" },
                })
                setShowMobileChat(true)
              }}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Message Clinic
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
