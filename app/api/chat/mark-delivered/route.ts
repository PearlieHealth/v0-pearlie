import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/chat/mark-delivered
 * Called by the recipient's client when their Realtime subscription
 * fires for a new message.  Batch-updates status from 'sent' → 'delivered'.
 */
export async function POST(request: NextRequest) {
  try {
    const { messageIds } = await request.json()

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: "messageIds array is required" },
        { status: 400 }
      )
    }

    // Cap at 50 to prevent abuse
    const ids = messageIds.slice(0, 50)

    const supabase = createAdminClient()

    // Only upgrade sent → delivered (never downgrade read → delivered)
    const { error } = await supabase
      .from("messages")
      .update({ status: "delivered" })
      .in("id", ids)
      .eq("status", "sent")

    if (error) {
      console.error("[Chat] Failed to mark delivered:", error)
      return NextResponse.json(
        { error: "Failed to update" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Chat] mark-delivered error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
