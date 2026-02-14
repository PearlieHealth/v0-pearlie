import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"

export async function GET(request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await params

    if (!leadId) {
      return NextResponse.json({ error: "Lead ID required" }, { status: 400 })
    }

    // Require authentication — either clinic user or patient with matching lead
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, first_name, last_name, email, phone, treatment_interest, postcode, preferred_times, user_id")
      .eq("id", leadId)
      .single()

    if (error || !lead) {
      console.error("[leads-api] Lead not found:", error)
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Authorization: user must own the lead OR be a clinic user with the lead assigned
    const isOwner = lead.user_id === user.id || lead.email === user.email
    if (!isOwner) {
      // Check if user is a clinic user who has this lead in their matches
      const { data: clinicUser } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .single()

      if (!clinicUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }

      // Verify the clinic has this lead in their match results
      const { data: matchResult } = await supabase
        .from("match_results")
        .select("id")
        .eq("lead_id", leadId)
        .eq("clinic_id", clinicUser.clinic_id)
        .limit(1)
        .maybeSingle()

      if (!matchResult) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }
    }

    // Return lead data without internal fields
    const { user_id, ...safeLeadData } = lead
    return NextResponse.json(safeLeadData)
  } catch (error) {
    console.error("[leads-api] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
