import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBotClinicReplied } from "@/lib/chat-bot"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"

export async function POST(request: NextRequest) {
  try {
    const { conversationId, content } = await request.json()

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: "Conversation ID and content are required" },
        { status: 400 }
      )
    }

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
      .select("id, clinic_id, clinic_first_reply_at, unread_count_patient")
      .eq("id", conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    if (conversation.clinic_id !== clinicUser.clinic_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Create message with delivery status
    const { data: message, error: messageError } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_type: "clinic",
        content: content.trim(),
        sent_via: "chat",
        status: "sent",
      })
      .select("*")
      .single()

    if (messageError) {
      console.error("[Chat] Failed to send clinic reply:", messageError)
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      )
    }

    // Update conversation - mark first reply timestamp if this is the first
    const updateData: Record<string, any> = {
      last_message_at: new Date().toISOString(),
      unread_by_patient: true,
      unread_by_clinic: false,
      unread_count_patient: (conversation.unread_count_patient || 0) + 1,
      unread_count_clinic: 0,
      clinic_typing_at: null, // Clear typing indicator on send
    }

    const isFirstClinicReply = !conversation.clinic_first_reply_at
    if (isFirstClinicReply) {
      updateData.clinic_first_reply_at = new Date().toISOString()
    }

    await supabaseAdmin
      .from("conversations")
      .update(updateData)
      .eq("id", conversationId)

    // Insert bot "clinic has replied" message before the first clinic reply
    let botMessage = null
    if (isFirstClinicReply) {
      try {
        // Get clinic name
        const { data: clinic } = await supabaseAdmin
          .from("clinics")
          .select("name")
          .eq("id", clinicUser.clinic_id)
          .single()

        if (clinic) {
          const { data: botMsg } = await supabaseAdmin
            .from("messages")
            .insert({
              conversation_id: conversationId,
              sender_type: "bot",
              content: getBotClinicReplied(clinic.name),
              sent_via: "chat",
              // Set created_at slightly before the clinic message so it appears above
              created_at: new Date(Date.now() - 1000).toISOString(),
            })
            .select("*")
            .single()

          botMessage = botMsg
        }
      } catch (botError) {
        console.error("[Chat] Bot clinic-replied message error:", botError)
      }
    }

    return NextResponse.json({
      success: true,
      message,
      botMessage,
    })
  } catch (error) {
    console.error("[Chat] Unexpected error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
