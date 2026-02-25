import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(
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
      .select("id, lead_id, clinic_id, conversation_state")
      .eq("id", conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    // Verify the patient owns the lead
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

    const body = await request.json()
    const { action } = body

    if (!action || !["booked", "closed", "mute", "unmute"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be one of: booked, closed, mute, unmute" },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    if (action === "booked") {
      if (conversation.conversation_state === "closed") {
        return NextResponse.json(
          { error: "Cannot mark a closed conversation as booked" },
          { status: 400 }
        )
      }

      // Atomic: only update if state hasn't been changed concurrently to 'closed'
      const { data: updated, error: updateErr } = await admin
        .from("conversations")
        .update({
          conversation_state: "booked",
          booked_at: now,
        })
        .eq("id", conversationId)
        .neq("conversation_state", "closed")
        .select("id")

      if (updateErr || !updated?.length) {
        return NextResponse.json(
          { error: "Cannot mark a closed conversation as booked" },
          { status: 400 }
        )
      }

      // Insert a system bot message so both sides see the status change
      await admin
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_type: "bot",
          content: "This conversation has been marked as booked. The chat will remain open for coordination.",
          sent_via: "chat",
          message_type: "bot-state-change",
        })

      return NextResponse.json({ success: true, state: "booked" })
    }

    if (action === "closed") {
      if (conversation.conversation_state === "closed") {
        return NextResponse.json({ success: true, state: "closed" })
      }

      // Atomic: only close if not already closed (prevents duplicate bot messages)
      const { data: updated } = await admin
        .from("conversations")
        .update({
          conversation_state: "closed",
          closed_at: now,
          closed_reason: "patient_not_interested",
        })
        .eq("id", conversationId)
        .neq("conversation_state", "closed")
        .select("id")

      if (!updated?.length) {
        // Already closed by another concurrent request — idempotent success
        return NextResponse.json({ success: true, state: "closed" })
      }

      await admin
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_type: "bot",
          content: "This conversation has been closed by the patient. No further messages can be sent.",
          sent_via: "chat",
          message_type: "bot-state-change",
        })

      return NextResponse.json({ success: true, state: "closed" })
    }

    if (action === "mute") {
      await admin
        .from("conversations")
        .update({ muted_by_patient: true })
        .eq("id", conversationId)

      return NextResponse.json({ success: true, muted: true })
    }

    if (action === "unmute") {
      await admin
        .from("conversations")
        .update({ muted_by_patient: false })
        .eq("id", conversationId)

      return NextResponse.json({ success: true, muted: false })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("[patient/conversations/state] Error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
