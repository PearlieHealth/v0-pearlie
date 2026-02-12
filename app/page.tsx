"use client"
import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Star, CheckCircle2, ArrowRight, Shield, Sparkles, Heart, MapPin, CalendarCheck, Building2, Users, X } from "lucide-react"
import Link from "next/link"
import { CookieSettingsButton } from "@/components/cookie-settings-button"
import { MainNav } from "@/components/main-nav"
import Image from "next/image"
import { ComparisonTable } from "@/components/comparison-table"
import { Badge } from "@/components/ui/badge"
import { LoadingAnimation } from "@/components/loading-animation"
import StatsCard from "@/components/stats-card"
import ClinicCarousel from "@/components/clinic-carousel" // Import the ClinicCarousel component

const dynamicWords = ["perfect", "right", "trusted", "ideal"]

interface LastMatch {
  matchId: string
  clinicCount: number
  treatment: string
  createdAt: string
}

export default function Home() {
  const [showLoading, setShowLoading] = useState(true)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [lastMatch, setLastMatch] = useState<LastMatch | null>(null)
  const [showReturnBanner, setShowReturnBanner] = useState(false)
  const treatments = ["Invisalign", "Composite bonding", "Veneers", "Whitening", "Implants", "General check-up"]

  // Check for previous match results in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pearlie_last_match")
      if (stored) {
        const data = JSON.parse(stored) as LastMatch
        // Only show if the match is less than 30 days old
        const age = Date.now() - new Date(data.createdAt).getTime()
        if (age < 30 * 24 * 60 * 60 * 1000) {
          setLastMatch(data)
          setShowReturnBanner(true)
        }
      }
    } catch {}
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

          {/* Return to matches banner - only shown if patient has previous results */}
          <AnimatePresence>
            {showReturnBanner && lastMatch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed top-16 left-0 right-0 z-40 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-[#907EFF]/10 to-[#ED64A6]/10 border-b border-[#907EFF]/20 backdrop-blur-sm">
                  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-full bg-[#907EFF]/15 p-1.5 flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-[#907EFF]" />
                      </div>
                      <p className="text-sm text-[#323141] truncate">
                        <span className="font-medium">Welcome back!</span>{" "}
                        <span className="hidden sm:inline">
                          You have {lastMatch.clinicCount} clinic{lastMatch.clinicCount !== 1 ? "s" : ""} matched to you.
                        </span>
                        <span className="sm:hidden">Your matches are ready.</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white rounded-full text-xs px-4 border-0 h-8"
                        asChild
                      >
                        <Link href={`/match/${lastMatch.matchId}`}>
                          View my matches
                          <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                        </Link>
                      </Button>
                      <button
                        onClick={() => setShowReturnBanner(false)}
                        className="p-1 rounded-full hover:bg-black/5 transition-colors text-[#323141]/50"
                        aria-label="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hero section - Purple/Pink design */}
          <section 
            className="relative min-h-[70vh] lg:min-h-[75vh] flex items-center justify-center overflow-hidden pt-24 pb-16 lg:pb-20"
            style={{
              background: "#FEFEFE"
            }}
          >
            {/* Floating orbs */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <motion.div
                className="absolute top-20 left-10 w-[600px] h-[600px] rounded-full blur-[140px]"
                style={{
                  background: "radial-gradient(circle, rgba(144, 126, 255, 0.06) 0%, rgba(237, 100, 166, 0.04) 50%, transparent 70%)"
                }}
                animate={prefersReducedMotion ? {} : { x: [0, 50, 0], y: [0, 70, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute bottom-20 right-10 w-[600px] h-[600px] rounded-full blur-[140px]"
                style={{
                  background: "radial-gradient(circle, rgba(237, 100, 166, 0.05) 0%, rgba(144, 126, 255, 0.04) 50%, transparent 70%)"
                }}
                animate={prefersReducedMotion ? {} : { x: [0, -50, 0], y: [0, -70, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px]"
                style={{
                  background: "radial-gradient(circle, rgba(248, 245, 255, 0.3) 0%, transparent 60%)"
                }}
                animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1], opacity: [0.3, 0.4, 0.3] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            
            {/* Floating decorative icons */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 left-12 hidden lg:block"
              animate={prefersReducedMotion ? {} : { y: [0, -20, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#907EFF] to-[#ED64A6] p-5 shadow-2xl">
                <Sparkles className="w-full h-full text-white" />
              </div>
            </motion.div>
            <motion.div
              className="absolute top-32 right-20 hidden lg:block"
              animate={prefersReducedMotion ? {} : { y: [0, 20, 0], rotate: [0, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-24 h-24 rounded-3xl bg-white p-6 shadow-xl">
                <Heart className="w-full h-full text-[#907EFF] fill-[#907EFF]" />
              </div>
            </motion.div>

            {/* Content */}
            <div className="relative z-10 max-w-[880px] mx-auto px-6 text-center">
              {/* Trust Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-8"
              >
                <span className="inline-flex items-center gap-2 text-sm text-[#323141] bg-white/70 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/40 shadow-lg ring-1 ring-black/5">
                  <Shield className="w-4 h-4 text-[#907EFF]" />
                  Verified dental clinics across the UK
                </span>
              </motion.div>

              {/* Headline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl leading-[1.15] font-semibold text-foreground mb-6">
                  {/* Mobile: 3 lines (original) */}
                  <span className="md:hidden">
                    <span className="block">
                      Where{" "}
                      <span className="inline-block relative">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={currentWordIndex}
                            className="inline-block bg-[length:200%_auto] bg-gradient-to-r from-[#9F7AEA] via-[#ED64A6] to-[#667EEA] bg-clip-text text-transparent font-semibold"
                            style={{
                              backgroundSize: "200% auto",
                              animation: "iridescent-shift 8s linear infinite"
                            }}
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
                            className="inline-block bg-[length:200%_auto] bg-gradient-to-r from-[#9F7AEA] via-[#ED64A6] to-[#667EEA] bg-clip-text text-transparent font-semibold"
                            style={{
                              backgroundSize: "200% auto",
                              animation: "iridescent-shift 8s linear infinite"
                            }}
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
                className="text-xl md:text-2xl text-foreground/80 mb-12 max-w-3xl mx-auto leading-relaxed font-medium"
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
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white px-10 py-4 h-auto rounded-full font-medium hover:shadow-xl transition-all shadow-lg text-base border-0"
                  asChild
                >
                  <Link href="/intake">
                    Find my clinic
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="text-[#323141] hover:text-[#323141] px-10 py-4 h-auto rounded-full transition-all border-2 border-[#907EFF] bg-white hover:bg-[#F8F5FF] text-base font-medium"
                  onClick={() => {
                    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                  }}
                >
                  How it works
                </Button>
              </motion.div>
              
              <motion.p
                className="text-sm text-muted-foreground mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                Free • No sign-up required
              </motion.p>
            </div>
          </section>

          {/* Trust bar - standalone section */}
          <section className="py-6 border-y border-border/30 bg-white/80 backdrop-blur-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12 max-w-3xl mx-auto">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground font-medium leading-tight">UK-focused</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground font-medium leading-tight">Independent</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
                    <Heart className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground font-medium leading-tight">Dentist-led</span>
                </div>
              </div>
            </div>
          </section>

          {/* Trusted clinics section - standalone */}
          <section className="py-16 md:py-24 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-6xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  {/* Clinic Carousel */}
                  <ClinicCarousel />

                  {/* Content */}
                  <div className="lg:pl-8">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 text-foreground text-balance">
                      Qualified, vetted dental clinics you can trust
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                      Access a carefully curated network of clinics reviewed for clinical quality, communication, patient experience, and transparency. Helping you make confident, informed dental decisions.
                    </p>
                    <div className="space-y-4 mb-8">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-secondary p-1.5 mt-0.5">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Patient-first clinics</p>
                          <p className="text-sm text-muted-foreground">
                            Clinics selected for their communication style, empathy, and patient-centred care, so you feel heard, respected, and supported at every step.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-secondary p-1.5 mt-0.5">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Transparent & ethical care</p>
                          <p className="text-sm text-muted-foreground">Clear explanations, honest recommendations, and upfront pricing</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-secondary p-1.5 mt-0.5">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Highly rated clinics</p>
                          <p className="text-sm text-muted-foreground">
                            Clinics rated highly by patients for comfort, results, and experience — so you know what to expect before you book.
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="text-base px-8 h-14 bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white rounded-full shadow-lg hover:shadow-xl transition-all group border-0"
                      asChild
                    >
                      <Link href="/intake">
                        Find my clinic
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How it works section - standalone */}
          <section id="how-it-works" className="py-20 md:py-28 bg-white relative overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-6xl mx-auto">
                {/* Section header */}
                <div className="text-center mb-16 md:mb-20">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
                    How it works
                  </h2>
                </div>

                {/* Step 1 - Image Left, Text Right */}
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16 mb-16 md:mb-24">
                  {/* Illustration */}
                  <div className="flex-1 flex justify-center lg:justify-end">
                    <div className="relative w-full max-w-[320px] lg:max-w-[380px]">
                      {/* Phone mockup with form illustration */}
                      <div className="relative bg-gradient-to-br from-secondary/50 to-secondary rounded-[32px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-border">
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
                  </div>
                  {/* Text content */}
                  <div className="flex-1 text-center lg:text-left">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">
                      Tell us what matters to you
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0">
                      Answer a few quick questions about what you're looking for and what's important to you, at your own
                      pace.
                    </p>
                  </div>
                </div>

                {/* Step 2 - Text Left, Image Right */}
                <div className="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-16 mb-16 md:mb-24">
                  {/* Illustration */}
                  <div className="flex-1 flex justify-center lg:justify-start">
                    <div className="relative w-full max-w-[320px] lg:max-w-[380px]">
                      {/* Phone mockup with clinic cards */}
                      <div className="relative bg-gradient-to-br from-secondary/50 to-secondary rounded-[32px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-border">
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
                  </div>
                  {/* Text content */}
                  <div className="flex-1 text-center lg:text-left">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">
                      We recommend two carefully matched clinics
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0">
                      Based on your answers, we'll recommend two trusted clinics near you that fit your preferences, so
                      you're not overwhelmed with options.
                    </p>
                  </div>
                </div>

                {/* Step 3 - Image Left, Text Right */}
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
                  {/* Illustration */}
                  <div className="flex-1 flex justify-center lg:justify-end">
                    <div className="relative w-full max-w-[320px] lg:max-w-[380px]">
                      {/* Phone mockup with booking */}
                      <div className="relative bg-gradient-to-br from-secondary/50 to-secondary rounded-[32px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-border">
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
                  </div>
                  {/* Text content */}
                  <div className="flex-1 text-center lg:text-left">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">
                      You choose if and when to book
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0">
                      Review your options, explore each clinic, and book directly with the one that feels right for you. No
                      pressure. No obligation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Comparison table - standalone */}
          <ComparisonTable />

          {/* CTA section - standalone */}
          <section className="py-20 md:py-24 bg-gradient-to-br from-foreground to-foreground/90 text-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 text-balance">
                  Ready to find the right dental clinic for you?
                </h2>
                <p className="text-lg md:text-xl mb-8 opacity-90 leading-relaxed">
                  Answer a few quick questions and we'll match you with trusted clinics near you.
                </p>
                <Button
                  size="lg"
                  className="text-base px-10 h-16 bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white rounded-full shadow-xl hover:shadow-2xl transition-all text-lg font-semibold border-0"
                  asChild
                >
                  <Link href="/intake">
                    Find my clinic
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Testimonials section - standalone */}
          <section className="py-16 md:py-20 bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-foreground">
                    What patients say
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Real experiences from people who found the right clinic for them
                  </p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="p-8 border-0 shadow-lg rounded-3xl bg-white">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-foreground fill-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      "The matching was spot-on! Found a fantastic clinic near me that specialized in nervous patients.
                      Couldn't be happier with the service."
                    </p>
                    <div>
                      <p className="font-bold text-foreground">Sophie</p>
                      <p className="text-sm text-muted-foreground">Clapham</p>
                    </div>
                  </Card>
                  <Card className="p-8 border-0 shadow-lg rounded-3xl bg-white">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-foreground fill-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      "Saved me hours of research. The clinics they matched me with were ideal for my cosmetic work and
                      budget. Really impressed!"
                    </p>
                    <div>
                      <p className="font-bold text-foreground">James</p>
                      <p className="text-sm text-muted-foreground">Shoreditch</p>
                    </div>
                  </Card>
                  <Card className="p-8 border-0 shadow-lg rounded-3xl bg-white">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-foreground fill-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      "Finally, someone who gets it! No more scrolling through dozens of clinic websites. Quick, easy, and
                      exactly what I needed."
                    </p>
                    <div>
                      <p className="font-bold text-foreground">Amara</p>
                      <p className="text-sm text-muted-foreground">Camden</p>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </section>

          <CookieSettingsButton />
      </div>
    </>
  )
}
