import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    // Get the authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const admin = createAdminClient()

    // Find all leads for this user (by user_id or email match)
    const { data: leads, error: leadsError } = await admin
      .from("leads")
      .select("id, first_name, last_name, email, treatment_interest, postcode, created_at, is_verified, user_id")
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .order("created_at", { ascending: false })

    if (leadsError) {
      console.error("[patient/matches] Error fetching leads:", leadsError)
      return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 })
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ leads: [], matches: [], conversations: [] })
    }

    // Link any unlinked leads to this user
    const unlinkedLeads = leads.filter((l) => !l.user_id)
    if (unlinkedLeads.length > 0) {
      await admin
        .from("leads")
        .update({ user_id: user.id })
        .in("id", unlinkedLeads.map((l) => l.id))
    }

    const leadIds = leads.map((l) => l.id)

    // Get matches for these leads
    const { data: matches, error: matchesError } = await admin
      .from("matches")
      .select("id, lead_id, clinic_ids, status, created_at")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false })

    if (matchesError) {
      console.error("[patient/matches] Error fetching matches:", matchesError)
    }

    // Get conversations for these leads
    const { data: conversations, error: convsError } = await admin
      .from("conversations")
      .select(`
        id, clinic_id, lead_id, status, last_message_at, unread_by_patient, unread_count_patient,
        clinics:clinic_id (id, name, images)
      `)
      .in("lead_id", leadIds)
      .order("last_message_at", { ascending: false })

    if (convsError) {
      console.error("[patient/matches] Error fetching conversations:", convsError)
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || "",
      },
      leads: leads || [],
      matches: matches || [],
      conversations: conversations || [],
    })
  } catch (error) {
    console.error("[patient/matches] Error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
