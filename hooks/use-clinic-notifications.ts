"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface UseClinicNotificationsOptions {
  clinicId: string | null
  enabled?: boolean
}

interface NotificationCounts {
  newLeads: number
  unrepliedConversations: number
  unreadMessages: number
}

/**
 * Real-time notification system for the clinic dashboard.
 *
 * Subscribes to Supabase Realtime channels for:
 * - lead_clinic_status: new leads matched to this clinic
 * - conversations: new/updated conversations
 * - messages: new inbound messages from patients
 *
 * Provides:
 * - Live badge counts (leads, unreplied, unread messages)
 * - Toast notifications (bottom-right via Sonner)
 * - Browser tab title updates when tab is unfocused
 */
export function useClinicNotifications({ clinicId, enabled = true }: UseClinicNotificationsOptions) {
  const [counts, setCounts] = useState<NotificationCounts>({
    newLeads: 0,
    unrepliedConversations: 0,
    unreadMessages: 0,
  })

  const isTabFocused = useRef(true)
  const originalTitle = useRef("Pearlie — Clinic Dashboard")
  const refreshInterval = useRef<NodeJS.Timeout | null>(null)

  // ── Fetch current counts from DB ─────────────────────────────

  const refreshCounts = useCallback(async () => {
    if (!clinicId) return
    const supabase = createBrowserClient()

    try {
      const [
        { count: newLeads },
        { count: unreplied },
        { count: unreadMsgs },
      ] = await Promise.all([
        supabase
          .from("lead_clinic_status")
          .select("*", { count: "exact", head: true })
          .eq("clinic_id", clinicId)
          .eq("status", "NEW"),
        supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("clinic_id", clinicId)
          .is("clinic_first_reply_at", null),
        supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("clinic_id", clinicId)
          .eq("unread_by_clinic", true),
      ])

      setCounts({
        newLeads: newLeads || 0,
        unrepliedConversations: unreplied || 0,
        unreadMessages: unreadMsgs || 0,
      })
    } catch (err) {
      console.error("[clinic-notifications] Failed to refresh counts:", err)
    }
  }, [clinicId])

  // ── Tab focus tracking + title updates ───────────────────────

  const updateTabTitle = useCallback((newCounts: NotificationCounts) => {
    if (isTabFocused.current) {
      document.title = originalTitle.current
      return
    }

    const total = newCounts.newLeads + newCounts.unreadMessages
    if (total > 0) {
      const parts: string[] = []
      if (newCounts.newLeads > 0) parts.push(`${newCounts.newLeads} new lead${newCounts.newLeads > 1 ? "s" : ""}`)
      if (newCounts.unreadMessages > 0) parts.push(`${newCounts.unreadMessages} message${newCounts.unreadMessages > 1 ? "s" : ""}`)
      document.title = `(${total}) ${parts.join(", ")} — Pearlie`
    } else {
      document.title = originalTitle.current
    }
  }, [])

  useEffect(() => {
    const handleFocus = () => {
      isTabFocused.current = true
      document.title = originalTitle.current
    }
    const handleBlur = () => {
      isTabFocused.current = false
      updateTabTitle(counts)
    }

    window.addEventListener("focus", handleFocus)
    window.addEventListener("blur", handleBlur)
    return () => {
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("blur", handleBlur)
      document.title = originalTitle.current
    }
  }, [counts, updateTabTitle])

  // Update tab title whenever counts change
  useEffect(() => {
    updateTabTitle(counts)
  }, [counts, updateTabTitle])

  // ── Real-time subscriptions ──────────────────────────────────

  useEffect(() => {
    if (!clinicId || !enabled) return

    const supabase = createBrowserClient()

    // Initial fetch
    refreshCounts()

    // Polling fallback (30s)
    refreshInterval.current = setInterval(refreshCounts, 30000)

    // Channel: new leads for this clinic
    const leadsChannel = supabase
      .channel(`clinic-leads:${clinicId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lead_clinic_status",
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          // New lead matched to this clinic
          setCounts((prev) => {
            const updated = { ...prev, newLeads: prev.newLeads + 1 }
            updateTabTitle(updated)
            return updated
          })

          toast("New lead request", {
            description: "A new patient has been matched to your clinic",
            action: {
              label: "View leads",
              onClick: () => window.location.assign("/clinic/appointments"),
            },
            duration: 8000,
          })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lead_clinic_status",
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => {
          // Lead status changed — refresh counts
          refreshCounts()
        }
      )
      .subscribe()

    // Channel: conversations (new + updates)
    const convsChannel = supabase
      .channel(`clinic-notif-convs:${clinicId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => {
          // Conversation created/updated — refresh counts
          refreshCounts()
        }
      )
      .subscribe()

    // Channel: new messages (inbound patient messages for this clinic's conversations)
    // We use broadcast from the chat API which includes clinic_id
    const messagesChannel = supabase
      .channel(`clinic-messages:${clinicId}`)
      .on(
        "broadcast",
        { event: "new_clinic_message" },
        (payload) => {
          const msg = payload.payload as {
            conversationId?: string
            senderType?: string
            content?: string
            patientName?: string
          }

          if (msg?.senderType === "patient") {
            setCounts((prev) => {
              const updated = { ...prev, unreadMessages: prev.unreadMessages + 1 }
              updateTabTitle(updated)
              return updated
            })

            toast("New message", {
              description: msg.patientName
                ? `${msg.patientName}: ${(msg.content || "").substring(0, 60)}...`
                : (msg.content || "New message from patient").substring(0, 80),
              action: {
                label: "View",
                onClick: () => window.location.assign("/clinic/appointments"),
              },
              duration: 8000,
            })
          }
        }
      )
      .subscribe()

    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current)
      supabase.removeChannel(leadsChannel)
      supabase.removeChannel(convsChannel)
      supabase.removeChannel(messagesChannel)
    }
  }, [clinicId, enabled, refreshCounts, updateTabTitle])

  return {
    counts,
    refreshCounts,
  }
}
