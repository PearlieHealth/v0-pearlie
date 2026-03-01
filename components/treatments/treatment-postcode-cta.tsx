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

interface TreatmentPostcodeCtaProps {
  treatmentName: string
  intakeTreatment: string
}

export function TreatmentPostcodeCta({ treatmentName, intakeTreatment }: TreatmentPostcodeCtaProps) {
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
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
        <div className="space-y-4">
          <div className="[&_input]:h-12 [&_input]:text-base [&_input]:rounded-full [&_input]:bg-white/10 [&_input]:border-white/20 [&_input]:text-white [&_input]:placeholder:text-white/40 [&_input]:focus-visible:ring-primary [&_input]:focus-visible:border-primary [&_.text-destructive]:text-red-300">
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
            className="bg-primary hover:bg-[var(--primary-hover)] text-white rounded-full px-8 h-12 text-base disabled:opacity-50"
          >
            Find my {treatmentName.toLowerCase()} clinic
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
