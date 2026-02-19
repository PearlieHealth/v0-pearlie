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

    // Get conversations with joined lead details and latest message in a single query
    const { data: conversations, error } = await supabaseAdmin
      .from("conversations")
      .select(`
        id,
        lead_id,
        status,
        last_message_at,
        unread_by_clinic,
        unread_count_clinic,
        created_at,
        leads!inner(first_name, last_name, email, phone, treatment_interest, primary_treatment),
        messages(content, sender_type, created_at)
      `)
      .eq("clinic_id", clinicUser.clinic_id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { referencedTable: "messages", ascending: false })
      .limit(1, { referencedTable: "messages" })

    if (error) {
      console.error("[Conversations] Failed to fetch:", error)
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      )
    }

    // Map joined result to existing response shape
    const conversationsWithLeads = (conversations || []).map((conv) => {
      const { leads, messages, ...rest } = conv as any
      const latestMessage = messages?.[0]
      return {
        ...rest,
        lead: leads,
        latest_message: latestMessage?.content,
        latest_message_sender: latestMessage?.sender_type,
      }
    })

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
