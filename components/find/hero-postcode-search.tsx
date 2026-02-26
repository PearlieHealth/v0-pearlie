"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { validateUKPostcode } from "@/lib/postcodes-io"

interface HeroPostcodeSearchProps {
  /** Show as compact bar (for sticky) vs. large hero style */
  variant?: "hero" | "sticky"
  /** Ref callback to measure this element for intersection observer */
  heroRef?: React.RefObject<HTMLDivElement | null>
}

export function HeroPostcodeSearch({ variant = "hero", heroRef }: HeroPostcodeSearchProps) {
  const router = useRouter()
  const [postcode, setPostcode] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!postcode.trim()) {
      // No postcode — go straight to intake
      router.push("/intake")
      return
    }

    setIsValidating(true)
    setError(null)

    // Validate format
    if (!validateUKPostcode(postcode)) {
      setError("Enter a valid UK postcode (e.g. SW1A 1AA)")
      setIsValidating(false)
      return
    }

    // Verify with postcodes.io
    try {
      const sanitized = postcode.replace(/\s/g, "").toUpperCase()
      const response = await fetch(`https://api.postcodes.io/postcodes/${sanitized}`)

      if (!response.ok) {
        setError("Please enter a valid UK postcode")
        setIsValidating(false)
        return
      }

      const data = await response.json()
      const region = data.result?.region || ""

      if (region !== "London") {
        setError("We're currently only available in London")
        setIsValidating(false)
        return
      }

      // Valid London postcode — navigate to intake with pre-filled postcode
      router.push(`/intake?postcode=${encodeURIComponent(sanitized)}`)
    } catch {
      // On network error, still allow navigation
      const sanitized = postcode.replace(/\s/g, "").toUpperCase()
      router.push(`/intake?postcode=${encodeURIComponent(sanitized)}`)
    } finally {
      setIsValidating(false)
    }
  }

  if (variant === "sticky") {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full max-w-lg mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Enter your postcode"
            value={postcode}
            onChange={(e) => {
              setPostcode(e.target.value.toUpperCase())
              setError(null)
            }}
            className="pl-9 h-10 rounded-full text-sm"
          />
        </div>
        <Button
          type="submit"
          disabled={isValidating}
          size="sm"
          className="rounded-full bg-[#0fbcb0] hover:bg-[#0da399] text-white px-5 h-10 text-sm font-medium"
        >
          {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find a dentist"}
        </Button>
      </form>
    )
  }

  return (
    <div ref={heroRef}>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Enter your postcode"
            value={postcode}
            onChange={(e) => {
              setPostcode(e.target.value.toUpperCase())
              setError(null)
            }}
            className="pl-12 h-14 rounded-full text-base bg-white shadow-lg border-0 focus-visible:ring-2 focus-visible:ring-[#0fbcb0]"
          />
          {isValidating && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <Button
          type="submit"
          disabled={isValidating}
          size="lg"
          className="rounded-full bg-[#0fbcb0] hover:bg-[#0da399] text-white px-8 h-14 text-base font-medium shadow-lg"
        >
          Find a dentist
        </Button>
      </form>
      {error && (
        <p className="text-sm text-red-300 mt-3 text-center">{error}</p>
      )}
      <p className="text-sm text-white/50 mt-3 text-center">
        Or <button type="button" onClick={() => router.push("/intake")} className="underline hover:text-white/70 transition-colors">skip and get matched</button> without a postcode
      </p>
    </div>
  )
}
