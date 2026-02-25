import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBotClinicReplied } from "@/lib/chat-bot"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"
import { escapeHtml } from "@/lib/escape-html"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { generateUnsubscribeFooterHtml, generateUnsubscribeHeaders } from "@/lib/unsubscribe"
import { createRateLimiter } from "@/lib/rate-limit"

// 20 messages per clinic per minute
const clinicReplyLimiter = createRateLimiter({ windowMs: 60 * 1000, maxAttempts: 20 })

export async function POST(request: NextRequest) {
  try {
    const { conversationId, content } = await request.json()

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: "Conversation ID and content are required" },
        { status: 400 }
      )
    }

    const user = await getAuthUser()
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

    if (!clinicUser) {
      return NextResponse.json({ error: "No clinic found" }, { status: 404 })
    }

    // Rate limit: 20 messages per clinic per minute
    const { limited, retryAfterSecs } = clinicReplyLimiter.check(clinicUser.clinic_id)
    if (limited) {
      return NextResponse.json(
        { error: `Too many messages. Please try again in ${retryAfterSecs} seconds.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSecs) } }
      )
    }
    clinicReplyLimiter.record(clinicUser.clinic_id)

    // Verify conversation belongs to this clinic
    const { data: conversation, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, clinic_id, lead_id, clinic_first_reply_at, unread_count_patient, conversation_state, muted_by_patient, notification_cycles_used, current_notification_cycle_start")
      .eq("id", conversationId)
      .single()

    if (convError || !conversation) {
      console.error("[Chat] Conversation lookup failed:", convError?.message)
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    if (conversation.clinic_id !== clinicUser.clinic_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Block messages on closed conversations
    if (conversation.conversation_state === "closed") {
      return NextResponse.json(
        { error: "This conversation is closed. No further messages can be sent." },
        { status: 403 }
      )
    }

    // Create message with delivery status
    const { data: message, error: messageError } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_type: "clinic",
        content: content.trim(),
        sent_via: "chat",
        status: "sent",
      })
      .select("*")
      .single()

    if (messageError) {
      console.error("[Chat] Failed to send clinic reply:", messageError)
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      )
    }

    // Broadcast the new message for real-time delivery (bypasses RLS)
    try {
      const broadcastChannel = supabaseAdmin.channel(`chat:${conversationId}`)
      await broadcastChannel.send({
        type: "broadcast",
        event: "new_message",
        payload: { message },
      })
      await supabaseAdmin.removeChannel(broadcastChannel)
    } catch (broadcastError) {
      console.error("[Chat] Broadcast error:", broadcastError)
    }

    // Atomically increment unread count via Postgres function (avoids read-then-write race)
    const { error: rpcError } = await supabaseAdmin.rpc('increment_unread', {
      p_conversation_id: conversationId,
      p_sender_type: 'clinic',
    })

    // Update conversation metadata (first reply, typing, read flags)
    const updateData: Record<string, any> = {
      last_message_at: new Date().toISOString(),
      unread_by_patient: true,
      unread_by_clinic: false,
      unread_count_clinic: 0,
      clinic_typing_at: null, // Clear typing indicator on send
    }

    // Fallback: if RPC not available, do manual increment
    if (rpcError) {
      console.warn("[Chat] increment_unread RPC failed, falling back:", rpcError.message)
      updateData.unread_count_patient = (conversation.unread_count_patient || 0) + 1
    }

    const isFirstClinicReply = !conversation.clinic_first_reply_at
    if (isFirstClinicReply) {
      updateData.clinic_first_reply_at = new Date().toISOString()
    }

    await supabaseAdmin
      .from("conversations")
      .update(updateData)
      .eq("id", conversationId)

    // Insert bot "clinic has replied" message before the first clinic reply
    let botMessage = null
    if (isFirstClinicReply) {
      try {
        // Get clinic name
        const { data: clinic } = await supabaseAdmin
          .from("clinics")
          .select("name")
          .eq("id", clinicUser.clinic_id)
          .single()

        if (clinic) {
          const { data: botMsg } = await supabaseAdmin
            .from("messages")
            .insert({
              conversation_id: conversationId,
              sender_type: "bot",
              content: getBotClinicReplied(clinic.name),
              sent_via: "chat",
              message_type: "bot-clinic-replied",
              // Use clinic message timestamp minus 1s so bot notification appears above the reply
              created_at: new Date(new Date(message.created_at).getTime() - 1000).toISOString(),
            })
            .select("*")
            .single()

          botMessage = botMsg

          // Broadcast bot message for real-time delivery
          try {
            const botBroadcastChannel = supabaseAdmin.channel(`chat:${conversationId}`)
            await botBroadcastChannel.send({
              type: "broadcast",
              event: "new_message",
              payload: { message: botMsg },
            })
            await supabaseAdmin.removeChannel(botBroadcastChannel)
          } catch (botBroadcastError) {
            console.error("[Chat] Bot broadcast error:", botBroadcastError)
          }
        }
      } catch (botError) {
        console.error("[Chat] Bot clinic-replied message error:", botError)
      }
    }

    // ── Return response immediately — message is delivered ──────────
    // Notification logic runs after the response to avoid blocking the clinic.
    const response = NextResponse.json({
      success: true,
      message,
      botMessage,
    })

    // ── Notification grouping logic (non-blocking) ─────────────────
    // Messages always deliver. Only email notifications are controlled:
    // - If muted: no notification
    // - If 2 notification cycles already used (without patient reply): no notification
    // - If within a 15-minute grouping window: no notification (grouped)
    // - Otherwise: send notification, advance cycle tracking
    try {
      const NOTIFICATION_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
      const MAX_NOTIFICATION_CYCLES = 2

      let shouldNotify = true
      const now = new Date()

      if (conversation.muted_by_patient) {
        shouldNotify = false
      } else if ((conversation.notification_cycles_used || 0) >= MAX_NOTIFICATION_CYCLES) {
        shouldNotify = false
      } else if (conversation.current_notification_cycle_start) {
        const cycleStart = new Date(conversation.current_notification_cycle_start)
        if (now.getTime() - cycleStart.getTime() < NOTIFICATION_WINDOW_MS) {
          shouldNotify = false
        }
      }

      if (shouldNotify) {
        const isNewCycle = !conversation.current_notification_cycle_start ||
          (now.getTime() - new Date(conversation.current_notification_cycle_start).getTime() >= NOTIFICATION_WINDOW_MS)

        const notificationUpdate: Record<string, any> = {
          current_notification_cycle_start: now.toISOString(),
        }
        if (isNewCycle) {
          notificationUpdate.notification_cycles_used = (conversation.notification_cycles_used || 0) + 1
        }

        await supabaseAdmin
          .from("conversations")
          .update(notificationUpdate)
          .eq("id", conversationId)

        // Send email notification
        try {
          const { data: lead } = await supabaseAdmin
            .from("leads")
            .select("email, first_name")
            .eq("id", conversation.lead_id)
            .single()

          const { data: clinic } = await supabaseAdmin
            .from("clinics")
            .select("name, id")
            .eq("id", clinicUser.clinic_id)
            .single()

          if (lead?.email && clinic) {
            const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
            const trimmedContent = content.trim()
            const safeFirstName = lead.first_name ? escapeHtml(lead.first_name) : ""
            const safeClinicName = escapeHtml(clinic.name)
            const safeContent = escapeHtml(trimmedContent.substring(0, 500)) + (trimmedContent.length > 500 ? "..." : "")
            const unsubFooter = generateUnsubscribeFooterHtml(
              generateUnsubscribeHeaders(lead.email, "patient_notifications")["List-Unsubscribe"].replace(/[<>]/g, "")
            )

            const messagesPath = `/patient/dashboard`
            const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(messagesPath)}`
            let viewReplyUrl = `${appUrl}${messagesPath}`

            try {
              const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
                type: "magiclink",
                email: lead.email,
                options: { redirectTo },
              })
              if (linkData?.properties?.action_link) {
                viewReplyUrl = linkData.properties.action_link
                try {
                  const linkUrl = new URL(viewReplyUrl)
                  const currentRedirect = linkUrl.searchParams.get("redirect_to")
                  if (currentRedirect) {
                    const redirectHost = new URL(currentRedirect).hostname
                    const appHost = new URL(appUrl).hostname
                    if (redirectHost !== appHost) {
                      linkUrl.searchParams.set("redirect_to", redirectTo)
                      viewReplyUrl = linkUrl.toString()
                    }
                  }
                } catch {}
              }
            } catch (linkErr) {
              console.warn("[Chat] Failed to generate magic link for patient notification:", linkErr)
            }

            await sendRegisteredEmail({
              type: EMAIL_TYPE.CLINIC_REPLY_TO_PATIENT,
              to: lead.email,
              data: {
                patientFirstName: safeFirstName,
                clinicName: safeClinicName,
                messagePreview: safeContent,
                viewReplyUrl,
                unsubscribeFooterHtml: unsubFooter,
                _conversationId: conversationId,
                _notificationCycle: notificationUpdate.notification_cycles_used || conversation.notification_cycles_used || 0,
              },
              headers: generateUnsubscribeHeaders(lead.email, "patient_notifications"),
              clinicId: clinicUser.clinic_id,
              leadId: conversation.lead_id,
            })
          }
        } catch (emailError) {
          console.error("[Chat] Failed to send patient email notification:", emailError)
        }
      }
    } catch (notifyError) {
      // Never let notification logic break the reply
      console.error("[Chat] Notification grouping error:", notifyError)
    }

    return response
  } catch (error) {
    console.error("[Chat] Unexpected error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
