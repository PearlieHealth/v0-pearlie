"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronRightIcon, ShieldCheckIcon, AlertCircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const TOTAL_STEPS = 6

type TreatmentType =
  | "invisalign"
  | "veneers"
  | "composite-bonding"
  | "dental-implants"
  | "teeth-whitening"
  | "general-dentistry"
  | "emergency"
  | "cosmetic-consultation"
  | "other"

type FormData = {
  treatments: TreatmentType[]
  painScore?: number
  hasSwelling?: boolean
  hasBleedingTrauma?: boolean
  cosmeticConcern?: string
  cosmeticTimeframe?: string
  urgency: string
  location: string
  budget: string
  fullName: string
  mobile: string
  email: string
}

const treatmentOptions = [
  { value: "emergency" as TreatmentType, label: "Emergency" },
  { value: "cosmetic-consultation" as TreatmentType, label: "Cosmetic Consultation" },
  { value: "invisalign" as TreatmentType, label: "Invisalign" },
  { value: "veneers" as TreatmentType, label: "Veneers" },
  { value: "composite-bonding" as TreatmentType, label: "Composite Bonding" },
  { value: "dental-implants" as TreatmentType, label: "Dental Implants" },
  { value: "teeth-whitening" as TreatmentType, label: "Teeth Whitening" },
  { value: "general-dentistry" as TreatmentType, label: "General Dentistry" },
  { value: "other" as TreatmentType, label: "Other" },
]

const urgencyOptions = [
  { value: "asap", label: "As soon as possible" },
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
  { value: "just-browsing", label: "Just browsing" },
]

const budgetOptions = [
  { value: "under-1k", label: "Under £1,000" },
  { value: "1k-3k", label: "£1,000 - £3,000" },
  { value: "3k-5k", label: "£3,000 - £5,000" },
  { value: "5k-plus", label: "£5,000+" },
  { value: "not-sure", label: "Not sure yet" },
]

const cosmeticConcernOptions = [
  { value: "colour", label: "Colour" },
  { value: "crowding", label: "Crowding" },
  { value: "gaps", label: "Gaps" },
  { value: "chips", label: "Chips" },
  { value: "bite", label: "Bite" },
  { value: "other", label: "Other" },
]

const cosmeticTimeframeOptions = [
  { value: "2-weeks", label: "2 weeks" },
  { value: "1-month", label: "1 month" },
  { value: "3-months", label: "3 months" },
  { value: "just-exploring", label: "Just exploring" },
]

export default function BookPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    treatments: [],
    urgency: "",
    location: "",
    budget: "",
    fullName: "",
    mobile: "",
    email: "",
  })
  const [otherTreatment, setOtherTreatment] = useState("")

  const isEmergency = formData.treatments.includes("emergency")
  const isCosmeticConsultation = formData.treatments.includes("cosmetic-consultation")

  const handleTreatmentToggle = (treatment: TreatmentType) => {
    setFormData((prev) => {
      const isSelected = prev.treatments.includes(treatment)
      return {
        ...prev,
        treatments: isSelected ? prev.treatments.filter((t) => t !== treatment) : [...prev.treatments, treatment],
      }
    })
  }

  const canContinueStep1 = formData.treatments.length > 0
  const canContinueStep2 = isEmergency
    ? formData.painScore !== undefined && formData.hasSwelling !== undefined && formData.hasBleedingTrauma !== undefined
    : isCosmeticConsultation
      ? formData.cosmeticConcern !== undefined && formData.cosmeticTimeframe !== undefined
      : formData.urgency !== ""
  const canContinueStep3 = formData.location.trim() !== ""
  const canContinueStep4 = formData.budget !== ""
  const canContinueStep5 =
    formData.fullName.trim() !== "" && formData.mobile.trim() !== "" && formData.email.trim() !== ""

  const handleContinue = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1)
    } else {
      console.log("[v0] Form submitted:", formData)
      alert("Thank you! Your intake form has been submitted.")
    }
  }

  const canContinue = () => {
    switch (currentStep) {
      case 1:
        return canContinueStep1
      case 2:
        return canContinueStep2
      case 3:
        return canContinueStep3
      case 4:
        return canContinueStep4
      case 5:
        return canContinueStep5
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-slate-900 mb-3">Patient intake form</h1>
          <p className="text-pretty text-lg text-slate-600">
            Help us understand your needs so we can connect you with the right clinic.
          </p>
        </div>

        {/* Main form card */}
        <Card className="bg-white p-8 sm:p-12 shadow-sm">
          {/* Progress indicator */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "size-12 rounded-full flex items-center justify-center font-semibold text-sm transition-colors",
                      step < currentStep
                        ? "bg-slate-900 text-white"
                        : step === currentStep
                          ? "bg-slate-900 text-white"
                          : "bg-slate-200 text-slate-500",
                    )}
                  >
                    {step}
                  </div>
                </div>
              ))}
            </div>
            <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-slate-900 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Step 1: Treatment selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">What treatment are you interested in?</h2>
                <p className="text-slate-600">Select all that apply.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {treatmentOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleTreatmentToggle(option.value)}
                    className={cn(
                      "flex items-center gap-3 p-4 border-2 rounded-xl text-left transition-colors",
                      formData.treatments.includes(option.value)
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div
                      className={cn(
                        "size-5 rounded border-2 flex items-center justify-center transition-colors",
                        formData.treatments.includes(option.value)
                          ? "border-slate-900 bg-slate-900"
                          : "border-slate-300",
                      )}
                    >
                      {formData.treatments.includes(option.value) && (
                        <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-slate-900">{option.label}</span>
                  </button>
                ))}
              </div>

              {formData.treatments.includes("other") && (
                <div className="mt-4">
                  <Label htmlFor="other-treatment">Please specify</Label>
                  <Input
                    id="other-treatment"
                    placeholder="Describe the treatment you're looking for"
                    value={otherTreatment}
                    onChange={(e) => setOtherTreatment(e.target.value)}
                    className="mt-2"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Emergency flow, Cosmetic flow, or standard Urgency */}
          {currentStep === 2 && isEmergency && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Emergency assessment</h2>
                <p className="text-slate-600">Help us understand the urgency of your situation.</p>
              </div>

              {/* Pain score */}
              <div>
                <Label className="text-base font-semibold text-slate-900 mb-3 block">
                  On a scale of 0-10, how would you rate your pain?
                </Label>
                <div className="grid grid-cols-11 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, painScore: score }))}
                      className={cn(
                        "aspect-square rounded-lg border-2 font-semibold transition-colors",
                        formData.painScore === score
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 hover:border-slate-300 text-slate-700",
                      )}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              {/* Swelling */}
              <div>
                <Label className="text-base font-semibold text-slate-900 mb-3 block">Do you have any swelling?</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, hasSwelling: true }))}
                    className={cn(
                      "flex items-center justify-center gap-3 p-4 border-2 rounded-xl transition-colors",
                      formData.hasSwelling === true
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div
                      className={cn(
                        "size-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        formData.hasSwelling === true ? "border-slate-900" : "border-slate-300",
                      )}
                    >
                      {formData.hasSwelling === true && <div className="size-2.5 rounded-full bg-slate-900" />}
                    </div>
                    <span className="font-medium text-slate-900">Yes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, hasSwelling: false }))}
                    className={cn(
                      "flex items-center justify-center gap-3 p-4 border-2 rounded-xl transition-colors",
                      formData.hasSwelling === false
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div
                      className={cn(
                        "size-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        formData.hasSwelling === false ? "border-slate-900" : "border-slate-300",
                      )}
                    >
                      {formData.hasSwelling === false && <div className="size-2.5 rounded-full bg-slate-900" />}
                    </div>
                    <span className="font-medium text-slate-900">No</span>
                  </button>
                </div>
              </div>

              {/* Bleeding/trauma */}
              <div>
                <Label className="text-base font-semibold text-slate-900 mb-3 block">
                  Are you experiencing any bleeding or trauma?
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, hasBleedingTrauma: true }))}
                    className={cn(
                      "flex items-center justify-center gap-3 p-4 border-2 rounded-xl transition-colors",
                      formData.hasBleedingTrauma === true
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div
                      className={cn(
                        "size-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        formData.hasBleedingTrauma === true ? "border-slate-900" : "border-slate-300",
                      )}
                    >
                      {formData.hasBleedingTrauma === true && <div className="size-2.5 rounded-full bg-slate-900" />}
                    </div>
                    <span className="font-medium text-slate-900">Yes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, hasBleedingTrauma: false }))}
                    className={cn(
                      "flex items-center justify-center gap-3 p-4 border-2 rounded-xl transition-colors",
                      formData.hasBleedingTrauma === false
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div
                      className={cn(
                        "size-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        formData.hasBleedingTrauma === false ? "border-slate-900" : "border-slate-300",
                      )}
                    >
                      {formData.hasBleedingTrauma === false && <div className="size-2.5 rounded-full bg-slate-900" />}
                    </div>
                    <span className="font-medium text-slate-900">No</span>
                  </button>
                </div>
              </div>

              {/* Emergency warning */}
              {formData.hasSwelling === true && (
                <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex gap-3">
                  <AlertCircleIcon className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-900">
                    <p className="font-semibold mb-1">Important:</p>
                    <p>If swelling affects your breathing or swallowing, call 999 or go to A&E immediately.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && isCosmeticConsultation && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">About your cosmetic goals</h2>
                <p className="text-slate-600">Help us understand what you're looking for.</p>
              </div>

              {/* Cosmetic concern */}
              <div>
                <Label className="text-base font-semibold text-slate-900 mb-3 block">
                  What are you most unhappy about?
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {cosmeticConcernOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, cosmeticConcern: option.value }))}
                      className={cn(
                        "flex items-center justify-center p-4 border-2 rounded-xl transition-colors font-medium",
                        formData.cosmeticConcern === option.value
                          ? "border-slate-900 bg-slate-50 text-slate-900"
                          : "border-slate-200 hover:border-slate-300 text-slate-700",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeframe */}
              <div>
                <Label className="text-base font-semibold text-slate-900 mb-3 block">
                  Are you hoping to start within?
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {cosmeticTimeframeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, cosmeticTimeframe: option.value }))}
                      className={cn(
                        "flex items-center justify-center p-4 border-2 rounded-xl transition-colors font-medium",
                        formData.cosmeticTimeframe === option.value
                          ? "border-slate-900 bg-slate-50 text-slate-900"
                          : "border-slate-200 hover:border-slate-300 text-slate-700",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && !isEmergency && !isCosmeticConsultation && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">When are you looking to book?</h2>
                <p className="text-slate-600">Select your preferred timeframe.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {urgencyOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, urgency: option.value }))}
                    className={cn(
                      "flex items-center gap-3 p-4 border-2 rounded-xl text-left transition-colors",
                      formData.urgency === option.value
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div
                      className={cn(
                        "size-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        formData.urgency === option.value ? "border-slate-900" : "border-slate-300",
                      )}
                    >
                      {formData.urgency === option.value && <div className="size-2.5 rounded-full bg-slate-900" />}
                    </div>
                    <span className="font-medium text-slate-900">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Where are you located?</h2>
                <p className="text-slate-600">This helps us find clinics near you.</p>
              </div>

              <div>
                <Label htmlFor="location">City or postcode</Label>
                <Input
                  id="location"
                  placeholder="e.g., London, Manchester, SW1A 1AA"
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {/* Step 4: Budget */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">What's your budget?</h2>
                <p className="text-slate-600">This is optional but helps us match you better.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {budgetOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, budget: option.value }))}
                    className={cn(
                      "flex items-center gap-3 p-4 border-2 rounded-xl text-left transition-colors",
                      formData.budget === option.value
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div
                      className={cn(
                        "size-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        formData.budget === option.value ? "border-slate-900" : "border-slate-300",
                      )}
                    >
                      {formData.budget === option.value && <div className="size-2.5 rounded-full bg-slate-900" />}
                    </div>
                    <span className="font-medium text-slate-900">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Contact details */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Your contact details</h2>
                <p className="text-slate-600">We'll use these to connect you with the right clinic.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Smith"
                    value={formData.fullName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="mobile">Mobile number</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="07XXX XXXXXX"
                    value={formData.mobile}
                    onChange={(e) => setFormData((prev) => ({ ...prev, mobile: e.target.value }))}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Continue button */}
          <div className="mt-8">
            <Button
              onClick={handleContinue}
              disabled={!canContinue()}
              size="lg"
              className={cn(
                "w-full rounded-xl text-base",
                canContinue()
                  ? "bg-slate-900 hover:bg-slate-800 text-white"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed",
              )}
            >
              {currentStep === 5 ? "Submit" : "Continue"}
              <ChevronRightIcon className="ml-2 size-5" />
            </Button>
          </div>

          {/* Back button */}
          {currentStep > 1 && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="text-sm text-slate-600 hover:text-slate-900 font-medium"
              >
                ← Back
              </button>
            </div>
          )}
        </Card>

        {/* Security message */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600">
          <ShieldCheckIcon className="size-4" />
          <span>Your information is secure and confidential</span>
        </div>
      </div>
    </div>
  )
}
