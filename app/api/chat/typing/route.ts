import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Clinic signals that they are typing in a conversation
export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json()

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is a clinic user
    const supabaseAdmin = createAdminClient()
    const { data: clinicUser } = await supabaseAdmin
      .from("clinic_users")
      .select("clinic_id")
      .eq("user_id", user.id)
      .single()

    if (!clinicUser) {
      return NextResponse.json({ error: "No clinic found" }, { status: 404 })
    }

    // Update typing timestamp (only if conversation belongs to this clinic)
    await supabaseAdmin
      .from("conversations")
      .update({ clinic_typing_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("clinic_id", clinicUser.clinic_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Chat] Typing indicator error:", error)
    return NextResponse.json({ error: "Failed to update typing status" }, { status: 500 })
  }
}
