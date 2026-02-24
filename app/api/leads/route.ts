import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { FORM_VERSION, SCHEMA_VERSION } from "@/lib/intake-form-config"
import { createRateLimiter } from "@/lib/rate-limit"
import { trackTikTokServerEvent, extractIp, extractUserAgent } from "@/lib/tiktok-events-api"
import { getAppUrl } from "@/lib/clinic-url"

// Rate limit: 5 lead submissions per email per 10 minutes
const leadRateLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, maxAttempts: 5 })

// Rate limit: 5 leads per IP per hour
const leadIpLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, maxAttempts: 5 })

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
  // Require at least an email (needed for OTP verification on match page)
  if (!body.email || typeof body.email !== "string" || (body.email as string).trim() === "") {
    return { valid: false, error: "Email address is required" }
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test((body.email as string).trim())) {
    return { valid: false, error: "Please enter a valid email address" }
  }

  // Input length validation
  if ((body.firstName as string).trim().length > 100) {
    return { valid: false, error: "First name is too long (max 100 characters)" }
  }
  if ((body.lastName as string).trim().length > 100) {
    return { valid: false, error: "Last name is too long (max 100 characters)" }
  }
  if (typeof body.email === "string" && (body.email as string).trim().length > 254) {
    return { valid: false, error: "Email address is too long" }
  }

  // Budget amount validation
  if (body.strictBudgetAmount !== undefined && body.strictBudgetAmount !== null) {
    const amount = typeof body.strictBudgetAmount === "number" ? body.strictBudgetAmount : Number(body.strictBudgetAmount)
    if (isNaN(amount) || amount < 0 || amount > 100000) {
      return { valid: false, error: "Budget amount must be between £0 and £100,000" }
    }
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
    // Rate limit by IP: 5 leads per hour
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const ipCheck = leadIpLimiter.check(ip)
    if (ipCheck.limited) {
      return NextResponse.json(
        { error: `Too many submissions. Please try again in ${ipCheck.retryAfterSecs} seconds.` },
        { status: 429, headers: { "Retry-After": String(ipCheck.retryAfterSecs) } }
      )
    }

    const body = await request.json()

    const validation = validateLeadData(body)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const validatedData = validation.data as Record<string, unknown>

    // M2: Rate limit by email (5 per 10 minutes)
    const rateLimitKey = (validatedData.email as string).trim().toLowerCase()
    const { limited, retryAfterSecs } = leadRateLimiter.check(rateLimitKey)
    if (limited) {
      return NextResponse.json(
        { error: `Too many submissions. Please try again in ${retryAfterSecs} seconds.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSecs) } }
      )
    }

    // M1: Check for duplicate submission (same email + postcode + treatment within 10 min)
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("email", rateLimitKey)
      .eq("postcode", (validatedData.postcode as string).trim())
      .eq("treatment_interest", (validatedData.treatmentInterest as string).trim())
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingLead) {
      console.log(`[leads] Duplicate submission detected, returning existing lead: ${existingLead.id}`)
      return NextResponse.json({ leadId: existingLead.id }, { status: 200 })
    }

    const geocoded = await geocodePostcode(validatedData.postcode as string)
    if (!geocoded) {
      return NextResponse.json({ error: "Invalid postcode. Please enter a valid UK postcode." }, { status: 400 })
    }

    const email = validatedData.email && (validatedData.email as string).trim() !== "" ? validatedData.email : null
    const phone = validatedData.phone && (validatedData.phone as string).trim() !== "" ? validatedData.phone : null
    const contactMethod = email ? "email" : phone ? "phone" : "email"

    // Use the form's rawAnswers directly — it's built from the actual form state
    // and is the canonical record of what the patient selected.
    // Only override geocoded coords and submitted_at (server-authoritative values).
    const rawAnswers = {
      ...(body.rawAnswers || {}),
      user_lat: geocoded.latitude,
      user_lng: geocoded.longitude,
      submitted_at: new Date().toISOString(),
    }

    const blockerCodes = validatedData.conversionBlockerCodes as string[]
    // Extract blocker labels from the form's rawAnswers payload, or fall back to codes
    const incomingBlockerLabels = body.rawAnswers?.blocker_labels
    const blockerLabels = Array.isArray(incomingBlockerLabels) && incomingBlockerLabels.length > 0
      ? incomingBlockerLabels
      : blockerCodes

    // If the user is already logged in, auto-verify the lead and link user_id.
    // This happens when a logged-in patient starts a new search ("Continue as").
    let authUserId: string | null = null
    try {
      const authClient = await createClient()
      const { data: { user } } = await authClient.auth.getUser()
      if (user?.id) {
        authUserId = user.id
      }
    } catch {}

    const { data: insertedLead, error: insertError } = await supabase
      .from("leads")
      .insert({
        treatment_interest: validatedData.treatmentInterest,
        postcode: validatedData.postcode,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        is_emergency: validatedData.isEmergency,
        decision_values: validatedData.decisionValues || [],
        conversion_blocker: validatedData.conversionBlocker || blockerCodes[0] || null,
        conversion_blocker_codes: blockerCodes,
        blocker_labels: blockerLabels,
        blocker: validatedData.conversionBlockerCode || blockerCodes[0] || null,
        preferred_timing: validatedData.timingPreference || "flexible",
        preferred_times: validatedData.preferred_times,
        // LEGACY: budget_range mirrors cost_approach; kept for backward compatibility
        budget_range: validatedData.budgetRange || null,
        cost_approach: validatedData.costApproach || null,
        monthly_payment_range: validatedData.monthlyPaymentRange || null,
        strict_budget_mode: validatedData.strictBudgetMode || null,
        strict_budget_amount: validatedData.strictBudgetAmount,
        outcome_treatment: validatedData.outcomeTreatment || null,
        outcome_priority: validatedData.outcomePriority || null,
        outcome_priority_key: validatedData.outcomePriorityKey || null,
        location_preference: validatedData.locationPreference || null,
        anxiety_level: validatedData.anxietyLevel || null,
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        email: email,
        phone: phone,
        city: validatedData.city || null,
        consent_contact: validatedData.consentContact,
        consent_terms: validatedData.consentTerms,
        consent_marketing: validatedData.consentMarketing,
        contact_method: contactMethod,
        contact_value: email || phone || null,
        form_version: validatedData.formVersion,
        schema_version: validatedData.schemaVersion,
        raw_answers: rawAnswers,
        source: body.source || "match",
        is_verified: !!authUserId,
        ...(authUserId ? { user_id: authUserId, verified_at: new Date().toISOString() } : {}),
      })
      .select()
      .single()

    if (insertError) {
      console.error("[leads] Error creating lead:", insertError)
      throw insertError
    }

    // Record successful submission for rate limiting
    leadRateLimiter.record(rateLimitKey)
    leadIpLimiter.record(ip)

    // Fire TikTok CompleteRegistration event (server-side, non-blocking)
    const appUrl = getAppUrl()
    trackTikTokServerEvent({
      event: "CompleteRegistration",
      eventId: body.tiktok_event_id || undefined,
      url: `${appUrl}/intake`,
      email: email as string | null,
      phone: phone as string | null,
      externalId: insertedLead.id,
      ip,
      userAgent: extractUserAgent(request),
      properties: {
        content_name: "intake_form",
        content_type: "lead",
        content_id: insertedLead.id,
      },
    }).catch(() => {})

    return NextResponse.json({ leadId: insertedLead.id }, { status: 201 })
  } catch (error) {
    console.error("[leads] Error in lead creation:", error)
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 })
  }
}
