import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBotClinicReplied } from "@/lib/chat-bot"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"
import { escapeHtml } from "@/lib/escape-html"
import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"
import { generateUnsubscribeFooterHtml, generateUnsubscribeHeaders, isUnsubscribed } from "@/lib/unsubscribe"
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
      .select("id, clinic_id, lead_id, clinic_first_reply_at, unread_count_patient")
      .eq("id", conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    if (conversation.clinic_id !== clinicUser.clinic_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
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

    // Update conversation - mark first reply timestamp if this is the first
    const updateData: Record<string, any> = {
      last_message_at: new Date().toISOString(),
      unread_by_patient: true,
      unread_by_clinic: false,
      unread_count_patient: (conversation.unread_count_patient || 0) + 1,
      unread_count_clinic: 0,
      clinic_typing_at: null, // Clear typing indicator on send
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
        }
      } catch (botError) {
        console.error("[Chat] Bot clinic-replied message error:", botError)
      }
    }

    // Send email notification to patient when clinic replies
    {
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
          const unsubscribed = await isUnsubscribed(lead.email, "patient_notifications")
          if (!unsubscribed) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
            const trimmedContent = content.trim()
            const safeFirstName = lead.first_name ? ` ${escapeHtml(lead.first_name)}` : ""
            const safeClinicName = escapeHtml(clinic.name)
            const safeContent = escapeHtml(trimmedContent.substring(0, 500)) + (trimmedContent.length > 500 ? "..." : "")
            const unsubFooter = generateUnsubscribeFooterHtml(
              generateUnsubscribeHeaders(lead.email, "patient_notifications")["List-Unsubscribe"].replace(/[<>]/g, "")
            )
            await sendEmailWithRetry({
              from: EMAIL_FROM.NOTIFICATIONS,
              to: lead.email,
              subject: `${clinic.name} has replied to your message`,
              headers: generateUnsubscribeHeaders(lead.email, "patient_notifications"),
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background-color: #0d9488; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">You've Got a Reply!</h1>
                  </div>
                  <div style="padding: 30px; background-color: #f9fafb;">
                    <p style="color: #374151; font-size: 16px;">
                      Hi${safeFirstName}, <strong>${safeClinicName}</strong> has replied to your message:
                    </p>
                    <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #0d9488;">
                      <p style="color: #4b5563; margin: 0; white-space: pre-wrap;">${safeContent}</p>
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                      <a href="${appUrl}/clinic/${clinic.id}?leadId=${conversation.lead_id}&reply=1"
                         style="background-color: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        View &amp; Reply
                      </a>
                    </div>
                  </div>
                  <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
                    <p>This is an automated message from Pearlie</p>
                    ${unsubFooter}
                  </div>
                </div>
              `,
            })
          }
        }
      } catch (emailError) {
        // Don't fail the reply if email notification fails
        console.error("[Chat] Failed to send patient email notification:", emailError)
      }
    }

    return NextResponse.json({
      success: true,
      message,
      botMessage,
    })
  } catch (error) {
    console.error("[Chat] Unexpected error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
