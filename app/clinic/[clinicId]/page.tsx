"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  MapPin,
  Phone,
  Star,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  Shield,
  Calendar,
  ImageIcon,
  ChevronLeftIcon,
  ChevronRight,
  XCircle,
  CreditCard,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Award,
  UserRound,
  MessageCircle,
  X,
} from "lucide-react"
import { generateMatchReasons, calculateDistance } from "@/lib/matching/reasons"
import { trackEvent, addOpenedClinic } from "@/lib/analytics"
import { ClinicDatePicker } from "@/components/clinic-date-picker"
import { EmbeddedClinicChat } from "@/components/clinic/embedded-clinic-chat"

interface Clinic {
  id: string
  slug?: string
  name: string
  address: string
  postcode: string
  city?: string
  latitude?: number
  longitude?: number
  phone?: string
  website?: string
  description?: string
  featured_review?: string
  rating: number
  review_count: number
  treatments: string[]
  facilities: string[]
  opening_hours: Record<string, string>
  images: string[]
  price_range: string
  verified: boolean
  featured: boolean
  wheelchair_accessible: boolean
  parking_available: boolean
  accepts_nhs?: boolean
  is_archived: boolean
  tags?: string[]
}

interface Lead {
  id: string
  treatment_interest?: string
  preferred_timing?: string
  budget_range?: string
  postcode?: string
  latitude?: number
  longitude?: number
  cosmetic_concern?: string
  pain_score?: number
  has_swelling?: boolean
  has_bleeding?: boolean
  additional_info?: string
}

interface ProviderProfile {
  id: string
  name: string
  photo_url: string | null
  bio: string | null
  education: { degree: string; institution: string }[]
  certifications: { name: string; date?: string }[]
}

// All possible treatments for dental clinics
const ALL_TREATMENTS = [
  "Dental Implants",
  "Composite Bonding",
  "Veneers",
  "Teeth Whitening",
  "Invisalign",
  "Braces",
  "Checkups",
  "Cleaning",
  "Fillings",
  "Extractions",
  "Root Canal",
  "Crowns",
  "Bridges",
  "Dentures",
  "Emergency Care",
  "Sedation Dentistry",
]

// All possible facilities
const ALL_FACILITIES = [
  "Wheelchair Accessible",
  "Parking Available",
  "WiFi",
  "TV in Rooms",
  "Refreshments",
  "Children's Play Area",
  "Private Rooms",
  "Digital X-Ray",
  "3D Scanning",
  "Same Day Appointments",
]

// Helper function to determine unique clinic feature
function getUniqueFeature(clinic: Clinic): { label: string; value: string; icon?: string } {
  // Check opening hours for weekend/evening availability
  const openingHours = clinic.opening_hours as Record<string, string> | null

  if (openingHours) {
    // Check for Saturday opening
    const saturdayHours = openingHours["Saturday"] || openingHours["saturday"] || openingHours["Sat"]
    if (saturdayHours && saturdayHours.toLowerCase() !== "closed") {
      return { label: "Weekend", value: "Open Saturdays", icon: "calendar" }
    }

    // Check for Sunday opening
    const sundayHours = openingHours["Sunday"] || openingHours["sunday"] || openingHours["Sun"]
    if (sundayHours && sundayHours.toLowerCase() !== "closed") {
      return { label: "Weekend", value: "Open Sundays", icon: "calendar" }
    }

    // Check for evening appointments (any day closing after 6pm)
    for (const day of Object.keys(openingHours)) {
      const hours = openingHours[day]
      if (hours && typeof hours === "string") {
        const match = hours.match(/(\d{1,2}):?(\d{2})?\s*(pm)?$/i)
        if (match) {
          const hour = Number.parseInt(match[1])
          const isPM = match[3]?.toLowerCase() === "pm"
          const actualHour = isPM && hour !== 12 ? hour + 12 : hour
          if (actualHour >= 18) {
            return { label: "Hours", value: "Evening appts", icon: "clock" }
          }
        }
      }
    }
  }

  // Check facilities and features
  if (clinic.parking_available) {
    return { label: "Parking", value: "Free parking", icon: "car" }
  }

  if (clinic.wheelchair_accessible) {
    return { label: "Access", value: "Step-free access", icon: "accessible" }
  }

  // Check for special facilities
  const facilities = clinic.facilities || []
  const specialFacilities: Record<string, { label: string; value: string }> = {
    sedation: { label: "Comfort", value: "Sedation available" },
    "iv sedation": { label: "Comfort", value: "IV sedation" },
    children: { label: "Family", value: "Family friendly" },
    "child friendly": { label: "Family", value: "Child friendly" },
    orthodontics: { label: "Specialist", value: "Orthodontics" },
    implants: { label: "Specialist", value: "Implant centre" },
    invisalign: { label: "Specialist", value: "Invisalign provider" },
    cosmetic: { label: "Specialist", value: "Cosmetic focus" },
  }

  for (const facility of facilities) {
    const lowerFacility = facility.toLowerCase()
    for (const [key, feature] of Object.entries(specialFacilities)) {
      if (lowerFacility.includes(key)) {
        return feature
      }
    }
  }

  // Check tags for unique features
  const tags = clinic.tags || []
  for (const tag of tags) {
    const lowerTag = tag.toLowerCase()
    for (const [key, feature] of Object.entries(specialFacilities)) {
      if (lowerTag.includes(key)) {
        return feature
      }
    }
  }

  // Default based on verified status
  if (clinic.verified) {
    return { label: "Trust", value: "Verified clinic", icon: "verified" }
  }

  // Final fallback based on review count
  if (clinic.review_count && clinic.review_count > 50) {
    return { label: "Reviews", value: `${clinic.review_count}+ reviews`, icon: "star" }
  }

  return { label: "Quality", value: "Trusted practice", icon: "shield" }
}

export default function ClinicDetailPage() {
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
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [uniqueFeature, setUniqueFeature] = useState<{ label: string; value: string; icon?: string } | null>(null)
  const [providers, setProviders] = useState<ProviderProfile[]>([])
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [showAllServices, setShowAllServices] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [showMobilePicker, setShowMobilePicker] = useState(false)
  const [directLeadId, setDirectLeadId] = useState<string | null>(null)

  // Generate FAQs
  const faqs = [
    {
      question: `Where is ${clinic?.name} located?`,
      answer: `${clinic?.name} is located at ${clinic?.address}, ${clinic?.postcode}${clinic?.city ? `, ${clinic?.city}` : ""}. ${distanceMiles ? `It is approximately ${distanceMiles.toFixed(1)} miles from your location.` : ""}`,
    },
    {
      question: `What treatments are available at ${clinic?.name}?`,
      answer: `${clinic?.name} offers a range of dental treatments including: ${clinic?.treatments.slice(0, 5).join(", ")}${clinic?.treatments.length > 5 ? ` and ${clinic?.treatments.length - 5} more services` : ""}.`,
    },
    {
      question: `Does ${clinic?.name} accept NHS patients?`,
      answer: clinic?.accepts_nhs
        ? `Yes, ${clinic?.name} accepts NHS patients alongside private treatments.`
        : `${clinic?.name} is a private dental practice. Contact them directly for pricing information.`,
    },
    {
      question: `What are the opening hours?`,
      answer:
        clinic?.opening_hours && Object.keys(clinic?.opening_hours).length > 0
          ? `Opening hours vary by day. Please check the opening hours section above or contact the clinic directly.`
          : `Please contact ${clinic?.name} directly to confirm their opening hours.`,
    },
    {
      question: `How can I book an appointment?`,
      answer: `You can book an appointment by ${clinic?.website ? "visiting their website or " : ""}${clinic?.phone ? `calling them on ${clinic?.phone}` : "contacting them directly"}.`,
    },
  ]

  // Lead's selected treatment for the "Your Selected Services" section
  const leadSelectedServices = lead?.treatment_interest
    ? lead.treatment_interest.split(",").map((s) => s.trim()).filter(Boolean)
    : []

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
        const resolvedId = resolvedClinic.id // Always use the real UUID for subsequent calls
        setClinic(resolvedClinic)
        setUniqueFeature(getUniqueFeature(resolvedClinic))

        // Canonical redirect: if visited via UUID but clinic has a slug, replace URL for SEO
        if (resolvedClinic.slug && clinicId !== resolvedClinic.slug) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId as string)
          if (isUUID) {
            const queryString = searchParams?.toString()
            router.replace(`/clinic/${resolvedClinic.slug}${queryString ? `?${queryString}` : ""}`, { scroll: false })
          }
        }

        // Fetch providers using the resolved UUID
        try {
          const providersRes = await fetch(`/api/clinic/providers?clinicId=${resolvedId}`)
          if (providersRes.ok) {
            const { providers: providerData } = await providersRes.json()
            setProviders(providerData || [])
          }
        } catch {
          // Non-critical, silently fail
        }

        if (matchId) {
          addOpenedClinic(matchId, resolvedId)

          const matchResponse = await fetch(`/api/matches/${matchId}`)

          if (matchResponse.ok) {
            const matchData = await matchResponse.json()

            if (matchData.match.clinic_ids.includes(resolvedId)) {
              setLead(matchData.lead)

              let distance: number | undefined
              if (
                matchData.lead.latitude &&
                matchData.lead.longitude &&
                clinicData.clinic.latitude &&
                clinicData.clinic.longitude
              ) {
                distance = calculateDistance(
                  matchData.lead.latitude,
                  matchData.lead.longitude,
                  clinicData.clinic.latitude,
                  clinicData.clinic.longitude,
                )
                setDistanceMiles(distance)
              }

              const reasons = generateMatchReasons(matchData.lead, clinicData.clinic, distance).slice(0, 3)
              setMatchReasons(reasons)
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

    // Use Pearlie's internal booking flow
    if (date && time && lead?.id) {
      const dateStr = date.toISOString().split("T")[0]
      window.location.href = `/booking/confirm?clinicId=${clinic?.id}&leadId=${lead.id}&date=${dateStr}&time=${time}`
    } else if (lead?.id) {
      // No slot selected yet -- scroll to the date picker in sidebar
      const picker = document.getElementById("clinic-date-picker")
      if (picker) {
        picker.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    } else {
      // No lead context (direct link) -- start from intake
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
      window.location.href = `tel:${clinic?.phone}`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a1a1a] mx-auto mb-4"></div>
          <p className="text-[#666]">Loading clinic details...</p>
        </div>
      </div>
    )
  }

  if (!clinic) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md bg-white border-[#e5e5e5]">
          <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Clinic not found</h1>
          <p className="text-[#666] mb-4">We couldn't find the clinic you're looking for</p>
          <Button onClick={() => router.back()} className="bg-[#1a1a1a] hover:bg-[#333] text-white">
            Go back
          </Button>
        </Card>
      </div>
    )
  }

  // Categorize treatments
  const availableTreatments = clinic.treatments || []
  const unavailableTreatments = ALL_TREATMENTS.filter(
    (t) =>
      !availableTreatments.some(
        (at) => at.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(at.toLowerCase()),
      ),
  )

  // Categorize facilities
  const clinicFacilities = clinic.facilities || []
  if (clinic.wheelchair_accessible) clinicFacilities.push("Wheelchair Accessible")
  if (clinic.parking_available) clinicFacilities.push("Parking Available")
  const availableFacilities = [...new Set(clinicFacilities)]
  const unavailableFacilities = ALL_FACILITIES.filter(
    (f) =>
      !availableFacilities.some(
        (af) => af.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(af.toLowerCase()),
      ),
  )

  // Main content grid
  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-8">
      {/* Back button header */}
      <div className="bg-white border-b border-[#e5e5e5] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#666] hover:text-[#1a1a1a] transition-colors text-sm font-medium"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to results
          </button>
        </div>
      </div>

      {/* 1. MAP - Full width */}
      <section id="location">
        <div className="w-full h-[225px] lg:h-[285px] bg-[#e5e5e5]">
          {clinic.latitude && clinic.longitude ? (
            <iframe
              title={`${clinic.name} location`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(clinic.address + ", " + clinic.postcode)}&zoom=14`}
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* LEFT COLUMN */}
          <div className="space-y-10">
            {/* 2. CLINIC NAME + ADDRESS + PROVIDER PHOTOS */}
            <section className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-[#1a1a1a] tracking-tight text-balance">{clinic.name}</h1>
                <p className="text-lg text-[#444] mt-2">{clinic.address}</p>
                <p className="text-lg text-[#444]">{clinic.city || ""}{clinic.city && clinic.postcode ? ", " : ""}{clinic.postcode}</p>
              </div>
              {/* Provider photos */}
              {providers.length > 0 && (
                <div className="hidden sm:flex items-center -space-x-3 flex-shrink-0">
                  {providers.slice(0, 3).map((provider) => (
                    <div key={provider.id} className="h-16 w-16 lg:h-20 lg:w-20 rounded-full border-3 border-white overflow-hidden bg-[#f0f0f0] shadow-sm">
                      {provider.photo_url ? (
                        <img src={provider.photo_url || "/placeholder.svg"} alt={provider.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <UserRound className="h-8 w-8 text-[#999]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Divider */}
            <div className="border-t border-[#e5e5e5]" />

            {/* 3. RATING + REVIEW */}
            <section className="flex items-start gap-8">
              <div className="flex-shrink-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-[#1a1a1a]">{clinic.rating}</span>
                  <span className="text-xl text-[#999]">/5</span>
                </div>
                {clinic.review_count > 0 && (
                  <p className="text-sm text-[#666] mt-1">{clinic.review_count} reviews</p>
                )}
              </div>
              {clinic.featured_review && (
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[#ccc] text-3xl leading-none">{'\u201C\u201C'}</span>
                    <span className="text-xs font-bold text-[#666] uppercase tracking-wider">Trusted Review</span>
                  </div>
                  <p className="text-[#444] leading-relaxed line-clamp-3 italic">
                    {clinic.featured_review}
                  </p>
                </div>
              )}
            </section>

            {/* Divider */}
            <div className="border-t border-[#e5e5e5]" />

            {/* 4. PEARLIE GUARANTEE BADGE */}
            {clinic.verified && (
              <section className="flex items-center gap-4 bg-[#f0faf4] border border-emerald-200 rounded-xl p-5">
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1a1a1a]">Pearlie Guarantee</h3>
                  <p className="text-sm text-[#666] mt-0.5">{"This clinic has been verified by Pearlie. Quality care, transparent pricing, and a trusted experience. If your new Pearlie dentist doesn\u2019t live up to your expectations, we\u2019ll cover your next consultation/check-up fee."}</p>
                </div>
              </section>
            )}

            {/* 5 + 6. TREATMENTS - patient selected first, then "View All" expands remaining */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-2xl font-bold text-[#1a1a1a]">
                  {leadSelectedServices.length > 0
                    ? "Your Selected Services"
                    : `Treatments Available at ${clinic.name}`}
                </h2>
                {(availableTreatments.length > 0 || availableFacilities.length > 0) && (
                  <Button
                    variant="outline"
                    className="rounded-full bg-transparent border-[#ccc] text-[#1a1a1a] hover:bg-[#f5f5f5] transition-colors"
                    onClick={() => setShowAllServices(!showAllServices)}
                  >
                    {showAllServices ? "Hide Services" : "View All Practice Services"}
                  </Button>
                )}
              </div>

              {/* Patient's selected services with tick marks */}
              {leadSelectedServices.length > 0 && (
                <div className="space-y-3 mb-6">
                  {leadSelectedServices.map((service, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-lg text-[#333] font-medium">{service}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* No lead services fallback: show available treatments directly */}
              {leadSelectedServices.length === 0 && availableTreatments.length > 0 && !showAllServices && (
                <div className="mb-4">
                  <div className="grid sm:grid-cols-2 gap-2">
                    {availableTreatments.slice(0, 6).map((treatment, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-[#333] py-1.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-[15px]">{treatment}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expanded: all treatments + facilities */}
              {showAllServices && (
                <>
                  {availableTreatments.length > 0 && (
                    <div className={leadSelectedServices.length > 0 ? "pt-5 border-t border-[#e5e5e5]" : ""}>
                      {leadSelectedServices.length > 0 && (
                        <h3 className="text-lg font-bold text-[#1a1a1a] mb-4">All Treatments at {clinic.name}</h3>
                      )}
                      <div className="grid sm:grid-cols-2 gap-2">
                        {availableTreatments.map((treatment, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 text-[#333] py-1.5">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                            <span className="text-[15px]">{treatment}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Facilities */}
                  {availableFacilities.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-[#e5e5e5]">
                      <h3 className="text-lg font-bold text-[#1a1a1a] mb-4">Clinic Facilities</h3>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {availableFacilities.map((facility, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 text-[#333] py-1.5">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                            <span className="text-[15px]">{facility}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Not listed treatments */}
                  {unavailableTreatments.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-[#e5e5e5]">
                      <h3 className="text-sm font-semibold text-[#999] mb-3">Not Listed</h3>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {unavailableTreatments.map((treatment, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[#999] py-1">
                            <XCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm">{treatment}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Divider */}
            <div className="border-t border-[#e5e5e5]" />

            {/* 7. INSURANCE & PAYMENT */}
            <section>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-5">Insurance & Payment</h2>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-[#f0f5f0] flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1a1a1a]">
                    {clinic.accepts_nhs ? "NHS & Private Patients Accepted" : "Private Practice"}
                  </h3>
                  <p className="text-[#666] mt-1 leading-relaxed">
                    {clinic.accepts_nhs
                      ? `${clinic.name} accepts both NHS and private patients. Contact the clinic directly for pricing and insurance queries.`
                      : `${clinic.name} is a private dental practice offering flexible payment options. Contact them directly for pricing information.`}
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="border-t border-[#e5e5e5]" />

            {/* 8. WHY CHOOSE US */}
            <section>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Why Choose Us</h2>
              <div className="border-t border-[#e5e5e5] pt-4">
                <p className="text-[#444] leading-relaxed whitespace-pre-line">
                  {clinic.description ||
                    `${clinic.name} is a dental practice located in ${clinic.city || clinic.postcode}. Contact them directly for more information about their services and availability.`}
                </p>
              </div>
            </section>

            {/* Divider */}
            <div className="border-t border-[#e5e5e5]" />

            {/* 9. OPENING HOURS + LINKS side by side */}
            {(clinic.opening_hours && Object.keys(clinic.opening_hours).length > 0) && (
              <>
                <section className="grid sm:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-xl font-bold text-[#1a1a1a] mb-4">Office Hours</h2>
                    <div className="space-y-0">
                      {Object.entries(clinic.opening_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between items-center py-2.5 border-b border-[#f0f0f0] last:border-b-0">
                          <span className="font-medium text-emerald-700 capitalize">{day}</span>
                          <span className="text-[#444]">{hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#1a1a1a] mb-4">Links</h2>
                    <div className="space-y-3">
                      {clinic.website && (
                        <a
                          href={clinic.website.startsWith("http") ? clinic.website : `https://${clinic.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[#444] hover:text-[#1a1a1a] transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Website</span>
                        </a>
                      )}
                      {clinic.phone && (
                        <a href={`tel:${clinic.phone}`} className="flex items-center gap-2 text-[#444] hover:text-[#1a1a1a] transition-colors">
                          <Phone className="h-4 w-4" />
                          <span>{clinic.phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </section>
                <div className="border-t border-[#e5e5e5]" />
              </>
            )}

            {/* 10. PHOTOS */}
            {clinic.images && clinic.images.length > 0 && (
              <>
                <section>
                  <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Photos</h2>
                  <div className="relative rounded-2xl overflow-hidden bg-[#e5e5e5] aspect-[16/9]">
                    <Image
                      src={clinic.images[lightboxIndex] || clinic.images[0]}
                      alt={`${clinic.name} - Photo ${lightboxIndex + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 60vw"
                    />
                    {clinic.images.length > 1 && (
                      <>
                        <button
                          onClick={() => setLightboxIndex((lightboxIndex - 1 + clinic.images.length) % clinic.images.length)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-colors"
                        >
                          <ChevronLeftIcon className="h-5 w-5 text-[#1a1a1a]" />
                        </button>
                        <button
                          onClick={() => setLightboxIndex((lightboxIndex + 1) % clinic.images.length)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-colors"
                        >
                          <ChevronRight className="h-5 w-5 text-[#1a1a1a]" />
                        </button>
                        <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm font-medium backdrop-blur-sm flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          {lightboxIndex + 1}/{clinic.images.length}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Thumbnail strip */}
                  {clinic.images.length > 1 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                      {clinic.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setLightboxIndex(idx)}
                          className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors ${idx === lightboxIndex ? "border-[#1a1a1a]" : "border-transparent opacity-70 hover:opacity-100"}`}
                        >
                          <img src={img || "/placeholder.svg"} alt={`${clinic.name} thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </section>
                <div className="border-t border-[#e5e5e5]" />
              </>
            )}

            {/* 11. OUR PROVIDERS */}
            {providers.length > 0 && (
              <>
                <section>
                  <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Our Providers</h2>
                  <div className="space-y-4">
                    {providers.map((provider) => {
                      const isExpanded = expandedProvider === provider.id
                      const hasBio = !!provider.bio
                      const hasEducation = provider.education && provider.education.length > 0
                      const hasCerts = provider.certifications && provider.certifications.length > 0

                      return (
                        <div key={provider.id} className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden">
                          <div className="flex items-center justify-between px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-14 w-14 rounded-full bg-[#f0f0f0] overflow-hidden flex-shrink-0">
                                {provider.photo_url ? (
                                  <img src={provider.photo_url || "/placeholder.svg"} alt={provider.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <UserRound className="h-7 w-7 text-[#999]" />
                                  </div>
                                )}
                              </div>
                              <span className="font-semibold text-[#1a1a1a] text-lg">{provider.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#1a1a1a] border border-[#ccc] rounded-full hover:bg-[#f5f5f5] transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4" />
                                  View less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4" />
                                  View more
                                </>
                              )}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="px-5 pb-5">
                              <div className="border-t border-[#e5e5e5] pt-4 space-y-5">
                                {hasBio && <p className="text-[#444] leading-relaxed">{provider.bio}</p>}
                                {(hasEducation || hasCerts) && (
                                  <div>
                                    <h3 className="text-base font-semibold text-[#1a1a1a] mb-3 pb-2 border-b border-[#e5e5e5]">
                                      Education & Certifications
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                      {(provider.education || []).map((edu, i) => (
                                        <div key={`edu-${i}`} className="flex items-start gap-3">
                                          <div className="rounded-lg bg-[#f0f5ff] p-2 flex-shrink-0">
                                            <GraduationCap className="h-5 w-5 text-[#3b6fcf]" />
                                          </div>
                                          <div>
                                            <p className="text-xs font-semibold text-[#3b6fcf] uppercase tracking-wide">Education</p>
                                            <p className="font-semibold text-[#1a1a1a]">{edu.degree}</p>
                                            {edu.institution && <p className="text-sm text-[#666]">{edu.institution}</p>}
                                          </div>
                                        </div>
                                      ))}
                                      {(provider.certifications || []).map((cert, i) => (
                                        <div key={`cert-${i}`} className="flex items-start gap-3">
                                          <div className="rounded-lg bg-[#f0f5ff] p-2 flex-shrink-0">
                                            <Award className="h-5 w-5 text-[#3b6fcf]" />
                                          </div>
                                          <div>
                                            <p className="text-xs font-semibold text-[#3b6fcf] uppercase tracking-wide">Certification</p>
                                            <p className="font-semibold text-[#1a1a1a]">{cert.name}</p>
                                            {cert.date && <p className="text-sm text-[#666]">{cert.date}</p>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="flex justify-center pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedProvider(null)}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1a1a1a] hover:text-[#666] transition-colors"
                                  >
                                    <ChevronUp className="h-4 w-4" />
                                    View less
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
                <div className="border-t border-[#e5e5e5]" />
              </>
            )}

            {/* 12. FAQs */}
            <section>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Frequently Asked Questions</h2>
              <p className="text-[#666] mb-6">
                Below are some of the most commonly asked questions about {clinic.name}.
              </p>
              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#fafafa] transition-colors"
                    >
                      <span className="font-medium text-[#1a1a1a]">{faq.question}</span>
                      <ChevronDown
                        className={`h-5 w-5 text-[#666] transition-transform flex-shrink-0 ${expandedFaq === idx ? "rotate-180" : ""}`}
                      />
                    </button>
                    {expandedFaq === idx && <div className="px-5 pb-4 text-[#666] leading-relaxed">{faq.answer}</div>}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN - Sticky Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              {/* Appointment request box */}
              <Card className="bg-white border-[#e5e5e5] overflow-hidden shadow-sm">
                {/* Clinic main photo */}
                {clinic.images && clinic.images.length > 0 && (
                  <div className="relative w-full h-[160px]">
                    <Image
                      src={clinic.images[0] || "/placeholder.svg"}
                      alt={`${clinic.name} clinic`}
                      fill
                      className="object-cover"
                      sizes="380px"
                    />
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
                  {/* Date picker for booking */}
                  <div id="clinic-date-picker">
                    <ClinicDatePicker
                      availableDays={clinic.available_days || ["mon", "tue", "wed", "thu", "fri"]}
                      availableHours={clinic.available_hours || ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]}
                      acceptsSameDay={clinic.accepts_same_day || false}
                      onSelectSlot={(date, time) => handleBookAppointment(date, time)}
                    />
                  </div>

                  {/* Message / Enquire button */}
                  <Button
                    size="lg"
                    className="w-full bg-[#1a1a1a] hover:bg-[#333] text-white"
                    onClick={() => setShowChat(!showChat)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {(lead?.id || leadIdParam || directLeadId) ? "Message Clinic" : "Enquire now"}
                  </Button>

                  {/* Inline chat panel / direct enquiry form */}
                  <EmbeddedClinicChat
                    leadId={lead?.id || leadIdParam || directLeadId || null}
                    clinicId={clinic.id}
                    clinicName={clinic.name}
                    isOpen={showChat}
                    onToggle={() => setShowChat(false)}
                    onLeadCreated={(newLeadId) => setDirectLeadId(newLeadId)}
                  />

                  {/* Trust indicators */}
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

              {/* Match reasons card - aligned with match page style */}
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
                    Most patients book one of these clinics
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
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5]">
              <h3 className="font-semibold text-[#1a1a1a]">Message {clinic.name}</h3>
              <button
                type="button"
                onClick={() => setShowMobileChat(false)}
                className="p-1 rounded-full hover:bg-[#f5f5f5]"
              >
                <X className="h-5 w-5 text-[#666]" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
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
              <button
                type="button"
                onClick={() => setShowMobilePicker(false)}
                className="p-1 rounded-full hover:bg-[#f5f5f5]"
              >
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

      {/* Mobile sticky CTA - hidden when a bottom sheet is open */}
      {!showMobileChat && !showMobilePicker && (
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-[#e5e5e5] p-4 z-50 pointer-events-auto">
        <p className="text-xs text-[#666] text-center mb-2">No booking fees on Pearlie</p>
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            size="lg"
            variant="outline"
            className="flex-1 border-[#e5e5e5] bg-transparent min-h-[48px] touch-manipulation"
            onClick={() => setShowMobileChat(true)}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {(lead?.id || leadIdParam || directLeadId) ? "Message" : "Enquire"}
          </Button>
          <Button
            size="lg"
            className="flex-1 bg-[#1a1a1a] hover:bg-[#333] text-white min-h-[48px] touch-manipulation"
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
