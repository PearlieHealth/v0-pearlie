import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/leads/direct
 * Creates a lightweight lead from a direct clinic profile visit.
 * Only collects name, email, phone, treatment interest, and urgency.
 * Skips the full intake questionnaire.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { firstName, lastName, email, phone, treatmentInterest, urgency, clinicId } = body

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: "First and last name are required" }, { status: 400 })
    }

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 })
    }

    if (!phone?.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    if (!clinicId) {
      return NextResponse.json({ error: "Clinic ID is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the clinic exists and is live
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name, is_live")
      .eq("id", clinicId)
      .single()

    if (clinicError || !clinic || !clinic.is_live) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    // Create the lead with source = "direct_profile"
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        treatment_interest: treatmentInterest || "",
        preferred_timing: urgency || "flexible",
        source: "direct_profile",
        consent_contact: true,
        contact_method: "email",
        contact_value: email.trim().toLowerCase(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("[leads/direct] Error creating lead:", insertError)
      return NextResponse.json({ error: "Failed to create enquiry" }, { status: 500 })
    }

    return NextResponse.json({
      leadId: lead.id,
      clinicId: clinic.id,
    })
  } catch (error) {
    console.error("[leads/direct] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
