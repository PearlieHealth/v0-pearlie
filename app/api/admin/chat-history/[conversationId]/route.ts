import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { conversationId } = await params
    const supabase = createAdminClient()

    // Fetch conversation with clinic and lead info
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(
        `
        id,
        clinic_id,
        lead_id,
        status,
        created_at,
        last_message_at,
        unread_count_clinic,
        unread_count_patient,
        clinics(id, name),
        leads(id, first_name, last_name, email, phone, contact_value, treatment_interest)
      `
      )
      .eq("id", conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    // Fetch all messages, ordered chronologically
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select(
        "id, conversation_id, sender_type, content, sent_via, status, message_type, created_at"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (msgError) {
      console.error("[Admin Chat History] Error fetching messages:", msgError)
      throw msgError
    }

    // Read-only: no side effects, no marking messages as read
    return NextResponse.json({
      conversation,
      messages: messages || [],
    })
  } catch (error) {
    console.error("[Admin Chat History] Unexpected error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch conversation" },
      { status: 500 }
    )
  }
}
