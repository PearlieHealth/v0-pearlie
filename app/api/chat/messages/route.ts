import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBotNoReplyYet } from "@/lib/chat-bot"

const NO_REPLY_DELAY_MS = 30 * 60 * 1000 // 30 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get("leadId")
    const clinicId = searchParams.get("clinicId")

    if (!leadId || !clinicId) {
      return NextResponse.json(
        { error: "Lead ID and Clinic ID are required" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get conversation with bot tracking fields
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, bot_greeted, clinic_first_reply_at, clinic_typing_at")
      .eq("lead_id", leadId)
      .eq("clinic_id", clinicId)
      .limit(1)

    const conversation = conversations?.[0]

    if (!conversation) {
      return NextResponse.json({
        messages: [],
        conversationId: null,
        clinicTyping: false,
      })
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })

    if (messagesError) {
      console.error("[Chat] Failed to fetch messages:", messagesError)
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      )
    }

    const allMessages = messages || []

    // Check if we should insert the "no reply yet" bot message
    // Conditions: bot has greeted, no clinic reply yet, 30+ min since first patient message
    if (conversation.bot_greeted && !conversation.clinic_first_reply_at) {
      const hasNoReplyBot = allMessages.some(
        (m) => m.sender_type === "bot" && m.content.includes("typically responds")
      )

      if (!hasNoReplyBot) {
        // Find first patient message timestamp
        const firstPatientMsg = allMessages.find((m) => m.sender_type === "patient")
        if (firstPatientMsg) {
          const timeSinceFirst = Date.now() - new Date(firstPatientMsg.created_at).getTime()
          if (timeSinceFirst >= NO_REPLY_DELAY_MS) {
            // Get clinic name for the bot message
            const { data: clinic } = await supabase
              .from("clinics")
              .select("name")
              .eq("id", clinicId)
              .single()

            const noReplyContent = getBotNoReplyYet(clinic?.name || "The clinic")
            const { data: noReplyMsg } = await supabase
              .from("messages")
              .insert({
                conversation_id: conversation.id,
                sender_type: "bot",
                content: noReplyContent,
                sent_via: "chat",
              })
              .select("*")
              .single()

            if (noReplyMsg) {
              allMessages.push(noReplyMsg)
            }
          }
        }
      }
    }

    // Mark messages as read by patient
    await supabase
      .from("conversations")
      .update({ unread_by_patient: false, unread_count_patient: 0 })
      .eq("id", conversation.id)

    // Determine if clinic is currently typing (within last 10 seconds)
    let clinicTyping = false
    if (conversation.clinic_typing_at) {
      const typingAge = Date.now() - new Date(conversation.clinic_typing_at).getTime()
      clinicTyping = typingAge < 10000 // 10 seconds
    }

    return NextResponse.json({
      messages: allMessages,
      conversationId: conversation.id,
      clinicTyping,
    })
  } catch (error) {
    console.error("[Chat] Unexpected error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
