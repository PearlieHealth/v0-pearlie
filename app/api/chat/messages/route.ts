import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBotNoReplyYet } from "@/lib/chat-bot"
import { generateIntelligentBotResponse } from "@/lib/chat-bot-ai"

const NO_REPLY_DELAY_MS = 30 * 60 * 1000 // 30 minutes
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

    if (!UUID_REGEX.test(leadId) || !UUID_REGEX.test(clinicId)) {
      return NextResponse.json(
        { error: "Invalid Lead ID or Clinic ID format" },
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
        (m) => m.sender_type === "bot" && (m.message_type === "bot-no-reply" || m.content.includes("typically responds"))
      )

      if (!hasNoReplyBot) {
        // Find first patient message timestamp
        const firstPatientMsg = allMessages.find((m) => m.sender_type === "patient")
        if (firstPatientMsg) {
          const timeSinceFirst = Date.now() - new Date(firstPatientMsg.created_at).getTime()
          if (timeSinceFirst >= NO_REPLY_DELAY_MS) {
            // Get clinic + lead context for AI bot
            const { data: clinic } = await supabase
              .from("clinics")
              .select("name, phone, treatments, opening_hours, accepts_nhs, bot_intelligence")
              .eq("id", clinicId)
              .single()

            const { data: leadData } = await supabase
              .from("leads")
              .select("first_name, treatment_interest, budget_range")
              .eq("id", leadId)
              .single()

            // Try AI no-reply message (if enabled), fall back to template
            const useAI = clinic?.bot_intelligence !== false
            const aiNoReply = useAI
              ? await generateIntelligentBotResponse(
                  "no_reply",
                  { name: clinic?.name || "The clinic", phone: clinic?.phone, treatments: clinic?.treatments, opening_hours: clinic?.opening_hours, accepts_nhs: clinic?.accepts_nhs },
                  { first_name: leadData?.first_name, treatment_interest: leadData?.treatment_interest, budget_range: leadData?.budget_range },
                  allMessages.filter((m: any) => m.sender_type !== "bot").slice(-4).map((m: any) => ({ sender_type: m.sender_type, content: m.content }))
                )
              : null
            const noReplyContent = aiNoReply || getBotNoReplyYet(clinic?.name || "The clinic")
            const { data: noReplyMsg } = await supabase
              .from("messages")
              .insert({
                conversation_id: conversation.id,
                sender_type: "bot",
                content: noReplyContent,
                sent_via: "chat",
                message_type: "bot-no-reply",
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

    // Mark conversation as read by patient + reset unread count
    await supabase
      .from("conversations")
      .update({ unread_by_patient: false, unread_count_patient: 0 })
      .eq("id", conversation.id)

    // Batch-mark all clinic messages in this conversation as 'read'
    // (only upgrade sent/delivered → read, never touch bot/patient messages)
    const unreadClinicMsgIds = allMessages
      .filter((m: any) => m.sender_type === "clinic" && m.status !== "read")
      .map((m: any) => m.id)

    if (unreadClinicMsgIds.length > 0) {
      await supabase
        .from("messages")
        .update({ status: "read", read_at: new Date().toISOString() })
        .in("id", unreadClinicMsgIds)
    }

    // Determine if clinic is currently typing (within last 10 seconds)
    // This is the polling-based fallback; Realtime uses Broadcast instead
    let clinicTyping = false
    if (conversation.clinic_typing_at) {
      const typingAge = Date.now() - new Date(conversation.clinic_typing_at).getTime()
      clinicTyping = typingAge < 10000
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
