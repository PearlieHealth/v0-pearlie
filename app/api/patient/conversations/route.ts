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
    // Try with conversation_state columns first; fall back without them if migration not yet applied
    let conversations: any[] | null = null
    let convsError: any = null

    const fullSelect = `
      id, clinic_id, lead_id, status, last_message_at,
      unread_by_patient, unread_count_patient,
      appointment_requested_at,
      conversation_state, booked_at, closed_at, closed_reason, muted_by_patient,
      clinics:clinic_id (id, name, images)
    `
    const baseSelect = `
      id, clinic_id, lead_id, status, last_message_at,
      unread_by_patient, unread_count_patient,
      appointment_requested_at,
      clinics:clinic_id (id, name, images)
    `

    const fullResult = await admin
      .from("conversations")
      .select(fullSelect)
      .in("lead_id", leadIds)
      .order("last_message_at", { ascending: false, nullsFirst: false })

    if (fullResult.error) {
      // Column likely doesn't exist yet — fall back to base query
      console.warn("[patient/conversations] Full query failed, falling back:", fullResult.error.message)
      const baseResult = await admin
        .from("conversations")
        .select(baseSelect)
        .in("lead_id", leadIds)
        .order("last_message_at", { ascending: false, nullsFirst: false })

      conversations = baseResult.data
      convsError = baseResult.error
    } else {
      conversations = fullResult.data
    }

    if (convsError) {
      console.error("[patient/conversations] Error fetching conversations:", convsError)
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
    }

    // Enrich with latest message preview (use allSettled so one failure doesn't crash the whole inbox)
    const settled = await Promise.allSettled(
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

    const enriched: any[] = []
    settled.forEach((result, i) => {
      if (result.status === "fulfilled") {
        enriched.push(result.value)
      } else {
        // Include conversation without preview rather than dropping it
        console.warn(`[patient/conversations] Message preview failed for conversation ${conversations![i].id}`)
        enriched.push({
          ...conversations![i],
          latest_message: null,
          latest_message_sender: null,
        })
      }
    })

    // Re-sort to maintain order (failed enrichments may have been appended out of order)
    enriched.sort((a: any, b: any) => {
      const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      return timeB - timeA
    })

    return NextResponse.json({ conversations: enriched })
  } catch (error) {
    console.error("[patient/conversations] Error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
