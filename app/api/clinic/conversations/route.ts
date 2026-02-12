import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    console.log("[v0] conversations API - user:", user?.id || "NO USER")
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

    console.log("[v0] conversations API - clinicUser:", clinicUser?.clinic_id || "NO CLINIC USER")

    if (!clinicUser) {
      return NextResponse.json({ error: "No clinic found" }, { status: 404 })
    }

    // Get conversations for this clinic
    const { data: conversations, error } = await supabaseAdmin
      .from("conversations")
      .select(`
        id,
        lead_id,
        status,
        last_message_at,
        unread_by_clinic,
        created_at
      `)
      .eq("clinic_id", clinicUser.clinic_id)
      .order("last_message_at", { ascending: false })

    console.log("[v0] conversations API - found:", conversations?.length, "conversations for clinic", clinicUser.clinic_id, "error:", error?.message)

    if (error) {
      console.error("[Conversations] Failed to fetch:", error)
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      )
    }

    // Get lead details for each conversation
    const conversationsWithLeads = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: lead } = await supabaseAdmin
          .from("leads")
          .select("first_name, last_name, email, phone, treatment_interest, primary_treatment")
          .eq("id", conv.lead_id)
          .single()

        // Get latest message
        const { data: latestMessage } = await supabaseAdmin
          .from("messages")
          .select("content")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        return {
          ...conv,
          lead,
          latest_message: latestMessage?.content,
        }
      })
    )

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
