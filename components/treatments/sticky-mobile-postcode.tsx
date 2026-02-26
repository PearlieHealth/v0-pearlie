"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { validateUKPostcode } from "@/lib/postcodes-io"
import { SUPPORTED_REGION } from "@/lib/intake-form-config"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

interface StickyMobilePostcodeProps {
  treatmentName: string
  intakeTreatment: string
}

export function StickyMobilePostcode({ treatmentName, intakeTreatment }: StickyMobilePostcodeProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [postcode, setPostcode] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [postcodeValid, setPostcodeValid] = useState(false)
  const [outsideArea, setOutsideArea] = useState<string | null>(null)
  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false)
  const [waitlistDone, setWaitlistDone] = useState(false)

  // Show/hide based on scroll position
  useEffect(() => {
    const threshold = 350 // roughly past the hero section
    const onScroll = () => {
      setVisible(window.scrollY > threshold)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

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
          const area = data.result?.admin_district || region

          if (region !== SUPPORTED_REGION) {
            setPostcodeValid(false)
            setOutsideArea(area)
          } else {
            setPostcodeValid(true)
          }
        }
      } catch {
        // Allow on network error
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
    const params = new URLSearchParams({
      treatment: intakeTreatment,
      postcode: postcode.trim().toUpperCase(),
    })
    router.push(`/intake?${params.toString()}`)
  }

  return (
    <>
      {/* Sticky bar — mobile only, shown when scrolled past hero */}
      <div
        className={`fixed top-0 left-0 right-0 z-[60] md:hidden transition-all duration-300 ${
          visible
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-md border-b border-border/30 shadow-sm px-3 py-2.5 safe-top">
          <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                className="w-full h-9 px-3 text-sm rounded-full border border-border/60 bg-white focus:outline-none focus:ring-2 focus:ring-[#0fbcb0] focus:border-[#0fbcb0] placeholder:text-muted-foreground/60"
              />
              {isValidating && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-[#0fbcb0] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!postcodeValid}
              className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full px-4 h-9 text-sm shrink-0 disabled:opacity-50 border-0"
            >
              Find clinic
            </Button>
          </form>
        </div>
      </div>

      {/* Outside area dialog */}
      <AlertDialog open={outsideArea !== null} onOpenChange={(open) => { if (!open) { setOutsideArea(null); setWaitlistDone(false) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>We&apos;re not in your area yet</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-base leading-relaxed space-y-4">
                <p>
                  We&apos;re currently serving patients in <span className="font-semibold text-foreground">{SUPPORTED_REGION}</span> only.
                  {outsideArea && (
                    <> It looks like you&apos;re in <span className="font-semibold text-foreground">{outsideArea}</span>.</>
                  )}
                  {" "}We&apos;re expanding soon!
                </p>

                {!waitlistDone ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Get notified when we launch in your area:</p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={waitlistEmail}
                        onChange={(e) => setWaitlistEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        disabled={!waitlistEmail.includes("@") || waitlistSubmitting}
                        className="bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0"
                        onClick={async () => {
                          setWaitlistSubmitting(true)
                          try {
                            await fetch("/api/waitlist", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                email: waitlistEmail,
                                postcode,
                                area: outsideArea || "outside_london",
                              }),
                            })
                            setWaitlistDone(true)
                          } catch {
                            // Silently fail
                          } finally {
                            setWaitlistSubmitting(false)
                          }
                        }}
                      >
                        {waitlistSubmitting ? "..." : "Notify me"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#0fbcb0] font-medium">
                    You&apos;re on the list! We&apos;ll let you know when we launch near you.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
