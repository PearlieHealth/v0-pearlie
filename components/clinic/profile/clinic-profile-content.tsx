"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MapPin,
  ChevronLeft,
  ExternalLink,
  Shield,
  Calendar,
  CreditCard,
  UserRound,
  MessageCircle,
  X,
  Eye,
  Pencil,
} from "lucide-react"
import { calculateDistance } from "@/lib/matching/reasons"
import { trackEvent, addOpenedClinic } from "@/lib/analytics"
import { ClinicDatePicker } from "@/components/clinic-date-picker"
import { EmbeddedClinicChat } from "@/components/clinic/embedded-clinic-chat"

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

    if (date && time && lead?.id) {
      const dateStr = date.toISOString().split("T")[0]
      window.location.href = `/booking/confirm?clinicId=${clinic?.id}&leadId=${lead.id}&date=${dateStr}&time=${time}`
    } else if (lead?.id) {
      const picker = document.getElementById("clinic-date-picker")
      if (picker) {
        picker.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    } else {
      window.location.href = "/"
    }
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
        <div className="bg-[#7C3AED] text-white sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Preview Mode</span>
              <span className="text-sm text-white/70">— This is how patients see your profile</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs bg-white text-[#7C3AED] hover:bg-white/90"
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

            {/* Patient Context Banner */}
            {lead && (
              <PatientContextBanner
                treatmentInterest={lead.treatment_interest}
                distanceMiles={distanceMiles}
              />
            )}

            {/* Tab Navigation */}
            <Tabs defaultValue="overview" className="w-full">
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
                  Services
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
                <OverviewTab clinic={clinic} matchReasons={matchReasons} hasLead={!!lead} />
              </TabsContent>

              <TabsContent value="services" className="pt-6">
                <ServicesTab clinic={clinic} lead={lead} />
              </TabsContent>

              <TabsContent value="reviews" className="pt-6">
                <ReviewsTab clinic={clinic} />
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
                {clinic.offers_free_consultation && (
                  <div className="bg-indigo-50 px-5 py-3.5 border-b border-indigo-100">
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg leading-none mt-0.5">🎉</span>
                      <div>
                        <p className="text-sm font-semibold text-indigo-900">Free Consultation</p>
                        <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed">
                          This clinic offers a free initial consultation for cosmetic treatments and Invisalign.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="px-6 pt-5 pb-3">
                  <h2 className="text-lg font-bold text-[#1a1a1a] text-center">
                    Request an appointment for free
                  </h2>
                  <p className="text-sm text-[#666] text-center mt-1">
                    No booking fees on Pearlie
                  </p>
                </div>

                <div className="border-t border-[#e5e5e5]" />

                <div className="p-6 space-y-4">
                  <div id="clinic-date-picker">
                    <ClinicDatePicker
                      availableDays={clinic.available_days || ["mon", "tue", "wed", "thu", "fri"]}
                      availableHours={clinic.available_hours || ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]}
                      acceptsSameDay={clinic.accepts_same_day || false}
                      onSelectSlot={(date, time) => handleBookAppointment(date, time)}
                    />
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-[#1a1a1a] hover:bg-[#333] text-white"
                    onClick={() => setShowChat(!showChat)}
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

              {/* Match reasons card */}
              {matchId && matchReasons.length > 0 && (
                <div className="border border-[#e5e5e5] rounded-lg p-4 bg-white">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-[#999]" />
                    <h3 className="font-semibold text-[#1a1a1a]">Why we matched you</h3>
                  </div>
                  <div className="space-y-3 text-sm text-[#333] leading-relaxed">
                    {matchReasons.slice(0, 3).map((reason, idx) => (
                      <p key={idx}>{reason}</p>
                    ))}
                  </div>
                  <p className="text-xs text-[#999] mt-4 pt-3 border-t border-[#e5e5e5]">
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

      {/* Mobile sticky CTA */}
      {!showMobileChat && !showMobilePicker && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-gradient-to-t from-[#f8f5ff] to-white border-t border-[#907EFF]/20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-50 pointer-events-auto shadow-[0_-4px_20px_rgba(144,126,255,0.12)]">
          <p className="text-xs text-[#666] text-center mb-2">No booking fees on Pearlie</p>
          <div className="flex gap-3 max-w-lg mx-auto">
            <Button
              size="lg"
              variant="outline"
              className="flex-1 border-[#907EFF]/30 bg-white hover:bg-[#f8f5ff] text-[#1a1a1a] min-h-[48px] touch-manipulation"
              onClick={() => setShowMobileChat(true)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {(lead?.id || leadIdParam || directLeadId) ? "Message" : "Enquire"}
            </Button>
            <Button
              size="lg"
              className="flex-1 bg-gradient-to-r from-[#907EFF] to-[#ED64A6] hover:from-[#805AD5] hover:to-[#D53F8C] text-white min-h-[48px] touch-manipulation shadow-md"
              onClick={() => setShowMobilePicker(true)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Request a Visit
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
