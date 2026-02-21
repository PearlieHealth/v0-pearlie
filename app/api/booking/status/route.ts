import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Lightweight check: has this lead already requested an appointment with this clinic?
 * Used by the booking confirm page to detect refresh / re-visit after confirmation.
 * No auth required — leadId acts as a secret (UUID only known to the patient).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get("leadId")
    const clinicId = searchParams.get("clinicId")

    if (!leadId || !clinicId || !UUID_REGEX.test(leadId) || !UUID_REGEX.test(clinicId)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: conv } = await supabase
      .from("conversations")
      .select("id, appointment_requested_at")
      .eq("lead_id", leadId)
      .eq("clinic_id", clinicId)
      .limit(1)
      .maybeSingle()

    const alreadyRequested = !!conv?.appointment_requested_at
    return NextResponse.json({
      alreadyRequested,
      conversationId: alreadyRequested ? conv.id : null,
    })
  } catch (error) {
    console.error("[booking-status] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
