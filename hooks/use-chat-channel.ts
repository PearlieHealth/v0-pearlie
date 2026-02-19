"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface RealtimeMessage {
  id: string
  conversation_id: string
  content: string
  sender_type: "patient" | "clinic" | "bot"
  status?: "sent" | "delivered" | "read"
  created_at: string
}

interface UseChatChannelOptions {
  conversationId: string | null
  userType: "patient" | "clinic"
  onNewMessage?: (message: RealtimeMessage) => void
  onStatusChange?: (messageId: string, status: string) => void
  enabled?: boolean
}

/**
 * Supabase Realtime hook for chat.
 *
 * - postgres_changes INSERT on messages → instant new-message delivery
 * - postgres_changes UPDATE on messages → delivery-status changes (sent→delivered→read)
 * - broadcast "typing" → ephemeral typing indicators (no DB writes)
 *
 * Falls back gracefully: if Realtime fails to connect the caller can
 * keep its existing polling as a safety net.
 */
export function useChatChannel({
  conversationId,
  userType,
  onNewMessage,
  onStatusChange,
  enabled = true,
}: UseChatChannelOptions) {
  const [otherTyping, setOtherTyping] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const typingClearRef = useRef<NodeJS.Timeout | null>(null)
  const typingThrottleRef = useRef<NodeJS.Timeout | null>(null)
  // Keep callbacks in refs so channel doesn't re-subscribe on every render
  const onNewMessageRef = useRef(onNewMessage)
  const onStatusChangeRef = useRef(onStatusChange)
  onNewMessageRef.current = onNewMessage
  onStatusChangeRef.current = onStatusChange

  useEffect(() => {
    if (!conversationId || !enabled) return

    const supabase = createBrowserClient()

    const channel = supabase.channel(`chat:${conversationId}`, {
      config: { broadcast: { self: false } },
    })

    // ── New messages ──────────────────────────────────────────────
    channel.on(
      "postgres_changes" as any,
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => {
        const msg = payload.new as RealtimeMessage
        // Ignore messages we sent ourselves (already in local state)
        if (msg.sender_type !== userType) {
          onNewMessageRef.current?.(msg)

          // Auto-acknowledge delivery
          fetch("/api/chat/mark-delivered", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageIds: [msg.id] }),
          }).catch(() => {})
        }
      }
    )

    // ── Status updates (sent → delivered → read) ─────────────────
    channel.on(
      "postgres_changes" as any,
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => {
        const updated = payload.new as RealtimeMessage
        if (updated.status) {
          onStatusChangeRef.current?.(updated.id, updated.status)
        }
      }
    )

    // ── Server-side broadcast: instant message delivery (bypasses RLS) ──
    channel.on("broadcast" as any, { event: "new_message" }, (payload: any) => {
      const msg = payload.payload?.message as RealtimeMessage | undefined
      if (msg && msg.sender_type !== userType) {
        onNewMessageRef.current?.(msg)

        // Auto-acknowledge delivery (skip for bot messages)
        if (msg.sender_type !== "bot") {
          fetch("/api/chat/mark-delivered", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageIds: [msg.id] }),
          }).catch(() => {})
        }
      }
    })

    // ── Typing indicators (ephemeral broadcast – no DB writes) ───
    channel.on("broadcast" as any, { event: "typing" }, (payload: any) => {
      const senderType = payload.payload?.sender_type
      if (senderType && senderType !== userType) {
        setOtherTyping(true)
        if (typingClearRef.current) clearTimeout(typingClearRef.current)
        typingClearRef.current = setTimeout(() => setOtherTyping(false), 3000)
      }
    })

    channel.subscribe((status: string) => {
      setIsConnected(status === "SUBSCRIBED")
    })

    channelRef.current = channel

    return () => {
      if (typingClearRef.current) clearTimeout(typingClearRef.current)
      if (typingThrottleRef.current) clearTimeout(typingThrottleRef.current)
      supabase.removeChannel(channel)
      channelRef.current = null
      setIsConnected(false)
      setOtherTyping(false)
    }
  }, [conversationId, userType, enabled])

  // ── Send typing (throttled to 1 broadcast per 3s) ─────────────
  const sendTyping = useCallback(() => {
    if (!channelRef.current || typingThrottleRef.current) return
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { sender_type: userType },
    })
    typingThrottleRef.current = setTimeout(() => {
      typingThrottleRef.current = null
    }, 3000)
  }, [userType])

  return { otherTyping, isConnected, sendTyping }
}

// ─────────────────────────────────────────────────────────────────
// Separate hook for the clinic inbox conversations list.
// Listens for any UPDATE on conversations for this clinic so the
// list re-fetches when unread counts / last_message_at change.
// ─────────────────────────────────────────────────────────────────

interface UseConversationUpdatesOptions {
  clinicId: string | null
  onUpdate: () => void
  enabled?: boolean
}

export function useConversationUpdates({
  clinicId,
  onUpdate,
  enabled = true,
}: UseConversationUpdatesOptions) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!clinicId || !enabled) return

    const supabase = createBrowserClient()

    const channel = supabase
      .channel(`clinic-convs:${clinicId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => {
          onUpdateRef.current()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clinicId, enabled])
}

// ─────────────────────────────────────────────────────────────────
// Patient inbox: listen for conversation changes for this patient's lead.
// Fires when unread counts change, new conversations are created, etc.
// ─────────────────────────────────────────────────────────────────

interface UsePatientConversationUpdatesOptions {
  leadId: string | null
  onUpdate: () => void
  enabled?: boolean
}

export function usePatientConversationUpdates({
  leadId,
  onUpdate,
  enabled = true,
}: UsePatientConversationUpdatesOptions) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!leadId || !enabled) return

    const supabase = createBrowserClient()

    const channel = supabase
      .channel(`patient-convs:${leadId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          onUpdateRef.current()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leadId, enabled])
}
