"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PostcodeInput } from "@/components/postcode-input"
import { SUPPORTED_REGION } from "@/lib/intake-form-config"
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

export function HomeHeroSearch({ variant = "inline" }: { variant?: "inline" | "card" }) {
  const isCard = variant === "card"
  const router = useRouter()
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
      params.set("postcode", postcode.trim().toUpperCase())

      router.push(`/intake?${params.toString()}`)
    },
    [postcodeValid, postcode, router]
  )

  return (
    <>
      <form
        id="home-hero-search"
        onSubmit={handleSubmit}
        className={
          isCard
            ? "w-full space-y-4"
            : "w-full max-w-xl lg:max-w-2xl bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)] p-4 sm:p-5 border border-border/30"
        }
      >
        <div className={isCard ? "flex flex-col gap-4" : "flex flex-col sm:flex-row gap-3 items-stretch sm:items-start"}>
          {/* Postcode input */}
          <div className={isCard ? "" : "flex-1 min-w-0"}>
            <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 pl-1 ${isCard ? "text-black/50" : "text-muted-foreground"}`}>Postcode</label>
            <div className={
              isCard
                ? "[&_input]:h-12 [&_input]:rounded-xl [&_input]:text-sm [&_input]:bg-white/60 [&_input]:border-white/40 [&_input]:backdrop-blur-sm"
                : "[&_input]:h-12 [&_input]:rounded-xl [&_input]:text-sm [&_input]:bg-[#f8f7f1] [&_input]:border-border/60"
            }>
              <PostcodeInput
                value={postcode}
                onChange={setPostcode}
                onValidChange={setPostcodeValid}
                onOutsideLondon={(area) => setOutsideArea(area)}
              />
            </div>
          </div>

          {/* Submit button */}
          <div className={isCard ? "" : "flex flex-col justify-end"}>
            {!isCard && (
              <label className="hidden sm:block text-[11px] font-semibold uppercase tracking-wider text-transparent mb-1.5 select-none">&nbsp;</label>
            )}
            <Button
              type="submit"
              disabled={!postcodeValid}
              className={`bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-xl h-12 text-sm font-semibold disabled:opacity-50 border-0 transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] shadow-sm ${
                isCard ? "w-full" : "px-6 shrink-0"
              }`}
            >
              {isCard ? "Get Started" : "Find my clinic"}
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
