import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAffiliateAudit } from "@/lib/affiliate-audit"

/**
 * POST /api/booking/cancel
 * Cancels a confirmed booking and reverses affiliate commission if applicable.
 * Called by clinic via booking token.
 */
export async function POST(request: Request) {
  try {
    const { token, reason } = await request.json()

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing booking token" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Find lead by booking token
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, booking_status, first_name, email")
      .eq("booking_token", token)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Invalid booking token" }, { status: 404 })
    }

    // Only confirmed bookings can be cancelled
    if (lead.booking_status !== "confirmed") {
      return NextResponse.json(
        { error: `Cannot cancel booking with status: ${lead.booking_status}` },
        { status: 400 }
      )
    }

    // Update lead status to cancelled
    await supabase
      .from("leads")
      .update({
        booking_status: "cancelled",
      })
      .eq("id", lead.id)

    // Reverse affiliate conversion if one was confirmed
    const { data: conversion } = await supabase
      .from("referral_conversions")
      .select("id, affiliate_id, commission_amount, status")
      .eq("lead_id", lead.id)
      .eq("status", "confirmed")
      .maybeSingle()

    if (conversion) {
      // Mark conversion as rejected (reversal)
      await supabase
        .from("referral_conversions")
        .update({ status: "rejected" })
        .eq("id", conversion.id)
        .eq("status", "confirmed") // Guard: only reverse if still confirmed

      // Reverse the earned amount atomically
      await supabase.rpc("decrement_affiliate_earned", {
        aff_id: conversion.affiliate_id,
        amount: conversion.commission_amount || 0,
      })

      // Audit log
      logAffiliateAudit(supabase, {
        affiliate_id: conversion.affiliate_id,
        action: "conversion_reversed",
        entity_type: "referral_conversion",
        entity_id: conversion.id,
        details: {
          lead_id: lead.id,
          commission_amount: conversion.commission_amount || 0,
          reason: reason || "booking_cancelled",
          previous_status: "confirmed",
        },
        performed_by: "clinic",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Booking cancelled",
      conversion_reversed: !!conversion,
    })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
