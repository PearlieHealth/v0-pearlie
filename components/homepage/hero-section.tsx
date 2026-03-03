"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, RotateCcw, Search } from "lucide-react"
import Link from "next/link"
import { trackTikTokEvent, trackTikTokServerRelay } from "@/lib/tiktok-pixel"
import { generateTikTokEventId } from "@/lib/tiktok-event-id"
import { useLastMatch } from "@/hooks/use-last-match"

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

export function HeroSection() {
  const lastMatch = useLastMatch()

  // Rotating hero benefit phrases
  const [benefitIndex, setBenefitIndex] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setBenefitIndex((prev) => (prev + 1) % heroRotatingBenefits.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const [showResumeHint, setShowResumeHint] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 1024) return
    const v = heroVideoRef.current
    if (!v) return

    const hideHint = () => setShowResumeHint(false)

    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      if (!v || v.ended) return
      v.play().then(hideHint).catch(() => {
        if (!v.ended) setShowResumeHint(true)
      })
    }

    v.addEventListener("playing", hideHint)
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("pageshow", onVisible)
    return () => {
      v.removeEventListener("playing", hideHint)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("pageshow", onVisible)
    }
  }, [])

  const handleHeroVideoTap = useCallback(() => {
    const v = heroVideoRef.current
    if (!v) return
    if (v.ended) return
    v.play().catch(() => {})
    setShowResumeHint(false)
  }, [])

  const handleFindClinicClick = useCallback(() => {
    const eventId = generateTikTokEventId()
    trackTikTokEvent("Search", { content_name: "find_my_clinic" }, eventId)
    trackTikTokServerRelay("Search", { event_id: eventId, properties: { content_name: "find_my_clinic" } })
  }, [])

  return (
    <>
      <section className="relative md:min-h-[70vh] lg:min-h-[100vh] pt-32 pb-8 md:pt-28 md:pb-14 lg:flex lg:flex-col lg:pt-20 lg:pb-0 bg-gradient-to-b from-[#f2f0e8] via-[#f5f3ec] to-[#f8f7f1] overflow-hidden">
        <div className="px-6 md:px-14 lg:flex-1 lg:flex lg:items-center">
          <div className="max-w-7xl lg:w-full">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8 md:gap-14 lg:gap-20">

              {/* Video */}
              <motion.div
                className="order-2 lg:order-2 flex-1 w-full max-w-[17rem] md:max-w-[24rem] lg:max-w-[78%] mx-auto lg:mx-0 lg:ml-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
              >
                <div className="relative" onClick={handleHeroVideoTap}>
                  <video
                    ref={heroVideoRef}
                    autoPlay
                    muted
                    playsInline
                    poster="/images/hero-poster.jpg"
                    className="w-full h-auto rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.04)] scale-x-[-1]"
                  >
                    <source src="/images/Short Clip Smile Pearlie.webm" type="video/webm" />
                    <source src="/images/Short Clip Smile Pearlie.mp4" type="video/mp4" />
                  </video>
                  {showResumeHint && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/10 lg:hidden">
                      <span className="text-white/90 text-sm font-medium px-4 py-2 rounded-full bg-black/30 backdrop-blur-sm">
                        Tap to resume
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Text content */}
              <div className="order-1 lg:order-1 flex-1 text-center lg:text-left">
                <motion.h1
                  className="text-[clamp(2.1rem,8vw,2.75rem)] md:text-[2.7rem] lg:text-[3.375rem] xl:text-[4.05rem] leading-[1.1] font-heading font-bold tracking-[-0.03em] text-black mb-8 md:mb-14 lg:mb-24 -mx-2 md:mx-0"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                >
                  <span className="block">Find dentists</span>
                  <span className="block mt-1 md:mt-2 relative h-[2.4em] md:h-[1.3em] overflow-hidden">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={benefitIndex}
                        className="absolute inset-x-0 top-0 block text-[#0fbcb0]"
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

                {!lastMatch && (
                  <motion.p
                    className="text-[15px] md:text-lg text-black mb-5 md:mb-6 lg:mb-8 leading-[1.5] max-w-lg mx-auto lg:mx-0"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  >
                    Pearlie is a curated network of best dentists. Find one perfect for you and book online instantly.
                  </motion.p>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                >
                  {lastMatch ? (
                    <div className="flex flex-col lg:flex-row justify-center lg:justify-start gap-2 md:gap-3 max-w-md lg:max-w-none">
                      <Link
                        href={`/match/${lastMatch.matchId}`}
                        className="group flex items-center gap-3 bg-white border border-[#0fbcb0]/30 rounded-2xl px-4 py-3 md:px-5 md:py-4 hover:shadow-md hover:border-[#0fbcb0]/60 transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)]"
                      >
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#0fbcb0]/10 flex items-center justify-center flex-shrink-0">
                          <RotateCcw className="w-4 h-4 md:w-5 md:h-5 text-[#0fbcb0]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm md:text-[15px] font-semibold text-black">Return to your matches</p>
                          <p className="text-xs text-black mt-0.5 leading-snug">View the clinics we matched you with</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-[#0fbcb0] group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                      <Link
                        href="/intake"
                        className="group flex items-center gap-3 bg-white border border-[#d5cfc8] rounded-2xl px-4 py-3 md:px-5 md:py-4 hover:shadow-md hover:border-[#bbb] transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)]"
                      >
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#f8f7f1] flex items-center justify-center flex-shrink-0">
                          <Search className="w-4 h-4 md:w-5 md:h-5 text-[#004443]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm md:text-[15px] font-semibold text-black">Start a new search</p>
                          <p className="text-xs text-black mt-0.5 leading-snug">Answer new questions and get fresh matches</p>
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
                        className="px-4 md:px-6 py-1.5 md:py-2.5 h-auto rounded-full font-heading font-normal text-sm md:text-[15px] text-black hover:text-black border border-[#d5cfc8] hover:border-[#bbb] bg-transparent hover:bg-white/50 transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)]"
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
    </>
  )
}
