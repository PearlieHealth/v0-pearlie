export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"

/**
 * POST /api/booking/confirm
 * Patient confirms they want to book with a specific clinic
 * This sends a notification to the clinic with patient contact info
 */
export async function POST(request: Request) {
  try {
    const { leadId, clinicId } = await request.json()

    if (!leadId || !clinicId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[booking/confirm] Processing booking confirmation", { leadId, clinicId })

    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // Generate a unique booking token
    const bookingToken = randomBytes(16).toString("hex")

    // Update lead with booking status
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        booking_status: "pending",
        booking_confirmed_at: new Date().toISOString(),
        booking_token: bookingToken,
      })
      .eq("id", leadId)

    if (updateError) {
      console.error("[booking/confirm] Failed to update lead:", updateError)
      return NextResponse.json({ error: "Failed to update booking status" }, { status: 500 })
    }

    // Record the lead action
    await supabase
      .from("lead_actions")
      .insert({
        lead_id: leadId,
        clinic_id: clinicId,
        action_type: "booking_confirmed",
        metadata: {
          timestamp: new Date().toISOString(),
          booking_token: bookingToken,
        },
      })
      .single()

    // Update affiliate conversion if this lead has one (non-blocking)
    try {
      const { data: conversion } = await supabaseAdmin
        .from("referral_conversions")
        .select("id, affiliate_id, commission_amount")
        .eq("lead_id", leadId)
        .eq("status", "pending_verification")
        .maybeSingle()

      if (conversion) {
        await supabaseAdmin
          .from("referral_conversions")
          .update({
            status: "confirmed",
            confirmed_at: new Date().toISOString(),
          })
          .eq("id", conversion.id)

        // Increment affiliate's total_earned
        const { data: affiliate } = await supabaseAdmin
          .from("affiliates")
          .select("total_earned")
          .eq("id", conversion.affiliate_id)
          .single()

        if (affiliate) {
          await supabaseAdmin
            .from("affiliates")
            .update({
              total_earned: (affiliate.total_earned || 0) + (conversion.commission_amount || 0),
            })
            .eq("id", conversion.affiliate_id)
        }
      }
    } catch (affErr) {
      console.error("[booking/confirm] Affiliate tracking failed (non-blocking):", affErr)
    }

    // Fetch lead and clinic data for email
    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .select(
        "first_name, last_name, email, phone, treatment_interest, postcode, budget_range, preferred_timing, preferred_times, created_at, location_preference, anxiety_level, decision_values, conversion_blocker, raw_answers"
      )
      .eq("id", leadId)
      .maybeSingle()

    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("name, notification_email, email, notification_preferences")
      .eq("id", clinicId)
      .maybeSingle()

    if (!leadData || !clinic) {
      console.error("[booking/confirm] Lead or clinic data missing", {
        leadId,
        clinicId,
        hasLeadData: !!leadData,
        hasClinic: !!clinic,
      })
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: "Booking confirmed but email notification failed"
      })
    }

    // Check notification preferences — default to sending if not configured
    const prefs = (clinic.notification_preferences as Record<string, boolean> | null) || {}
    if (prefs.booking_confirmations === false) {
      console.log("[booking/confirm] Clinic has disabled booking confirmation emails:", clinic.name)
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: "Booking confirmed - email notifications disabled by clinic"
      })
    }

    const recipientEmail = clinic.notification_email || clinic.email

    if (!recipientEmail) {
      console.log("[booking/confirm] No notification email configured for clinic:", clinic.name)
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: "Booking confirmed - clinic will be notified"
      })
    }

    // Send clinic notification email
    try {
      const result = await sendRegisteredEmail({
        type: EMAIL_TYPE.BOOKING_CONFIRMATION,
        to: recipientEmail,
        data: {
          clinicName: clinic.name,
          firstName: leadData.first_name || "",
          lastName: leadData.last_name || "",
          email: leadData.email || "",
          phone: leadData.phone || "",
          treatment: leadData.treatment_interest || "",
          postcode: leadData.postcode || "",
          preferredTiming: leadData.preferred_timing || "",
          preferredTimes: leadData.preferred_times || [],
          createdAt: leadData.created_at || new Date().toISOString(),
          rawAnswers: leadData.raw_answers || {},
        },
        clinicId,
        leadId,
      })

      return NextResponse.json({
        success: true,
        emailSent: result.success && !result.skipped,
        bookingToken,
      })
    } catch (emailError: any) {
      console.error("[booking/confirm] Exception sending email:", emailError)
      return NextResponse.json({
        success: true,
        emailSent: false,
        bookingToken,
      })
    }
  } catch (error) {
    console.error("[booking/confirm] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

