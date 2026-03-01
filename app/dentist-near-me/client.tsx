"use client"

import { useState, useEffect, useCallback } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TreatmentClinicCard, type ClinicData } from "@/components/treatments/treatment-clinic-card"
import { validateUKPostcode } from "@/lib/postcodes-io"

interface DentistNearMeClientProps {
  clinics: ClinicData[]
  totalClinics: number
  faqs: { question: string; answer: string }[]
  treatmentShortcuts: { label: string; slug: string }[]
  boroughs: { slug: string; name: string }[]
}

export function DentistNearMeClient({
  clinics,
  totalClinics,
  faqs,
  treatmentShortcuts,
  boroughs,
}: DentistNearMeClientProps) {
  const router = useRouter()
  const [postcode, setPostcode] = useState("")
  const [detectedBorough, setDetectedBorough] = useState<string | null>(null)
  const [detectedBoroughSlug, setDetectedBoroughSlug] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [postcodeError, setPostcodeError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check localStorage for saved postcode on mount
  useEffect(() => {
    const saved = localStorage.getItem("pearlie_postcode")
    if (saved) {
      setPostcode(saved)
      lookupPostcode(saved)
    }
  }, [])

  const lookupPostcode = useCallback(async (pc: string) => {
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.status === 200 && data.result) {
        const district = data.result.admin_district as string
        if (district) {
          setDetectedBorough(district)
          // Try to match to a Pearlie borough
          const slug = boroughs.find(
            (b) => b.name.toLowerCase() === district.toLowerCase()
          )?.slug
          setDetectedBoroughSlug(slug || null)
        }
      }
    } catch {
      // Silently fail
    }
  }, [boroughs])

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
          const res = await fetch(
            `https://api.postcodes.io/postcodes?lon=${longitude}&lat=${latitude}&limit=1`
          )
          const data = await res.json()

          if (data.status === 200 && data.result?.length > 0) {
            const pc = data.result[0].postcode as string
            setPostcode(pc)
            localStorage.setItem("pearlie_postcode", pc)
            await lookupPostcode(pc)
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

  // Build treatment links based on detected borough
  const treatmentLinkBase = detectedBoroughSlug
    ? `/london/${detectedBoroughSlug}`
    : "/london"

  // Average rating from clinics
  const avgRating =
    clinics.length > 0
      ? (
          clinics.reduce((sum, c) => sum + ((c.rating as number) || 0), 0) /
          clinics.filter((c) => (c.rating as number) > 0).length
        ).toFixed(1)
      : "4.8"

  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-[#004443] to-[#00625e] text-white py-16 sm:py-20 lg:py-24 overflow-hidden">
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-white/[0.03] blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-56 h-56 rounded-full bg-[#0fbcb0]/[0.08] blur-2xl pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-heading font-bold tracking-[-0.03em] mb-4 text-balance">
              {detectedBorough
                ? `Dentists Near You in ${detectedBorough}`
                : "Dentists Near Me – Compare Verified Local Clinics"}
            </h1>
            <p className="text-lg md:text-xl opacity-90 mb-8 max-w-2xl mx-auto leading-snug">
              Compare GDC-registered dental clinics near you. See real reviews,
              pricing, availability and get matched free.
            </p>

            {detectedBorough && (
              <p className="flex items-center justify-center gap-1.5 text-sm opacity-75 mb-6">
                <MapPin className="w-4 h-4" />
                Showing clinics near: {detectedBorough}{postcode ? ` (${postcode})` : ""}
              </p>
            )}

            {/* Postcode search */}
            <form onSubmit={handlePostcodeSubmit} className="max-w-md mx-auto mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={postcode}
                    onChange={(e) => {
                      setPostcode(e.target.value)
                      setPostcodeError("")
                    }}
                    placeholder="Enter your postcode"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0fbcb0]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0fbcb0] hover:bg-[#0da399] text-white font-semibold px-6 rounded-xl"
                >
                  {isSubmitting ? "Finding..." : "Find"}
                </Button>
              </div>
            </form>

            <button
              onClick={handleUseLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              {isLocating ? "Detecting location..." : "Use my location"}
            </button>

            {postcodeError && (
              <p className="flex items-center justify-center gap-1.5 text-sm text-red-300 mt-3">
                <AlertCircle className="w-4 h-4" />
                {postcodeError}
              </p>
            )}

            <p className="text-xs text-white/60 mt-6">
              Free matching &bull; No booking fees &bull; Verified clinics only
            </p>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF BAR ─────────────────────────────── */}
      <section className="border-b border-border/50 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 py-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold text-foreground">{avgRating}</span> average rating
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#0fbcb0]" />
              <span className="font-semibold text-foreground">{totalClinics}+</span> verified clinics
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#0fbcb0]" />
              Free matching service
            </div>
          </div>
        </div>
      </section>

      {/* ─── CLINIC LISTINGS ──────────────────────────────── */}
      {clinics.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-2">
                {detectedBorough
                  ? `Top-rated clinics near ${detectedBorough}`
                  : "Top-rated clinics in London"}
              </h2>
              <p className="text-muted-foreground mb-8">
                Verified, GDC-registered clinics sorted by rating and reviews.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {clinics.map((clinic) => (
                  <TreatmentClinicCard key={clinic.id} clinic={clinic} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── SEO INTRO ────────────────────────────────────── */}
      <section className="py-12 sm:py-14 bg-[#faf9f6]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto prose prose-sm">
            <p className="text-muted-foreground leading-relaxed">
              Looking for a dentist near you? Whether you need a routine check-up,
              emergency appointment, or cosmetic treatment like Invisalign or dental
              implants, Pearlie helps you compare verified local dental clinics across
              London.
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
      </section>

      {/* ─── WHY PEARLIE ──────────────────────────────────── */}
      <section className="py-12 sm:py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-8 text-center">
              Why use Pearlie to find a dentist?
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  icon: Shield,
                  title: "GDC-registered clinics only",
                  desc: "Every clinic is independently verified against the General Dental Council register.",
                },
                {
                  icon: Star,
                  title: "Real Google reviews",
                  desc: "See genuine patient reviews and ratings — not curated testimonials.",
                },
                {
                  icon: Search,
                  title: "Compare pricing transparently",
                  desc: "See treatment costs upfront so you can compare before committing.",
                },
                {
                  icon: Users,
                  title: "Free matching service",
                  desc: "No sign-up fees, no booking charges. Pearlie is completely free for patients.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 p-5 rounded-xl bg-white border border-border/50"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#0fbcb0]/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-[#0fbcb0]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TREATMENT SHORTCUTS ──────────────────────────── */}
      <section className="py-12 sm:py-14 bg-[#004443] text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-5 h-5 text-[#0fbcb0]" />
              <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-[-0.02em] text-white">
                Find treatment clinics near you
              </h2>
            </div>
            <p className="text-sm text-white/70 mb-6">
              Compare specialist clinics for specific treatments in your area.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {treatmentShortcuts.map((t) => (
                <Link
                  key={t.slug}
                  href={`${treatmentLinkBase}/${t.slug}`}
                  className="flex items-center justify-between gap-3 p-4 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 hover:border-[#0fbcb0]/50 transition-all group"
                >
                  <span className="text-sm font-medium text-white group-hover:text-[#0fbcb0]">
                    {t.label}
                  </span>
                  <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-[#0fbcb0] transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── BOROUGH LINKS ────────────────────────────────── */}
      <section className="py-12 sm:py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-2">
              {detectedBorough
                ? "Popular areas near you"
                : "Browse dentists by borough"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Explore verified dental clinics across London boroughs.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {boroughs.map((borough) => (
                <Link
                  key={borough.slug}
                  href={`/london/${borough.slug}`}
                  className="text-sm text-foreground hover:text-[#0fbcb0] transition-colors flex items-center gap-1.5 p-2.5 rounded-lg hover:bg-muted/50"
                >
                  <MapPin className="w-3 h-3 text-[#0fbcb0] flex-shrink-0" />
                  {borough.name}
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/london"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0fbcb0] hover:underline"
              >
                View all London boroughs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────── */}
      <section className="py-12 sm:py-14 bg-[#faf9f6]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-8 text-center">
              Common questions about finding a dentist
            </h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group bg-white rounded-xl border border-border/50 overflow-hidden"
                >
                  <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <h3 className="font-semibold text-foreground text-left">
                      {faq.question}
                    </h3>
                    <CheckCircle2 className="w-5 h-5 text-[#0fbcb0] flex-shrink-0 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-5 pb-5">
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

      {/* ─── BOTTOM CTA ───────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-[#004443] text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold tracking-[-0.03em] mb-4">
              Ready to find your dentist?
            </h2>
            <p className="text-lg opacity-90 mb-8">
              Answer a few quick questions and we&apos;ll match you with trusted clinics
              near you. Takes under 60 seconds.
            </p>
            <Link href="/intake">
              <Button
                size="lg"
                className="bg-[#0fbcb0] hover:bg-[#0da399] text-white font-semibold px-8 py-3 rounded-xl text-base"
              >
                Get matched now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
