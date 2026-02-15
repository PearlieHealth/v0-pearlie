import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params

    if (!leadId) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, is_verified, first_name")
      .eq("id", leadId)
      .single()

    if (error || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Only return minimal fields — no email or last name (PII)
    return NextResponse.json({
      leadId: lead.id,
      isVerified: lead.is_verified ?? false,
      firstName: lead.first_name,
    })
  } catch (error) {
    console.error("[LeadStatus] Unexpected error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
