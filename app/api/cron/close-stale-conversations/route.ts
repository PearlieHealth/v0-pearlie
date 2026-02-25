import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const INACTIVITY_DAYS = 14
const POST_BOOKING_DAYS = 14

/**
 * Cron endpoint to auto-close stale conversations.
 * Should be called daily (e.g., via Vercel Cron).
 *
 * Rules:
 * 1. Open conversations with no activity for 14 days → close
 * 2. Booked conversations 14 days after booking date → close
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()
    const now = new Date()

    // 1. Close open conversations inactive for 14 days
    const inactivityCutoff = new Date(now.getTime() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: staleOpen, error: staleError } = await admin
      .from("conversations")
      .update({
        conversation_state: "closed",
        closed_at: now.toISOString(),
        closed_reason: "auto_inactive",
      })
      .eq("conversation_state", "open")
      .lt("last_message_at", inactivityCutoff)
      .not("last_message_at", "is", null)
      .select("id")

    if (staleError) {
      console.error("[Cron] Failed to close stale open conversations:", staleError)
    }

    // Also close open conversations that never had any messages and are 14 days old
    const { data: staleNoMessage, error: staleNoMsgError } = await admin
      .from("conversations")
      .update({
        conversation_state: "closed",
        closed_at: now.toISOString(),
        closed_reason: "auto_inactive",
      })
      .eq("conversation_state", "open")
      .is("last_message_at", null)
      .lt("created_at", inactivityCutoff)
      .select("id")

    if (staleNoMsgError) {
      console.error("[Cron] Failed to close no-message conversations:", staleNoMsgError)
    }

    // 2. Close booked conversations 14 days after booking
    const bookingCutoff = new Date(now.getTime() - POST_BOOKING_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: staleBooked, error: bookedError } = await admin
      .from("conversations")
      .update({
        conversation_state: "closed",
        closed_at: now.toISOString(),
        closed_reason: "auto_post_booking",
      })
      .eq("conversation_state", "booked")
      .lt("booked_at", bookingCutoff)
      .select("id")

    if (bookedError) {
      console.error("[Cron] Failed to close stale booked conversations:", bookedError)
    }

    // Insert system messages for auto-closed conversations
    const closedIds = [
      ...(staleOpen || []).map((c) => c.id),
      ...(staleNoMessage || []).map((c) => c.id),
      ...(staleBooked || []).map((c) => c.id),
    ]

    for (const convId of closedIds) {
      await admin
        .from("messages")
        .insert({
          conversation_id: convId,
          sender_type: "bot",
          content: "This conversation has been automatically closed due to inactivity.",
          sent_via: "chat",
          message_type: "bot-state-change",
        })
    }

    return NextResponse.json({
      success: true,
      closed: {
        stale_open: staleOpen?.length || 0,
        stale_no_message: staleNoMessage?.length || 0,
        stale_booked: staleBooked?.length || 0,
        total: closedIds.length,
      },
    })
  } catch (error) {
    console.error("[Cron] Unexpected error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
