import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const admin = createAdminClient()

    // Find all leads for this user (by user_id or email match)
    const { data: leads } = await admin
      .from("leads")
      .select("id, user_id")
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)

    if (!leads || leads.length === 0) {
      return NextResponse.json({ conversations: [] })
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

    // Get conversations with clinic details
    const { data: conversations, error: convsError } = await admin
      .from("conversations")
      .select(`
        id, clinic_id, lead_id, status, last_message_at,
        unread_by_patient, unread_count_patient,
        appointment_requested_at,
        clinics:clinic_id (id, name, images)
      `)
      .in("lead_id", leadIds)
      .order("last_message_at", { ascending: false, nullsFirst: false })

    if (convsError) {
      console.error("[patient/conversations] Error fetching conversations:", convsError)
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
    }

    // Enrich with latest message preview
    const enriched = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: latestMessage } = await admin
          .from("messages")
          .select("content, sender_type")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        return {
          ...conv,
          latest_message: latestMessage?.content?.substring(0, 100) || null,
          latest_message_sender: latestMessage?.sender_type || null,
        }
      })
    )

    return NextResponse.json({ conversations: enriched })
  } catch (error) {
    console.error("[patient/conversations] Error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
