import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { leadId, clinicIds } = body
    
    console.log("[v0] Creating match record for lead:", leadId, "clinics:", clinicIds?.length)
    
    if (!leadId || !clinicIds || !Array.isArray(clinicIds) || clinicIds.length === 0) {
      console.error("[v0] Invalid match data - leadId:", leadId, "clinicIds:", clinicIds)
      return NextResponse.json({ error: "Invalid lead or clinic data" }, { status: 400 })
    }

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .insert({
        lead_id: leadId,
        clinic_ids: clinicIds,
        status: "pending",
      })
      .select()
      .single()

    if (matchError) throw matchError

    return NextResponse.json({ matchId: match.id }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating match:", error)
    return NextResponse.json({ error: "Failed to create match" }, { status: 500 })
  }
}
