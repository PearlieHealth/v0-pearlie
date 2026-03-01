"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, RotateCcw } from "lucide-react"
import { useLastMatchId } from "@/hooks/use-last-match"

export function StickyMobileHomeCta() {
  const [visible, setVisible] = useState(false)
  const lastMatchId = useLastMatchId()

  useEffect(() => {
    const target =
      document.getElementById("home-hero-cta") ||
      document.getElementById("home-hero-search")
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const show = !entry.isIntersecting
        setVisible(show)
        // Hide / restore the main nav on mobile when this sticky bar is visible
        document.documentElement.classList.toggle("treatment-sticky-visible", show)
      },
      { threshold: 0 }
    )

    observer.observe(target)
    return () => {
      observer.disconnect()
      document.documentElement.classList.remove("treatment-sticky-visible")
    }
  }, [])

  // Returning users: don't overlay the nav bar immediately.
  // Only show a "Return to my matches" bar once they scroll past the hero.
  if (lastMatchId) {
    return (
      <div
        className={`fixed top-3 left-3 right-3 z-[60] md:hidden transition-all duration-300 ${
          visible
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="rounded-[6vw] bg-white/70 backdrop-blur-[40px] backdrop-saturate-[1.4] border border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] px-4 py-3">
          <Link
            href={`/match/${lastMatchId}`}
            className="flex items-center justify-center gap-2 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full px-5 h-10 text-sm font-medium transition-all border-0"
          >
            <RotateCcw className="w-4 h-4" />
            Return to my matches
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`fixed top-3 left-3 right-3 z-[60] md:hidden transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="rounded-[6vw] bg-white/70 backdrop-blur-[40px] backdrop-saturate-[1.4] border border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] px-4 py-3">
        <Link
          href="/intake"
          className="flex items-center justify-center gap-2 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full px-5 h-10 text-sm font-medium transition-all border-0"
        >
          Find my clinic — takes 60 secs
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
