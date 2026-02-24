import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAffiliateAudit } from "@/lib/affiliate-audit"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const allowedFields = ["status", "commission_per_booking"]
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // Validate status
    if (updates.status && !["pending", "approved", "suspended"].includes(updates.status as string)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Validate commission
    if (updates.commission_per_booking !== undefined && (typeof updates.commission_per_booking !== "number" || updates.commission_per_booking < 0)) {
      return NextResponse.json({ error: "Invalid commission amount" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch current state for audit trail
    const { data: before } = await supabase
      .from("affiliates")
      .select("status, commission_per_booking")
      .eq("id", id)
      .single()

    const { data, error } = await supabase
      .from("affiliates")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to update affiliate" }, { status: 500 })
    }

    // Audit log each change
    if (updates.status && before?.status !== updates.status) {
      logAffiliateAudit(supabase, {
        affiliate_id: id,
        action: `status_changed_to_${updates.status}`,
        entity_type: "referral_conversion", // reusing entity_type for affiliate-level events
        entity_id: id,
        details: {
          old_status: before?.status,
          new_status: updates.status,
        },
        performed_by: "admin",
      })
    }
    if (updates.commission_per_booking !== undefined && before?.commission_per_booking !== updates.commission_per_booking) {
      logAffiliateAudit(supabase, {
        affiliate_id: id,
        action: "commission_changed",
        entity_type: "referral_conversion",
        entity_id: id,
        details: {
          old_commission: before?.commission_per_booking,
          new_commission: updates.commission_per_booking,
        },
        performed_by: "admin",
      })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
