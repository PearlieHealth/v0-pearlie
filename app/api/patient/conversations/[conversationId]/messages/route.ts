import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params

    if (!conversationId || !UUID_REGEX.test(conversationId)) {
      return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get conversation
    const { data: conversation, error: convError } = await admin
      .from("conversations")
      .select("id, lead_id, clinic_id")
      .eq("id", conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    // Verify the patient owns the lead associated with this conversation
    const { data: lead } = await admin
      .from("leads")
      .select("user_id, email")
      .eq("id", conversation.lead_id)
      .single()

    const ownsLead = lead && (
      (lead.user_id && lead.user_id === user.id) ||
      (!lead.user_id && lead.email && lead.email.toLowerCase() === user.email?.toLowerCase())
    )

    if (!ownsLead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await admin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (messagesError) {
      console.error("[patient/conversations/messages] Failed to fetch messages:", messagesError)
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }

    // Mark conversation as read by patient
    await admin
      .from("conversations")
      .update({ unread_by_patient: false, unread_count_patient: 0 })
      .eq("id", conversationId)

    // Batch-mark all clinic messages as 'read'
    const unreadClinicMsgIds = (messages || [])
      .filter((m: any) => m.sender_type === "clinic" && m.status !== "read")
      .map((m: any) => m.id)

    if (unreadClinicMsgIds.length > 0) {
      await admin
        .from("messages")
        .update({ status: "read", read_at: new Date().toISOString() })
        .in("id", unreadClinicMsgIds)
    }

    return NextResponse.json({
      messages: messages || [],
      conversationId: conversation.id,
      clinicId: conversation.clinic_id,
      leadId: conversation.lead_id,
    })
  } catch (error) {
    console.error("[patient/conversations/messages] Error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
