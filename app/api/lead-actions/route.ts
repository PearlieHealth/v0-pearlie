export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"
import { NextResponse } from "next/server"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"

export async function POST(request: Request) {
  try {
    const { leadId, clinicId, actionType } = await request.json()

    if (!leadId || !clinicId || !actionType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[lead-actions] Processing action", { leadId, clinicId, actionType })

    // Auth: require authenticated user whose ID matches the lead's user_id.
    // If the lead has no user_id yet (pre-OTP or failed account creation),
    // still allow authenticated users who own the email on the lead.
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()
    const { data: leadOwner } = await supabaseAdmin
      .from("leads")
      .select("user_id, email")
      .eq("id", leadId)
      .maybeSingle()

    if (!leadOwner) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Verify ownership: user_id match, or email match if user_id not yet set
    const ownsLead =
      (leadOwner.user_id && leadOwner.user_id === user.id) ||
      (!leadOwner.user_id && leadOwner.email && leadOwner.email.toLowerCase() === user.email?.toLowerCase())

    if (!ownsLead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const supabase = await createClient()

    const { data: lead, error: leadError } = await supabase.from("leads").select("id").eq("id", leadId).maybeSingle()

    if (!lead || leadError) {
      console.error("[lead-actions] Lead not found:", leadId, leadError)
      return NextResponse.json({ error: "Lead not found" }, { status: 400 })
    }

    const { data: actionRecord, error: insertError } = await supabase
      .from("lead_actions")
      .insert({
        lead_id: leadId,
        clinic_id: clinicId,
        action_type: actionType,
        metadata: {
          timestamp: new Date().toISOString(),
          source: "match_page",
        },
      })
      .select("id")
      .maybeSingle()

    if (insertError && insertError.code === "23505") {
      console.log("[lead-actions] Duplicate action prevented", { leadId, clinicId, actionType })
      return NextResponse.json({
        success: true,
        alreadyNotified: true,
        emailSent: false,
      })
    }

    if (insertError) {
      console.error("[lead-actions] Error recording lead action:", insertError)
      return NextResponse.json({ error: "Failed to record action" }, { status: 500 })
    }

    console.log("[lead-actions] Action recorded successfully")

    // Send email notification in background (non-blocking)
    const emailPromise = (async () => {
      try {
        const { data: leadData, error: leadDataError } = await supabase
          .from("leads")
          .select(
            "first_name, last_name, email, phone, treatment_interest, postcode, budget_range, preferred_timing, preferred_times, booking_token, booking_date, booking_time, created_at, location_preference, anxiety_level, decision_values, conversion_blocker, raw_answers",
          )
          .eq("id", leadId)
          .maybeSingle()

        const { data: clinic, error: clinicError } = await supabase
          .from("clinics")
          .select("name, notification_email, email, notification_preferences")
          .eq("id", clinicId)
          .maybeSingle()

        if (!leadData || !clinic) {
          console.error("[lead-actions] Lead or clinic data missing for email", {
            leadId,
            clinicId,
            hasLeadData: !!leadData,
            hasClinic: !!clinic,
          })
          return
        }

        // Check notification preferences — default to sending if not configured
        const prefs = (clinic.notification_preferences as Record<string, boolean> | null) || {}
        if (prefs.new_leads === false) {
          console.log("[lead-actions] Clinic has disabled new lead alerts:", clinic.name)
          return
        }

        const recipientEmail = clinic.notification_email || clinic.email

        if (!recipientEmail) {
          console.log("[lead-actions] No notification email configured for clinic:", clinic.name)
          return
        }

        await sendClinicNotification({
          recipientEmail,
          clinicName: clinic.name,
          clinicId,
          leadId,
          actionType,
          lead: {
            firstName: leadData.first_name || "",
            lastName: leadData.last_name || "",
            email: leadData.email || "",
            phone: leadData.phone || "",
            treatment: leadData.treatment_interest || "",
            postcode: leadData.postcode || "",
            budget: leadData.budget_range || "",
            timing: leadData.preferred_timing || "",
            preferredTimes: leadData.preferred_times || [],
            bookingToken: leadData.booking_token || "",
            bookingDate: leadData.booking_date || null,
            bookingTime: leadData.booking_time || null,
            submittedAt: leadData.created_at || new Date().toISOString(),
            locationPreference: leadData.location_preference || "",
            anxietyLevel: leadData.anxiety_level || "",
            decisionValues: leadData.decision_values || [],
            conversionBlocker: leadData.conversion_blocker || "",
            rawAnswers: leadData.raw_answers || {},
          },
        })
      } catch (backgroundError) {
        console.error("[lead-actions] Background email error:", backgroundError)
      }
    })()

    // Wait for email to complete before returning (serverless functions may terminate early otherwise)
    await emailPromise

    return NextResponse.json({
      success: true,
      emailSent: true,
      alreadyNotified: false,
    })
  } catch (error) {
    console.error("[lead-actions] Error in lead-actions API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function sendClinicNotification({
  recipientEmail,
  clinicName,
  clinicId,
  leadId,
  actionType,
  lead,
}: {
  recipientEmail: string
  clinicName: string
  clinicId: string
  leadId: string
  actionType: string
  lead: {
    firstName: string
    lastName: string
    email: string
    phone: string
    treatment: string
    postcode: string
    budget: string
    timing: string
    preferredTimes: string[]
    bookingToken: string
    bookingDate?: string | null
    bookingTime?: string | null
    submittedAt: string
    locationPreference: string
    anxietyLevel: string
    decisionValues: string[]
    conversionBlocker: string
    rawAnswers: Record<string, any>
  }
}): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await sendRegisteredEmail({
      type: EMAIL_TYPE.LEAD_ACTION_NOTIFICATION,
      to: recipientEmail,
      data: {
        clinicName,
        clinicId,
        actionType,
        ...lead,
        _leadId: leadId,
        _clinicId: clinicId,
      },
      clinicId,
      leadId,
    })

    if (!result.success) {
      console.error("[lead-actions] Email send failed:", result.error)
      return { success: false, error: result.error }
    }

    console.log("[lead-actions] Email sent successfully, ID:", result.messageId)
    return { success: true }
  } catch (error: any) {
    console.error("[lead-actions] Exception sending email:", error)
    return { success: false, error: error.message }
  }
}
