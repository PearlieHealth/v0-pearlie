"use client"
import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Star, CheckCircle2, ArrowRight, Shield, Sparkles, Heart, MapPin, CalendarCheck, Building2, Users, RotateCcw, Search, User } from "lucide-react"
import Link from "next/link"
import { MainNav } from "@/components/main-nav"
import Image from "next/image"
import { ComparisonTable } from "@/components/comparison-table"
import { Badge } from "@/components/ui/badge"
import { LoadingAnimation } from "@/components/loading-animation"
import StatsCard from "@/components/stats-card"
import ClinicCarousel from "@/components/clinic-carousel"
import { ScrollingMarquee } from "@/components/scrolling-marquee"
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
          <section className="relative pt-24 pb-10 md:pt-28 md:pb-14 lg:pt-32 lg:pb-16 bg-gradient-to-b from-[#e2d9cf] via-[#ebe4db] to-[#f1ece5] overflow-hidden">
            <div className="container mx-auto px-6 lg:px-8">
              <div className="max-w-6xl mx-auto">

                {/* Desktop: Video LEFT, Text RIGHT */}
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

                  {/* Video — desktop left, mobile below text */}
                  <motion.div
                    className="order-2 lg:order-1 flex-1 w-full max-w-md lg:max-w-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                  >
                    <video
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-auto rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)]"
                    >
                      <source src="/images/Short Clip Smile Pearlie.mp4" type="video/mp4" />
                    </video>
                  </motion.div>

                  {/* Text content — desktop right, mobile first */}
                  <div className="order-1 lg:order-2 flex-1 text-center lg:text-left">
                    <motion.h1
                      className="text-4xl md:text-5xl lg:text-[3.25rem] xl:text-[3.5rem] leading-[1.15] font-bold text-[#222] mb-6"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                    >
                      Where finding a dentist finally feels{" "}
                      <span className="inline-block relative overflow-hidden align-bottom" style={{ height: "1.15em" }}>
                        {/* Invisible sizer to hold width of current word */}
                        <span className="invisible">{rotatingWords[wordIndex]}</span>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={rotatingWords[wordIndex]}
                            className="absolute inset-0 text-[#0fbcb0]"
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "-100%", opacity: 0 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                          >
                            {rotatingWords[wordIndex]}
                          </motion.span>
                        </AnimatePresence>
                      </span>.
                    </motion.h1>

                    <motion.p
                      className="text-lg md:text-xl text-[#666] mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    >
                      Matching you with the right clinic for your needs, preferences, and timing — not just whoever is closest.
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    >
                      {lastMatch ? (
                        <div className="flex flex-col items-stretch justify-center lg:justify-start gap-3 max-w-xl">
                          <div className="flex flex-col sm:flex-row items-stretch gap-3">
                            <Link
                              href="/patient/dashboard"
                              className="flex-1 group flex items-center gap-3 bg-white border border-[#0fbcb0]/30 rounded-2xl px-5 py-4 hover:shadow-md hover:border-[#0fbcb0]/60 transition-all"
                            >
                              <div className="w-10 h-10 rounded-full bg-[#0fbcb0]/10 flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-[#0fbcb0]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-semibold text-[#222]">Go to your account</p>
                                <p className="text-xs text-[#666] mt-0.5 leading-snug">View messages, bookings &amp; matched clinics</p>
                              </div>
                              <ArrowRight className="w-5 h-5 text-[#0fbcb0] group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                            <Link
                              href={`/match/${lastMatch.matchId}`}
                              className="flex-1 group flex items-center gap-3 bg-white border border-[#d5cfc8] rounded-2xl px-5 py-4 hover:shadow-md hover:border-[#bbb] transition-all"
                            >
                              <div className="w-10 h-10 rounded-full bg-[#F8F1E7] flex items-center justify-center flex-shrink-0">
                                <RotateCcw className="w-5 h-5 text-[#004443]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-semibold text-[#222]">Return to your matches</p>
                                <p className="text-xs text-[#666] mt-0.5 leading-snug">View the clinics we matched you with</p>
                              </div>
                              <ArrowRight className="w-5 h-5 text-[#004443] group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                          </div>
                          <Link
                            href="/intake"
                            className="group flex items-center justify-center gap-2 text-sm text-[#666] hover:text-[#004443] transition-colors py-1"
                          >
                            <Search className="w-3.5 h-3.5" />
                            <span>Or start a new search</span>
                          </Link>
                        </div>
                      ) : (
                        <div className="flex flex-row items-center justify-center lg:justify-start gap-4">
                          <Button
                            size="lg"
                            className="bg-[#0fbcb0] hover:bg-[#0da399] text-white px-10 py-5 h-auto rounded-full font-semibold hover:shadow-lg transition-all shadow-md text-lg border-0"
                            asChild
                          >
                            <Link href="/intake">
                              Find my clinic
                              <ArrowRight className="ml-2 w-5 h-5" />
                            </Link>
                          </Button>

                          <button
                            onClick={() => {
                              document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                            }}
                            className="px-6 py-3 h-auto rounded-full font-semibold text-lg text-[#555] hover:text-[#222] border border-[#d5cfc8] hover:border-[#bbb] bg-transparent hover:bg-white/50 transition-all"
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
              <div className="max-w-6xl mx-auto">
                {/* Section header */}
                <div className="text-center mb-16 md:mb-24">
                  <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#004443]">
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

          {/* Trusted clinics section */}
          <section className="py-16 md:py-28 lg:py-32">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-6xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                  {/* Clinic Carousel */}
                  <ClinicCarousel />

                  {/* Content */}
                  <div className="lg:pl-4">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 text-foreground text-balance">
                      Qualified, vetted dental clinics you can <span className="text-[#0fbcb0]">trust</span>
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
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl">
                          <div className="rounded-full bg-white p-1.5 mt-0.5 shadow-sm">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{item.title}</p>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
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
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Comparison table */}
          <ComparisonTable />

          {/* Testimonials section */}
          <section className="py-16 md:py-28 lg:py-32 bg-[#F8F1E7]">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12 md:mb-16">
                  <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-[#004443]">
                    What Patients Say
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Real experiences from people who found the right clinic for them
                  </p>
                </div>
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
                    <Card key={i} className="p-5 sm:p-8 border-0 shadow-lg rounded-3xl bg-white h-full">
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
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* CTA section - dark teal background */}
          <section className="py-24 md:py-32 lg:py-36 bg-[#004443] text-white relative overflow-hidden">
            {/* Decorative background blobs */}
            <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-white/[0.03] blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-[#0fbcb0]/[0.08] blur-2xl pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 text-balance">
                  Ready to find the right dental clinic for you?
                </h2>
                <p className="text-lg md:text-xl mb-10 opacity-90 leading-relaxed">
                  Answer a few quick questions and we&apos;ll match you with trusted clinics near you.
                </p>
                <Button
                  size="lg"
                  className="text-base px-10 h-16 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full shadow-xl hover:shadow-2xl transition-all text-lg font-semibold border-0"
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

          {/* Footer */}
          <SiteFooter />
      </div>
    </>
  )
}
