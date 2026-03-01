"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PostcodeInput } from "@/components/postcode-input"
import { TREATMENT_OPTIONS, SUPPORTED_REGION } from "@/lib/intake-form-config"
import { trackTikTokEvent, trackTikTokServerRelay } from "@/lib/tiktok-pixel"
import { generateTikTokEventId } from "@/lib/tiktok-event-id"
import { ArrowRight } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

// All treatment options including emergency — shown in hero dropdown
const ALL_TREATMENTS = [...TREATMENT_OPTIONS]

export function HomeHeroSearch() {
  const router = useRouter()
  const [treatment, setTreatment] = useState("")
  const [postcode, setPostcode] = useState("")
  const [postcodeValid, setPostcodeValid] = useState(false)
  const [outsideArea, setOutsideArea] = useState<string | null>(null)
  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false)
  const [waitlistDone, setWaitlistDone] = useState(false)

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!postcodeValid) return

      const eventId = generateTikTokEventId()
      trackTikTokEvent("Search", { content_name: "hero_search_submit" }, eventId)
      trackTikTokServerRelay("Search", {
        event_id: eventId,
        properties: { content_name: "hero_search_submit" },
      })

      const params = new URLSearchParams()
      if (treatment) {
        params.set("treatment", treatment)
      }
      params.set("postcode", postcode.trim().toUpperCase())

      router.push(`/intake?${params.toString()}`)
    },
    [postcodeValid, treatment, postcode, router]
  )

  return (
    <>
      <form
        id="home-hero-search"
        onSubmit={handleSubmit}
        className="w-full max-w-xl lg:max-w-2xl bg-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3),0_1px_4px_rgba(0,0,0,0.15)] p-4 sm:p-5 border border-border"
      >
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-start">
          {/* Treatment selector */}
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 pl-1">Treatment</label>
            <select
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              className="w-full h-12 px-4 text-sm rounded-xl border border-border bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
                paddingRight: "40px",
              }}
            >
              <option value="">Select treatment</option>
              {ALL_TREATMENTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Postcode input */}
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 pl-1">Postcode</label>
            <div className="[&_input]:h-12 [&_input]:rounded-xl [&_input]:text-sm [&_input]:bg-secondary [&_input]:border-border">
              <PostcodeInput
                value={postcode}
                onChange={setPostcode}
                onValidChange={setPostcodeValid}
                onOutsideLondon={(area) => setOutsideArea(area)}
              />
            </div>
          </div>

          {/* Submit button */}
          <div className="flex flex-col justify-end">
            <label className="hidden sm:block text-[11px] font-semibold uppercase tracking-wider text-transparent mb-1.5 select-none">&nbsp;</label>
            <Button
              type="submit"
              disabled={!postcodeValid}
              className="bg-primary hover:bg-[var(--primary-hover)] text-white rounded-xl px-6 h-12 text-sm font-semibold shrink-0 disabled:opacity-50 border-0 transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] shadow-[0_0_20px_rgba(15,188,176,0.25)]"
            >
              Find my clinic
              <ArrowRight className="ml-1.5 w-4 h-4" />
            </Button>
          </div>
        </div>
      </form>

      {/* Outside London dialog */}
      <AlertDialog
        open={outsideArea !== null}
        onOpenChange={(open) => {
          if (!open) {
            setOutsideArea(null)
            setWaitlistDone(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>We&apos;re not in your area yet</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-base leading-relaxed space-y-4">
                <p>
                  We&apos;re currently serving patients in{" "}
                  <span className="font-semibold text-foreground">
                    {SUPPORTED_REGION}
                  </span>{" "}
                  only.
                  {outsideArea && (
                    <>
                      {" "}
                      It looks like you&apos;re in{" "}
                      <span className="font-semibold text-foreground">
                        {outsideArea}
                      </span>
                      .
                    </>
                  )}{" "}
                  We&apos;re expanding soon!
                </p>

                {!waitlistDone ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Get notified when we launch in your area:
                    </p>
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
                        disabled={
                          !waitlistEmail.includes("@") || waitlistSubmitting
                        }
                        className="bg-primary hover:bg-[var(--primary-hover)] text-white border-0"
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
                  <p className="text-sm text-primary font-medium">
                    You&apos;re on the list! We&apos;ll let you know when we
                    launch near you.
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
