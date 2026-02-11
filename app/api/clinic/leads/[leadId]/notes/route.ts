import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params
  const supabase = await createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get clinic ID from user
  const { data: clinicUser } = await supabaseAdmin
    .from("clinic_users")
    .select("clinic_id")
    .eq("user_id", session.user.id)
    .single()

  if (!clinicUser) {
    return NextResponse.json({ error: "No clinic found" }, { status: 403 })
  }

  const { data: status } = await supabaseAdmin
    .from("lead_clinic_status")
    .select("staff_notes")
    .eq("lead_id", leadId)
    .eq("clinic_id", clinicUser.clinic_id)
    .single()

  return NextResponse.json({ notes: status?.staff_notes || [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params
  const supabase = await createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { text } = await request.json()
  if (!text?.trim()) {
    return NextResponse.json({ error: "Note text required" }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: clinicUser } = await supabaseAdmin
    .from("clinic_users")
    .select("clinic_id, email")
    .eq("user_id", session.user.id)
    .single()

  if (!clinicUser) {
    return NextResponse.json({ error: "No clinic found" }, { status: 403 })
  }

  // Get current notes
  const { data: status } = await supabaseAdmin
    .from("lead_clinic_status")
    .select("staff_notes")
    .eq("lead_id", leadId)
    .eq("clinic_id", clinicUser.clinic_id)
    .single()

  const currentNotes = status?.staff_notes || []
  const newNote = {
    text: text.trim(),
    created_at: new Date().toISOString(),
    created_by: clinicUser.email || session.user.email,
  }

  const updatedNotes = [...currentNotes, newNote]

  // Upsert the status row with updated notes
  const { error } = await supabaseAdmin
    .from("lead_clinic_status")
    .upsert(
      {
        lead_id: leadId,
        clinic_id: clinicUser.clinic_id,
        staff_notes: updatedNotes,
      },
      { onConflict: "lead_id,clinic_id" }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notes: updatedNotes })
}
