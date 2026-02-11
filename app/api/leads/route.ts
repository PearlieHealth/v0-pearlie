import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { rankClinics, buildLeadProfile, type LeadAnswer, type ClinicProfile } from "@/lib/matching/engine"

const CURRENT_FORM_VERSION = "v2_final_11q_2026-01-13"

// The Zod import was causing "_zod" undefined errors in the runtime

async function geocodePostcode(postcode: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const sanitized = postcode.replace(/\s/g, "").toUpperCase()
    const response = await fetch(`https://api.postcodes.io/postcodes/${sanitized}`)

    if (!response.ok) {
      console.error("[geocode] Postcode API returned:", response.status)
      return null
    }

    const data = await response.json()
    if (data.result && data.result.latitude && data.result.longitude) {
      return {
        latitude: data.result.latitude,
        longitude: data.result.longitude,
      }
    }

    return null
  } catch (error) {
    console.error("[geocode] Error geocoding postcode:", error)
    return null
  }
}

function validateLeadData(body: any): { valid: true; data: any } | { valid: false; error: string } {
  // Required fields
  if (!body.treatmentInterest || typeof body.treatmentInterest !== "string" || body.treatmentInterest.trim() === "") {
    return { valid: false, error: "Treatment is required" }
  }
  if (!body.postcode || typeof body.postcode !== "string" || body.postcode.trim() === "") {
    return { valid: false, error: "Postcode is required" }
  }
  if (!body.firstName || typeof body.firstName !== "string" || body.firstName.trim() === "") {
    return { valid: false, error: "First name is required" }
  }
  if (!body.lastName || typeof body.lastName !== "string" || body.lastName.trim() === "") {
    return { valid: false, error: "Last name is required" }
  }

  // Return normalized data with defaults
  return {
    valid: true,
    data: {
      treatmentInterest: body.treatmentInterest.trim(),
      postcode: body.postcode.trim(),
      isEmergency: Boolean(body.isEmergency),
      urgency: body.urgency || null,
      budgetRange: body.budgetRange || "unspecified",
      costApproach: body.costApproach || "",
      monthlyPaymentRange: body.monthlyPaymentRange || null,
      strictBudgetMode: body.strictBudgetMode || "",
      strictBudgetAmount: typeof body.strictBudgetAmount === "number" ? body.strictBudgetAmount : null,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: body.email && typeof body.email === "string" ? body.email.trim() : "",
      phone: body.phone && typeof body.phone === "string" ? body.phone.trim() : "",
      city: body.city || "",
      consentContact: Boolean(body.consentContact),
      consentTerms: Boolean(body.consentTerms),
      decisionValues: Array.isArray(body.decisionValues) ? body.decisionValues : [],
      conversionBlocker: body.conversionBlocker || "",
      conversionBlockerCode: body.conversionBlockerCode || "",
      conversionBlockerCodes: Array.isArray(body.conversionBlockerCodes)
        ? body.conversionBlockerCodes
        : body.conversionBlockerCode
          ? [body.conversionBlockerCode]
          : [],
      timingPreference: body.timingPreference || "flexible",
      preferred_times: Array.isArray(body.preferred_times) ? body.preferred_times : [],
      outcomeTreatment: body.outcomeTreatment || "",
      outcomePriority: body.outcomePriority || "",
      outcomePriorityKey: body.outcomePriorityKey || "",
      locationPreference: body.locationPreference || "",
      anxietyLevel: body.anxietyLevel || "",
      formVersion: body.formVersion || CURRENT_FORM_VERSION,
      schemaVersion: typeof body.schemaVersion === "number" ? body.schemaVersion : 2,
    },
  }
}

export async function POST(request: Request) {
  const supabase = createAdminClient()
  let sessionId: string | null = null
  let leadId: string | null = null

  try {
    const body = await request.json()
    console.log("[leads] Received lead submission")

    const validation = validateLeadData(body)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const validatedData = validation.data
    console.log("[leads] Validated data with form version:", validatedData.formVersion)

    const geocoded = await geocodePostcode(validatedData.postcode)
    if (!geocoded) {
      console.error("[leads] Failed to geocode postcode:", validatedData.postcode)
      return NextResponse.json({ error: "Invalid postcode. Please enter a valid UK postcode." }, { status: 400 })
    }

    console.log("[leads] Geocoded to:", geocoded)

    const email = validatedData.email && validatedData.email.trim() !== "" ? validatedData.email : null
    const phone = validatedData.phone && validatedData.phone.trim() !== "" ? validatedData.phone : null
    const contactMethod = email ? "email" : phone ? "phone" : "email"

    const rawAnswers = {
      treatments_selected: validatedData.treatmentInterest.split(", ").filter(Boolean),
      is_emergency: validatedData.isEmergency,
      urgency: validatedData.urgency,
      location_preference: validatedData.locationPreference,
      postcode: validatedData.postcode,
      user_lat: geocoded.latitude,
      user_lng: geocoded.longitude,
      values: validatedData.decisionValues || [],
      blocker:
        validatedData.conversionBlockerCodes.length > 0
          ? validatedData.conversionBlockerCodes
          : validatedData.conversionBlockerCode
            ? [validatedData.conversionBlockerCode]
            : [],
      blocker_label: validatedData.conversionBlocker,
      timing: validatedData.timingPreference,
      preferred_times: validatedData.preferred_times,
      expectations: validatedData.outcomePriority,
      expectations_key: validatedData.outcomePriorityKey,
      expectations_treatment: validatedData.outcomeTreatment,
      cost_approach: validatedData.costApproach,
      monthly_payment_range: validatedData.monthlyPaymentRange,
      strict_budget_mode: validatedData.strictBudgetMode,
      strict_budget_amount: validatedData.strictBudgetAmount,
      anxiety_level: validatedData.anxietyLevel,
      contact_method: contactMethod,
      contact_value: email || phone,
      first_name: validatedData.firstName,
      last_name: validatedData.lastName,
      email: email,
      phone: phone,
      city: validatedData.city || "",
      consent_contact: validatedData.consentContact,
      consent_terms: validatedData.consentTerms,
      form_version: validatedData.formVersion,
      submitted_at: new Date().toISOString(),
    }

    // Check if this is a Google-authenticated lead (pre-verified)
    const isGoogleAuth = body.authMethod === "google"

    const { data: insertedLead, error: insertError } = await supabase
      .from("leads")
      .insert({
        treatment_interest: validatedData.treatmentInterest,
        postcode: validatedData.postcode,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        decision_values: validatedData.decisionValues || [],
        conversion_blocker: validatedData.conversionBlocker || validatedData.conversionBlockerCodes[0] || "",
        blocker: validatedData.conversionBlockerCode || validatedData.conversionBlockerCodes[0] || "",
        preferred_timing: validatedData.timingPreference || "flexible",
        preferred_times: validatedData.preferred_times,
        budget_range: validatedData.budgetRange || "unspecified",
        outcome_treatment: validatedData.outcomeTreatment || "",
        outcome_priority: validatedData.outcomePriority || "",
        outcome_priority_key: validatedData.outcomePriorityKey || "",
        location_preference: validatedData.locationPreference || "",
        anxiety_level: validatedData.anxietyLevel || "",
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        email: email,
        phone: phone,
        city: validatedData.city || "",
        consent_contact: validatedData.consentContact,
        consent_terms: validatedData.consentTerms,
        contact_method: contactMethod,
        schema_version: validatedData.schemaVersion,
        raw_answers: rawAnswers,
        // Google-authenticated users are pre-verified (email verified by Google)
        ...(isGoogleAuth && {
          is_verified: true,
          verified_at: new Date().toISOString(),
          verification_email: email,
        }),
      })
      .select()
      .single()

    if (insertError) {
      console.error("[leads] Error creating lead:", insertError)
      throw insertError
    }

    leadId = insertedLead.id
    console.log("[leads] Lead created:", leadId)

    const { data: session, error: sessionError } = await supabase
      .from("match_sessions")
      .insert({
        lead_id: leadId,
        status: "running",
      })
      .select()
      .single()

    if (sessionError) {
      console.error("[leads] Error creating match session:", sessionError)
      throw new Error("Failed to create match session")
    }

    sessionId = session.id
    console.log("[leads] Match session created:", sessionId)

    try {
      // ====== UNIFIED MATCHING SYSTEM ======
      // Step 1: Fetch all active clinics (verified and unverified) with filter keys
      const { data: clinicsWithFilters, error: clinicsError } = await supabase
        .from("clinics")
        .select(`
          *,
          clinic_filter_selections(filter_key)
        `)
        .eq("is_archived", false)
      
      if (clinicsError) {
        throw new Error(`Failed to fetch clinics: ${clinicsError.message}`)
      }

      const verifiedCount = clinicsWithFilters?.filter(c => c.verified).length || 0
      const unverifiedCount = clinicsWithFilters?.filter(c => !c.verified).length || 0
      console.log("[leads] Found", verifiedCount, "verified and", unverifiedCount, "unverified clinics")

      // Step 2: Build lead profile for scoring
      const leadProfile: LeadAnswer = buildLeadProfile({
        id: leadId!,
        treatments: validatedData.treatmentInterest.split(", ").filter(Boolean),
        postcode: validatedData.postcode,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        locationPreference: validatedData.locationPreference,
        priorities: validatedData.decisionValues || [],
        anxietyLevel: validatedData.anxietyLevel,
        costApproach: validatedData.costApproach,
        strictBudgetAmount: validatedData.strictBudgetAmount,
        timingPreference: validatedData.timingPreference,
        preferred_times: validatedData.preferred_times,
        blockerCodes: validatedData.conversionBlockerCodes,
      })

      // Step 3: Build clinic profiles using the normalizer
      const clinicProfiles: ClinicProfile[] = (clinicsWithFilters || []).map((c) => {
        const filterKeys = Array.isArray(c.clinic_filter_selections)
          ? c.clinic_filter_selections.map((s: any) => s.filter_key)
          : []
        return {
          id: c.id,
          name: c.name,
          postcode: c.postcode || "",
          latitude: c.latitude ? Number(c.latitude) : undefined,
          longitude: c.longitude ? Number(c.longitude) : undefined,
          priceRange: c.price_range || null,
          financeAvailable: c.finance_available ?? false,
          verified: c.verified ?? false,
          rating: c.rating ? Number(c.rating) : undefined,
          reviewCount: c.review_count || 0,
          tags: c.tags || [],
          treatments: c.treatments || [],
          filterKeys,
        }
      })

      // Step 4: Score and rank clinics using the unified engine
      // Include unverified clinics - they'll appear at the end as directory listings
      const rankedClinics = rankClinics(leadProfile, clinicProfiles, { topN: 15, includeUnverified: true })
      console.log("[leads] Ranked", rankedClinics.length, "clinics")

      // Step 5: Compose unique reasons for each clinic using templates (no AI)
      const { composeReasonsForMultipleClinics } = await import("@/lib/matching/reasonComposer")
      
      const composedReasonsMap = composeReasonsForMultipleClinics(
        leadId!,
        rankedClinics.map((rc) => ({
          clinicId: rc.clinic.id,
          matchReasons: rc.reasons,
          matchFacts: {
            treatmentMatch: {
              requested: validatedData.treatmentInterest,
              clinicOffers: true,
              matchedTreatments: [validatedData.treatmentInterest]
            }
          } as import("@/lib/matching/contract").MatchFacts
        }))
      )
      console.log("[leads] Composed unique reasons for", composedReasonsMap.size, "clinics")

      // Step 6: Save match results
      const matchResults = rankedClinics.map((rc) => {
        const composed = composedReasonsMap.get(rc.clinic.id)
        return {
          lead_id: leadId,
          clinic_id: rc.clinic.id,
          score: rc.score.percent,
          reasons: composed?.bullets || rc.reasons.map((r) => r.text),
          ai_reasons_source: "template_v4",
          ai_headline: null,
          ai_proof: null,
        }
      })

      if (matchResults.length > 0) {
        const { error: upsertError } = await supabase.from("match_results").upsert(matchResults, {
          onConflict: "lead_id,clinic_id",
        })

        if (upsertError) {
          console.error("[leads] Error saving match_results:", upsertError)
          throw new Error(`Failed to save match results: ${upsertError.message}`)
        }

        // Also save to lead_matches table
        const leadMatchesData = matchResults.map((r) => ({
          lead_id: r.lead_id,
          clinic_id: r.clinic_id,
          score: r.score,
          reasons: r.reasons,
        }))

        const { error: leadMatchesError } = await supabase.from("lead_matches").upsert(leadMatchesData, {
          onConflict: "lead_id,clinic_id",
        })

        if (leadMatchesError) {
          console.error("[leads] Error saving lead_matches:", leadMatchesError)
        }
      }

      console.log("[leads] Matching completed, found", matchResults.length, "matches")

      await supabase
        .from("match_sessions")
        .update({
          status: "complete",
          matched_count: matchResults.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId)

      console.log("[leads] Match session marked as complete")
    } catch (matchError) {
      console.error("[leads] Error during matching:", matchError)

      const errorDetails = {
        message: matchError instanceof Error ? matchError.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }

      await supabase
        .from("match_sessions")
        .update({
          status: "error",
          error_step: "generate_matches",
          error_message: "Failed to generate matches",
          error_details: errorDetails,
        })
        .eq("id", sessionId)

      console.log("[leads] Match session marked as error, but lead creation succeeded")
    }

    return NextResponse.json({ leadId, sessionId }, { status: 201 })
  } catch (error) {
    console.error("[leads] Error in lead creation:", error)

    if (sessionId && leadId) {
      await supabase
        .from("match_sessions")
        .update({
          status: "error",
          error_step: "create_lead",
          error_message: "Failed to create lead or process request",
          error_details: {
            message: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          },
        })
        .eq("id", sessionId)
        .catch(() => {})
    }

    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 })
  }
}
