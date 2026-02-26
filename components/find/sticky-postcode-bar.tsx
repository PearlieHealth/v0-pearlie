"use client"

import { useState, useEffect, useRef } from "react"
import { HeroPostcodeSearch } from "./hero-postcode-search"

interface StickyPostcodeBarProps {
  /** ID of the hero search element to observe */
  heroSearchId?: string
}

export function StickyPostcodeBar({ heroSearchId = "hero-postcode-search" }: StickyPostcodeBarProps) {
  const [isVisible, setIsVisible] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const heroEl = document.getElementById(heroSearchId)
    if (!heroEl) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky bar when hero search is NOT visible
        setIsVisible(!entry.isIntersecting)
      },
      { threshold: 0 }
    )

    observer.observe(heroEl)
    return () => observer.disconnect()
  }, [heroSearchId])

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-md border-b border-border/40 shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <HeroPostcodeSearch variant="sticky" />
          </div>
        </div>
      </div>
    </>
  )
}
