import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await params

    if (!leadId) {
      return NextResponse.json({ error: "Lead ID required" }, { status: 400 })
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, first_name, last_name, email, phone, treatment_interest, postcode, preferred_times")
      .eq("id", leadId)
      .single()

    if (error || !lead) {
      console.error("[leads-api] Lead not found:", error)
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error("[leads-api] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
