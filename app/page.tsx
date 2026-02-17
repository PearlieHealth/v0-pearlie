"use client"
import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Star, CheckCircle2, ArrowRight, Shield, Sparkles, Heart, MapPin, CalendarCheck, Building2, Users, ChevronDown } from "lucide-react"
import Link from "next/link"
import { MainNav } from "@/components/main-nav"
import Image from "next/image"
import { ComparisonTable } from "@/components/comparison-table"
import { Badge } from "@/components/ui/badge"
import { LoadingAnimation } from "@/components/loading-animation"
import StatsCard from "@/components/stats-card"
import ClinicCarousel from "@/components/clinic-carousel"
import { ScrollReveal } from "@/components/scroll-reveal"
import { ScrollingMarquee } from "@/components/scrolling-marquee"
import { SiteFooter } from "@/components/site-footer"
import { TREATMENT_OPTIONS, EMERGENCY_TREATMENT } from "@/lib/intake-form-config"

// Homepage treatment list derived from the canonical config (not hardcoded)
const HOMEPAGE_TREATMENTS = TREATMENT_OPTIONS.filter((t) => t !== EMERGENCY_TREATMENT)

const dynamicWords = ["perfect", "right", "trusted", "ideal"]

const marqueeItems = [
  { text: "Trusted UK Clinics", icon: <Shield className="w-3.5 h-3.5" /> },
  { text: "Free Clinic Matching", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { text: "No Sign-Up Required", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { text: "Verified Dental Practices", icon: <Heart className="w-3.5 h-3.5" /> },
]

const marqueeItemsDark = [
  { text: "Verified Clinics", icon: <Shield className="w-3.5 h-3.5" /> },
  { text: "Patient-First", icon: <Heart className="w-3.5 h-3.5" /> },
  { text: "Independent & Trusted", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { text: "Free to Use", icon: <Sparkles className="w-3.5 h-3.5" /> },
]

interface LastMatch {
  matchId: string
  clinicCount: number
  treatment: string
  createdAt: string
}

export default function Home() {
  const [showLoading, setShowLoading] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 768 // Skip animation on mobile for instant content
  })
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [lastMatch, setLastMatch] = useState<LastMatch | null>(null)
  const treatments = HOMEPAGE_TREATMENTS

  // Check for previous match results in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pearlie_last_match")
      if (stored) {
        const data = JSON.parse(stored) as LastMatch
        const MAX_MATCH_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
        const age = Date.now() - new Date(data.createdAt).getTime()
        if (age < MAX_MATCH_AGE_MS && data.matchId) {
          setLastMatch(data)
        } else {
          // Clean up stale entry
          localStorage.removeItem("pearlie_last_match")
        }
      }
    } catch {
      localStorage.removeItem("pearlie_last_match")
    }
  }, [])

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  // Rotate words every 4000ms (slower, less distracting)
  useEffect(() => {
    if (prefersReducedMotion) return
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % dynamicWords.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [prefersReducedMotion])

  const featuredClinics = [
    { name: "Smile Studio London", area: "Shoreditch", tags: ["Invisalign", "Cosmetic"] },
    { name: "Camden Dental Care", area: "Camden", tags: ["NHS", "Emergency"] },
    { name: "Chelsea Smiles", area: "Chelsea", tags: ["Veneers", "Whitening"] },
    { name: "Brixton Dental Practice", area: "Brixton", tags: ["Family", "Implants"] },
  ]

  return (
    <>
      <AnimatePresence>
        {showLoading && <LoadingAnimation onComplete={() => setShowLoading(false)} />}
      </AnimatePresence>

      {/* Content is always rendered underneath - loading screen slides up like a curtain to reveal it */}
      <div className={`min-h-screen ${showLoading ? 'invisible' : 'visible'}`}>
          <MainNav />

          {/* Hero section — background image with dark overlay */}
          <section
            className="relative min-h-[60vh] md:min-h-[75vh] lg:min-h-[90vh] flex items-center justify-center overflow-hidden pt-28 pb-16 md:pt-32 md:pb-24"
          >
            {/* Background image */}
            <Image
              src="/hero-clinic.webp"
              alt="Modern dental clinic"
              fill
              className="object-cover"
              priority
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/55" />

            {/* Content */}
            <div className="relative z-10 max-w-[880px] mx-auto px-6 text-center">
              {/* Trust Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-8"
              >
                <span className="inline-flex items-center gap-2 text-sm text-white bg-white/15 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/20 shadow-lg">
                  <Shield className="w-4 h-4 text-[#0fbcb0]" />
                  Verified dental clinics across the UK
                </span>
              </motion.div>

              {/* Headline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
              >
                <h1 className="text-3xl md:text-5xl lg:text-6xl leading-[1.15] font-bold text-[#F8F1E7] mb-4 md:mb-6">
                  {/* Mobile: 3 lines */}
                  <span className="md:hidden">
                    <span className="block">
                      Where{" "}
                      <span className="inline-block relative">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={currentWordIndex}
                            className="inline-block text-[#0fbcb0] font-bold"
                            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
                            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                          >
                            {dynamicWords[currentWordIndex]}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                    </span>
                    <span className="block">dental care</span>
                    <span className="block">begins.</span>
                  </span>
                  {/* Desktop: 2 lines - "[word] dental care" stays on one line */}
                  <span className="hidden md:block">
                    <span className="block whitespace-nowrap">
                      Where{" "}
                      <span className="inline-block relative">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={`desktop-${currentWordIndex}`}
                            className="inline-block text-[#0fbcb0] font-bold"
                            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
                            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                          >
                            {dynamicWords[currentWordIndex]}
                          </motion.span>
                        </AnimatePresence>
                      </span>{" "}
                      dental care
                    </span>
                    <span className="block">begins.</span>
                  </span>
                </h1>
              </motion.div>

              {/* Subheadline */}
              <motion.p
                className="text-lg md:text-2xl text-white/90 mb-8 md:mb-12 max-w-3xl mx-auto leading-relaxed font-medium"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                We match you with the right dental clinic based on what actually matters to you.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                {lastMatch ? (
                  <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4 max-w-xl mx-auto">
                    <Link
                      href={`/match/${lastMatch.matchId}`}
                      className="flex-1 group flex items-center gap-4 bg-white border border-[#0fbcb0]/30 rounded-2xl px-5 py-4 shadow-md hover:shadow-lg hover:border-[#0fbcb0]/60 transition-all text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-[#222]">Return to previous match</p>
                        <p className="text-xs text-[#666] mt-0.5 leading-snug">View the clinics we recommended in your last search</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[#0fbcb0] flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    <Link
                      href="/intake"
                      className="flex-1 group flex items-center gap-4 bg-white border border-[#0fbcb0]/30 rounded-2xl px-5 py-4 shadow-md hover:shadow-lg hover:border-[#0fbcb0]/60 transition-all text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-[#222]">Start a new search</p>
                        <p className="text-xs text-[#666] mt-0.5 leading-snug">Answer a new set of questions and get matched with clinics</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[#0fbcb0] flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        size="lg"
                        className="bg-[#0fbcb0] hover:bg-[#0da399] text-white px-10 py-4 h-auto rounded-full font-medium hover:shadow-xl transition-all shadow-lg text-base border-0"
                        asChild
                      >
                        <Link href="/intake">
                          Find my clinic
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                      </Button>
                    </motion.div>

                    <Button
                      variant="outline"
                      size="lg"
                      className="text-white hover:text-white px-10 py-4 h-auto rounded-full transition-all border-2 border-white/70 bg-transparent hover:bg-white/10 text-base font-medium"
                      onClick={() => {
                        document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                      }}
                    >
                      How it works
                    </Button>
                  </div>
                )}
              </motion.div>

            </div>

            {/* Scroll indicator */}
            <motion.div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:block"
              animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <ChevronDown className="w-6 h-6 text-white/40" />
            </motion.div>
          </section>

          {/* Scrolling Marquee - right below hero */}
          <ScrollingMarquee items={marqueeItems} speed={35} />

          {/* Trust bar - standalone section */}
          <section className="py-8 border-y border-border/30 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 lg:gap-12 max-w-3xl mx-auto">
                <ScrollReveal delay={0}>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground font-medium leading-tight">UK-focused</span>
                  </div>
                </ScrollReveal>
                <ScrollReveal delay={0.1}>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground font-medium leading-tight">Independent</span>
                  </div>
                </ScrollReveal>
                <ScrollReveal delay={0.2}>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
                      <Heart className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground font-medium leading-tight">Dentist-led</span>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* Trusted clinics section */}
          <section className="py-16 md:py-28 lg:py-32 bg-[#F8F1E7]">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-6xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                  {/* Clinic Carousel */}
                  <ScrollReveal direction="left">
                    <ClinicCarousel />
                  </ScrollReveal>

                  {/* Content */}
                  <ScrollReveal direction="right" className="lg:pl-4">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 text-foreground text-balance">
                      Qualified, vetted dental clinics you can trust
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                      Access a carefully curated network of clinics reviewed for clinical quality, communication, patient experience, and transparency. Helping you make confident, informed dental decisions.
                    </p>
                    <div className="space-y-4 mb-8">
                      {[
                        {
                          title: "Patient-first clinics",
                          desc: "Clinics selected for their communication style, empathy, and patient-centred care, so you feel heard, respected, and supported at every step.",
                        },
                        {
                          title: "Transparent & ethical care",
                          desc: "Clear explanations, honest recommendations, and upfront pricing",
                        },
                        {
                          title: "Highly rated clinics",
                          desc: "Clinics rated highly by patients for comfort, results, and experience — so you know what to expect before you book.",
                        },
                      ].map((item, i) => (
                        <ScrollReveal key={i} delay={0.1 * (i + 1)}>
                          <div className="flex items-start gap-3 p-3 rounded-xl transition-all duration-300 hover:bg-white/70 hover:shadow-sm">
                            <div className="rounded-full bg-white p-1.5 mt-0.5 shadow-sm">
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{item.title}</p>
                              <p className="text-sm text-muted-foreground">{item.desc}</p>
                            </div>
                          </div>
                        </ScrollReveal>
                      ))}
                    </div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        size="lg"
                        className="text-base px-8 h-14 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full shadow-lg hover:shadow-xl transition-all group border-0"
                        asChild
                      >
                        <Link href="/intake">
                          Find my clinic
                          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </motion.div>
                  </ScrollReveal>
                </div>
              </div>
            </div>
          </section>

          {/* How it works section */}
          <section id="how-it-works" className="py-20 md:py-32 lg:py-36 bg-white relative overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-6xl mx-auto">
                {/* Section header */}
                <ScrollReveal className="text-center mb-16 md:mb-24">
                  <span className="overline block mb-3">How It Works</span>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                    Three simple steps
                  </h2>
                </ScrollReveal>

                {/* Step 1 - Image Left, Text Right */}
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16 mb-20 md:mb-32">
                  {/* Illustration */}
                  <ScrollReveal direction="left" className="flex-1 flex justify-center lg:justify-end">
                    <div className="relative w-full max-w-[320px] lg:max-w-[380px]">
                      {/* Step number */}
                      <span className="absolute -top-6 -left-2 lg:-left-8 text-7xl lg:text-8xl font-bold text-primary/[0.07] select-none leading-none z-0">01</span>
                      {/* Phone mockup with form illustration */}
                      <div className="relative bg-gradient-to-br from-secondary/50 to-secondary rounded-[32px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-border hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-500">
                        <div className="bg-white rounded-2xl p-5 shadow-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary/20 flex items-center justify-center">
                              <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="h-3 w-32 bg-border/50 rounded-full" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/60">
                              <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                              </div>
                              <span className="text-sm text-primary font-medium">Dental Implants</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border/60">
                              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                              <span className="text-sm text-muted-foreground">Cosmetic Dentistry</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border/60">
                              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                              <span className="text-sm text-muted-foreground">General Checkup</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                  {/* Text content */}
                  <ScrollReveal direction="right" className="flex-1 text-center lg:text-left">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">
                      Tell us what matters to you
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0">
                      Answer a few quick questions about what you're looking for and what's important to you, at your own
                      pace.
                    </p>
                  </ScrollReveal>
                </div>

                {/* Step 2 - Text Left, Image Right */}
                <div className="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-16 mb-20 md:mb-32">
                  {/* Illustration */}
                  <ScrollReveal direction="right" className="flex-1 flex justify-center lg:justify-start">
                    <div className="relative w-full max-w-[320px] lg:max-w-[380px]">
                      {/* Step number */}
                      <span className="absolute -top-6 -right-2 lg:-right-8 text-7xl lg:text-8xl font-bold text-primary/[0.07] select-none leading-none z-0">02</span>
                      {/* Phone mockup with clinic cards */}
                      <div className="relative bg-gradient-to-br from-secondary/50 to-secondary rounded-[32px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-border hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-500">
                        <div className="space-y-4">
                          {/* Clinic card 1 */}
                          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border/60">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-primary/20 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="h-3 w-28 bg-foreground rounded-full mb-2" />
                                <div className="flex items-center gap-1 mb-1">
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <Star
                                      key={i}
                                      className="w-3 h-3 fill-amber-400 text-amber-400"
                                    />
                                  ))}
                                </div>
                                <div className="h-2 w-20 bg-muted rounded-full" />
                              </div>
                              <Badge className="bg-secondary text-primary text-xs">98%</Badge>
                            </div>
                          </div>
                          {/* Clinic card 2 */}
                          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border/60">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-primary/20 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="h-3 w-24 bg-foreground rounded-full mb-2" />
                                <div className="flex items-center gap-1 mb-1">
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <Star
                                      key={i}
                                      className="w-3 h-3 fill-amber-400 text-amber-400"
                                    />
                                  ))}
                                </div>
                                <div className="h-2 w-16 bg-muted rounded-full" />
                              </div>
                              <Badge className="bg-secondary text-primary text-xs">94%</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                  {/* Text content */}
                  <ScrollReveal direction="left" className="flex-1 text-center lg:text-left">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">
                      We recommend two carefully matched clinics
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0">
                      Based on your answers, we'll recommend two trusted clinics near you that fit your preferences, so
                      you're not overwhelmed with options.
                    </p>
                  </ScrollReveal>
                </div>

                {/* Step 3 - Image Left, Text Right */}
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
                  {/* Illustration */}
                  <ScrollReveal direction="left" className="flex-1 flex justify-center lg:justify-end">
                    <div className="relative w-full max-w-[320px] lg:max-w-[380px]">
                      {/* Step number */}
                      <span className="absolute -top-6 -left-2 lg:-left-8 text-7xl lg:text-8xl font-bold text-primary/[0.07] select-none leading-none z-0">03</span>
                      {/* Phone mockup with booking */}
                      <div className="relative bg-gradient-to-br from-secondary/50 to-secondary rounded-[32px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-border hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-500">
                        <div className="bg-white rounded-2xl p-5 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <CalendarCheck className="w-5 h-5 text-primary" />
                              <span className="text-sm font-semibold text-foreground">Choose your time</span>
                            </div>
                          </div>
                          {/* Calendar grid */}
                          <div className="grid grid-cols-7 gap-1 mb-4">
                            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                              <div key={i} className="text-center text-xs text-muted-foreground py-1">
                                {d}
                              </div>
                            ))}
                            {[...Array(14)].map((_, i) => (
                              <div
                                key={i}
                                className={`aspect-square rounded-lg flex items-center justify-center text-xs ${
                                  i === 8
                                    ? "bg-primary text-white font-semibold"
                                    : i === 5 || i === 6 || i === 12 || i === 13
                                      ? "bg-secondary/50 text-muted-foreground"
                                      : "bg-secondary text-primary"
                                }`}
                              >
                                {i + 10}
                              </div>
                            ))}
                          </div>
                          <Button className="w-full bg-primary hover:bg-[var(--primary-hover)] text-white rounded-xl h-10 text-sm">
                            Book appointment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                  {/* Text content */}
                  <ScrollReveal direction="right" className="flex-1 text-center lg:text-left">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">
                      You choose if and when to book
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0">
                      Review your options, explore each clinic, and book directly with the one that feels right for you. No
                      pressure. No obligation.
                    </p>
                  </ScrollReveal>
                </div>
              </div>
            </div>
          </section>

          {/* Comparison table - standalone */}
          <ComparisonTable />

          {/* CTA section - dark teal background */}
          <section className="py-24 md:py-32 lg:py-36 bg-[#004443] text-white relative overflow-hidden">
            {/* Decorative background blobs */}
            <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-white/[0.03] blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-[#0fbcb0]/[0.08] blur-2xl pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <ScrollReveal className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 text-balance">
                  Ready to find the right dental clinic for you?
                </h2>
                <p className="text-lg md:text-xl mb-10 opacity-90 leading-relaxed">
                  Answer a few quick questions and we&apos;ll match you with trusted clinics near you.
                </p>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-block">
                  <Button
                    size="lg"
                    className="text-base px-10 h-16 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full shadow-xl hover:shadow-[0_0_30px_rgba(15,188,176,0.3)] transition-all text-lg font-semibold border-0"
                    asChild
                  >
                    <Link href="/intake">
                      Find my clinic
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>
                </motion.div>
              </ScrollReveal>
            </div>
          </section>

          {/* Testimonials section */}
          <section className="py-16 md:py-28 lg:py-32 bg-[#F8F1E7]">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-6xl mx-auto">
                <ScrollReveal className="text-center mb-12 md:mb-16">
                  <span className="overline block mb-3">What Patients Say</span>
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-foreground">
                    Trusted by patients across the UK
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Real experiences from people who found the right clinic for them
                  </p>
                </ScrollReveal>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    {
                      text: "The matching was spot-on! Found a fantastic clinic near me that specialized in nervous patients. Couldn't be happier with the service.",
                      name: "Sophie",
                      location: "Clapham",
                      initial: "S",
                    },
                    {
                      text: "Saved me hours of research. The clinics they matched me with were ideal for my cosmetic work and budget. Really impressed!",
                      name: "James",
                      location: "Shoreditch",
                      initial: "J",
                    },
                    {
                      text: "Finally, someone who gets it! No more scrolling through dozens of clinic websites. Quick, easy, and exactly what I needed.",
                      name: "Amara",
                      location: "Camden",
                      initial: "A",
                    },
                  ].map((testimonial, i) => (
                    <ScrollReveal key={i} delay={i * 0.15}>
                      <Card className="p-5 sm:p-8 border-0 shadow-lg rounded-3xl bg-white hover:shadow-xl hover:-translate-y-2 transition-all duration-500 h-full">
                        {/* Decorative quote */}
                        <span className="text-5xl text-primary/10 font-serif leading-none block -mb-2" aria-hidden="true">&ldquo;</span>
                        <div className="flex gap-1 mb-4">
                          {[...Array(5)].map((_, j) => (
                            <Star key={j} className="w-5 h-5 text-foreground fill-primary" />
                          ))}
                        </div>
                        <p className="text-muted-foreground leading-relaxed mb-6">
                          &ldquo;{testimonial.text}&rdquo;
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {testimonial.initial}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{testimonial.name}</p>
                            <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                          </div>
                        </div>
                      </Card>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Dark scrolling marquee before footer */}
          <ScrollingMarquee items={marqueeItemsDark} speed={40} variant="dark" />

          {/* Footer */}
          <SiteFooter />
      </div>
    </>
  )
}
