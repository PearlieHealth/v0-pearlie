import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params

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

    // Verify conversation belongs to this clinic
    const { data: conversation, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, clinic_id")
      .eq("id", conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    if (conversation.clinic_id !== clinicUser.clinic_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (messagesError) {
      console.error("[Messages] Failed to fetch:", messagesError)
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      )
    }

    // Mark conversation as read by clinic
    await supabaseAdmin
      .from("conversations")
      .update({ unread_by_clinic: false, unread_count_clinic: 0 })
      .eq("id", conversationId)

    return NextResponse.json({
      messages: messages || [],
    })
  } catch (error) {
    console.error("[Messages] Unexpected error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
