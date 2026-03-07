"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
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
import { pushToDataLayer } from "@/lib/gtm"
import { identifyForTikTok, trackTikTokEvent } from "@/lib/tiktok-pixel"
import { generateTikTokEventId } from "@/lib/tiktok-event-id"
import { slideVariants, slideTransition } from "@/lib/slide-variants"
import { ChevronLeft, Shield, Clock, CheckCircle2, MapPin, Calendar, Smile, Heart, AlertCircle, Sun, Moon, CreditCard, Mail, Zap, Info, ChevronRight, X, MessageCircle } from "lucide-react"
import {
  FORM_VERSION,
  SCHEMA_VERSION,
  TREATMENT_OPTIONS,
  EMERGENCY_TREATMENT,
  TREATMENT_CATEGORIES,
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
  COMFORT_PREFERENCE_OPTIONS,
  SOCIAL_PROOF_MESSAGES,
  SUPPORTED_REGION,
} from "@/lib/intake-form-config"
import type { TreatmentCategory, TreatmentInfo } from "@/lib/intake-form-config"

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

  // Auth state: detect if user is already logged in (e.g. returning after a previous intake OTP)
  const [authUser, setAuthUser] = useState<{ email: string; firstName: string; lastName: string } | null>(null)
  const [continueAsSomeoneElse, setContinueAsSomeoneElse] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email && user.user_metadata?.role === "patient") {
        setAuthUser({
          email: user.email,
          firstName: user.user_metadata?.first_name || "",
          lastName: user.user_metadata?.last_name || "",
        })
      }
    })
  }, [])

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
    comfortPreferences: [] as string[],
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

  // Social proof notification state
  const [showSocialProof, setShowSocialProof] = useState(false)
  const [socialProofMessage, setSocialProofMessage] = useState("")

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // Treatment category tabs + info popup state
  const [activeCategory, setActiveCategory] = useState<TreatmentCategory>("general")
  const [treatmentInfoPopup, setTreatmentInfoPopup] = useState<TreatmentInfo | null>(null)

  // Pre-select treatment from URL param (?treatment=) and skip step 1
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const treatmentParam = params.get("treatment")
      if (!treatmentParam) return

      // Match the param against valid treatment options
      const matched = TREATMENT_OPTIONS.find(
        (t) => t.toLowerCase() === treatmentParam.toLowerCase()
      )
      if (!matched) return

      // Check if there's also a pre-filled postcode
      const postcodeParam = params.get("postcode")

      setFormData((prev) => ({
        ...prev,
        treatments: matched === EMERGENCY_TREATMENT ? [EMERGENCY_TREATMENT] : [matched],
        ...(postcodeParam ? { postcode: postcodeParam.toUpperCase() } : {}),
      }))

      // Treatment is pre-selected but form still starts at step 1 (postcode)
      // Treatment will be pre-filled when they reach step 8
    } catch {}
  }, [])

  // Restore form data from localStorage on mount (only if no URL treatment param)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get("treatment")) return // URL param takes priority

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

  // Pre-fill postcode from URL query param (e.g. from /find landing pages)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const postcodeParam = params.get("postcode")
      if (postcodeParam) {
        const sanitized = postcodeParam.replace(/\s/g, "").toUpperCase()
        setFormData(prev => ({ ...prev, postcode: sanitized, postcodeValid: true }))
        return
      }
      // Fallback: check localStorage for postcode saved from landing pages
      const stored = localStorage.getItem("pearlie_postcode")
      if (stored) {
        setFormData(prev => ({ ...prev, postcode: stored, postcodeValid: true }))
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

  // Derived: is the user on the emergency flow? (detected at treatment step)
  const isEmergency = formData.treatments.includes(EMERGENCY_TREATMENT)

  // Is the patient anxious? (determines if step 6 is shown)
  const isAnxious = formData.anxiety_level === "quite_anxious" || formData.anxiety_level === "very_anxious"

  // Is treatment a checkup?
  const isCheckup = formData.treatments.includes("Check up and/or hygiene clean") || formData.treatments.includes("Check-ups")

  // Dynamic step order based on flow
  // ORDER: 1(postcode) -> 3(travel) -> 2(email) -> 4(priorities) -> 5(anxiety) -> 8(treatment) -> 6(comfort, conditional) -> 7(concerns, skip if checkup) -> 9(timing+avail) -> 10(budget) -> 11(contact)
  // Emergency: skip 9 & 10 -> go to 11
  const stepOrder = useMemo(() => {
    const order: number[] = [1, 3, 2, 4, 5]
    if (isAnxious) {
      order.push(6)
    }
    order.push(8)
    if (!isCheckup && !isEmergency) {
      order.push(7)
    }
    if (!isEmergency) {
      order.push(9, 10)
      if (formData.costApproach === "comfort_range") {
        order.push(10.5)
      } else if (formData.costApproach === "strict_budget") {
        order.push(10.6)
      }
    }
    order.push(11)
    return order
  }, [isAnxious, isEmergency, isCheckup, formData.costApproach])

  const currentStepIndex = stepOrder.indexOf(step)
  const totalSteps = stepOrder.length
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100)

  // Validation checks
  const canContinueStep1 = formData.postcode !== "" && formData.postcodeValid
  const isEmailValid = EMAIL_REGEX.test(formData.email.trim())
  const canContinueStep2 = formData.email !== "" && isEmailValid
  const canContinueStep4 = formData.decisionValues.length > 0
  const canContinueStep7 = formData.conversionBlockerCodes.length > 0
  const canContinueStep8 = formData.treatments.length > 0
  const canContinueStep9 = formData.readiness !== "" && formData.preferred_times.length > 0
  const canContinueStep11 =
    formData.firstName && formData.consentContact

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
      // "Just find me someone great" is exclusive
      if (value === "Just find me someone great") {
        if (prev.decisionValues.includes(value)) {
          return { ...prev, decisionValues: [] }
        }
        return { ...prev, decisionValues: [value] }
      }
      // Selecting a real value removes "Just find me someone great"
      const withoutGreat = prev.decisionValues.filter((v) => v !== "Just find me someone great")
      const isSelected = withoutGreat.includes(value)
      if (isSelected) {
        return { ...prev, decisionValues: withoutGreat.filter((v) => v !== value) }
      }
      if (withoutGreat.length >= 2) return prev
      return { ...prev, decisionValues: [...withoutGreat, value] }
    })
  }

  const handleBlockerToggle = (code: string) => {
    setFormData((prev) => {
      // "Nothing in particular" is exclusive — toggle off if already selected
      if (code === "NO_CONCERN") {
        if (prev.conversionBlockerCodes.includes("NO_CONCERN")) {
          return { ...prev, conversionBlockerCodes: [] }
        }
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

  // Comfort preference toggle (multi-select, no max)
  const handleComfortToggle = (value: string) => {
    setFormData((prev) => {
      const isSelected = prev.comfortPreferences.includes(value)
      if (isSelected) {
        return { ...prev, comfortPreferences: prev.comfortPreferences.filter((v) => v !== value) }
      }
      return { ...prev, comfortPreferences: [...prev.comfortPreferences, value] }
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
      if (step < 11) {
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
      // URL treatment param takes priority over draft restoration
      const params = new URLSearchParams(window.location.search)
      if (params.get("treatment")) return

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
    const names: Record<number, string> = {
      1: "Postcode",
      2: "Email Capture",
      3: "Travel Distance",
      4: "Clinic Priorities",
      5: "Dental Anxiety",
      6: "Comfort Preferences",
      7: "Concerns",
      8: "Treatment Selection",
      9: "Timing & Availability",
      10: "Budget Mindset",
      10.5: "Monthly Payments",
      10.6: "Budget Handling",
      11: "Contact Details",
    }
    return names[stepNum] || "Unknown"
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
    const currentValue = (formData as Record<string, unknown>)[field]
    if (currentValue === value) {
      // Deselect — toggle off
      setFormData((prev) => ({ ...prev, [field]: "" }))
      return
    }
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
        comfort_preferences: formData.comfortPreferences.length > 0 ? formData.comfortPreferences : null,
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
      pushToDataLayer("lead_submit")

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
        group relative w-full px-4 py-2.5 sm:px-5 sm:py-3 rounded-full border-2 text-left ${className}
        transition-all duration-200 ease-out
        ${selected
          ? "border-[#0fbcb0] bg-[#d4edea] shadow-md"
          : disabled
            ? "border-transparent bg-[#eaf6f4]/50 opacity-50 cursor-not-allowed"
            : "border-transparent bg-[#eaf6f4] hover:bg-[#dff2ef] hover:shadow-md active:scale-[0.98]"
        }
      `}
    >
      <div className="flex items-center gap-3">
        {hasCheckbox && (
          <div
            className={`
              w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0
              transition-all duration-200
              ${selected ? "border-[#0fbcb0] bg-[#0fbcb0]" : "border-[#a8d5cf] group-hover:border-[#0fbcb0]/50"}
            `}
          >
            {selected && (
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}
        <div className="flex-1">
          <span className="text-base font-normal block text-[#2d2d2d]">
            {children}
          </span>
          {hint && (
            <span className={`text-xs mt-0.5 block ${selected ? "text-[#0fbcb0]" : "text-[#2d2d2d]/50"}`}>
              {hint}
            </span>
          )}
        </div>
        {!hasCheckbox && (
          <div
            className={`
              w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
              transition-all duration-200
              ${selected ? "border-[#0fbcb0] bg-[#0fbcb0]" : "border-[#a8d5cf] group-hover:border-[#0fbcb0]/50"}
            `}
          >
            {selected && <div className="w-2 h-2 rounded-full bg-white" />}
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
  const StepHeader = ({ icon: _icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => (
    <div className="text-center space-y-3">
      <motion.h1
        className="text-2xl md:text-3xl font-semibold text-[#2d2d2d] tracking-tight text-balance"
        initial={hasAnimated ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: hasAnimated ? 0 : 0.1 }}
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          className="text-[#2d2d2d]/60 text-base"
          initial={hasAnimated ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: hasAnimated ? 0 : 0.2 }}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  )

  // CTA labels per step
  const getCtaLabel = (stepNum: number) => {
    const labels: Record<number, string> = {
      1: "Continue \u2192",
      2: "Save & continue \u2192",
      3: "Continue \u2192",
      4: "Continue \u2192",
      5: "Keep going \u2192",
      6: "Keep going \u2192",
      7: "Keep going \u2192",
      8: "Almost there \u2192",
      9: "Almost there \u2192",
      10: "One more \u2192",
      11: "See my matches \u2192",
    }
    return labels[stepNum] || "Continue \u2192"
  }

  // Reusable continue button - uses `hasAnimated` from closure
  const ContinueButton = ({ onClick, disabled, delay = 0.5, label }: { onClick: () => void; disabled: boolean; delay?: number; label?: string }) => (
    <motion.div initial={hasAnimated ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: hasAnimated ? 0 : delay }}>
      <Button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full h-11 text-base font-semibold rounded-full shadow-lg bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0 hover:shadow-xl transition-all"
        size="lg"
      >
        {label || getCtaLabel(step)}
      </Button>
    </motion.div>
  )

  // WhatsApp bar component
  const WhatsAppBar = () => (
    <div className="bg-[#e8faf8] text-center py-1.5 px-4">
      <a
        href="https://wa.me/447000000000"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-[#0d3d3a] hover:text-[#0fbcb0] transition-colors inline-flex items-center gap-1.5"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Prefer to talk? Chat with us on WhatsApp
      </a>
    </div>
  )

  // Social proof effect for step 4
  useEffect(() => {
    if (step === 4) {
      const msg = SOCIAL_PROOF_MESSAGES[Math.floor(Math.random() * SOCIAL_PROOF_MESSAGES.length)]
      setSocialProofMessage(msg)
      const showTimer = setTimeout(() => setShowSocialProof(true), 1500)
      const hideTimer = setTimeout(() => setShowSocialProof(false), 5500)
      return () => { clearTimeout(showTimer); clearTimeout(hideTimer) }
    } else {
      setShowSocialProof(false)
    }
  }, [step])

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      {/* Top bar — Pearlie logo */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-full bg-[#0fbcb0] p-1.5">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-heading font-bold tracking-tight text-[#0fbcb0]">Pearlie</span>
          </Link>
          <button
            type="button"
            onClick={handleStepBack}
            disabled={currentStepIndex === 0}
            className="flex items-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-0"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Previous</span>
          </button>
        </div>
      </div>

      {/* WhatsApp bar */}
      <WhatsAppBar />

      {/* Headline banner — tagline + progress on dark teal bg with shadow */}
      <div className="bg-[#0d3d3a] text-center pt-2 pb-4 px-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)] relative z-10">
        <h2 className="text-2xl md:text-3xl font-heading font-medium text-[#faf5ef] leading-tight">
          Find the best dentist{" "}
          <span className="text-[#0fbcb0] font-bold whitespace-nowrap">for you.</span>
        </h2>
        <div className="flex items-center justify-center gap-2 mt-2.5">
          <span className="text-xs font-medium text-[#faf5ef]/50">Step {currentStepIndex + 1} of {totalSteps}</span>
          <div className="w-28 h-1.5 bg-[#faf5ef]/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#0fbcb0] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 md:py-5">
          {/* Match failure inline card */}
          {matchFailed && (
            <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <h2 className="text-lg font-semibold text-[#2d2d2d]">We couldn&apos;t find your matches</h2>
              <p className="text-sm text-[#2d2d2d]/60">{matchFailed}</p>
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
              if (step === 11) handleSubmit()
            }}
          >
            <AnimatePresence mode="wait" custom={direction}>

              {/* ============================================ */}
              {/* STEP 1: POSTCODE (was Q2)                    */}
              {/* ============================================ */}
              {step === 1 && (
                <motion.div key="step1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-5">
                  <StepHeader
                    icon={<MapPin className="w-10 h-10" />}
                    title="Where are you based?"
                    subtitle=""
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
                      inputClassName="bg-[#eaf6f4] border-[#a8d5cf] text-[#2d2d2d] placeholder:text-[#2d2d2d]/40"
                    />
                  </motion.div>

                  <ContinueButton onClick={() => handleStepForward(1, getNextStep(1))} disabled={!canContinueStep1} delay={0.4} />

                  <motion.p {...fadeUp(0.5)} className="text-sm text-[#2d2d2d]/60 text-center leading-relaxed">
                    We&apos;ll find clinics near you.
                  </motion.p>

                  {/* FAQ / Trust section below the fold */}
                  <motion.div {...fadeUp(0.6)} className="pt-6 space-y-6">
                    <div className="border-t border-gray-200" />

                    {/* About Pearlie */}
                    <div className="bg-gray-50 rounded-2xl p-5">
                      <h3 className="text-base font-semibold text-[#2d2d2d] mb-2">About Pearlie</h3>
                      <p className="text-sm text-[#2d2d2d]/70 leading-relaxed">
                        Pearlie is a curated network of best dentists. Find one perfect for you and book online instantly. Free for patients, always.
                      </p>
                    </div>

                    <div className="border-t border-gray-200" />

                    {/* Common Questions accordion */}
                    <div>
                      <h3 className="text-base font-semibold text-[#2d2d2d] mb-3">Common Questions</h3>
                      <div className="space-y-0">
                        {[
                          { q: "What is Pearlie?", a: "Pearlie is a curated network of top-rated dental clinics. We match you with the right dentist based on your specific needs, preferences, and how you feel about dental visits — so you can book with confidence. It's completely free for patients." },
                          { q: "How does the matching work?", a: "We ask you a short set of questions about what matters most to you — things like your comfort level, priorities in a dentist, budget, and location. Our algorithm then scores and ranks clinics based on how well they match your answers, not just who's closest. You'll receive personalised recommendations with clear reasons why each clinic is a good fit for you." },
                          { q: "Is it free for patients?", a: "Yes, 100% free. Pearlie is funded by the clinics in our network — they pay a small fee when they successfully connect with a new patient. You will never be charged anything for using Pearlie, browsing your matches, or booking an appointment." },
                          { q: "How quickly will I hear back from a clinic?", a: "Most matched clinics respond within 24–48 hours. If you indicate that you're in pain or need urgent care, we flag your enquiry as a priority so clinics can get back to you even faster. You'll receive updates by email so you never miss a response." },
                          { q: "Will my details be shared without my permission?", a: "No, never. Your personal details are only shared with clinics that you actively choose to contact. We don't sell your data or share it with third parties. You're always in control of who sees your information." },
                        ].map((faq, idx) => (
                          <div key={idx} className="border-b border-gray-100 last:border-b-0">
                            <button
                              type="button"
                              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                              className="w-full flex items-center justify-between py-3 text-left text-sm text-[#2d2d2d] hover:text-[#0fbcb0] transition-colors"
                            >
                              <span>{faq.q}</span>
                              <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${openFaq === idx ? "rotate-90" : ""}`} />
                            </button>
                            {openFaq === idx && (
                              <p className="text-sm text-[#2d2d2d]/60 pb-3 leading-relaxed">{faq.a}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                  </motion.div>
                </motion.div>
              )}

              {/* ============================================ */}
              {/* STEP 2: EMAIL CAPTURE (NEW)                  */}
              {/* ============================================ */}
              {step === 2 && (
                <motion.div key="step2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-5">
                  <StepHeader
                    icon={<Mail className="w-10 h-10" />}
                    title="Where should we send your results?"
                    subtitle="We'll save your progress so you can continue any time."
                  />

                  <motion.div {...fadeUp(0.3)} className="space-y-2">
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-12 text-base rounded-xl bg-[#eaf6f4] border-[#a8d5cf] text-[#2d2d2d] placeholder:text-[#2d2d2d]/40"
                      placeholder="your@email.com"
                    />
                    {formData.email && !isEmailValid && (
                      <p className="text-sm text-red-500">Please enter a valid email address</p>
                    )}
                    <p className="text-xs text-[#2d2d2d]/40">No spam, ever.</p>
                  </motion.div>

                  <ContinueButton onClick={() => handleStepForward(2, getNextStep(2))} disabled={!canContinueStep2} delay={0.4} />
                </motion.div>
              )}

              {/* ============================================ */}
              {/* STEP 3: TRAVEL DISTANCE (time-based)         */}
              {/* ============================================ */}
              {step === 3 && (
                <motion.div key="step3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-5">
                  <StepHeader
                    icon={<MapPin className="w-10 h-10" />}
                    title="How long are you happy to travel?"
                  />

                  <div className="grid grid-cols-1 gap-2.5">
                    {LOCATION_PREFERENCE_OPTIONS.map((option, index) => (
                      <motion.div key={option.value} {...fadeUp(0.15 * index + 0.3)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={formData.location_preference === option.value}
                            onClick={() => handleSingleSelect("location_preference", option.value, getNextStep(3))}
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

              {/* ============================================ */}
              {/* STEP 4: PRIORITIES (pick up to 2)            */}
              {/* ============================================ */}
              {step === 4 && (
                <motion.div key="step4" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-5">
                  <StepHeader
                    icon={<Heart className="w-10 h-10" />}
                    title="What matters most to you in a dentist?"
                    subtitle=""
                  />

                  <div className="grid grid-cols-1 gap-2.5">
                    {DECISION_VALUE_OPTIONS.map((option, index) => {
                      const isSelected = formData.decisionValues.includes(option)
                      const isGreatSelected = formData.decisionValues.includes("Just find me someone great")
                      const isDisabled = !isSelected && (isGreatSelected || (!isSelected && formData.decisionValues.length >= 2)) && option !== "Just find me someone great"
                      return (
                        <motion.div key={option} {...fadeUp(0.05 * index + 0.3)}>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <OptionCard
                              selected={isSelected}
                              onClick={() => handleDecisionValueToggle(option)}
                              disabled={isDisabled}
                              hasCheckbox={option !== "Just find me someone great"}
                            >
                              {option}
                            </OptionCard>
                          </motion.div>
                        </motion.div>
                      )
                    })}
                  </div>

                  <ContinueButton onClick={() => handleStepForward(4, getNextStep(4))} disabled={!canContinueStep4} />

                  {/* Social proof notification */}
                  <AnimatePresence>
                    {showSocialProof && (
                      <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50"
                      >
                        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 flex items-center gap-3">
                          <span className="text-lg">&#10024;</span>
                          <span className="text-sm text-[#2d2d2d] flex-1">{socialProofMessage}</span>
                          <button type="button" onClick={() => setShowSocialProof(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* ============================================ */}
              {/* STEP 5: ANXIETY LEVEL                        */}
              {/* ============================================ */}
              {step === 5 && (
                <motion.div key="step5" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-5">
                  <StepHeader
                    icon={<Shield className="w-10 h-10" />}
                    title="How do you feel about going to the dentist?"
                  />

                  <div className="grid grid-cols-1 gap-2.5">
                    {ANXIETY_LEVEL_OPTIONS.map((option, index) => (
                      <motion.div key={option.value} {...fadeUp(0.15 * index + 0.3)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={formData.anxiety_level === option.value}
                            onClick={() => handleSingleSelect("anxiety_level", option.value, getNextStep(5))}
                          >
                            {option.label}
                          </OptionCard>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex items-start gap-2 px-4 py-2.5 rounded-2xl bg-[#faf5ef] text-[#0d3d3a] text-sm">
                    <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#0d3d3a]" />
                    <span>We&apos;ll only match you with dentists who&apos;ve helped patients in exactly your situation.</span>
                  </div>
                </motion.div>
              )}

              {/* ============================================ */}
              {/* STEP 6: COMFORT PREFERENCES (CONDITIONAL)    */}
              {/* Only shown if anxiety = quite/very anxious   */}
              {/* ============================================ */}
              {step === 6 && isAnxious && (
                <motion.div key="step6" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-5">
                  <StepHeader
                    icon={<Heart className="w-10 h-10" />}
                    title="What would help you feel at ease?"
                    subtitle="Pick as many as feel right. You can skip if you're not sure."
                  />

                  <div className="grid grid-cols-1 gap-2.5">
                    {COMFORT_PREFERENCE_OPTIONS.map((option, index) => (
                      <motion.div key={option.value} {...fadeUp(0.05 * index + 0.3)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={formData.comfortPreferences.includes(option.value)}
                            onClick={() => handleComfortToggle(option.value)}
                            hasCheckbox
                          >
                            {option.label}
                          </OptionCard>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <ContinueButton onClick={() => handleStepForward(6, getNextStep(6))} disabled={false} />
                    </div>
                    <motion.div initial={hasAnimated ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: hasAnimated ? 0 : 0.5 }}>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, comfortPreferences: [] }))
                          handleStepForward(6, getNextStep(6))
                        }}
                        className="h-11 text-base text-[#2d2d2d]/50 hover:text-[#2d2d2d]"
                      >
                        Skip &rarr;
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* ============================================ */}
              {/* STEP 7: CONCERNS                             */}
              {/* ============================================ */}
              {step === 7 && (
                <motion.div key="step7" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-5">
                  <StepHeader
                    icon={<AlertCircle className="w-10 h-10" />}
                    title="Is there anything on your mind about this?"
                  />

                  <div className="grid grid-cols-1 gap-2.5">
                    {BLOCKER_OPTIONS.map((option, index) => (
                      <motion.div key={option.code} {...fadeUp(0.1 * index + 0.3)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={formData.conversionBlockerCodes.includes(option.code)}
                            onClick={() => {
                              const isSelected = formData.conversionBlockerCodes.includes(option.code)
                              if (isSelected) {
                                setFormData((prev) => ({ ...prev, conversionBlockerCodes: [] }))
                                return
                              }
                              // NO_CONCERN is exclusive
                              if (option.code === "NO_CONCERN") {
                                setFormData((prev) => ({ ...prev, conversionBlockerCodes: ["NO_CONCERN"] }))
                              } else {
                                setFormData((prev) => ({ ...prev, conversionBlockerCodes: [option.code] }))
                              }
                              setTimeout(() => handleStepForward(7, getNextStep(7)), 300)
                            }}
                          >
                            {option.label}
                          </OptionCard>
                        </motion.div>
                        {/* Inline reassurance for "embarrassed" */}
                        {option.code === "EMBARRASSED" && formData.conversionBlockerCodes.includes("EMBARRASSED") && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-2 flex items-start gap-2 px-4 py-2 rounded-xl bg-[#eaf6f4] text-sm text-[#0d3d3a]"
                          >
                            <Info className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>Every dentist we work with has seen it all — and won&apos;t judge you.</span>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ============================================ */}
              {/* STEP 8: TREATMENT SELECTION (category tabs)  */}
              {/* ============================================ */}
              {step === 8 && (
                <motion.div key="step8" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-5">
                  <StepHeader
                    icon={<Smile className="w-10 h-10" />}
                    title="What services do you need?"
                  />

                  {/* Category tabs */}
                  <motion.div {...fadeUp(0.2)} className="flex flex-wrap gap-2">
                    {TREATMENT_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`
                          px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border-2
                          ${activeCategory === cat.id
                            ? "border-[#0fbcb0] bg-white text-[#0fbcb0] shadow-sm"
                            : "border-transparent bg-[#eaf6f4] text-[#2d2d2d] hover:bg-[#dff2ef]"
                          }
                        `}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </motion.div>

                  {/* Divider */}
                  <div className="border-t border-gray-200" />

                  {/* Treatment pills for active category */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeCategory}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-wrap gap-2.5"
                    >
                      {TREATMENT_CATEGORIES.find((c) => c.id === activeCategory)?.treatments.map((treatment) => {
                        const isSelected = formData.treatments.includes(treatment.value)
                        return (
                          <div key={treatment.value} className="flex items-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setFormData((prev) => ({ ...prev, treatments: [] }))
                                  return
                                }
                                setFormData((prev) => ({ ...prev, treatments: [treatment.value] }))
                              }}
                              className={`
                                inline-flex items-center gap-1.5 pl-4 pr-2 py-2 rounded-full text-sm transition-all duration-200 border-2
                                ${isSelected
                                  ? "border-[#0fbcb0] bg-[#d4edea] text-[#0d3d3a] shadow-sm"
                                  : "border-gray-200 bg-white text-[#2d2d2d] hover:border-gray-300 hover:shadow-sm"
                                }
                              `}
                            >
                              <span>{treatment.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setTreatmentInfoPopup(treatment)
                                }}
                                className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 hover:text-[#0fbcb0] hover:border-[#0fbcb0] transition-colors flex-shrink-0"
                              >
                                <Info className="w-3 h-3" />
                              </button>
                            </button>
                          </div>
                        )
                      })}
                    </motion.div>
                  </AnimatePresence>

                  {/* Emergency fast-track message */}
                  {isEmergency && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex items-start gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 text-amber-800 text-sm"
                    >
                      <Zap className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>We&apos;ll fast-track your match — just add your details on the next screen.</span>
                    </motion.div>
                  )}

                  <ContinueButton
                    onClick={() => handleStepForward(8, getNextStep(8))}
                    disabled={!canContinueStep8}
                  />
                </motion.div>
              )}

              {/* Treatment info popup/modal */}
              <AnimatePresence>
                {treatmentInfoPopup && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                  >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40" onClick={() => setTreatmentInfoPopup(null)} />

                    {/* Modal */}
                    <motion.div
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 100, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
                    >
                      {/* Header */}
                      <div className="sticky top-0 bg-white rounded-t-3xl sm:rounded-t-3xl px-5 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between z-10">
                        <div>
                          <h3 className="text-xl font-semibold text-[#2d2d2d]">{treatmentInfoPopup.name}</h3>
                          <p className="text-xs text-[#2d2d2d]/50 mt-0.5">BDA/GDC compliant information</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTreatmentInfoPopup(null)}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Body */}
                      <div className="px-5 py-4 space-y-5">
                        {/* Description */}
                        <p className="text-sm text-[#2d2d2d]/80 leading-relaxed">{treatmentInfoPopup.description}</p>

                        {/* What to Expect */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <AlertCircle className="w-4 h-4 text-[#e07a4a]" />
                            <h4 className="text-sm font-semibold text-[#2d2d2d]">What to Expect</h4>
                          </div>
                          <ol className="space-y-2.5">
                            {treatmentInfoPopup.whatToExpect.map((item, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <span className="w-5 h-5 rounded-md bg-[#eaf6f4] text-[#0fbcb0] text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                <span className="text-sm text-[#2d2d2d]/70">{item}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Duration & Recovery cards */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Clock className="w-3.5 h-3.5 text-[#e07a4a]" />
                              <span className="text-xs font-semibold text-[#2d2d2d]">Duration</span>
                            </div>
                            <p className="text-xs text-[#2d2d2d]/60 leading-relaxed">{treatmentInfoPopup.duration}</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Shield className="w-3.5 h-3.5 text-[#e07a4a]" />
                              <span className="text-xs font-semibold text-[#2d2d2d]">Recovery</span>
                            </div>
                            <p className="text-xs text-[#2d2d2d]/60 leading-relaxed">{treatmentInfoPopup.recovery}</p>
                          </div>
                        </div>

                        {/* Benefits */}
                        <div>
                          <h4 className="text-sm font-semibold text-[#2d2d2d] mb-2">Benefits</h4>
                          <div className="flex flex-wrap gap-2">
                            {treatmentInfoPopup.benefits.map((benefit, i) => (
                              <span key={i} className="px-3 py-1 rounded-full bg-[#eaf6f4] text-[#0fbcb0] text-xs font-medium">
                                {benefit}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Disclaimer */}
                        <div className="bg-gray-50 rounded-xl px-4 py-3">
                          <p className="text-xs text-[#2d2d2d]/50 text-center leading-relaxed">
                            This information is for general guidance only. Your dentist will discuss your specific treatment plan.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ============================================ */}
              {/* STEP 9: TIMING + AVAILABILITY (combined)     */}
              {/* ============================================ */}
              {step === 9 && !isEmergency && (
                <motion.div key="step9" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-5">
                  <StepHeader
                    icon={<Calendar className="w-10 h-10" />}
                    title="When are you looking to start?"
                  />

                  {/* Part A — Urgency (single select) */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {TIMING_OPTIONS.map((option, index) => (
                      <motion.div key={option.value} {...fadeUp(0.15 * index + 0.3)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={formData.readiness === option.value}
                            onClick={() => {
                              if (formData.readiness === option.value) {
                                setFormData((prev) => ({ ...prev, readiness: "" }))
                              } else {
                                setFormData((prev) => ({ ...prev, readiness: option.value }))
                              }
                            }}
                          >
                            {option.label}
                          </OptionCard>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm text-[#2d2d2d]/60 mb-3">When works best for appointments?</p>
                  </div>

                  {/* Part B — Availability (multi-select cards) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {PREFERRED_TIME_OPTIONS.map((option, index) => (
                      <motion.div key={option.value} {...fadeUp(0.15 * index + 0.6)}>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            setFormData((prev) => {
                              const isSelected = prev.preferred_times.includes(option.value)
                              if (isSelected) {
                                return { ...prev, preferred_times: prev.preferred_times.filter((t) => t !== option.value) }
                              }
                              return { ...prev, preferred_times: [...prev.preferred_times, option.value] }
                            })
                          }}
                          className={`
                            w-full p-3.5 rounded-2xl border-2 transition-all duration-200 text-center
                            ${
                              formData.preferred_times.includes(option.value)
                                ? "border-[#0fbcb0] bg-[#d4edea] shadow-md"
                                : "border-transparent bg-[#eaf6f4] hover:bg-[#dff2ef] hover:shadow-md"
                            }
                          `}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${formData.preferred_times.includes(option.value) ? "bg-[#0fbcb0] text-white" : "bg-[#d4edea] text-[#0fbcb0]"}`}>
                              {option.value === "weekend" ? <Calendar className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                            </div>
                            <span className="font-medium text-[#2d2d2d] text-sm">{option.label}</span>
                            <span className="text-xs text-[#2d2d2d]/60">{option.time}</span>
                          </div>
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>

                  <ContinueButton onClick={() => handleStepForward(9, getNextStep(9))} disabled={!canContinueStep9} />
                </motion.div>
              )}

              {/* ============================================ */}
              {/* STEP 10: BUDGET MINDSET                      */}
              {/* ============================================ */}
              {step === 10 && !isEmergency && (
                <motion.div key="step10" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-5">
                  <StepHeader
                    icon={<CreditCard className="w-10 h-10" />}
                    title="How do you think about paying for dental treatment?"
                    subtitle="There's no right answer — this just helps us find the right fit."
                  />

                  <div className="grid grid-cols-1 gap-2.5">
                    {COST_APPROACH_OPTIONS.map((option, index) => (
                      <motion.div key={option.value} {...fadeUp(0.15 * index + 0.3)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={formData.costApproach === option.value}
                            onClick={() => handleSingleSelect("costApproach", option.value, getNextStep(10))}
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
              {/* STEP 10.5: MONTHLY PAYMENTS (conditional)    */}
              {/* ============================================ */}
              {step === 10.5 && (
                <motion.div key="step10_5" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-5">
                  <StepHeader
                    icon={<CreditCard className="w-10 h-10" />}
                    title="Would spreading the cost into monthly payments make treatment easier for you?"
                  />

                  <div className="grid grid-cols-1 gap-2.5">
                    {MONTHLY_PAYMENT_OPTIONS.map((option, index) => (
                      <motion.div key={option.value} {...fadeUp(0.15 * index + 0.3)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={formData.monthlyPaymentRange === option.value}
                            onClick={() => handleSingleSelect("monthlyPaymentRange", option.value, getNextStep(10.5))}
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
              {/* STEP 10.6: BUDGET HANDLING (conditional)     */}
              {/* ============================================ */}
              {step === 10.6 && (
                <motion.div key="step10_6" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-5">
                  <StepHeader
                    icon={<CreditCard className="w-10 h-10" />}
                    title="How would you prefer to handle costs with the clinic?"
                  />

                  <div className="grid grid-cols-1 gap-2.5">
                    {BUDGET_HANDLING_OPTIONS.map((option, index) => (
                      <motion.div key={option.value} {...fadeUp(0.15 * index + 0.3)}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <OptionCard
                            selected={formData.strictBudgetMode === option.value}
                            onClick={() => handleSingleSelect("strictBudgetMode", option.value, getNextStep(10.6))}
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
              {/* STEP 11: CONTACT DETAILS (Final step)        */}
              {/* ============================================ */}
              {step === 11 && (
                <motion.div key="step11" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTransition} className="space-y-5">
                  <StepHeader
                    icon={<CheckCircle2 className="w-10 h-10" />}
                    title="Almost there! What's your name?"
                    subtitle="Your details are only shared with clinics you choose to contact."
                  />

                  {/* Logged-in user: "Continue as" shortcut */}
                  {authUser && !continueAsSomeoneElse ? (
                    <motion.div className="space-y-5" {...fadeUp(0.3)}>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            firstName: authUser.firstName,
                            lastName: authUser.lastName,
                            email: authUser.email,
                            consentContact: true,
                          }))
                          setTimeout(() => {
                            const form = document.querySelector("form")
                            if (form) form.requestSubmit()
                          }, 50)
                        }}
                        disabled={isSubmitting}
                        className="w-full p-4 sm:p-5 rounded-2xl border-2 border-[#0fbcb0] bg-[#eaf6f4] text-left transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#0fbcb0] flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-base font-semibold text-[#2d2d2d] block">
                              {isSubmitting ? "Finding your matches..." : "Continue as"}
                            </span>
                            <span className="text-[#0fbcb0] font-medium truncate block">{authUser.email}</span>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const supabase = createClient()
                          await supabase.auth.signOut()
                          setAuthUser(null)
                          setContinueAsSomeoneElse(true)
                        }}
                        className="w-full text-center text-sm text-[#2d2d2d]/50 hover:text-[#2d2d2d] transition-colors py-2"
                      >
                        Continue as someone else
                      </button>
                    </motion.div>
                  ) : (
                    <>
                  <motion.div className="space-y-5" {...fadeUp(0.3)}>
                    {/* Email confirmation */}
                    {formData.email && (
                      <div className="flex items-center gap-2 text-sm text-[#2d2d2d]/60">
                        <span>Matches will be sent to <span className="font-medium text-[#2d2d2d]">{formData.email}</span></span>
                        <button
                          type="button"
                          onClick={() => animateToStep(2, -1)}
                          className="text-[#0fbcb0] hover:text-[#0da399] text-xs underline"
                        >
                          change
                        </button>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="fullName" className="text-sm font-normal text-[#2d2d2d]">
                        Full name
                      </Label>
                      <Input
                        id="fullName"
                        value={`${formData.firstName}${formData.lastName ? ` ${formData.lastName}` : ""}`}
                        onChange={(e) => {
                          const parts = e.target.value.split(" ")
                          const first = parts[0] || ""
                          const last = parts.slice(1).join(" ")
                          setFormData({ ...formData, firstName: first, lastName: last })
                        }}
                        className="mt-2 h-11 text-base rounded-xl bg-[#eaf6f4] border-[#a8d5cf] text-[#2d2d2d] placeholder:text-[#2d2d2d]/40"
                        placeholder="John Smith"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-sm font-normal text-[#2d2d2d]">
                        Phone number <span className="text-[#2d2d2d]/50 font-normal">(optional)</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="mt-2 h-11 text-base rounded-xl bg-[#eaf6f4] border-[#a8d5cf] text-[#2d2d2d] placeholder:text-[#2d2d2d]/40"
                        placeholder="07123 456789"
                      />
                      <p className="text-xs text-[#2d2d2d]/40 mt-1">Only used if you request a call-back. Never shared without your permission.</p>
                    </div>

                    <div className="pt-4 space-y-4">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <Checkbox
                          id="consent"
                          checked={formData.consentContact}
                          onCheckedChange={(checked) => setFormData({ ...formData, consentContact: checked === true })}
                          className="mt-0.5 border-[#2d2d2d]/30 data-[state=checked]:bg-[#0fbcb0] data-[state=checked]:border-[#0fbcb0]"
                        />
                        <span className="text-sm text-[#2d2d2d] leading-relaxed">
                          I agree to be contacted by matched clinics about my enquiry and accept the{" "}
                          <a href="/terms" className="text-[#0fbcb0] underline hover:text-[#0da399]">
                            Terms
                          </a>{" "}
                          and{" "}
                          <a href="/privacy" className="text-[#0fbcb0] underline hover:text-[#0da399]">
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
                          className="mt-0.5 border-[#2d2d2d]/30 data-[state=checked]:bg-[#0fbcb0] data-[state=checked]:border-[#0fbcb0]"
                        />
                        <span className="text-sm text-[#2d2d2d]/60 leading-relaxed">
                          Send me helpful dental care tips and offers (optional).
                        </span>
                      </label>
                    </div>
                  </motion.div>

                  <motion.div {...fadeUp(0.55)}>
                    <Button
                      type="submit"
                      disabled={!canContinueStep11 || isSubmitting}
                      className="w-full h-11 text-base font-semibold rounded-full shadow-lg bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0 hover:shadow-xl transition-all"
                      size="lg"
                    >
                      {isSubmitting ? "Finding your matches..." : "See my matches \u2192"}
                    </Button>
                  </motion.div>
                    </>
                  )}

                  {/* Trust indicators */}
                  <motion.div
                    className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 text-sm text-[#2d2d2d]/40"
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
