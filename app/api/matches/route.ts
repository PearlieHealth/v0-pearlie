import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

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
