"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PostcodeInput } from "@/components/postcode-input"
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

interface HeroPostcodeCtaProps {
  treatmentName: string
  intakeTreatment: string
}

export function HeroPostcodeCta({ treatmentName, intakeTreatment }: HeroPostcodeCtaProps) {
  const router = useRouter()
  const [postcode, setPostcode] = useState("")
  const [postcodeValid, setPostcodeValid] = useState(false)
  const [outsideArea, setOutsideArea] = useState<string | null>(null)
  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false)
  const [waitlistDone, setWaitlistDone] = useState(false)

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
      <form onSubmit={handleSubmit} className="max-w-lg">
        <p className="text-sm text-muted-foreground mb-3">
          Enter your postcode to get started
        </p>
        <div className="flex gap-3 items-start">
          <div className="flex-1 [&_input]:h-12 [&_input]:rounded-full">
            <PostcodeInput
              value={postcode}
              onChange={setPostcode}
              onValidChange={setPostcodeValid}
              onOutsideLondon={(area) => setOutsideArea(area)}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={!postcodeValid}
            className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full px-6 h-12 text-base shrink-0 disabled:opacity-50"
          >
            <span className="md:hidden">Find my clinic</span>
            <span className="hidden md:inline">Find my {treatmentName.toLowerCase()} clinic</span>
          </Button>
        </div>
      </form>

      {/* Outside London dialog */}
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
