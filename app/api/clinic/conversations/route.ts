import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get clinic ID from clinic_users table using admin client
    const supabaseAdmin = createAdminClient()
    const { data: clinicUser } = await supabaseAdmin
      .from("clinic_users")
      .select("clinic_id")
      .eq("user_id", user.id)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "No clinic found" }, { status: 404 })
    }

    // Get conversations for this clinic
    // Try with conversation_state columns; fall back without them if migration not yet applied
    const fullSelect = `
      id, lead_id, status, last_message_at, unread_by_clinic, unread_count_clinic,
      created_at, conversation_state, booked_at, closed_at, closed_reason
    `
    const baseSelect = `
      id, lead_id, status, last_message_at, unread_by_clinic, unread_count_clinic, created_at
    `

    const fullResult = await supabaseAdmin
      .from("conversations")
      .select(fullSelect)
      .eq("clinic_id", clinicUser.clinic_id)
      .order("last_message_at", { ascending: false, nullsFirst: false })

    let conversations: any[] | null = fullResult.data
    let error = fullResult.error

    if (error) {
      console.warn("[Conversations] conversation_state columns not available, falling back:", error.message)
      const baseResult = await supabaseAdmin
        .from("conversations")
        .select(baseSelect)
        .eq("clinic_id", clinicUser.clinic_id)
        .order("last_message_at", { ascending: false, nullsFirst: false })
      conversations = baseResult.data
      error = baseResult.error
    }

    if (error) {
      console.error("[Conversations] Failed to fetch:", error)
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      )
    }

    // Get lead details for each conversation
    const conversationsWithLeads = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: lead } = await supabaseAdmin
          .from("leads")
          .select("first_name, last_name, email, phone, treatment_interest, primary_treatment")
          .eq("id", conv.lead_id)
          .single()

        // Get latest message (include bot messages so preview is always current)
        const { data: latestMessage } = await supabaseAdmin
          .from("messages")
          .select("content, sender_type")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        return {
          ...conv,
          lead,
          latest_message: latestMessage?.content,
          latest_message_sender: latestMessage?.sender_type,
        }
      })
    )

    return NextResponse.json({
      conversations: conversationsWithLeads,
    })
  } catch (error) {
    console.error("[Conversations] Unexpected error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
