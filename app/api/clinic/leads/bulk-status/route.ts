import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { BOOKING_FEE_AMOUNT, CURRENCY } from "@/lib/stripe"
import { getDisputeWindowEnd } from "@/lib/billing"

const VALID_STATUSES = [
  "NEW",
  "CONTACTED",
  "IN_PROGRESS",
  "BOOKED_PENDING",
  "BOOKED_CONFIRMED",
  "ATTENDED",
  "NOT_SUITABLE",
  "NO_RESPONSE",
  "CLOSED",
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { leadIds, clinicId, status } = body

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "leadIds must be a non-empty array" }, { status: 400 })
    }

    if (!clinicId || typeof clinicId !== "string") {
      return NextResponse.json({ error: "clinicId is required" }, { status: 400 })
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 })
    }

    // Verify the user owns this clinic
    const { data: clinicUser } = await supabase
      .from("clinic_users")
      .select("clinic_id")
      .eq("user_id", user.id)
      .eq("clinic_id", clinicId)
      .single()

    if (!clinicUser) {
      // Check portal users as fallback
      const { data: portalUser } = await supabase
        .from("clinic_portal_users")
        .select("clinic_ids")
        .eq("email", user.email)
        .single()

      if (!portalUser?.clinic_ids?.includes(clinicId)) {
        return NextResponse.json({ error: "Unauthorized for this clinic" }, { status: 403 })
      }
    }

    // Update all lead statuses in batch
    const now = new Date().toISOString()
    let updatedCount = 0

    for (const leadId of leadIds) {
      const { data: existing } = await supabase
        .from("lead_clinic_status")
        .select("lead_id")
        .eq("lead_id", leadId)
        .eq("clinic_id", clinicId)
        .single()

      if (existing) {
        const { error } = await supabase
          .from("lead_clinic_status")
          .update({
            status,
            updated_by: user.id,
            updated_at: now,
          })
          .eq("lead_id", leadId)
          .eq("clinic_id", clinicId)

        if (!error) updatedCount++
      } else {
        const { error } = await supabase.from("lead_clinic_status").insert({
          lead_id: leadId,
          clinic_id: clinicId,
          status,
          updated_by: user.id,
        })

        if (!error) updatedCount++
      }
    }

    // Create booking charges for leads marked as ATTENDED
    if (status === "ATTENDED" && updatedCount > 0) {
      const adminClient = createAdminClient()
      for (const leadId of leadIds) {
        try {
          // Check for existing charge to prevent duplicates
          const { data: existingCharge } = await adminClient
            .from("booking_charges")
            .select("id")
            .eq("lead_id", leadId)
            .eq("clinic_id", clinicId)
            .single()

          if (existingCharge) continue

          // Get lead info for description
          const { data: lead } = await adminClient
            .from("leads")
            .select("first_name, last_name, raw_answers")
            .eq("id", leadId)
            .single()

          const patientName = lead
            ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim()
            : "Unknown Patient"
          const rawAnswers = lead?.raw_answers as Record<string, unknown> | null
          const treatment = (rawAnswers?.treatment as string) || null

          // Get booking ID if exists
          const { data: booking } = await adminClient
            .from("bookings")
            .select("id")
            .eq("lead_id", leadId)
            .eq("clinic_id", clinicId)
            .single()

          await adminClient.from("booking_charges").insert({
            booking_id: booking?.id || null,
            lead_id: leadId,
            clinic_id: clinicId,
            patient_name: patientName,
            treatment: treatment?.replace(/_/g, " ") || null,
            amount: BOOKING_FEE_AMOUNT,
            currency: CURRENCY,
            attendance_status: "auto_confirmed",
            dispute_window_ends_at: getDisputeWindowEnd().toISOString(),
          })

          await adminClient.from("billing_events").insert({
            event_type: "booking_charged",
            clinic_id: clinicId,
            metadata: {
              lead_id: leadId,
              amount: BOOKING_FEE_AMOUNT,
              patient_name: patientName,
              source: "bulk_status_update",
            },
          })
        } catch (chargeErr) {
          console.error(`[bulk-status] Failed to create booking charge for lead ${leadId}:`, chargeErr)
        }
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: leadIds.length,
    })
  } catch (error) {
    console.error("Bulk status update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
