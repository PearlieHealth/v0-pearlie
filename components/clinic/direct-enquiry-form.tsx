"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ArrowRight, User, Mail, Phone, Shield } from "lucide-react"
import { OTPVerification } from "@/components/otp-verification"
import { trackEvent, setLeadId as setAnalyticsLeadId } from "@/lib/analytics"
import { identifyForTikTok, trackTikTokEvent } from "@/lib/tiktok-pixel"

const TREATMENT_OPTIONS = [
  "Dental Implants",
  "Composite Bonding",
  "Veneers",
  "Teeth Whitening",
  "Invisalign",
  "Braces",
  "General Checkup",
  "Emergency Care",
  "Other",
]

const URGENCY_OPTIONS = [
  { value: "asap", label: "As soon as possible" },
  { value: "this_month", label: "Within a month" },
  { value: "exploring", label: "Just exploring options" },
]

interface DirectEnquiryFormProps {
  clinicId: string
  clinicName: string
  onLeadCreated: (leadId: string) => void
}

export function DirectEnquiryForm({ clinicId, clinicName, onLeadCreated }: DirectEnquiryFormProps) {
  const [step, setStep] = useState<"form" | "verify">("form")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leadId, setLeadId] = useState<string | null>(null)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [treatment, setTreatment] = useState("")
  const [urgency, setUrgency] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/leads/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          treatmentInterest: treatment,
          urgency,
          clinicId,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Something went wrong")
      }

      const data = await response.json()
      setLeadId(data.leadId)
      setAnalyticsLeadId(data.leadId)
      await identifyForTikTok({ email: email.trim(), phone: phone.trim(), externalId: data.leadId })
      trackTikTokEvent("CompleteRegistration", { content_name: "direct_enquiry", treatment: treatment || null })
      trackEvent("lead_submitted", {
        leadId: data.leadId,
        clinicId,
        meta: { source: "direct_profile", treatment: treatment || null },
      })
      setStep("verify")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (step === "verify" && leadId) {
    return (
      <div className="p-4">
        <OTPVerification
          leadId={leadId}
          email={email.trim()}
          onVerified={async () => {
            await identifyForTikTok({ email: email.trim(), phone: phone.trim(), externalId: leadId })
            trackTikTokEvent("CompleteRegistration", { content_name: "otp_verified_direct" })
            trackEvent("email_verified", {
              leadId,
              clinicId,
              meta: { source: "direct_profile" },
            })
            onLeadCreated(leadId)
          }}
          onBack={() => setStep("form")}
        />
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#1a1a1a]">
          Quick intro so {clinicName} knows who you are
        </h3>
        <p className="text-xs text-[#666] mt-1">
          Takes 30 seconds. Your details are shared only with this clinic.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="de-first-name" className="text-[11px] font-medium text-[#555] mb-1 block">
              First name
            </label>
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#999]" />
              <Input
                id="de-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="pl-8 h-9 text-sm"
                placeholder="First name"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="de-last-name" className="text-[11px] font-medium text-[#555] mb-1 block">
              Last name
            </label>
            <Input
              id="de-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-9 text-sm"
              placeholder="Last name"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="de-email" className="text-[11px] font-medium text-[#555] mb-1 block">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#999]" />
            <Input
              id="de-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-8 h-9 text-sm"
              placeholder="your@email.com"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="de-phone" className="text-[11px] font-medium text-[#555] mb-1 block">
            Phone number
          </label>
          <div className="relative">
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#999]" />
            <Input
              id="de-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-8 h-9 text-sm"
              placeholder="07xxx xxx xxx"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="de-treatment" className="text-[11px] font-medium text-[#555] mb-1 block">
            What treatment are you interested in?
          </label>
          <select
            id="de-treatment"
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select a treatment (optional)</option>
            {TREATMENT_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-[#555] mb-1.5 block">
            When are you looking to be seen?
          </label>
          <div className="flex gap-1.5">
            {URGENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUrgency(opt.value)}
                className={`flex-1 text-[11px] py-1.5 px-2 rounded-full border transition-colors ${
                  urgency === opt.value
                    ? "border-[#0fbcb0] bg-[#0fbcb0]/10 text-[#0fbcb0] font-medium"
                    : "border-[#ddd] text-[#666] hover:border-[#bbb]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || !firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()}
          className="w-full bg-[#004443] hover:bg-[#003332] text-white h-10 text-sm rounded-full"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Verify & start chatting
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-[10px] text-[#999] text-center flex items-center justify-center gap-1">
          <Shield className="w-3 h-3" />
          Your details are only shared with {clinicName}
        </p>
      </form>
    </div>
  )
}
