"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { validateUKPostcode } from "@/lib/postcodes-io"
import { SUPPORTED_REGION } from "@/lib/intake-form-config"

interface StickyPostcodeBarProps {
  /** ID of the hero search element to observe */
  heroSearchId?: string
}

export function StickyPostcodeBar({ heroSearchId = "hero-postcode-search" }: StickyPostcodeBarProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [postcode, setPostcode] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [postcodeValid, setPostcodeValid] = useState(false)

  // Pre-fill from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pearlie_postcode")
      if (stored) {
        setPostcode(stored)
      }
    } catch {}
  }, [])

  // Show when hero postcode CTA scrolls out of view
  useEffect(() => {
    const target = document.getElementById(heroSearchId)
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const show = !entry.isIntersecting
        setVisible(show)
        document.documentElement.classList.toggle("treatment-sticky-visible", show)
      },
      { threshold: 0 }
    )

    observer.observe(target)
    return () => {
      observer.disconnect()
      document.documentElement.classList.remove("treatment-sticky-visible")
    }
  }, [heroSearchId])

  // Validate postcode with debounce
  useEffect(() => {
    if (!postcode) {
      setPostcodeValid(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsValidating(true)

      if (!validateUKPostcode(postcode)) {
        setPostcodeValid(false)
        setIsValidating(false)
        return
      }

      try {
        const sanitized = postcode.replace(/\s/g, "").toUpperCase()
        const response = await fetch(`https://api.postcodes.io/postcodes/${sanitized}`)

        if (!response.ok) {
          setPostcodeValid(false)
        } else {
          const data = await response.json()
          const region = data.result?.region || ""

          if (region !== SUPPORTED_REGION) {
            setPostcodeValid(false)
          } else {
            setPostcodeValid(true)
          }
        }
      } catch {
        setPostcodeValid(true)
      } finally {
        setIsValidating(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [postcode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!postcodeValid) return
    const sanitized = postcode.trim().toUpperCase()
    try {
      localStorage.setItem("pearlie_postcode", sanitized)
    } catch {}
    router.push(`/intake?postcode=${encodeURIComponent(sanitized)}`)
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
        <form onSubmit={handleSubmit} className="flex gap-2.5 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Enter postcode"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              className="w-full h-10 px-4 text-sm rounded-full border border-border/40 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#0fbcb0] focus:border-[#0fbcb0] placeholder:text-muted-foreground/60"
            />
            {isValidating && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-[#0fbcb0] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <Button
            type="submit"
            disabled={!postcodeValid}
            className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full px-5 h-10 text-sm font-medium shrink-0 disabled:opacity-50 border-0"
          >
            Find a dentist
          </Button>
        </form>
      </div>
    </div>
  )
}
