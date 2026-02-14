"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Heart, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  FORM_VERSION,
  SCHEMA_VERSION,
  EMERGENCY_TREATMENT,
  BLOCKER_OPTIONS,
} from "@/lib/intake-form-config"

export default function GoogleCompletePage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [status, setStatus] = useState("Verifying your Google account...")

  useEffect(() => {
    async function completeIntake() {
      try {
        // 1. Get the Google user session
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user?.email) {
          setError("Could not retrieve your Google account. Please try again.")
          return
        }

        // 2. Read saved form data from localStorage
        const saved = localStorage.getItem("pearlie_intake_form")
        if (!saved) {
          setError("Your form data was lost. Please go back and fill in the form again.")
          return
        }

        const formData = JSON.parse(saved)
        localStorage.removeItem("pearlie_intake_form")

        // Verify consent was given before the OAuth redirect
        if (formData.consentContact !== true) {
          setError("Please agree to the contact terms before continuing. Go back and check the consent box.")
          return
        }

        // Use Google email, override any email entered in the form
        const googleEmail = user.email
        const firstName = formData.firstName || user.user_metadata?.given_name || ""
        const lastName = formData.lastName || user.user_metadata?.family_name || ""

        const isEmergency = formData.treatments?.includes(EMERGENCY_TREATMENT) === true
        const blockerCode = formData.conversionBlockerCode || ""
        const blockerOption = BLOCKER_OPTIONS.find((o) => o.code === blockerCode)

        setStatus("Creating your matches...")

        // 3. Create the lead via /api/leads with authMethod: "google"
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
              ? Number.parseFloat(formData.strictBudgetAmount.replace(/,/g, ""))
              : null,
            firstName,
            lastName,
            email: googleEmail,
            phone: formData.phone || null,
            city: null,
            consentContact: formData.consentContact === true,
            consentTerms: formData.consentContact === true,
            decisionValues: isEmergency ? [] : (formData.decisionValues || []),
            conversionBlocker: isEmergency ? "" : (blockerOption?.label || ""),
            conversionBlockerCode: isEmergency ? "" : blockerCode,
            conversionBlockerCodes: isEmergency ? [] : (blockerCode ? [blockerCode] : []),
            timingPreference: isEmergency ? (formData.urgency || "asap") : (formData.readiness || "flexible"),
            preferred_times: formData.preferred_times || [],
            locationPreference: isEmergency ? null : formData.location_preference || null,
            anxietyLevel: formData.anxiety_level || null,
            formVersion: FORM_VERSION,
            schemaVersion: SCHEMA_VERSION,
            authMethod: "google",
          }),
        })

        if (!leadRes.ok) {
          const body = await leadRes.json().catch(() => ({}))
          throw new Error(body.error || "Failed to create lead")
        }

        const { leadId } = await leadRes.json()
        localStorage.setItem("pearlie_lead_id", leadId)

        // 4. Create match
        setStatus("Finding your best clinics...")

        const matchRes = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId }),
        })

        if (!matchRes.ok) throw new Error("Failed to create match")
        const matchData = await matchRes.json()
        const matchId = matchData.matchId
        if (!matchId) throw new Error("No match ID returned")

        // 5. Redirect to match results (already verified via Google)
        router.replace(`/match/${matchId}`)
      } catch (err) {
        console.error("[GoogleComplete] Error:", err)
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      }
    }

    completeIntake()
  }, [router])

  return (
    <div className="min-h-screen bg-[#FEFEFE] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center justify-center gap-2.5 mb-8">
          <div className="rounded-full bg-black p-2">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="font-semibold text-xl">Pearlie</span>
        </Link>

        {error ? (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-[#323141]">Something went wrong</h1>
            <p className="text-[#323141]/70">{error}</p>
            <Button asChild className="mt-4">
              <Link href="/intake">Back to form</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#907EFF]" />
            <h1 className="text-xl font-semibold text-[#323141]">{status}</h1>
            <p className="text-[#323141]/70">This will only take a moment.</p>
          </div>
        )}
      </div>
    </div>
  )
}
