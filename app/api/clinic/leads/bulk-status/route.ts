import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
        .select("id")
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
          .eq("id", existing.id)

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
