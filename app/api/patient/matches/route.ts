import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const matchesLimit = Math.min(parseInt(searchParams.get("matchesLimit") || "10", 10), 100)
    const matchesOffset = parseInt(searchParams.get("matchesOffset") || "0", 10)
    const convsLimit = Math.min(parseInt(searchParams.get("convsLimit") || "10", 10), 100)
    const convsOffset = parseInt(searchParams.get("convsOffset") || "0", 10)

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
      .select("id, first_name, last_name, email, treatment_interest, postcode, created_at, is_verified, user_id, booking_date, booking_time, booking_clinic_id, booking_status, booking_decline_reason, booking_cancel_reason, booking_completed_at")
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .order("created_at", { ascending: false })

    if (leadsError) {
      console.error("[patient/matches] Error fetching leads:", leadsError)
      return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 })
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        leads: [], matches: [], conversations: [],
        matchesTotal: 0, conversationsTotal: 0,
      })
    }

    // Link any unlinked leads to this user
    const unlinkedLeads = leads.filter((l) => !l.user_id)
    if (unlinkedLeads.length > 0) {
      await admin
        .from("leads")
        .update({ user_id: user.id })
        .in("id", unlinkedLeads.map((l) => l.id))
    }

    // Auto-expire stale appointment requests (pending > 30 days)
    const staleLeadIds = leads
      .filter((l) => l.booking_status === "pending" && l.booking_date)
      .filter((l) => {
        const bookingDate = new Date(l.booking_date + "T00:00:00")
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return bookingDate < thirtyDaysAgo
      })
      .map((l) => l.id)

    if (staleLeadIds.length > 0) {
      await admin
        .from("leads")
        .update({ booking_status: "expired" })
        .in("id", staleLeadIds)

      // Clear appointment_requested_at on conversations so patient can re-request
      for (const sLeadId of staleLeadIds) {
        await admin
          .from("conversations")
          .update({ appointment_requested_at: null })
          .eq("lead_id", sLeadId)
      }

      // Update local data to reflect expiry
      for (const lead of leads) {
        if (staleLeadIds.includes(lead.id)) {
          lead.booking_status = "expired"
        }
      }
    }

    // Note: confirmed appointments are NOT auto-completed — only the clinic
    // can mark an appointment as completed after verifying attendance.

    const leadIds = leads.map((l) => l.id)

    // Get matches for these leads with pagination
    const [
      { data: matches, error: matchesError },
      { count: matchesTotal },
      { data: conversations, error: convsError },
      { count: convsTotal },
    ] = await Promise.all([
      admin
        .from("matches")
        .select("id, lead_id, clinic_ids, status, created_at")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false })
        .range(matchesOffset, matchesOffset + matchesLimit - 1),
      admin
        .from("matches")
        .select("*", { count: "exact", head: true })
        .in("lead_id", leadIds),
      admin
        .from("conversations")
        .select(`
          id, clinic_id, lead_id, status, last_message_at, unread_by_patient, unread_count_patient,
          clinics:clinic_id (id, name, images)
        `)
        .in("lead_id", leadIds)
        .order("last_message_at", { ascending: false })
        .range(convsOffset, convsOffset + convsLimit - 1),
      admin
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .in("lead_id", leadIds),
    ])

    if (matchesError) {
      console.error("[patient/matches] Error fetching matches:", matchesError)
    }
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
      matchesTotal: matchesTotal || 0,
      conversationsTotal: convsTotal || 0,
    })
  } catch (error) {
    console.error("[patient/matches] Error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
