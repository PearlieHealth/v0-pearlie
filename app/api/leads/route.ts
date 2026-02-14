import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { FORM_VERSION, SCHEMA_VERSION } from "@/lib/intake-form-config"

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

function validateLeadData(body: Record<string, unknown>): { valid: true; data: Record<string, unknown> } | { valid: false; error: string } {
  if (!body.treatmentInterest || typeof body.treatmentInterest !== "string" || (body.treatmentInterest as string).trim() === "") {
    return { valid: false, error: "Treatment is required" }
  }
  if (!body.postcode || typeof body.postcode !== "string" || (body.postcode as string).trim() === "") {
    return { valid: false, error: "Postcode is required" }
  }
  if (!body.firstName || typeof body.firstName !== "string" || (body.firstName as string).trim() === "") {
    return { valid: false, error: "First name is required" }
  }
  if (!body.lastName || typeof body.lastName !== "string" || (body.lastName as string).trim() === "") {
    return { valid: false, error: "Last name is required" }
  }

  return {
    valid: true,
    data: {
      treatmentInterest: (body.treatmentInterest as string).trim(),
      postcode: (body.postcode as string).trim(),
      isEmergency: Boolean(body.isEmergency),
      urgency: body.urgency || null,
      budgetRange: body.budgetRange || "unspecified",
      costApproach: body.costApproach || "",
      monthlyPaymentRange: body.monthlyPaymentRange || null,
      strictBudgetMode: body.strictBudgetMode || "",
      strictBudgetAmount: typeof body.strictBudgetAmount === "number" ? body.strictBudgetAmount : null,
      firstName: (body.firstName as string).trim(),
      lastName: (body.lastName as string).trim(),
      email: body.email && typeof body.email === "string" ? (body.email as string).trim() : "",
      phone: body.phone && typeof body.phone === "string" ? (body.phone as string).trim() : "",
      city: body.city || "",
      consentContact: Boolean(body.consentContact),
      consentTerms: Boolean(body.consentTerms),
      consentMarketing: Boolean(body.consentMarketing),
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
      formVersion: body.formVersion || FORM_VERSION,
      schemaVersion: typeof body.schemaVersion === "number" ? body.schemaVersion : SCHEMA_VERSION,
    },
  }
}

export async function POST(request: Request) {
  const supabase = createAdminClient()

  try {
    const body = await request.json()

    const validation = validateLeadData(body)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const validatedData = validation.data as Record<string, unknown>

    const geocoded = await geocodePostcode(validatedData.postcode as string)
    if (!geocoded) {
      return NextResponse.json({ error: "Invalid postcode. Please enter a valid UK postcode." }, { status: 400 })
    }

    const email = validatedData.email && (validatedData.email as string).trim() !== "" ? validatedData.email : null
    const phone = validatedData.phone && (validatedData.phone as string).trim() !== "" ? validatedData.phone : null
    const contactMethod = email ? "email" : phone ? "phone" : "email"

    const rawAnswers = {
      treatments_selected: (validatedData.treatmentInterest as string).split(", ").filter(Boolean),
      is_emergency: validatedData.isEmergency,
      urgency: validatedData.urgency,
      location_preference: validatedData.locationPreference,
      postcode: validatedData.postcode,
      user_lat: geocoded.latitude,
      user_lng: geocoded.longitude,
      values: validatedData.decisionValues || [],
      blocker:
        (validatedData.conversionBlockerCodes as string[]).length > 0
          ? validatedData.conversionBlockerCodes
          : validatedData.conversionBlockerCode
            ? [validatedData.conversionBlockerCode]
            : [],
      blocker_label: validatedData.conversionBlocker,
      blocker_labels: Array.isArray(body.rawAnswers?.blocker_labels) ? body.rawAnswers.blocker_labels : [],
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
      consent_marketing: validatedData.consentMarketing,
      form_version: validatedData.formVersion,
      submitted_at: new Date().toISOString(),
    }

    const isGoogleAuth = body.authMethod === "google"

    const blockerCodes = validatedData.conversionBlockerCodes as string[]
    // Extract blocker labels from the form's rawAnswers payload, or fall back to codes
    const incomingBlockerLabels = body.rawAnswers?.blocker_labels
    const blockerLabels = Array.isArray(incomingBlockerLabels) && incomingBlockerLabels.length > 0
      ? incomingBlockerLabels
      : blockerCodes

    const { data: insertedLead, error: insertError } = await supabase
      .from("leads")
      .insert({
        treatment_interest: validatedData.treatmentInterest,
        postcode: validatedData.postcode,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        is_emergency: validatedData.isEmergency,
        decision_values: validatedData.decisionValues || [],
        conversion_blocker: validatedData.conversionBlocker || blockerCodes[0] || "",
        conversion_blocker_codes: blockerCodes,
        blocker_labels: blockerLabels,
        blocker: validatedData.conversionBlockerCode || blockerCodes[0] || "",
        preferred_timing: validatedData.timingPreference || "flexible",
        preferred_times: validatedData.preferred_times,
        budget_range: validatedData.budgetRange || "unspecified",
        cost_approach: validatedData.costApproach || "",
        monthly_payment_range: validatedData.monthlyPaymentRange || null,
        strict_budget_mode: validatedData.strictBudgetMode || "",
        strict_budget_amount: validatedData.strictBudgetAmount,
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
        consent_marketing: validatedData.consentMarketing,
        contact_method: contactMethod,
        form_version: validatedData.formVersion,
        schema_version: validatedData.schemaVersion,
        raw_answers: rawAnswers,
        source: body.source || "match",
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

    return NextResponse.json({ leadId: insertedLead.id }, { status: 201 })
  } catch (error) {
    console.error("[leads] Error in lead creation:", error)
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 })
  }
}
