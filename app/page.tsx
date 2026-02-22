"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Star, CheckCircle2, ArrowRight, Shield, Sparkles, Heart, MapPin, CalendarCheck, Building2, Users, RotateCcw, Search } from "lucide-react"
import Link from "next/link"
import { MainNav } from "@/components/main-nav"
import Image from "next/image"
import { ComparisonTable } from "@/components/comparison-table"
import { Badge } from "@/components/ui/badge"
import { LoadingAnimation } from "@/components/loading-animation"
import StatsCard from "@/components/stats-card"
import ClinicCarousel from "@/components/clinic-carousel"
import { ScrollingMarquee } from "@/components/scrolling-marquee"
import { trackTikTokEvent, trackTikTokServerRelay } from "@/lib/tiktok-pixel"
import { generateTikTokEventId } from "@/lib/tiktok-event-id"
import { SiteFooter } from "@/components/site-footer"
import { TREATMENT_OPTIONS, EMERGENCY_TREATMENT } from "@/lib/intake-form-config"

// Homepage treatment list derived from the canonical config (not hardcoded)
const HOMEPAGE_TREATMENTS = TREATMENT_OPTIONS.filter((t) => t !== EMERGENCY_TREATMENT)

const marqueeItems = [
  { text: "Trusted UK Clinics", icon: <Shield className="w-3.5 h-3.5" /> },
  { text: "Free To Use", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { text: "Independent", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { text: "Verified Dental Practices", icon: <Heart className="w-3.5 h-3.5" /> },
]

const rotatingWords = ["right", "easy", "simple", "clear", "effortless"]


interface LastMatch {
  matchId: string
  clinicCount: number
  treatment: string
  createdAt: string
}

const testimonials = [
  {
    label: "New to London",
    text: "I\u2019d just moved to London and didn\u2019t know where to begin. Instead of scrolling endlessly, I answered a few questions and had solid options straight away.",
    name: "Sophie M.",
  },
  {
    label: "Emergency",
    text: "I needed to be seen quickly, but I didn\u2019t want to rush into the wrong place. Pearlie helped me compare properly before booking.",
    name: "James R.",
  },
  {
    label: "Second Opinion",
    text: "I wasn\u2019t sure what treatment I actually needed. Pearlie matched me with clinics that explained my options clearly, without pushing anything.",
    name: "Priya K.",
  },
  {
    label: "Invisalign",
    text: "I wanted Invisalign but didn\u2019t know where to start. The clinics Pearlie suggested had experience with adult cases like mine. I finally felt confident choosing.",
    name: "Tom H.",
  },
  {
    label: "Cosmetic",
    text: "I was overwhelmed researching cosmetic dentists. Pearlie matched me with a clinic that specialised in natural-looking results. The consultation felt thoughtful \u2014 not salesy.",
    name: "Amara L.",
  },
  {
    label: "Nervous Patient",
    text: "I\u2019m a nervous patient and usually avoid dentists. The clinic I found through Pearlie really understood that. It made the whole process feel manageable.",
    name: "Hannah W.",
  },
]

function PatientExperiences() {
  const railRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect() } },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-16 md:py-28 lg:py-32 bg-[#f8f7f1] overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block text-xs font-extrabold tracking-[0.08em] uppercase text-[#004443] mb-4">
              Patient Experiences
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-[3rem] font-heading font-bold tracking-[-0.03em] mb-6 text-[#004443] leading-[1.05]">
              Real stories.<br />Thoughtful decisions.<br /><span className="text-[#0fbcb0]">Confident choices.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Real experiences from people who used Pearlie to choose with confidence.
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal scroll rail */}
      <div
        ref={railRef}
        className="flex gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide px-4 sm:px-6 lg:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] pb-4 -mb-4"
      >
        {testimonials.map((testimonial, i) => (
          <motion.div
            key={i}
            className="snap-start flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px]"
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Card className="p-5 border border-[#e8e4dc] shadow-none rounded-2xl bg-white h-full flex flex-col hover:shadow-md hover:border-[#d5cfc8] hover:-translate-y-0.5 focus-within:shadow-md focus-within:border-[#d5cfc8] focus-within:-translate-y-0.5 transition-all duration-300 ease-out">
              <span className="text-[9px] font-extrabold tracking-[0.1em] uppercase text-[#0fbcb0] mb-2.5">
                {testimonial.label}
              </span>
              <p className="text-[14px] text-muted-foreground leading-snug mb-4 flex-1">
                &ldquo;{testimonial.text}&rdquo;
              </p>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-foreground">{testimonial.name}</p>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-3 h-3 fill-[#0fbcb0]/50 text-[#0fbcb0]/50" />
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const [showLoading, setShowLoading] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 768 // Skip animation on mobile for instant content
  })
  const treatments = HOMEPAGE_TREATMENTS

  const [lastMatch, setLastMatch] = useState<LastMatch | null>(null)
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
          localStorage.removeItem("pearlie_last_match")
        }
      }
    } catch {
      localStorage.removeItem("pearlie_last_match")
    }
  }, [])

  const handleFindClinicClick = useCallback(() => {
    const eventId = generateTikTokEventId()
    trackTikTokEvent("Search", { content_name: "find_my_clinic" }, eventId)
    trackTikTokServerRelay("Search", { event_id: eventId, properties: { content_name: "find_my_clinic" } })
  }, [])

  const [wordIndex, setWordIndex] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % rotatingWords.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <AnimatePresence>
        {showLoading && <LoadingAnimation onComplete={() => setShowLoading(false)} />}
      </AnimatePresence>

      {/* Content is always rendered underneath - loading screen slides up like a curtain to reveal it */}
      <div className={`min-h-screen ${showLoading ? 'invisible' : 'visible'}`}>
          <MainNav />

          {/* Hero section — calm, split layout */}
          <section className="relative md:min-h-[85vh] lg:min-h-[90vh] pt-32 pb-12 md:pt-32 md:pb-20 lg:pt-36 lg:pb-24 bg-gradient-to-b from-[#f2f0e8] via-[#f5f3ec] to-[#f8f7f1] overflow-hidden">
            <div className="container mx-auto px-6 lg:px-10">
              <div className="max-w-7xl mx-auto">

                {/* Desktop: Text LEFT, Video RIGHT */}
                <div className="flex flex-col lg:flex-row items-start gap-8 md:gap-14 lg:gap-20">

                  {/* Video — desktop right, mobile below text */}
                  <motion.div
                    className="order-2 lg:order-2 flex-1 w-full max-w-xs md:max-w-md lg:max-w-[90%] mx-auto lg:mx-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                  >
                    <video
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-auto rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.04)] scale-x-[-1]"
                    >
                      <source src="/images/Short Clip Smile Pearlie.mp4" type="video/mp4" />
                    </video>
                  </motion.div>

                  {/* Text content — desktop left, mobile first */}
                  <div className="order-1 lg:order-1 flex-1 text-center lg:text-left lg:pt-6">
                    <motion.h1
                      className="text-[2.25rem] md:text-5xl lg:text-[3.75rem] xl:text-[4.5rem] leading-[0.95] font-heading font-bold tracking-[-0.03em] text-[#3d3838] mb-8 md:mb-14 lg:mb-20"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                    >
                      Where finding a dentist finally feels{" "}
                      <span className="inline-flex relative overflow-hidden align-baseline" style={{ height: "1em", verticalAlign: "baseline" }}>
                        {/* Invisible sizer to hold width of current word */}
                        <span className="invisible">{rotatingWords[wordIndex]}</span>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={rotatingWords[wordIndex]}
                            className="absolute left-0 top-0 text-[#0fbcb0]"
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "-100%", opacity: 0 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                          >
                            {rotatingWords[wordIndex]}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                    </motion.h1>

                    <motion.p
                      className="text-[15px] md:text-lg text-[#666] mb-5 md:mb-6 leading-[1.5] max-w-lg mx-auto lg:mx-0"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    >
                      Matching you with carefully reviewed clinics based on your Needs, Preferences, and Timing NOT just Location — so you can choose with confidence.
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    >
                      {lastMatch ? (
                        <div className="flex flex-col sm:flex-row items-stretch justify-center lg:justify-start gap-2 md:gap-3 max-w-xl">
                          <Link
                            href={`/match/${lastMatch.matchId}`}
                            className="flex-1 group flex items-center gap-3 bg-white border border-[#0fbcb0]/30 rounded-2xl px-4 py-3 md:px-5 md:py-4 hover:shadow-md hover:border-[#0fbcb0]/60 transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)]"
                          >
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#0fbcb0]/10 flex items-center justify-center flex-shrink-0">
                              <RotateCcw className="w-4 h-4 md:w-5 md:h-5 text-[#0fbcb0]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-semibold text-[#3d3838]">Return to your matches</p>
                              <p className="text-xs text-[#666] mt-0.5 leading-snug">View the clinics we matched you with</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-[#0fbcb0] group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                          <Link
                            href="/intake"
                            className="flex-1 group flex items-center gap-3 bg-white border border-[#d5cfc8] rounded-2xl px-4 py-3 md:px-5 md:py-4 hover:shadow-md hover:border-[#bbb] transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)]"
                          >
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#f8f7f1] flex items-center justify-center flex-shrink-0">
                              <Search className="w-4 h-4 md:w-5 md:h-5 text-[#004443]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-semibold text-[#3d3838]">Start a new search</p>
                              <p className="text-xs text-[#666] mt-0.5 leading-snug">Answer new questions and get fresh matches</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-[#004443] group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>
                      ) : (
                        <div className="flex flex-row items-center justify-center lg:justify-start gap-4">
                          <Button
                            size="default"
                            className="bg-[#0fbcb0] hover:bg-[#0da399] text-white px-5 md:px-7 py-2 md:py-3 h-auto rounded-full font-normal transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] text-sm md:text-[15px] border-0"
                            asChild
                          >
                            <Link href="/intake" onClick={handleFindClinicClick}>
                              Find my clinic
                              <ArrowRight className="ml-1.5 md:ml-2 w-4 h-4 md:w-5 md:h-5" />
                            </Link>
                          </Button>

                          <button
                            onClick={() => {
                              document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                            }}
                            className="px-4 md:px-6 py-1.5 md:py-2.5 h-auto rounded-full font-heading font-normal text-sm md:text-[15px] text-[#555] hover:text-[#3d3838] border border-[#d5cfc8] hover:border-[#bbb] bg-transparent hover:bg-white/50 transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)]"
                          >
                            How it works
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </div>

                </div>
              </div>
            </div>
          </section>

          {/* Scrolling Marquee - right below hero */}
          <ScrollingMarquee items={marqueeItems} speed={35} />

          {/* How it works section */}
          <section id="how-it-works" className="py-20 md:py-32 lg:py-36 bg-white relative overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                {/* Section header */}
                <div className="text-center mb-16 md:mb-24">
                  <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-heading font-bold tracking-[-0.03em] text-[#004443]">
                    How It Works
                  </h2>
                </div>

                {/* Step 1 - Image Left, Text Right */}
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16 mb-20 md:mb-32">
                  {/* Illustration */}
                  <div className="flex-1 flex justify-center lg:justify-end">
                    <div className="relative w-full max-w-[320px] lg:max-w-[380px]">
                      {/* Step number */}
                      <span className="absolute -top-6 -left-2 lg:-left-8 text-8xl lg:text-9xl font-bold text-[#004443]/20 select-none leading-none z-0">01</span>
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
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-foreground">
                      Tell us what matters to you
                    </h3>
                    <p className="text-lg text-muted-foreground leading-snug max-w-md mx-auto lg:mx-0">
                      Answer a few quick questions about what you're looking for and what's important to you, at your own
                      pace.
                    </p>
                  </div>
                </div>

                {/* Step 2 - Text Left, Image Right */}
                <div className="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-16 mb-20 md:mb-32">
                  {/* Illustration */}
                  <div className="flex-1 flex justify-center lg:justify-start">
                    <div className="relative w-full max-w-[320px] lg:max-w-[380px]">
                      {/* Step number */}
                      <span className="absolute -top-6 -right-2 lg:-right-8 text-8xl lg:text-9xl font-bold text-[#004443]/20 select-none leading-none z-0">02</span>
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
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-foreground">
                      We recommend carefully matched clinics
                    </h3>
                    <p className="text-lg text-muted-foreground leading-snug max-w-md mx-auto lg:mx-0">
                      Based on your answers, we'll recommend trusted clinics near you that fit your preferences — so
                      you're not overwhelmed with options.
                    </p>
                  </div>
                </div>

                {/* Step 3 - Image Left, Text Right */}
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
                  {/* Illustration */}
                  <div className="flex-1 flex justify-center lg:justify-end">
                    <div className="relative w-full max-w-[320px] lg:max-w-[380px]">
                      {/* Step number */}
                      <span className="absolute -top-6 -left-2 lg:-left-8 text-8xl lg:text-9xl font-bold text-[#004443]/20 select-none leading-none z-0">03</span>
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
                          <Button className="w-full bg-primary hover:bg-[var(--primary-hover)] text-white rounded-xl h-10 text-sm" asChild>
                            <Link href="/intake">Request appointment</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Text content */}
                  <div className="flex-1 text-center lg:text-left">
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-foreground">
                      You choose if and when to book
                    </h3>
                    <p className="text-lg text-muted-foreground leading-snug max-w-md mx-auto lg:mx-0">
                      Review your options, explore each clinic, <span className="text-[#0fbcb0] font-medium">live chat and book directly</span> with the one that feels right
                      for you. No pressure. No obligation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Trusted clinics section */}
          <section className="py-16 md:py-28 lg:py-32">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                  {/* Clinic Carousel */}
                  <ClinicCarousel />

                  {/* Content */}
                  <div className="lg:pl-4">
                    {/* Small accent label */}
                    <span className="inline-block text-xs font-extrabold tracking-[0.08em] uppercase text-[#004443] mb-4">
                      Quality &amp; Trust
                    </span>

                    <h2 className="text-3xl sm:text-4xl md:text-[3rem] font-heading font-bold tracking-[-0.03em] mb-6 text-foreground leading-[1.05]">
                      We shortlist.<br />You decide.<br /><span className="text-[#0fbcb0]">With confidence.</span>
                    </h2>

                    <p className="text-lg text-muted-foreground leading-snug mb-8">
                      Every clinic on Pearlie is carefully reviewed for clinical standards, transparency, and patient experience. We focus on quality over quantity — so you only see clinics that meet our standards.
                    </p>

                    <div className="space-y-3 mb-10">
                      {[
                        "Personally reviewed by Pearlie",
                        "Transparent pricing & clear communication",
                        "Highly rated for patient care and results",
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-[#0fbcb0] flex-shrink-0" />
                          <span className="text-foreground font-medium">{item}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      size="lg"
                      className="text-base px-8 h-14 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] group border-0"
                      asChild
                    >
                      <Link href="/intake" onClick={handleFindClinicClick}>
                        Find my clinic
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Comparison table */}
          <ComparisonTable />

          {/* Patient Experiences section */}
          <PatientExperiences />

          {/* CTA section - dark teal background */}
          <section className="py-24 md:py-32 lg:py-36 bg-[#004443] text-white relative overflow-hidden">
            {/* Decorative background blobs */}
            <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-white/[0.03] blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-[#0fbcb0]/[0.08] blur-2xl pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-heading font-bold tracking-[-0.03em] mb-6 text-balance">
                  Ready to find the right dental clinic for you?
                </h2>
                <p className="text-lg md:text-xl mb-10 opacity-90 leading-snug">
                  Answer a few quick questions and we&apos;ll match you with trusted clinics near you.
                </p>
                <Button
                  size="lg"
                  className="text-base px-10 h-16 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] text-lg font-normal border-0"
                  asChild
                >
                  <Link href="/intake" onClick={handleFindClinicClick}>
                    Find my clinic
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <SiteFooter />
      </div>
    </>
  )
}
