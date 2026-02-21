"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { PostcodeInput } from "@/components/postcode-input"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

import { trackEvent } from "@/lib/analytics"
import { identifyForTikTok, trackTikTokEvent } from "@/lib/tiktok-pixel"
import { generateTikTokEventId } from "@/lib/tiktok-event-id"
import { slideVariants, slideTransition } from "@/lib/slide-variants"
import { ChevronLeft, Shield, Clock, CheckCircle2, MapPin, Calendar, Smile, Heart, AlertCircle, Sun, CreditCard, Mail, Zap } from "lucide-react"
import {
  FORM_VERSION,
  SCHEMA_VERSION,
  TREATMENT_OPTIONS,
  EMERGENCY_TREATMENT,
  DECISION_VALUE_OPTIONS,
  BLOCKER_OPTIONS,
  COST_APPROACH_OPTIONS,
  ANXIETY_LEVEL_OPTIONS,
  LOCATION_PREFERENCE_OPTIONS,
  TIMING_OPTIONS,
  URGENCY_OPTIONS,
  MONTHLY_PAYMENT_OPTIONS,
  BUDGET_HANDLING_OPTIONS,
  PREFERRED_TIME_OPTIONS,
  SUPPORTED_REGION,
} from "@/lib/intake-form-config"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function IntakePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formStarted, setFormStarted] = useState(false)
  const formStartTimeRef = useRef<number>(Date.now())
  const [animatedSteps, setAnimatedSteps] = useState<Set<number>>(new Set())
  const [outsideLondonArea, setOutsideLondonArea] = useState<string | null>(null)
  const [matchFailed, setMatchFailed] = useState<string | null>(null)
  const [matchRetryLeadId, setMatchRetryLeadId] = useState<string | null>(null)
  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false)
  const [waitlistDone, setWaitlistDone] = useState(false)

  const [utmParams, setUtmParams] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    treatments: [] as string[],
    postcode: "",
    postcodeValid: false,
    // Planning-only fields
    location_preference: "",
    decisionValues: [] as string[],
    conversionBlockerCodes: [] as string[],
    preferred_times: [] as string[],
    readiness: "",
    costApproach: "",
    monthlyPaymentRange: "",
    strictBudgetMode: "",
    strictBudgetAmount: "",
    // Emergency-only fields
    urgency: "",
    // Shared fields
    anxiety_level: "",
    // Contact
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    consentContact: false,
    consentMarketing: false,
  })

  // Restore form data from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pearlie_intake_progress")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed._savedAt && Date.now() - parsed._savedAt < 24 * 60 * 60 * 1000) {
          const { _savedAt, _savedStep, ...restoredData } = parsed
          setFormData(prev => ({ ...prev, ...restoredData }))
          if (_savedStep && _savedStep > 1) {
            setStep(_savedStep)
          }
        } else {
          localStorage.removeItem("pearlie_intake_progress")
        }
      }
    } catch {}
  }, [])

  // Persist form data to localStorage on change (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem("pearlie_intake_progress", JSON.stringify({
          ...formData,
          _savedAt: Date.now(),
          _savedStep: step,
        }))
      } catch {}
    }, 500)
    return () => clearTimeout(timeout)
  }, [formData, step])

  // Derived: is the user on the emergency flow?
  const isEmergency = formData.treatments.includes(EMERGENCY_TREATMENT)

  // Dynamic step order based on flow
  // PLANNING: 1 -> 2 -> 2.5 -> 3 -> 3.5 -> 5 -> 5.5 -> 6 -> 7 -> 7.5(cond) -> 7.6(cond) -> 8
  // EMERGENCY: 1 -> 2 -> 2.5E -> 3.5 -> 5.5 -> 8
  const stepOrder = useMemo(() => {
    if (isEmergency) {
      return [1, 2, 2.5, 3.5, 5.5, 8]
    }
    // Planning flow - 7.5 and 7.6 are conditionally shown
    const order = [1, 2, 2.5, 3, 3.5, 5, 5.5, 6, 7]
    if (formData.costApproach === "comfort_range") {
      order.push(7.5)
    } else if (formData.costApproach === "strict_budget") {
      order.push(7.6)
    }
    order.push(8)
    return order
  }, [isEmergency, formData.costApproach])

  const currentStepIndex = stepOrder.indexOf(step)
  const totalSteps = stepOrder.length
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100)

  // Validation checks
  const canContinueStep1 = formData.treatments.length > 0
  const canContinueStep2 = formData.postcode !== "" && formData.postcodeValid
  const canContinueStep3 = formData.decisionValues.length > 0
  const canContinueStep5 = formData.conversionBlockerCodes.length > 0
  const canContinueStep5_5 = formData.preferred_times.length > 0
  const isEmailValid = EMAIL_REGEX.test(formData.email.trim())
  const canContinueStep8 =
    formData.firstName && formData.lastName && formData.email && isEmailValid && formData.consentContact

  // Treatment toggle with emergency exclusivity
  const handleTreatmentToggle = (treatment: string) => {
    setFormData((prev) => {
      if (treatment === EMERGENCY_TREATMENT) {
        // Emergency selected: deselect everything else, only emergency
        if (prev.treatments.includes(EMERGENCY_TREATMENT)) {
          return { ...prev, treatments: [] }
        }
        return { ...prev, treatments: [EMERGENCY_TREATMENT] }
      }
      // Non-emergency selected: remove emergency if present, toggle treatment
      const withoutEmergency = prev.treatments.filter((t) => t !== EMERGENCY_TREATMENT)
      if (withoutEmergency.includes(treatment)) {
        return { ...prev, treatments: withoutEmergency.filter((t) => t !== treatment) }
      }
      return { ...prev, treatments: [...withoutEmergency, treatment] }
    })
  }

  const handleDecisionValueToggle = (value: string) => {
    setFormData((prev) => {
      const isSelected = prev.decisionValues.includes(value)
      if (isSelected) {
        return { ...prev, decisionValues: prev.decisionValues.filter((v) => v !== value) }
      }
      if (prev.decisionValues.length >= 2) return prev
      return { ...prev, decisionValues: [...prev.decisionValues, value] }
    })
  }

  const handleBlockerToggle = (code: string) => {
    setFormData((prev) => {
      // "Nothing in particular" is exclusive
      if (code === "NO_CONCERN") {
        return { ...prev, conversionBlockerCodes: ["NO_CONCERN"] }
      }
      // Selecting a real concern removes "Nothing in particular"
      const withoutNoConcern = prev.conversionBlockerCodes.filter((c) => c !== "NO_CONCERN")
      if (withoutNoConcern.includes(code)) {
        return { ...prev, conversionBlockerCodes: withoutNoConcern.filter((c) => c !== code) }
      }
      if (withoutNoConcern.length >= 2) return prev // Max 2
      return { ...prev, conversionBlockerCodes: [...withoutNoConcern, code] }
    })
  }

  // Reset conditional fields when costApproach changes
  useEffect(() => {
    if (formData.costApproach !== "strict_budget") {
      setFormData((prev) => ({ ...prev, strictBudgetMode: "", strictBudgetAmount: "" }))
    }
    if (formData.costApproach !== "comfort_range") {
      setFormData((prev) => ({ ...prev, monthlyPaymentRange: "" }))
    }
  }, [formData.costApproach])

  useEffect(() => {
    if (!formStarted) {
      formStartTimeRef.current = Date.now()
      trackEvent("form_started", {
        meta: {
          flow: isEmergency ? "emergency" : "planning",
          is_returning: !!localStorage.getItem("pearlie_form_draft"),
          ...(Object.keys(utmParams).length > 0 ? { utm: utmParams } : {}),
        },
      })
      setFormStarted(true)
    }
  }, [formStarted, isEmergency, utmParams])

  // Mark current step as animated after a short delay (once intro plays)
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedSteps((prev) => new Set(prev).add(step))
    }, 800)
    return () => clearTimeout(timer)
  }, [step])

  // Helper: has this step already played its intro animation?
  const hasAnimated = animatedSteps.has(step)

  useEffect(() => {
    trackEvent("form_step_viewed", { meta: { step_name: getStepName(step), step_number: step, flow: isEmergency ? "emergency" : "planning" } })
  }, [step, isEmergency])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (step < 8) {
        const sessionId = localStorage.getItem("pearlie_session_id") || crypto.randomUUID()
        const timeSpentSeconds = Math.round((Date.now() - formStartTimeRef.current) / 1000)
        const stepsCompleted = stepOrder.indexOf(step)
        const completionPercent = Math.round(((stepsCompleted + 1) / stepOrder.length) * 100)
        const payload = JSON.stringify({
          session_id: sessionId,
          event_name: "form_abandoned",
          step_name: getStepName(step),
          meta: {
            last_step: step,
            step_name: getStepName(step),
            flow: isEmergency ? "emergency" : "planning",
            time_spent_seconds: timeSpentSeconds,
            completion_percent: completionPercent,
            treatments_count: formData.treatments.length,
            postcode_entered: !!formData.postcode,
            anxiety_level: formData.anxiety_level || null,
            cost_approach: formData.costApproach || null,
            blockers_count: formData.conversionBlockerCodes.length,
            priorities_count: formData.decisionValues.length,
          },
        })
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }))
        }
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [step, stepOrder, formData, isEmergency])

  // P2: Capture UTM params on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const utm: Record<string, string> = {}
      for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
        const val = params.get(key)
        if (val) utm[key] = val
      }
      if (Object.keys(utm).length > 0) setUtmParams(utm)
    } catch {}
  }, [])

  // I1: Restore form data from localStorage on mount (if draft < 2 hours old)
  useEffect(() => {
    try {
      const draft = localStorage.getItem("pearlie_form_draft")
      if (draft) {
        const parsed = JSON.parse(draft)
        if (Date.now() - parsed.savedAt < 2 * 60 * 60 * 1000) {
          setFormData(parsed.formData)
          if (parsed.step !== undefined) {
            const targetStep = parsed.step
            setTimeout(() => {
              setStep(targetStep)
            }, 100)
          }
        } else {
          localStorage.removeItem("pearlie_form_draft")
        }
      }
    } catch {
      localStorage.removeItem("pearlie_form_draft")
    }
  }, [])

  // I1: Save form data to localStorage on change (debounced 500ms)
  useEffect(() => {
    if (!formStarted && formData.treatments.length === 0) return // Don't save empty initial state
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("pearlie_form_draft", JSON.stringify({
          formData,
          step,
          savedAt: Date.now(),
        }))
      } catch {}
    }, 500)
    return () => clearTimeout(timer)
  }, [formData, step, formStarted])

  const getStepName = (stepNum: number) => {
    if (isEmergency) {
      const emergencyNames: Record<number, string> = {
        1: "Treatment Selection",
        2: "Postcode",
        2.5: "Urgency",
        3.5: "Dental Anxiety",
        5.5: "Best Time",
        8: "Contact Details",
      }
      return emergencyNames[stepNum] || "Unknown"
    }
    const planningNames: Record<number, string> = {
      1: "Treatment Selection",
      2: "Postcode",
      2.5: "Travel Distance",
      3: "Clinic Priorities",
      3.5: "Dental Anxiety",
      5: "Concerns",
      5.5: "Best Time",
      6: "When to Start",
      7: "Cost Mindset",
      7.5: "Monthly Payments",
      7.6: "Budget Handling",
      8: "Contact Details",
    }
    return planningNames[stepNum] || "Unknown"
  }

  const animateToStep = useCallback((toStep: number, dir: number) => {
    setDirection(dir)
    setStep(toStep)
  }, [])

  const getNextStep = (currentStep: number): number => {
    const idx = stepOrder.indexOf(currentStep)
    if (idx < stepOrder.length - 1) return stepOrder[idx + 1]
    return currentStep
  }

  const handleStepForward = (fromStep: number, toStep: number) => {
    trackEvent("form_step_completed", { meta: { step_name: getStepName(fromStep), step_number: fromStep, flow: isEmergency ? "emergency" : "planning" } })
    animateToStep(toStep, 1)
  }

  const handleStepBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) animateToStep(stepOrder[prevIndex], -1)
  }

  const handleSingleSelect = (field: string, value: string, nextStep: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setTimeout(() => handleStepForward(step, nextStep), 300)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const blockerCodes = formData.conversionBlockerCodes
      const blockerLabels = blockerCodes
        .map((code) => BLOCKER_OPTIONS.find((o) => o.code === code)?.label)
        .filter(Boolean) as string[]

      const rawAnswers = {
        treatments_selected: formData.treatments,
        is_emergency: isEmergency,
        urgency: isEmergency ? formData.urgency : null,
        location_preference: isEmergency ? null : formData.location_preference || null,
        postcode: formData.postcode,
        values: isEmergency ? [] : formData.decisionValues,
        blocker: isEmergency ? [] : blockerCodes,
        blocker_labels: isEmergency ? [] : blockerLabels,
        timing: isEmergency ? null : formData.readiness || null,
        preferred_times: formData.preferred_times,
        cost_approach: isEmergency ? null : formData.costApproach || null,
        monthly_payment_range: formData.monthlyPaymentRange || null,
        strict_budget_mode: formData.strictBudgetMode || null,
        strict_budget_amount: formData.strictBudgetAmount
          ? Number.parseFloat(formData.strictBudgetAmount.replace(/,/g, ""))
          : null,
        anxiety_level: formData.anxiety_level || null,
        contact_method: formData.email ? "email" : "phone",
        contact_value: formData.email || formData.phone || null,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email || null,
        phone: formData.phone || null,
        consent_contact: formData.consentContact,
        consent_marketing: formData.consentMarketing,
        form_version: FORM_VERSION,
        submitted_at: new Date().toISOString(),
        ...utmParams, // P2: Include UTM tracking params
      }

      const tiktokEventId = generateTikTokEventId()

      const leadRes = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tiktok_event_id: tiktokEventId,
          treatmentInterest: formData.treatments.join(", "),
          postcode: formData.postcode,
          isEmergency,
          urgency: isEmergency ? formData.urgency : null,
          budgetRange: formData.costApproach || "unspecified",
          costApproach: isEmergency ? null : formData.costApproach || null,
          monthlyPaymentRange: formData.monthlyPaymentRange || null,
          strictBudgetMode: formData.strictBudgetMode || null,
          strictBudgetAmount: formData.strictBudgetAmount
            ? Number.parseFloat(formData.strictBudgetAmount.replace(/,/g, ""))
            : null,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || null,
          phone: formData.phone || null,
          city: null,
          consentContact: formData.consentContact,
          consentTerms: formData.consentContact,
          decisionValues: isEmergency ? [] : formData.decisionValues,
          conversionBlocker: isEmergency ? "" : (blockerLabels[0] || ""),
          conversionBlockerCode: isEmergency ? "" : (blockerCodes[0] || ""),
          conversionBlockerCodes: isEmergency ? [] : blockerCodes,
          timingPreference: isEmergency ? (formData.urgency || "asap") : (formData.readiness || "flexible"),
          preferred_times: formData.preferred_times,
          locationPreference: isEmergency ? null : formData.location_preference || null,
          anxietyLevel: formData.anxiety_level || null,
          rawAnswers,
          formVersion: FORM_VERSION,
          schemaVersion: SCHEMA_VERSION,
        }),
      })

      if (!leadRes.ok) throw new Error("Failed to create lead")
      const { leadId } = await leadRes.json()
      localStorage.setItem("pearlie_lead_id", leadId)
      localStorage.removeItem("pearlie_intake_progress")

      await identifyForTikTok({ email: formData.email, phone: formData.phone, externalId: leadId })
      trackTikTokEvent("CompleteRegistration", {
        content_name: "intake_form",
        treatment: formData.treatments.join(", "),
        postcode: formData.postcode,
        flow: isEmergency ? "emergency" : "planning",
        urgency: isEmergency ? formData.urgency : null,
        cost_approach: formData.costApproach || null,
      }, tiktokEventId)

      trackEvent("lead_submitted", {
        leadId,
        meta: {
          treatment_interest: formData.treatments.join(", "),
          postcode: formData.postcode,
          flow: isEmergency ? "emergency" : "planning",
          preferred_timing: isEmergency ? formData.urgency : formData.readiness,
          cost_approach: formData.costApproach || null,
        },
      })

      // M3: Match creation with retry (3 attempts, exponential backoff)
      let matchData = null
      let lastMatchError = ""
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const matchRes = await fetch("/api/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leadId }),
          })
          if (matchRes.ok) {
            matchData = await matchRes.json()
            break
          }
          lastMatchError = `Match failed (${matchRes.status})`
          if (matchRes.status < 500) break // Don't retry client errors
        } catch (e) {
          lastMatchError = "Network error during matching"
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
      }

      if (!matchData?.matchId) {
        // Store leadId for potential manual retry
        localStorage.setItem("pearlie_failed_lead_id", leadId)
        setMatchRetryLeadId(leadId)
        setMatchFailed(lastMatchError || "Failed to create match after 3 attempts")
        return
      }

      // I1: Clear form draft after successful submission
      localStorage.removeItem("pearlie_form_draft")

      router.push(`/match/${matchData.matchId}`)
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error"
      console.error("Intake submit error:", errMsg)
      toast({ title: "Something went wrong", description: `Please try again or contact support. (${errMsg})`, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Retry match creation with backoff
  async function handleMatchRetry() {
    if (!matchRetryLeadId) return
    setIsSubmitting(true)
    setMatchFailed(null)
    let matchData = null
    let lastErr = ""
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const matchRes = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: matchRetryLeadId }),
        })
        if (matchRes.ok) {
          matchData = await matchRes.json()
          break
        }
        lastErr = `Match failed (${matchRes.status})`
        if (matchRes.status < 500) break
      } catch {
        lastErr = "Network error during matching"
      }
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
    }
    setIsSubmitting(false)
    if (matchData?.matchId) {
      localStorage.removeItem("pearlie_form_draft")
      router.push(`/match/${matchData.matchId}`)
    } else {
      setMatchFailed(lastErr || "Still unable to create match")
    }
  }

  // Option card component for consistent styling
  const OptionCard = ({
    selected,
    onClick,
    children,
    disabled = false,
    hasCheckbox = false,
    hint,
    className = "",
  }: {
    selected: boolean
    onClick: () => void
    children: React.ReactNode
    disabled?: boolean
    hasCheckbox?: boolean
    hint?: string
    className?: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative w-full p-4 sm:p-5 md:p-6 rounded-2xl border-2 text-left ${className}
        transition-all duration-200 ease-out
        ${selected
          ? "border-[#0fbcb0] bg-[#F8F1E7] shadow-md"
          : disabled
            ? "border-border/50 bg-muted/30 opacity-50 cursor-not-allowed"
            : "border-border bg-white hover:border-[#0fbcb0]/50 hover:shadow-md active:scale-[0.98]"
        }
      `}
    >
      <div className="flex items-center gap-4">
        {hasCheckbox && (
          <div
            className={`
              w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0
              transition-all duration-200
              ${selected ? "border-[#0fbcb0] bg-[#0fbcb0]" : "border-input group-hover:border-[#0fbcb0]/50"}
            `}
          >
            {selected && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}
        <div className="flex-1">
          <span className={`text-lg md:text-xl font-medium block ${selected ? "text-[#222]" : "text-[#222]"}`}>
            {children}
          </span>
          {hint && (
            <span className={`text-sm mt-1 block ${selected ? "text-[#0fbcb0]" : "text-[#222]/50"}`}>
              {hint}
            </span>
          )}
        </div>
        {!hasCheckbox && (
          <div
            className={`
              w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
              transition-all duration-200
              ${selected ? "border-[#0fbcb0] bg-[#0fbcb0]" : "border-input group-hover:border-[#0fbcb0]/50"}
            `}
          >
            {selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
          </div>
        )}
      </div>
    </button>
  )

  // Animation helpers - skip intro animation once the step has played
  const fadeUp = (delay: number) => ({
    initial: hasAnimated ? false as const : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: hasAnimated ? 0 : delay },
  })

  // Reusable step header component - only animates on first render of step
  // Uses `hasAnimated` from closure to skip intro animation on re-renders
  const StepHeader = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
    <div className="text-center space-y-4">
      <motion.div
        className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#0fbcb0] text-white mb-2 shadow-2xl"
        initial={hasAnimated ? false : { scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        {icon}
      </motion.div>
      <motion.h1
        className="text-3xl md:text-4xl font-bold text-[#222] tracking-tight text-balance"
        initial={hasAnimated ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: hasAnimated ? 0 : 0.1 }}
      >
        {title}
      </motion.h1>
      <motion.p
        className="text-[#222]/70 text-lg"
        initial={hasAnimated ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: hasAnimated ? 0 : 0.2 }}
      >
        {subtitle}
      </motion.p>
    </div>
  )

  // Reusable continue button - uses `hasAnimated` from closure
  const ContinueButton = ({ onClick, disabled, delay = 0.5, label = "Continue" }: { onClick: () => void; disabled: boolean; delay?: number; label?: string }) => (
    <motion.div initial={hasAnimated ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: hasAnimated ? 0 : delay }}>
      <Button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full h-14 text-lg font-semibold rounded-2xl shadow-lg bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0 hover:shadow-xl transition-all"
        size="lg"
      >
        {label}
      </Button>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-[#ffffff] flex flex-col relative overflow-hidden">
      {/* Header with progress */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleStepBack}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-0"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-[#F8F1E7] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#0fbcb0] hover:bg-[#0da399] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <span className="text-sm font-medium text-[#222]/70">{progressPercent}%</span>
          </div>

          <div className="w-16" />
        </div>
      </header>

      {/* Floating background orb */}
      <motion.div
        className="fixed -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none blur-[100px] hidden md:block"
        style={{
          background: "radial-gradient(circle, rgba(15, 188, 176, 0.3) 0%, transparent 70%)"
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 10, 0],
        }}
        transition={{
          duration: 15,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 md:py-12">
          {/* Match failure inline card */}
          {matchFailed && (
            <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <h2 className="text-lg font-semibold text-[#222]">We couldn&apos;t find your matches</h2>
              <p className="text-sm text-[#222]/70">{matchFailed}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleMatchRetry}
                  disabled={isSubmitting}
                  className="bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0"
                >
                  {isSubmitting ? "Retrying..." : "Try again"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMatchFailed(null)
                    setMatchRetryLeadId(null)
                    setStep(1)
                  }}
                >
                  Start over
                </Button>
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (step === 8) handleSubmit()
            }}
          >
            <AnimatePresence mode="wait" custom={direction}>

              {/* ============================================ */}
              {/* Q1: TREATMENT SELECTION (Both flows)         */}
              {/* ============================================ */}
              {step === 1 && (
                <motion.div key="step1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-8">
                  <StepHeader
                    icon={<Smile className="w-10 h-10" />}
                    title="What are you looking for help with?"
                    subtitle="Select all that apply. You do not need to be certain."
                  />

                  <div className="grid grid-cols-1 gap-3">
                    {TREATMENT_OPTIONS.filter((t) => t !== EMERGENCY_TREATMENT).map((treatment, index) => (
                      <motion.div key={treatment} {...fadeUp(0.05 * index + 0.3)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={formData.treatments.includes(treatment)}
                            onClick={() => handleTreatmentToggle(treatment)}
                            hasCheckbox
                            disabled={isEmergency}
                          >
                            {treatment}
                          </OptionCard>
                        </motion.div>
                      </motion.div>
                    ))}

                    {/* Emergency option - visually separated */}
                    <motion.div {...fadeUp(0.05 * TREATMENT_OPTIONS.length + 0.3)}>
                      <div className="pt-2 border-t border-border/50 mt-2">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={isEmergency}
                            onClick={() => handleTreatmentToggle(EMERGENCY_TREATMENT)}
                          >
                            <div className="flex items-center gap-3">
                              <Zap className="w-5 h-5 text-amber-500 flex-shrink-0" />
                              <span>{EMERGENCY_TREATMENT}</span>
                            </div>
                          </OptionCard>
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>

                  <ContinueButton onClick={() => handleStepForward(1, 2)} disabled={!canContinueStep1} />
                </motion.div>
              )}

              {/* ============================================ */}
              {/* Q2: POSTCODE (Both flows)                    */}
              {/* ============================================ */}
              {step === 2 && (
                <motion.div key="step2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-8">
                  <StepHeader
                    icon={<MapPin className="w-10 h-10" />}
                    title="What is your postcode?"
                    subtitle="We will find clinics near you."
                  />

                  <motion.div {...fadeUp(0.3)}>
                    <PostcodeInput
                      value={formData.postcode}
                      onChange={(value) => setFormData({ ...formData, postcode: value })}
                      onValidChange={(isValid) => setFormData({ ...formData, postcodeValid: isValid })}
                      onOutsideLondon={(area) => {
                        setOutsideLondonArea(area)
                        trackEvent("postcode_outside_london", { meta: { area, postcode: formData.postcode } })
                      }}
                    />
                  </motion.div>

                  <ContinueButton onClick={() => handleStepForward(2, 2.5)} disabled={!canContinueStep2} delay={0.4} />
                </motion.div>
              )}

              {/* ============================================ */}
              {/* Q2.5 PLANNING: TRAVEL DISTANCE               */}
              {/* Q2.5 EMERGENCY: HOW SOON DO YOU NEED TO BE SEEN? */}
              {/* ============================================ */}
              {step === 2.5 && !isEmergency && (
                <motion.div key="step2.5-planning" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-8">
                  <StepHeader
                    icon={<MapPin className="w-10 h-10" />}
                    title="How far are you willing to travel?"
                    subtitle="This helps us balance convenience with finding the right clinic."
                  />

                  <div className="grid grid-cols-1 gap-3">
                    {LOCATION_PREFERENCE_OPTIONS.map((option, index) => (
                      <motion.div key={option.value} {...fadeUp(0.15 * index + 0.3)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={formData.location_preference === option.value}
                            onClick={() => handleSingleSelect("location_preference", option.value, getNextStep(2.5))}
                            hint={option.hint}
                          >
                            {option.label}
                          </OptionCard>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 2.5 && isEmergency && (
                <motion.div key="step2.5-emergency" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-8">
                  <StepHeader
                    icon={<Zap className="w-10 h-10" />}
                    title="How soon do you need to be seen?"
                    subtitle="We will prioritise clinics with the right availability."
                  />

                  <div className="grid grid-cols-1 gap-3">
                    {URGENCY_OPTIONS.map((option, index) => (
                      <motion.div key={option.value} {...fadeUp(0.15 * index + 0.3)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={formData.urgency === option.value}
                            onClick={() => handleSingleSelect("urgency", option.value, getNextStep(2.5))}
                          >
                            {option.label}
                          </OptionCard>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ============================================ */}
              {/* Q3: CLINIC PRIORITIES (Planning only, up to 2) */}
              {/* ============================================ */}
              {step === 3 && !isEmergency && (
                <motion.div key="step3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-8">
                  <StepHeader
                    icon={<Heart className="w-10 h-10" />}
                    title="When choosing a clinic, what would you prioritise most?"
                    subtitle="Pick up to 2."
                  />

                  <div className="grid grid-cols-1 gap-3">
                    {DECISION_VALUE_OPTIONS.map((option, index) => {
                      const isSelected = formData.decisionValues.includes(option)
                      const isDisabled = !isSelected && formData.decisionValues.length >= 2
                      return (
                        <motion.div key={option} {...fadeUp(0.05 * index + 0.3)}>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <OptionCard
                              selected={isSelected}
                              onClick={() => handleDecisionValueToggle(option)}
                              disabled={isDisabled}
                              hasCheckbox
                            >
                              {option}
                            </OptionCard>
                          </motion.div>
                        </motion.div>
                      )
                    })}
                  </div>

                  <ContinueButton onClick={() => handleStepForward(3, getNextStep(3))} disabled={!canContinueStep3} />
                </motion.div>
              )}

              {/* ============================================ */}
              {/* Q3.5 / Q4E: DENTAL ANXIETY (Both flows)     */}
              {/* ============================================ */}
              {step === 3.5 && (
                <motion.div key="step3.5" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-8">
                  <StepHeader
                    icon={<Shield className="w-10 h-10" />}
                    title="How do you feel about dental visits?"
                    subtitle="We will match you with clinics experienced with patients like you."
                  />

                  <div className="grid grid-cols-1 gap-3">
                    {ANXIETY_LEVEL_OPTIONS.map((option, index) => (
                      <motion.div key={option.value} {...fadeUp(0.15 * index + 0.3)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={formData.anxiety_level === option.value}
                            onClick={() => handleSingleSelect("anxiety_level", option.value, getNextStep(3.5))}
                          >
                            {option.label}
                          </OptionCard>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ============================================ */}
              {/* Q5: CONCERNS (Planning only, multi max 2)    */}
              {/* ============================================ */}
              {step === 5 && !isEmergency && (
                <motion.div key="step5" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-8">
                  <StepHeader
                    icon={<AlertCircle className="w-10 h-10" />}
                    title="Is there anything you're unsure or concerned about right now?"
                    subtitle="Select up to 2."
                  />

                  <div className="grid grid-cols-1 gap-3">
                    {BLOCKER_OPTIONS.map((option, index) => {
                      const isSelected = formData.conversionBlockerCodes.includes(option.code)
                      const isNoConcernSelected = formData.conversionBlockerCodes.includes("NO_CONCERN")
                      const isDisabled = !isSelected && option.code !== "NO_CONCERN" && (
                        isNoConcernSelected || formData.conversionBlockerCodes.length >= 2
                      )
                      return (
                        <motion.div key={option.code} {...fadeUp(0.1 * index + 0.3)}>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <OptionCard
                              selected={isSelected}
                              onClick={() => handleBlockerToggle(option.code)}
                              disabled={isDisabled}
                              hasCheckbox
                            >
                              {option.label}
                            </OptionCard>
                          </motion.div>
                        </motion.div>
                      )
                    })}
                  </div>

                  <ContinueButton onClick={() => handleStepForward(5, getNextStep(5))} disabled={!canContinueStep5} />
                </motion.div>
              )}

              {/* ============================================ */}
              {/* Q5.5 / Q5E: BEST TIME (Both flows)          */}
              {/* ============================================ */}
              {step === 5.5 && (
                <motion.div key="step5.5" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-8">
                  <StepHeader
                    icon={<Sun className="w-10 h-10" />}
                    title="When works best for you?"
                    subtitle="Choose all the times that suit you."
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PREFERRED_TIME_OPTIONS.map((option, index) => (
                      <motion.div key={option.value} {...fadeUp(0.15 * index + 0.3)}>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            const current = formData.preferred_times
                            const updated = current.includes(option.value)
                              ? current.filter((t) => t !== option.value)
                              : [...current, option.value]
                            setFormData({ ...formData, preferred_times: updated })
                          }}
                          className={`
                            w-full p-5 rounded-2xl border-2 transition-all duration-200 text-center
                            ${
                              formData.preferred_times.includes(option.value)
                                ? "border-[#0fbcb0] bg-[#F8F1E7] ring-1 ring-[#0fbcb0]/20"
                                : "border-border bg-card hover:border-[#0fbcb0]/50 hover:bg-[#F8F1E7]/50"
                            }
                          `}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.preferred_times.includes(option.value) ? "bg-[#0fbcb0] text-white" : "bg-[#F8F1E7] text-[#0fbcb0]"}`}>
                              {option.value === "weekend" ? <Calendar className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                            </div>
                            <span className="font-semibold text-[#222]">{option.label}</span>
                            <span className="text-sm text-[#222]/60">{option.time}</span>
                          </div>
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>

                  <ContinueButton onClick={() => handleStepForward(5.5, getNextStep(5.5))} disabled={!canContinueStep5_5} />
                </motion.div>
              )}

              {/* ============================================ */}
              {/* Q6: WHEN TO START (Planning only)            */}
              {/* ============================================ */}
              {step === 6 && !isEmergency && (
                <motion.div key="step6" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-8">
                  <StepHeader
                    icon={<Calendar className="w-10 h-10" />}
                    title="When are you looking to start?"
                    subtitle="This helps us find clinics with the right availability."
                  />

                  <div className="grid grid-cols-1 gap-3">
                    {TIMING_OPTIONS.map((option, index) => (
                      <motion.div key={option.value} {...fadeUp(0.15 * index + 0.3)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={formData.readiness === option.value}
                            onClick={() => handleSingleSelect("readiness", option.value, getNextStep(6))}
                          >
                            {option.label}
                          </OptionCard>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ============================================ */}
              {/* Q7: COST / DECISION MINDSET (Planning only)  */}
              {/* ============================================ */}
              {step === 7 && !isEmergency && (
                <motion.div key="step7" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-8">
                  <StepHeader
                    icon={<CreditCard className="w-10 h-10" />}
                    title="How do you usually think about investing in dental treatment?"
                    subtitle="This helps us match you with clinics that fit your approach."
                  />

                  <div className="grid grid-cols-1 gap-3">
                    {COST_APPROACH_OPTIONS.map((option, index) => (
                      <motion.div key={option.value} {...fadeUp(0.15 * index + 0.3)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={formData.costApproach === option.value}
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, costApproach: option.value }))
                              // Conditional next step based on selection
                              if (option.value === "comfort_range") {
                                setTimeout(() => handleStepForward(7, 7.5), 300)
                              } else if (option.value === "strict_budget") {
                                setTimeout(() => handleStepForward(7, 7.6), 300)
                              } else {
                                setTimeout(() => handleStepForward(7, 8), 300)
                              }
                            }}
                          >
                            {option.label}
                          </OptionCard>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ============================================ */}
              {/* Q7.5 (Q9A): MONTHLY PAYMENTS (Planning only) */}
              {/* Shown only if Q7 = comfort_range             */}
              {/* ============================================ */}
              {step === 7.5 && formData.costApproach === "comfort_range" && (
                <motion.div key="step7.5" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-8">
                  <StepHeader
                    icon={<CreditCard className="w-10 h-10" />}
                    title="Would spreading the cost into monthly payments make treatment easier for you?"
                    subtitle="This is informational only — it won't affect your matches."
                  />

                  <div className="grid grid-cols-1 gap-3">
                    {MONTHLY_PAYMENT_OPTIONS.map((option, index) => (
                      <motion.div key={option.value} {...fadeUp(0.15 * index + 0.3)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={formData.monthlyPaymentRange === option.value}
                            onClick={() => handleSingleSelect("monthlyPaymentRange", option.value, 8)}
                          >
                            {option.label}
                          </OptionCard>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ============================================ */}
              {/* Q7.6 (Q9B): BUDGET HANDLING (Planning only)  */}
              {/* Shown only if Q7 = strict_budget             */}
              {/* ============================================ */}
              {step === 7.6 && formData.costApproach === "strict_budget" && (
                <motion.div key="step7.6" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-8">
                  <StepHeader
                    icon={<CreditCard className="w-10 h-10" />}
                    title="How would you prefer to handle costs with the clinic?"
                    subtitle="This is informational only — it won't affect your matches."
                  />

                  <div className="grid grid-cols-1 gap-3">
                    <motion.div {...fadeUp(0.3)}>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <OptionCard
                          selected={formData.strictBudgetMode === "discuss_with_clinic"}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, strictBudgetMode: "discuss_with_clinic", strictBudgetAmount: "" }))
                            setTimeout(() => handleStepForward(7.6, 8), 300)
                          }}
                        >
                          I'd prefer to discuss costs directly with the clinic
                        </OptionCard>
                      </motion.div>
                    </motion.div>

                    <motion.div {...fadeUp(0.45)}>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <OptionCard
                          selected={formData.strictBudgetMode === "share_range"}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, strictBudgetMode: "share_range" }))
                          }}
                        >
                          I can share a rough budget range
                        </OptionCard>
                      </motion.div>
                    </motion.div>

                    {/* Optional budget input — shown when "share_range" is selected */}
                    {formData.strictBudgetMode === "share_range" && (
                      <motion.div
                        {...fadeUp(0.1)}
                        className="p-5 md:p-6 rounded-2xl border-2 border-[#0fbcb0] bg-[#F8F1E7]"
                      >
                        <Label className="text-lg font-medium text-foreground">Enter your approximate budget or range (optional)</Label>
                        <div className="relative mt-3">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">£</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g. 3,000"
                            value={formData.strictBudgetAmount}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d,]/g, "")
                              setFormData((prev) => ({ ...prev, strictBudgetAmount: value }))
                            }}
                            className="pl-8 h-14 text-lg rounded-xl"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <ContinueButton
                    onClick={() => handleStepForward(7.6, 8)}
                    disabled={!formData.strictBudgetMode}
                    delay={0.6}
                  />
                </motion.div>
              )}

              {/* ============================================ */}
              {/* Q8: CONTACT DETAILS (Both flows)             */}
              {/* ============================================ */}
              {step === 8 && (
                <motion.div key="step8" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-8">
                  <StepHeader
                    icon={<Mail className="w-10 h-10" />}
                    title="Almost there! How can clinics reach you?"
                    subtitle="Your details are only shared with clinics you choose to contact."
                  />

                  <motion.div className="space-y-5" {...fadeUp(0.3)}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                          First name
                        </Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="mt-2 h-14 text-lg rounded-xl"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                          Last name
                        </Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="mt-2 h-14 text-lg rounded-xl"
                          placeholder="Smith"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-foreground">
                        Email address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-2 h-14 text-lg rounded-xl"
                        placeholder="john@example.com"
                      />
                      {formData.email && !EMAIL_REGEX.test(formData.email.trim()) && (
                        <p className="text-sm text-red-500 mt-1">Please enter a valid email address</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                        Phone number <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="mt-2 h-14 text-lg rounded-xl"
                        placeholder="07123 456789"
                      />
                    </div>

                    <div className="pt-4 space-y-4">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <Checkbox
                          id="consent"
                          checked={formData.consentContact}
                          onCheckedChange={(checked) => setFormData({ ...formData, consentContact: checked === true })}
                          className="mt-0.5"
                        />
                        <span className="text-sm text-foreground leading-relaxed">
                          I agree to be contacted by matched clinics about my enquiry and accept the{" "}
                          <a href="/terms" className="text-[#3c8481] underline hover:text-[#0fbcb0]">
                            Terms
                          </a>{" "}
                          and{" "}
                          <a href="/privacy" className="text-[#3c8481] underline hover:text-[#0fbcb0]">
                            Privacy Policy
                          </a>
                          .
                        </span>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer group">
                        <Checkbox
                          id="marketing"
                          checked={formData.consentMarketing}
                          onCheckedChange={(checked) => setFormData({ ...formData, consentMarketing: checked === true })}
                          className="mt-0.5"
                        />
                        <span className="text-sm text-muted-foreground leading-relaxed">
                          Send me helpful dental care tips and offers (optional).
                        </span>
                      </label>
                    </div>
                  </motion.div>


                  <motion.div {...fadeUp(0.55)}>
                    <Button
                      type="submit"
                      disabled={!canContinueStep8 || isSubmitting}
                      className="w-full h-14 text-lg font-semibold rounded-2xl shadow-lg bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0 hover:shadow-xl transition-all"
                      size="lg"
                    >
                      {isSubmitting ? "Finding your matches..." : "Get my clinic matches"}
                    </Button>
                  </motion.div>

                  {/* Trust indicators */}
                  <motion.div
                    className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 text-sm text-[#222]/50"
                    initial={hasAnimated ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: hasAnimated ? 0 : 0.7 }}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>Data protected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Free service</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>No spam</span>
                    </div>
                  </motion.div>
                </motion.div>
              )}

            </AnimatePresence>
          </form>
        </div>
      </main>

      {/* Outside London hard-block dialog with waitlist */}
      <AlertDialog open={outsideLondonArea !== null} onOpenChange={(open) => { if (!open) { setOutsideLondonArea(null); setWaitlistDone(false) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>We&apos;re not in your area yet</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-base leading-relaxed space-y-4">
                <p>
                  We&apos;re currently serving patients in <span className="font-semibold text-foreground">{SUPPORTED_REGION}</span> only.
                  {outsideLondonArea && (
                    <> It looks like you&apos;re in <span className="font-semibold text-foreground">{outsideLondonArea}</span>.</>
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
                        value={waitlistEmail || formData.email}
                        onChange={(e) => setWaitlistEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        disabled={!(waitlistEmail || formData.email).includes("@") || waitlistSubmitting}
                        className="bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0"
                        onClick={async () => {
                          setWaitlistSubmitting(true)
                          try {
                            await fetch("/api/waitlist", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                email: waitlistEmail || formData.email,
                                postcode: formData.postcode,
                                area: outsideLondonArea || "outside_london",
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
                    Thanks! We&apos;ll let you know when we expand to your area.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0">
              {waitlistDone ? "Done" : "Got it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
