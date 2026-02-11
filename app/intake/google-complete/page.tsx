"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Heart, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { trackEvent } from "@/lib/analytics"
import { FORM_VERSION, SCHEMA_VERSION } from "@/lib/intake-form-config"

export default function GoogleCompletePage() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "submitting" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true
    processGoogleAuth()
  }, [])

  async function processGoogleAuth() {
    try {
      // 1. Get the authenticated Google user from Supabase
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error("[google-complete] No authenticated user:", userError)
        setErrorMessage("Google sign-in failed. Please try again.")
        setStatus("error")
        return
      }

      const googleEmail = user.email
      const googleName = user.user_metadata?.full_name || user.user_metadata?.name || ""
      const nameParts = googleName.split(" ")
      const googleFirstName = nameParts[0] || ""
      const googleLastName = nameParts.slice(1).join(" ") || ""

      // 2. Load saved form data from sessionStorage
      const savedFormData = sessionStorage.getItem("pearlie_intake_form")
      if (!savedFormData) {
        console.error("[google-complete] No saved form data found")
        setErrorMessage("Form data was lost. Please start the form again.")
        setStatus("error")
        return
      }

      const formData = JSON.parse(savedFormData)
      sessionStorage.removeItem("pearlie_intake_form")

      // 3. Use Google profile data, falling back to form data
      const firstName = googleFirstName || formData.firstName || ""
      const lastName = googleLastName || formData.lastName || ""
      const email = googleEmail || formData.email || ""
      const isEmergency = formData.treatments?.includes("Emergency dental care")

      if (!firstName || !email) {
        setErrorMessage("Could not retrieve your details from Google. Please try again.")
        setStatus("error")
        return
      }

      setStatus("submitting")

      // 4. Build raw answers (same structure as regular form)
      const rawAnswers = {
        treatments_selected: formData.treatments || [],
        is_emergency: isEmergency,
        urgency: isEmergency ? formData.urgency : null,
        location_preference: isEmergency ? null : formData.location_preference || null,
        postcode: formData.postcode,
        values: isEmergency ? [] : formData.decisionValues || [],
        blocker: isEmergency ? [] : (formData.conversionBlockerCode ? [formData.conversionBlockerCode] : []),
        timing: isEmergency ? null : formData.readiness || null,
        preferred_times: formData.preferred_times || [],
        cost_approach: isEmergency ? null : formData.costApproach || null,
        monthly_payment_range: formData.monthlyPaymentRange || null,
        strict_budget_mode: formData.strictBudgetMode || null,
        strict_budget_amount: formData.strictBudgetAmount
          ? Number.parseFloat(String(formData.strictBudgetAmount).replace(/,/g, ""))
          : null,
        anxiety_level: formData.anxiety_level || null,
        contact_method: "email",
        contact_value: email,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: formData.phone || null,
        consent_contact: true,
        consent_marketing: formData.consentMarketing || false,
        form_version: FORM_VERSION,
        submitted_at: new Date().toISOString(),
        auth_method: "google",
      }

      // 5. Submit the lead with Google auth flag
      const leadRes = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treatmentInterest: (formData.treatments || []).join(", "),
          postcode: formData.postcode,
          isEmergency,
          urgency: isEmergency ? formData.urgency : null,
          budgetRange: formData.costApproach || "unspecified",
          costApproach: isEmergency ? null : formData.costApproach || null,
          monthlyPaymentRange: formData.monthlyPaymentRange || null,
          strictBudgetMode: formData.strictBudgetMode || null,
          strictBudgetAmount: formData.strictBudgetAmount
            ? Number.parseFloat(String(formData.strictBudgetAmount).replace(/,/g, ""))
            : null,
          firstName,
          lastName,
          email,
          phone: formData.phone || null,
          city: null,
          consentContact: true,
          consentTerms: true,
          decisionValues: isEmergency ? [] : formData.decisionValues || [],
          conversionBlocker: "",
          conversionBlockerCode: isEmergency ? "" : formData.conversionBlockerCode || "",
          conversionBlockerCodes: isEmergency ? [] : (formData.conversionBlockerCode ? [formData.conversionBlockerCode] : []),
          timingPreference: isEmergency ? (formData.urgency || "asap") : (formData.readiness || "flexible"),
          preferred_times: formData.preferred_times || [],
          locationPreference: isEmergency ? null : formData.location_preference || null,
          anxietyLevel: formData.anxiety_level || null,
          rawAnswers,
          formVersion: FORM_VERSION,
          schemaVersion: SCHEMA_VERSION,
          // Google auth specific
          authMethod: "google",
          supabaseUserId: user.id,
        }),
      })

      if (!leadRes.ok) throw new Error("Failed to create lead")
      const { leadId } = await leadRes.json()
      localStorage.setItem("pearlie_lead_id", leadId)

      trackEvent("lead_submitted", {
        leadId,
        meta: {
          treatment_interest: (formData.treatments || []).join(", "),
          postcode: formData.postcode,
          flow: isEmergency ? "emergency" : "planning",
          auth_method: "google",
        },
      })

      // 6. Run matching
      const matchRes = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      })

      if (!matchRes.ok) throw new Error("Failed to create match")
      const matchData = await matchRes.json()
      const matchId = matchData.matchId
      if (!matchId) throw new Error("No match ID returned")

      setStatus("success")

      // 7. Redirect to match results
      setTimeout(() => {
        router.push(`/match/${matchId}`)
      }, 800)
    } catch (err) {
      console.error("[google-complete] Error:", err)
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setStatus("error")
    }
  }

  return (
    <div className="min-h-screen bg-[#FEFEFE] flex flex-col items-center justify-center px-4">
      <Link href="/" className="inline-flex items-center justify-center gap-2.5 mb-8">
        <div className="rounded-full bg-black p-2">
          <Heart className="w-5 h-5 text-white fill-white" />
        </div>
        <span className="font-semibold text-xl">Pearlie</span>
      </Link>

      {(status === "loading" || status === "submitting") && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#907EFF] to-[#ED64A6] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h1 className="text-2xl font-semibold text-[#323141]">
            {status === "loading" ? "Verifying your Google account..." : "Finding your clinic matches..."}
          </h1>
          <p className="text-[#323141]/70">This will only take a moment.</p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold text-[#323141]">Matches found!</h1>
          <p className="text-[#323141]/70">Redirecting you to your results...</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-semibold text-[#323141]">Something went wrong</h1>
          <p className="text-[#323141]/70">{errorMessage}</p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" asChild>
              <Link href="/intake">Start again</Link>
            </Button>
            <Button
              onClick={() => {
                setStatus("loading")
                hasRun.current = false
                processGoogleAuth()
              }}
              className="bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white border-0"
            >
              Try again
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
