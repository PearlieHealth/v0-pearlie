"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  MapPin,
  Search,
  CheckCircle2,
  Shield,
  Star,
  Users,
  ArrowRight,
  Stethoscope,
  Navigation,
  AlertCircle,
  ChevronDown,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { TreatmentClinicCard, type ClinicData } from "@/components/treatments/treatment-clinic-card"
import { validateUKPostcode } from "@/lib/postcodes-io"

const heroRotatingBenefits = [
  "with availability",
  "open on weekends",
  "with transparent pricing",
  "with the best reviews",
  "accepting new patients",
  "near your workplace",
  "known for Invisalign",
  "known for implants",
  "known for composite bonding",
]

// Extend ClinicData with optional distance from nearby API
type ClinicWithDistance = ClinicData & { distance_miles?: number }

interface DentistNearMeClientProps {
  clinics: ClinicData[]
  totalClinics: number
  faqs: { question: string; answer: string }[]
  treatmentShortcuts: { label: string; slug: string }[]
  boroughs: { slug: string; name: string }[]
}

export function DentistNearMeClient({
  clinics: initialClinics,
  totalClinics,
  faqs,
  treatmentShortcuts,
  boroughs,
}: DentistNearMeClientProps) {
  const router = useRouter()
  const heroRef = useRef<HTMLDivElement>(null)
  const [postcode, setPostcode] = useState("")
  const [detectedBorough, setDetectedBorough] = useState<string | null>(null)
  const [detectedBoroughSlug, setDetectedBoroughSlug] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [postcodeError, setPostcodeError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [displayedClinics, setDisplayedClinics] = useState<ClinicWithDistance[]>(initialClinics)
  const [isLoadingClinics, setIsLoadingClinics] = useState(false)
  const [showStickyTop, setShowStickyTop] = useState(false)
  const [seoExpanded, setSeoExpanded] = useState(false)

  // Rotating hero benefit phrases
  const [benefitIndex, setBenefitIndex] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setBenefitIndex((prev) => (prev + 1) % heroRotatingBenefits.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Sticky top bar: show when hero scrolls out of view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyTop(!entry.isIntersecting),
      { threshold: 0 }
    )
    const el = heroRef.current
    if (el) observer.observe(el)
    return () => { if (el) observer.unobserve(el) }
  }, [])

  // Fetch clinics near a lat/lng from the API
  const fetchNearbyClinics = useCallback(async (lat: number, lng: number) => {
    setIsLoadingClinics(true)
    try {
      const res = await fetch(`/api/clinics/nearby?lat=${lat}&lng=${lng}&radius=5`)
      if (!res.ok) return
      const data = await res.json()
      if (data.clinics && data.clinics.length > 0) {
        setDisplayedClinics(data.clinics)
      }
    } catch {
      // Keep initial clinics on error
    } finally {
      setIsLoadingClinics(false)
    }
  }, [])

  // Resolve a postcode → borough name + slug + nearby clinics
  const lookupPostcode = useCallback(async (pc: string) => {
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.status === 200 && data.result) {
        const district = data.result.admin_district as string
        const lat = data.result.latitude as number
        const lng = data.result.longitude as number

        if (district) {
          setDetectedBorough(district)
          const slug = boroughs.find(
            (b) => b.name.toLowerCase() === district.toLowerCase()
          )?.slug
          setDetectedBoroughSlug(slug || null)
        }

        if (lat && lng) {
          await fetchNearbyClinics(lat, lng)
        }
      }
    } catch {
      // Silently fail
    }
  }, [boroughs, fetchNearbyClinics])

  // Check localStorage for saved postcode on mount
  useEffect(() => {
    const saved = localStorage.getItem("pearlie_postcode")
    if (saved) {
      setPostcode(saved)
      lookupPostcode(saved)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePostcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPostcodeError("")

    const sanitized = postcode.trim().toUpperCase()
    if (!sanitized) {
      setPostcodeError("Please enter your postcode")
      return
    }
    if (!validateUKPostcode(sanitized)) {
      setPostcodeError("Please enter a valid UK postcode")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(sanitized)}`)
      const data = await res.json()

      if (data.status !== 200 || !data.result) {
        setPostcodeError("We couldn't find that postcode. Please check and try again.")
        setIsSubmitting(false)
        return
      }

      const region = data.result.region as string
      if (region !== "London") {
        setPostcodeError("We're currently only serving patients in London. More areas coming soon.")
        setIsSubmitting(false)
        return
      }

      localStorage.setItem("pearlie_postcode", sanitized)
      router.push(`/intake?postcode=${encodeURIComponent(sanitized)}`)
    } catch {
      setPostcodeError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  const handleUseLocation = async () => {
    if (!navigator.geolocation) {
      setPostcodeError("Geolocation is not supported by your browser")
      return
    }

    setIsLocating(true)
    setPostcodeError("")

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          fetchNearbyClinics(latitude, longitude)

          const res = await fetch(
            `https://api.postcodes.io/postcodes?lon=${longitude}&lat=${latitude}&limit=1`
          )
          const data = await res.json()

          if (data.status === 200 && data.result?.length > 0) {
            const pc = data.result[0].postcode as string
            const district = data.result[0].admin_district as string
            setPostcode(pc)
            localStorage.setItem("pearlie_postcode", pc)

            if (district) {
              setDetectedBorough(district)
              const slug = boroughs.find(
                (b) => b.name.toLowerCase() === district.toLowerCase()
              )?.slug
              setDetectedBoroughSlug(slug || null)
            }
          } else {
            setPostcodeError("We couldn't determine your postcode. Please enter it manually.")
          }
        } catch {
          setPostcodeError("We couldn't determine your location. Please enter your postcode.")
        } finally {
          setIsLocating(false)
        }
      },
      () => {
        setPostcodeError("Location access was denied. Please enter your postcode instead.")
        setIsLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }

  const treatmentLinkBase = detectedBoroughSlug
    ? `/london/${detectedBoroughSlug}`
    : "/london"


  return (
    <>
      {/* ─── STICKY TOP BAR (mobile) ──────────────────────── */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-[#004443] text-white transition-transform duration-300 md:hidden ${
          showStickyTop ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <MapPin className="w-3.5 h-3.5 text-[#0fbcb0] flex-shrink-0" />
            <span className="truncate">
              {detectedBorough
                ? `Clinics near ${postcode || detectedBorough}`
                : "Dentists near you"}
            </span>
          </div>
          <button
            onClick={handleUseLocation}
            disabled={isLocating}
            className="text-xs font-medium text-[#0fbcb0] hover:text-white transition-colors flex-shrink-0 ml-2"
          >
            {isLocating ? "Locating..." : detectedBorough ? "Update" : "Enable location"}
          </button>
        </div>
      </div>

      {/* ─── HERO (Full-screen mobile, expanded desktop) ──── */}
      <section
        ref={heroRef}
        className="relative bg-gradient-to-b from-[#004443] to-[#00625e] text-white min-h-[100svh] sm:min-h-0 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-20 overflow-hidden flex flex-col justify-center"
      >
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-white/[0.03] blur-3xl pointer-events-none hidden sm:block" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-[2rem] sm:text-4xl md:text-5xl lg:text-[3.5rem] font-heading font-bold tracking-[-0.03em] mb-2 sm:mb-4">
              <span className="block">
                {detectedBorough
                  ? `Dentist Near Me in ${detectedBorough}`
                  : "Dentist Near Me"}
              </span>
              <span className="block mt-2 sm:mt-2 relative h-[1.2em] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={benefitIndex}
                    className="absolute inset-x-0 top-0 text-[#0fbcb0]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    {heroRotatingBenefits[benefitIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            {detectedBorough && (
              <p className="flex items-center justify-center gap-1.5 text-sm opacity-75 mb-4 sm:mb-5">
                <MapPin className="w-3.5 h-3.5" />
                Showing clinics near: {postcode || detectedBorough}
              </p>
            )}

            {/* Postcode search */}
            <form onSubmit={handlePostcodeSubmit} className="max-w-[21rem] sm:max-w-[21rem] mx-auto mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={postcode}
                  onChange={(e) => {
                    setPostcode(e.target.value)
                    setPostcodeError("")
                  }}
                  placeholder="Enter your postcode"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0fbcb0]"
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 bg-[#0fbcb0] hover:bg-[#0da399] text-white font-semibold rounded-xl h-[52px] text-base sm:text-lg"
              >
                {isSubmitting ? "Finding..." : "Find my dentist now"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <button
              onClick={handleUseLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors min-h-[44px]"
            >
              <Navigation className="w-3.5 h-3.5" />
              {isLocating ? "Detecting location..." : "Use my location"}
            </button>

            {postcodeError && (
              <p className="flex items-center justify-center gap-1.5 text-sm text-red-300 mt-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {postcodeError}
              </p>
            )}

            <p className="text-xs text-white/60 mt-4 sm:mt-5">
              Free &bull; No booking fees &bull; Verified clinics only
            </p>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF BAR ─────────────────────────────── */}
      <section className="border-b border-border/50 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-4 sm:gap-10 py-3 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold text-foreground">4.8</span> avg
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-[#0fbcb0]" />
              <span className="font-semibold text-foreground">100+</span> clinics
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0fbcb0]" />
              Trusted across London
            </div>
          </div>
        </div>
      </section>

      {/* ─── TREATMENT SHORTCUTS (horizontal scroll mobile) ─ */}
      <section className="py-3 sm:py-4 bg-[#004443]">
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex gap-2 px-4 sm:px-6 lg:px-8 sm:justify-center min-w-max sm:min-w-0 sm:flex-wrap">
            {treatmentShortcuts.map((t) => (
              <Link
                key={t.slug}
                href={`${treatmentLinkBase}/${t.slug}`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 border border-white/15 hover:bg-white/20 text-xs sm:text-sm font-medium text-white whitespace-nowrap min-h-[36px] transition-colors"
              >
                <Stethoscope className="w-3 h-3 text-[#0fbcb0]" />
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CLINIC LISTINGS ──────────────────────────────── */}
      {displayedClinics.length > 0 && (
        <section className="py-6 sm:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-end justify-between mb-4 sm:mb-6">
                <div>
                  <h2 className="text-lg sm:text-2xl font-heading font-bold tracking-[-0.02em] text-[#004443]">
                    {detectedBorough
                      ? `Clinics near ${detectedBorough}`
                      : "Top-rated clinics"}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {detectedBorough
                      ? "Sorted by distance and rating"
                      : "Verified, GDC-registered clinics"}
                  </p>
                </div>
              </div>
              <div className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 transition-opacity duration-300 ${isLoadingClinics ? "opacity-50" : "opacity-100"}`}>
                {displayedClinics.map((clinic) => (
                  <div key={clinic.id} className="relative">
                    <TreatmentClinicCard clinic={clinic} />
                    {/* Distance badge overlay */}
                    {clinic.distance_miles != null && (
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
                        <MapPin className="w-3 h-3 text-[#0fbcb0]" />
                        <span className="text-xs font-semibold text-foreground">
                          {clinic.distance_miles.toFixed(1)} mi
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── SEO INTRO (collapsible on mobile) ────────────── */}
      <section className="py-8 sm:py-12 bg-[#faf9f6]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {/* Mobile: collapsible */}
            <div className="sm:hidden">
              <button
                onClick={() => setSeoExpanded(!seoExpanded)}
                className="flex items-center justify-between w-full text-left min-h-[44px]"
              >
                <span className="text-sm font-semibold text-[#004443]">
                  Why use Pearlie to find a dentist?
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${seoExpanded ? "rotate-180" : ""}`} />
              </button>
              {seoExpanded && (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Looking for a dentist near you? Whether you need a routine check-up,
                    emergency appointment, or cosmetic treatment like Invisalign or dental
                    implants, Pearlie helps you compare verified local dental clinics across London.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Every clinic is independently verified and GDC-registered. See real Google
                    reviews, transparent pricing, and book directly — no middleman, no hidden fees.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Whether you&apos;re looking for a private dentist near you, an NHS dentist
                    accepting new patients, or an emergency dentist open today, enter your
                    postcode to get matched.
                  </p>
                </div>
              )}
            </div>

            {/* Desktop: always visible */}
            <div className="hidden sm:block prose prose-sm">
              <p className="text-muted-foreground leading-relaxed">
                Looking for a dentist near you? Whether you need a routine check-up,
                emergency appointment, or cosmetic treatment like Invisalign or dental
                implants, Pearlie helps you compare verified local dental clinics across London.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Every clinic on Pearlie is independently verified and confirmed as registered
                with the General Dental Council (GDC). You can see real Google reviews,
                transparent pricing, available treatments and book directly — no middleman,
                no hidden fees.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Whether you&apos;re looking for a private dentist near you, an NHS dentist
                accepting new patients, or an emergency dentist open today, enter your
                postcode above to get matched with clinics suited to your needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHY PEARLIE (compact on mobile) ──────────────── */}
      <section className="py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg sm:text-2xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-4 sm:mb-6 text-center">
              Why use Pearlie?
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: Shield, title: "GDC verified", desc: "Every clinic is GDC-registered" },
                { icon: Star, title: "Real reviews", desc: "Genuine Google ratings" },
                { icon: Search, title: "Compare prices", desc: "Transparent pricing upfront" },
                { icon: Users, title: "100% free", desc: "No fees for patients" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col items-center text-center p-3 sm:p-4 rounded-xl bg-white border border-border/50"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0fbcb0]/10 flex items-center justify-center mb-2">
                    <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#0fbcb0]" />
                  </div>
                  <h3 className="font-semibold text-foreground text-xs sm:text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── BOROUGH LINKS ────────────────────────────────── */}
      <section className="py-8 sm:py-12 bg-[#faf9f6]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg sm:text-xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-3 sm:mb-4">
              {detectedBorough ? "Areas near you" : "Browse by borough"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-3">
              {boroughs.slice(0, 8).map((borough) => (
                <Link
                  key={borough.slug}
                  href={`/london/${borough.slug}`}
                  className="text-sm text-foreground hover:text-[#0fbcb0] transition-colors flex items-center gap-1.5 p-2.5 rounded-lg hover:bg-white min-h-[44px]"
                >
                  <MapPin className="w-3 h-3 text-[#0fbcb0] flex-shrink-0" />
                  {borough.name}
                </Link>
              ))}
            </div>
            {boroughs.length > 8 && (
              <div className="mt-3 text-center">
                <Link
                  href="/london"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0fbcb0] hover:underline min-h-[44px]"
                >
                  View all {boroughs.length} boroughs
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────── */}
      <section className="py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-lg sm:text-2xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-4 sm:mb-6 text-center">
              Common questions
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group bg-white rounded-xl border border-border/50 overflow-hidden"
                >
                  <summary className="flex items-center justify-between gap-3 p-4 sm:p-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden min-h-[44px]">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base text-left">
                      {faq.question}
                    </h3>
                    <ChevronDown className="w-4 h-4 text-[#0fbcb0] flex-shrink-0 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── BOTTOM CTA (desktop) ─────────────────────────── */}
      <section className="py-12 sm:py-16 bg-[#004443] text-white mb-16 sm:mb-0">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-heading font-bold tracking-[-0.03em] mb-3 sm:mb-4">
              Ready to find your dentist?
            </h2>
            <p className="text-sm sm:text-lg opacity-90 mb-6 sm:mb-8">
              Answer a few quick questions and get matched with trusted clinics near you.
            </p>
            <Link href="/intake">
              <Button
                size="lg"
                className="bg-[#0fbcb0] hover:bg-[#0da399] text-white font-semibold px-8 py-3 rounded-xl text-base min-h-[48px]"
              >
                Find my dentist now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── STICKY BOTTOM CTA (mobile only) ──────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border/50 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 py-2.5 md:hidden">
        <div className="flex gap-2">
          <Link href="/intake" className="flex-1">
            <Button className="w-full bg-[#0fbcb0] hover:bg-[#0da399] text-white font-semibold rounded-full h-10 text-sm">
              Find my dentist now
            </Button>
          </Link>
          <button
            onClick={handleUseLocation}
            disabled={isLocating}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-white hover:bg-muted/50 transition-colors"
            aria-label="Use my location"
          >
            <Navigation className="w-4 h-4 text-[#0fbcb0]" />
          </button>
        </div>
      </div>
    </>
  )
}
