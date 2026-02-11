import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

    const supabase = await createClient()

    // Get conversation (use maybeSingle to handle 0 rows without error)
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id")
      .eq("lead_id", leadId)
      .eq("clinic_id", clinicId)
      .limit(1)

    const conversation = conversations?.[0]

    if (!conversation) {
      // No conversation exists yet - return empty messages
      return NextResponse.json({
        messages: [],
        conversationId: null,
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

    // Mark messages as read by patient
    await supabase
      .from("conversations")
      .update({ unread_by_patient: false })
      .eq("id", conversation.id)

    return NextResponse.json({
      messages: messages || [],
      conversationId: conversation.id,
    })
  } catch (error) {
    console.error("[Chat] Unexpected error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
