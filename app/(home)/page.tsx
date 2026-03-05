"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { MeshGradient } from "@paper-design/shaders-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Star, CheckCircle2, ArrowRight, Shield, Sparkles, Heart, MapPin, CalendarCheck, Building2, RotateCcw, Search, MessageCircle, Hexagon, Triangle, Command, Ghost, Gem, Cpu, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { MainNav } from "@/components/main-nav"
import Image from "next/image"
import { ComparisonTable } from "@/components/comparison-table"
import { Badge } from "@/components/ui/badge"
import StatsCard from "@/components/stats-card"
import ClinicCarousel from "@/components/clinic-carousel"
import { ScrollingMarquee } from "@/components/scrolling-marquee"
import { trackTikTokEvent, trackTikTokServerRelay } from "@/lib/tiktok-pixel"
import { generateTikTokEventId } from "@/lib/tiktok-event-id"
import { SiteFooter } from "@/components/site-footer"
import { TREATMENT_OPTIONS, EMERGENCY_TREATMENT } from "@/lib/intake-form-config"
import {
  LONDON_BOROUGHS,
} from "@/lib/data/london-boroughs"
import { HomeHeroSearch } from "@/components/home-hero-search"
import { StickyMobileHomeCta } from "@/components/sticky-mobile-home-cta"
import { TrustBadgeStrip } from "@/components/trust-badge-strip"
import { useLastMatch } from "@/hooks/use-last-match"


// Homepage treatment list derived from the canonical config (not hardcoded)
const HOMEPAGE_TREATMENTS = TREATMENT_OPTIONS.filter((t) => t !== EMERGENCY_TREATMENT)

const heroRotatingBenefits = [
  "nearby with availability",
  "open on weekends",
  "with transparent pricing",
  "with the best reviews",
  "accepting new patients",
  "near your workplace",
  "known for Invisalign",
  "known for implants",
  "known for composite bonding",
]

const marqueeItems = [
  { text: "Trusted UK Clinics", icon: <Shield className="w-3.5 h-3.5" /> },
  { text: "Free to Use", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { text: "Independent Platform", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { text: "Live Chat with Clinics", icon: <MessageCircle className="w-3.5 h-3.5" /> },
  { text: "Book Directly Online", icon: <CalendarCheck className="w-3.5 h-3.5" /> },
]

// --- TRUSTED-BY BRANDS ---
// Easily editable: add `src` for an <img> logo, or use `icon` for a Lucide placeholder
const CLIENTS: { name: string; icon?: LucideIcon; src?: string }[] = [
  { name: "Acme Corp", icon: Hexagon },
  { name: "Quantum", icon: Triangle },
  { name: "Command+Z", icon: Command },
  { name: "Phantom", icon: Ghost },
  { name: "Ruby", icon: Gem },
  { name: "Chipset", icon: Cpu },
]




const testimonials = [
  {
    label: "New to London",
    text: "I\u2019d just moved to London and didn\u2019t know where to begin. Instead of scrolling endlessly, I answered a few questions and had solid options straight away.",
    name: "Sophie M.",
    rating: 5,
    verified: true,
  },
  {
    label: "Emergency",
    text: "I needed to be seen quickly, but I didn\u2019t want to rush into the wrong place. Pearlie helped me compare properly before booking.",
    name: "James R.",
    rating: 5,
    verified: true,
  },
  {
    label: "Second Opinion",
    text: "I wasn\u2019t sure what treatment I actually needed. Pearlie matched me with clinics that explained my options clearly, without pushing anything.",
    name: "Priya K.",
    rating: 5,
    verified: true,
  },
  {
    label: "Invisalign",
    text: "I wanted Invisalign but didn\u2019t know where to start. The clinics Pearlie suggested had experience with adult cases like mine. I finally felt confident choosing.",
    name: "Tom H.",
    rating: 4,
    verified: true,
  },
  {
    label: "Cosmetic",
    text: "I was overwhelmed researching cosmetic dentists. Pearlie matched me with a clinic that specialised in natural-looking results. The consultation felt thoughtful \u2014 not salesy.",
    name: "Amara L.",
    rating: 5,
    verified: true,
  },
  {
    label: "Nervous Patient",
    text: "I\u2019m a nervous patient and usually avoid dentists. The clinic I found through Pearlie really understood that. It made the whole process feel manageable.",
    name: "Hannah W.",
    rating: 5,
    verified: true,
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
    <section ref={sectionRef} className="py-16 md:pt-20 md:pb-28 lg:pt-24 lg:pb-32 bg-[#f8f7f1] overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block text-xs font-extrabold tracking-[0.08em] uppercase text-[#004443] mb-4">
              Patient Experiences
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-[3rem] font-heading font-bold tracking-[-0.03em] mb-6 text-[#004443] leading-[1.05]">
              Real stories.<br />Thoughtful decisions.<br /><span className="text-[#0fbcb0]">Confident choices.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-4">
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
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-extrabold tracking-[0.1em] uppercase text-[#0fbcb0]">
                  {testimonial.label}
                </span>
                {testimonial.verified && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-[#0fbcb0]" />
                    Verified
                  </span>
                )}
              </div>
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, j) => (
                  <Star
                    key={j}
                    className={`w-3.5 h-3.5 ${
                      j < testimonial.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-gray-200 text-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[14px] text-muted-foreground leading-snug mb-4 flex-1">
                &ldquo;{testimonial.text}&rdquo;
              </p>
              <p className="text-[13px] font-semibold text-foreground">{testimonial.name}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const treatments = HOMEPAGE_TREATMENTS

  const lastMatch = useLastMatch()

  // Client-side mount flag for WebGL MeshGradient
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Rotating hero benefit phrases
  const [benefitIndex, setBenefitIndex] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setBenefitIndex((prev) => (prev + 1) % heroRotatingBenefits.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleFindClinicClick = useCallback(() => {
    const eventId = generateTikTokEventId()
    trackTikTokEvent("Search", { content_name: "find_my_clinic" }, eventId)
    trackTikTokServerRelay("Search", { event_id: eventId, properties: { content_name: "find_my_clinic" } })
  }, [])

  return (
    <>
      <div className="min-h-screen">
          <MainNav hideCta={!!lastMatch} />
          <StickyMobileHomeCta />

          {/* Hero section — 2-column grid with animated mesh gradient */}
          <style>{`
            @keyframes heroFadeSlideIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes heroMarquee {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
            .hero-fade-in {
              animation: heroFadeSlideIn 0.8s ease-out forwards;
              opacity: 0;
            }
            .hero-marquee {
              animation: heroMarquee 40s linear infinite;
            }
            .hero-delay-100 { animation-delay: 0.1s; }
            .hero-delay-200 { animation-delay: 0.2s; }
            .hero-delay-300 { animation-delay: 0.3s; }
            .hero-delay-400 { animation-delay: 0.4s; }
            .hero-delay-500 { animation-delay: 0.5s; }
          `}</style>
          <section className="relative min-h-[100svh] flex flex-col pt-32 pb-10 md:pt-36 md:pb-14 bg-[#e8f0ef] overflow-hidden">
            {/* Animated mesh gradient background */}
            {mounted && (
              <div className="absolute inset-0 z-0">
                <MeshGradient
                  colors={["#0fbcb0", "#72b9bb", "#b5d9d9", "#f5e6d0", "#ffebe0", "#004443"]}
                  distortion={0.8}
                  swirl={0.6}
                  speed={0.42}
                  offsetX={0.08}
                  grainMixer={0}
                  grainOverlay={0}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            )}
            {/* Veil overlay for text readability */}
            <div className="absolute inset-0 z-[1] bg-white/45 pointer-events-none" />

            <div className="flex-1 flex items-center px-6 md:px-14 relative z-10">
              <div className="max-w-7xl mx-auto w-full px-4 lg:px-8">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8 items-start">

                  {/* --- LEFT COLUMN --- */}
                  <div className="lg:col-span-7 flex flex-col justify-center space-y-8 pt-8 text-center lg:text-left">
                    {/* Badge */}
                    <div className="hero-fade-in hero-delay-100">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#004443]/10 bg-white/50 px-3 py-1.5 backdrop-blur-md">
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#004443] flex items-center gap-2">
                          London&apos;s dental matching platform
                          <Star className="w-3.5 h-3.5 text-[#0fbcb0] fill-[#0fbcb0]" />
                        </span>
                      </div>
                    </div>

                    {/* Heading */}
                    <motion.h1
                      className="text-[clamp(2.4rem,8vw,3rem)] md:text-[3.2rem] lg:text-[4rem] xl:text-[4.75rem] leading-[1.08] font-heading font-bold tracking-[-0.03em] text-black"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                    >
                      <span className="block">Find dentists</span>
                      <span className="block mt-1 md:mt-2 relative grid">
                        {heroRotatingBenefits.map((text) => (
                          <span key={text} className="invisible col-start-1 row-start-1" aria-hidden="true">
                            {text}
                          </span>
                        ))}
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={benefitIndex}
                            className="col-start-1 row-start-1 text-[#004d47]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                          >
                            {heroRotatingBenefits[benefitIndex]}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                    </motion.h1>

                    {/* Description */}
                    {!lastMatch && (
                      <p className="hero-fade-in hero-delay-300 max-w-xl text-base md:text-lg text-black/80 leading-relaxed mx-auto lg:mx-0">
                        Pearlie is a curated network of best dentists. Find one perfect for you and book online instantly.
                      </p>
                    )}

                    {/* CTA Buttons */}
                    <motion.div
                      id="home-hero-cta"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    >
                      {lastMatch ? (
                        <div className="flex flex-col gap-5">
                          <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 max-w-xl w-full">
                            <Link
                              href={`/match/${lastMatch.matchId}`}
                              className="group flex items-center gap-3 bg-white border border-[#0fbcb0]/30 rounded-2xl px-5 py-4 hover:shadow-md hover:border-[#0fbcb0]/60 transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)]"
                            >
                              <div className="w-10 h-10 rounded-full bg-[#0fbcb0]/10 flex items-center justify-center flex-shrink-0">
                                <RotateCcw className="w-5 h-5 text-[#0fbcb0]" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-[15px] font-semibold text-black">Return to your matches</p>
                                <p className="text-xs text-black/60 mt-0.5 leading-snug">View the clinics we matched you with</p>
                              </div>
                              <ArrowRight className="w-5 h-5 text-[#0fbcb0] group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                            <Link
                              href="/intake"
                              className="group flex items-center gap-3 bg-white border border-[#d5cfc8] rounded-2xl px-5 py-4 hover:shadow-md hover:border-[#bbb] transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)]"
                            >
                              <div className="w-10 h-10 rounded-full bg-[#f8f7f1] flex items-center justify-center flex-shrink-0">
                                <Search className="w-5 h-5 text-[#004443]" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-[15px] font-semibold text-black">Start a new search</p>
                                <p className="text-xs text-black/60 mt-0.5 leading-snug">Answer new questions and get fresh matches</p>
                              </div>
                              <ArrowRight className="w-5 h-5 text-[#004443] group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                          </div>
                          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                            <span className="inline-flex items-center gap-2 bg-white border border-[#e8e4dc] rounded-full px-4 py-2 text-sm shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                              <MapPin className="w-4 h-4 text-[#0fbcb0]" />
                              <span className="font-bold text-foreground">Trusted</span>
                              <span className="text-muted-foreground">across London</span>
                            </span>
                            <span className="inline-flex items-center gap-2 bg-white border border-[#e8e4dc] rounded-full px-4 py-2 text-sm shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                              <Building2 className="w-4 h-4 text-[#0fbcb0]" />
                              <span className="font-bold text-foreground">100+</span>
                              <span className="text-muted-foreground">practices</span>
                            </span>
                            <span className="inline-flex items-center gap-2 bg-white border border-[#e8e4dc] rounded-full px-4 py-2 text-sm shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                              <Star className="w-4 h-4 text-[#0fbcb0]" />
                              <span className="font-bold text-foreground">4.8★</span>
                              <span className="text-muted-foreground">avg rating</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                          <Button
                            size="default"
                            className="group bg-[#0fbcb0] hover:bg-[#0da399] text-white px-8 py-4 h-auto rounded-full font-semibold transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] text-sm border-0 hover:scale-[1.02] active:scale-[0.98]"
                            asChild
                          >
                            <Link href="/intake" onClick={handleFindClinicClick}>
                              Find my clinic
                              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                          </Button>
                          <button
                            onClick={() => {
                              document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#004443]/10 bg-white/50 px-8 py-4 text-sm font-semibold text-[#004443] backdrop-blur-sm transition-colors hover:bg-white/70 hover:border-[#004443]/20"
                          >
                            How it works
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </div>

                  {/* --- RIGHT COLUMN --- */}
                  <div className="lg:col-span-5 space-y-6 lg:mt-12">
                    {/* Intake Form Card */}
                    <div className="hero-fade-in hero-delay-500 relative overflow-hidden rounded-3xl border border-white/30 bg-white/70 p-8 backdrop-blur-xl shadow-2xl">
                      {/* Glow effect */}
                      <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-[#0fbcb0]/10 blur-3xl pointer-events-none" />
                      <div className="relative z-10">
                        <div className="mb-6">
                          <h2 className="text-xl font-heading font-bold text-[#004443]">Find your perfect dentist</h2>
                          <p className="text-sm text-black/60 mt-1">Tell us what you need and we&apos;ll match you instantly</p>
                        </div>
                        <HomeHeroSearch variant="card" />
                      </div>
                    </div>

                    {/* Trusted-by Marquee Card */}
                    <div className="hero-fade-in hero-delay-500 relative overflow-hidden rounded-3xl border border-white/30 bg-white/50 py-8 backdrop-blur-xl">
                      <h3 className="mb-6 px-8 text-sm font-medium text-black/50">Trusted by Industry Leaders</h3>
                      <div
                        className="relative flex overflow-hidden"
                        style={{
                          maskImage: "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
                          WebkitMaskImage: "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
                        }}
                      >
                        <div className="hero-marquee flex gap-12 whitespace-nowrap px-4">
                          {[...CLIENTS, ...CLIENTS, ...CLIENTS].map((client, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 opacity-40 transition-all hover:opacity-80 hover:scale-105 cursor-default grayscale hover:grayscale-0"
                            >
                              {client.src ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={client.src} alt={client.name} className="h-6 w-auto" />
                              ) : client.icon ? (
                                <client.icon className="h-6 w-6 text-[#004443]" />
                              ) : null}
                              <span className="text-lg font-bold text-[#004443] tracking-tight">
                                {client.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </section>

          {/* Scrolling Marquee - right below hero */}
          <ScrollingMarquee items={marqueeItems} speed={35} />

          {/* How it works section */}
          <section id="how-it-works" className="py-16 md:pt-12 md:pb-16 lg:pt-16 lg:pb-20 bg-white relative overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                {/* Section header */}
                <div className="text-center mb-12 md:mb-14">
                  <span className="inline-block text-xs font-extrabold tracking-[0.08em] uppercase text-[#004443]/60 mb-3">
                    Simple process
                  </span>
                  <h2 className="text-[2rem] sm:text-[2.6rem] md:text-[2.6rem] lg:text-[3.25rem] font-heading font-bold tracking-[-0.03em] text-[#004443]">
                    How It Works
                  </h2>
                </div>

                {/* Step 1 - Image Left, Text Right */}
                <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12 mb-14 md:mb-14">
                  {/* Illustration */}
                  <div className="flex-1 flex justify-center lg:justify-end">
                    <div className="relative w-full max-w-[280px] lg:max-w-[250px] scale-[0.7] lg:scale-100 origin-top -mb-[80px] lg:mb-0">
                      {/* Step number */}
                      <span className="absolute -top-6 -left-2 lg:-left-8 text-8xl lg:text-8xl font-bold text-[#004443]/20 select-none leading-none z-0">01</span>
                      {/* Phone mockup with form illustration */}
                      <div className="relative bg-gradient-to-br from-secondary/50 to-secondary rounded-[32px] p-4 lg:p-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-border">
                        <div className="bg-white rounded-2xl p-4 lg:p-3 shadow-sm">
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
                    <h3 className="text-xl sm:text-2xl md:text-2xl font-bold mb-2 text-[#004443]">
                      Tell us what you're looking for
                    </h3>
                    <p className="text-base md:text-[0.9rem] text-muted-foreground leading-snug max-w-md mx-auto lg:mx-0">
                      Answer a few simple questions about your treatment, budget, location, and preferences. It only takes a minute.
                    </p>
                  </div>
                </div>

                {/* Step 2 - Text Left, Image Right */}
                <div className="flex flex-col lg:flex-row-reverse items-center gap-6 lg:gap-12 mb-14 md:mb-14">
                  {/* Illustration */}
                  <div className="flex-1 flex justify-center lg:justify-start">
                    <div className="relative w-full max-w-[280px] lg:max-w-[250px] scale-[0.7] lg:scale-100 origin-top -mb-[80px] lg:mb-0">
                      {/* Step number */}
                      <span className="absolute -top-6 -right-2 lg:-right-8 text-8xl lg:text-8xl font-bold text-[#004443]/20 select-none leading-none z-0">02</span>
                      {/* Phone mockup with clinic cards */}
                      <div className="relative bg-gradient-to-br from-secondary/50 to-secondary rounded-[32px] p-6 lg:p-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-border">
                        <div className="space-y-4 lg:space-y-2">
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
                    <h3 className="text-xl sm:text-2xl md:text-2xl font-bold mb-2 text-[#004443]">
                      We match you with the right clinics
                    </h3>
                    <p className="text-base md:text-[0.9rem] text-muted-foreground leading-snug max-w-md mx-auto lg:mx-0">
                      Based on your answers, we suggest carefully reviewed clinics in London that meet our standards for quality and transparency — so you're not overwhelmed with endless searching.
                    </p>
                  </div>
                </div>

                {/* Step 3 - Image Left, Text Right */}
                <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
                  {/* Illustration */}
                  <div className="flex-1 flex justify-center lg:justify-end">
                    <div className="relative w-full max-w-[280px] lg:max-w-[250px] scale-[0.7] lg:scale-100 origin-top -mb-[80px] lg:mb-0">
                      {/* Step number */}
                      <span className="absolute -top-6 -left-2 lg:-left-8 text-8xl lg:text-8xl font-bold text-[#004443]/20 select-none leading-none z-0">03</span>
                      {/* Phone mockup with booking */}
                      <div className="relative bg-gradient-to-br from-secondary/50 to-secondary rounded-[32px] p-6 lg:p-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-border">
                        <div className="bg-white rounded-2xl p-5 lg:p-3 shadow-sm">
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
                    <h3 className="text-xl sm:text-2xl md:text-2xl font-bold mb-2 text-[#004443]">
                      Compare. Chat. Book.
                    </h3>
                    <p className="text-base md:text-[0.9rem] text-muted-foreground leading-snug max-w-md mx-auto lg:mx-0">
                      Compare clinics side-by-side, chat directly with them, and book online when you're ready. All in one place.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Trust badge strip — below how it works */}
          <TrustBadgeStrip />

          {/* Trusted clinics section */}
          <section className="py-16 md:pt-20 md:pb-28 lg:pt-24 lg:pb-32">
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

                    <h2 className="text-3xl sm:text-4xl md:text-[3rem] font-heading font-bold tracking-[-0.03em] mb-6 text-[#004443] leading-[1.05]">
                      We shortlist.<br />You decide.<br /><span className="text-[#0fbcb0]">With confidence.</span>
                    </h2>

                    <p className="text-lg text-muted-foreground leading-snug mb-8">
                      Verified clinics across London, reviewed by our team for quality, transparency, and GDC registration. We focus on quality over quantity — so you can choose with confidence.
                    </p>

                    {/* How we verify */}
                    <div className="space-y-4 mb-10">
                      <p className="text-xs font-extrabold tracking-[0.08em] uppercase text-[#004443]/60">How we verify clinics</p>
                      {[
                        {
                          step: "1",
                          title: "GDC & CQC registration",
                          desc: "Every practitioner verified on the GDC register. Clinic regulatory status confirmed.",
                        },
                        {
                          step: "2",
                          title: "Quality & transparency review",
                          desc: "We assess patient reviews, pricing clarity, and clinical standards before listing.",
                        },
                        {
                          step: "3",
                          title: "Ongoing monitoring",
                          desc: "Clinics are re-reviewed regularly. Those that don\u2019t maintain standards are removed.",
                        },
                      ].map((item) => (
                        <div key={item.step} className="flex gap-3.5">
                          <div className="w-7 h-7 rounded-full bg-[#0fbcb0]/10 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-[#0fbcb0]">{item.step}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.title}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      size="lg"
                      className="text-base px-8 h-14 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] group border-0"
                      asChild
                    >
                      <Link href="/intake" onClick={handleFindClinicClick}>
                        See clinics near you
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">Free, takes under 60 seconds</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Comparison table */}
          <ComparisonTable />

          {/* Pearlie Guarantee callout */}
          <section className="py-14 md:py-20 bg-[#004443] relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-72 h-72 rounded-full bg-[#0fbcb0]/[0.04] blur-[80px] pointer-events-none" />
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                  {/* Icon */}
                  <div className="shrink-0">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#0fbcb0]/15 flex items-center justify-center">
                      <Shield className="w-8 h-8 md:w-10 md:h-10 text-[#0fbcb0]" />
                    </div>
                  </div>
                  {/* Content */}
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-3">
                      The Pearlie Guarantee
                    </h2>
                    <p className="text-white/70 leading-relaxed mb-4 max-w-2xl">
                      Our guarantee applies to Pearlie Verified clinics — those we&apos;ve reviewed for quality care, transparent pricing, and GDC registration.
                      If your experience doesn&apos;t meet expectations, we&apos;ll cover your next consultation — free.
                    </p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <CheckCircle2 className="w-4 h-4 text-[#0fbcb0]" />
                        <span>For Pearlie Verified clinics</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <CheckCircle2 className="w-4 h-4 text-[#0fbcb0]" />
                        <span>Satisfaction promise</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <CheckCircle2 className="w-4 h-4 text-[#0fbcb0]" />
                        <span>No hidden costs</span>
                      </div>
                    </div>
                  </div>
                  {/* CTA */}
                  <div className="shrink-0">
                    <Link
                      href="/about#pearlie-guarantee"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#0fbcb0] hover:text-white transition-colors whitespace-nowrap"
                    >
                      Learn more
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Patient Experiences section */}
          <PatientExperiences />

          {/* Find dentists by area */}
          <section className="py-16 md:pt-20 md:pb-28 lg:pt-24 lg:pb-32 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12 md:mb-16">
                  <span className="inline-block text-xs font-extrabold tracking-[0.08em] uppercase text-[#004443] mb-4">
                    Browse by Area
                  </span>
                  <h2 className="text-3xl sm:text-4xl md:text-[3rem] font-heading font-bold tracking-[-0.03em] mb-6 text-[#004443] leading-[1.05]">
                    Find dentists across<br /><span className="text-[#0fbcb0]">London</span>
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                    Compare verified dental clinics in {LONDON_BOROUGHS.length} London boroughs.
                    See pricing, read reviews, and get matched by area.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-10">
                  {LONDON_BOROUGHS.map((borough) => (
                    <Link
                      key={borough.slug}
                      href={`/london/${borough.slug}`}
                      className="text-sm text-foreground hover:text-[#0fbcb0] transition-colors flex items-center gap-1.5 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <MapPin className="w-3 h-3 text-[#0fbcb0] flex-shrink-0" />
                      {borough.name}
                    </Link>
                  ))}
                </div>

                <div className="text-center">
                  <Link
                    href="/london"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#0fbcb0] hover:underline"
                  >
                    View all London areas
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* CTA section - dark teal background */}
          <section className="py-20 md:pt-24 md:pb-28 lg:pt-28 lg:pb-32 bg-[#004443] text-white relative overflow-hidden">
            {/* Decorative background blobs */}
            <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-white/[0.03] blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-[#0fbcb0]/[0.08] blur-2xl pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-heading font-bold tracking-[-0.03em] mb-6 text-balance">
                  Ready to find the right dental clinic for you?
                </h2>
                <p className="text-lg md:text-xl mb-10 opacity-90 leading-snug">
                  Answer a few quick questions and we&apos;ll match you with trusted clinics near you. Takes under 60 seconds.
                </p>
                <Button
                  size="lg"
                  className="text-base px-10 h-16 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] text-lg font-normal border-0"
                  asChild
                >
                  <Link href="/intake" onClick={handleFindClinicClick}>
                    Get my matches
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
