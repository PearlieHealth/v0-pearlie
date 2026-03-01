import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/supabase/get-clinic-user"
import { escapeHtml } from "@/lib/escape-html"
import { portalUrl } from "@/lib/clinic-url"
import { trackTikTokServerEvent, extractIp, extractUserAgent } from "@/lib/tiktok-events-api"
import { getBotGreeting, getBotFollowUp } from "@/lib/chat-bot"
import { generateIntelligentBotResponse } from "@/lib/chat-bot-ai"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { generateUnsubscribeFooterHtml, generateUnsubscribeHeaders } from "@/lib/unsubscribe"
import { createRateLimiter } from "@/lib/rate-limit"
import { generateReplyToAddress, generateThreadMarker } from "@/lib/email-reply-token"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 10 messages per conversation per minute
const chatSendLimiter = createRateLimiter({ windowMs: 60 * 1000, maxAttempts: 10 })

export async function POST(request: NextRequest) {
  try {
    const { leadId, clinicId, content, senderType, messageType } = await request.json()

    if (!leadId || !clinicId || !content) {
      return NextResponse.json(
        { error: "Lead ID, Clinic ID, and content are required" },
        { status: 400 }
      )
    }

    if (!UUID_REGEX.test(leadId) || !UUID_REGEX.test(clinicId)) {
      return NextResponse.json(
        { error: "Invalid Lead ID or Clinic ID format" },
        { status: 400 }
      )
    }

    if (!["patient", "clinic"].includes(senderType)) {
      return NextResponse.json(
        { error: "Invalid sender type" },
        { status: 400 }
      )
    }

    // Rate limit: 10 messages per conversation per minute
    const conversationKey = `${leadId}:${clinicId}`
    const { limited, retryAfterSecs } = chatSendLimiter.check(conversationKey)
    if (limited) {
      return NextResponse.json(
        { error: `Too many messages. Please try again in ${retryAfterSecs} seconds.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSecs) } }
      )
    }
    chatSendLimiter.record(conversationKey)

    // Clinic senders must be authenticated and belong to the clinic
    if (senderType === "clinic") {
      const user = await getAuthUser()
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      const supabaseAuth = createAdminClient()
      const { data: clinicUser } = await supabaseAuth
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .eq("clinic_id", clinicId)
        .single()
      if (!clinicUser) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Validate content length
    const trimmedContent = content.trim()
    if (trimmedContent.length === 0 || trimmedContent.length > 5000) {
      return NextResponse.json(
        { error: "Message must be between 1 and 5000 characters" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get lead details (extended for AI bot context)
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, user_id, is_verified, first_name, last_name, email, treatment_interest, budget_range, pain_score, has_swelling, has_bleeding, additional_info, anxiety_level, preferred_times, timing_preference, cost_approach, decision_values, location_preference")
      .eq("id", leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Verify patient email before sending (for patient messages)
    if (senderType === "patient" && !lead.is_verified) {
      return NextResponse.json(
        { error: "Please verify your email before sending messages" },
        { status: 403 }
      )
    }

    // Authenticate patient senders: prefer session-based auth, but fall back to
    // verified lead status. After OTP, the session cookie may not propagate
    // immediately (e.g. mobile browsers, cross-page navigation). Since the lead
    // is already verified (checked above), the patient has proven email ownership.
    if (senderType === "patient") {
      const supabaseAuth = await createClient()
      const { data: { user: authUser } } = await supabaseAuth.auth.getUser()

      if (authUser) {
        // Session exists — verify they own this lead
        const ownsLead = (
          (lead.user_id && lead.user_id === authUser.id) ||
          (!lead.user_id && lead.email && lead.email.toLowerCase() === authUser.email?.toLowerCase())
        )

        if (!ownsLead) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
      } else if (!lead.is_verified) {
        // No session AND lead not verified — reject
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      // If no session but lead IS verified, allow the message (OTP already proved identity)
    }

    // Get clinic details (extended for AI bot context + email notifications)
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name, email, notification_email, phone, treatments, price_range, description, facilities, opening_hours, accepts_nhs, parking_available, wheelchair_accessible, bot_intelligence, treatment_prices, show_treatment_prices, offers_free_consultation, available_days, available_hours, before_after_images")
      .eq("id", clinicId)
      .single()

    if (clinicError || !clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    // Get or create conversation using limit instead of single to avoid errors
    const { data: convData } = await supabase
      .from("conversations")
      .select("id, bot_greeted, unread_count_clinic, unread_count_patient, conversation_state")
      .eq("lead_id", leadId)
      .eq("clinic_id", clinicId)
      .limit(1)

    let conversation = convData?.[0] as { id: string; bot_greeted?: boolean; unread_count_clinic?: number; unread_count_patient?: number; conversation_state?: string } | undefined

    // Block messages on closed conversations
    if (conversation?.conversation_state === "closed") {
      return NextResponse.json(
        { error: "This conversation has been closed. No further messages can be sent.", reason: "conversation_closed" },
        { status: 403 }
      )
    }

    if (!conversation) {
      // Create new conversation with unread flags
      const { data: newConversation, error: createError } = await supabase
        .from("conversations")
        .insert({
          lead_id: leadId,
          clinic_id: clinicId,
          status: "active",
          unread_by_clinic: senderType === "patient",
          unread_by_patient: senderType === "clinic",
        })
        .select("id")
        .single()

      if (createError) {
        // Handle race condition - conversation might have been created
        if (createError.code === "23505") {
          const { data: existingConv } = await supabase
            .from("conversations")
            .select("id")
            .eq("lead_id", leadId)
            .eq("clinic_id", clinicId)
            .limit(1)
          conversation = existingConv?.[0]
        } else {
          console.error("[Chat] Failed to create conversation:", createError)
          return NextResponse.json(
            { error: "Failed to create conversation" },
            { status: 500 }
          )
        }
      } else {
        conversation = newConversation

        // Ensure match_results entry exists so the clinic sees this lead in their
        // appointments dashboard. Uses ignoreDuplicates to avoid overwriting existing
        // match data from the matching engine.
        await supabase
          .from("match_results")
          .upsert(
            {
              lead_id: leadId,
              clinic_id: clinicId,
              score: 0,
              reasons: ["Patient initiated a conversation"],
              tier: "conversation",
              rank: 0,
            },
            { onConflict: "lead_id,clinic_id", ignoreDuplicates: true }
          )
          .then(({ error }) => {
            if (error) console.error("[Chat] Failed to ensure match_results:", error)
          })

        // Ensure lead_clinic_status entry exists so the clinic's notification
        // badge counts this lead and it appears in the correct status category.
        await supabase
          .from("lead_clinic_status")
          .upsert(
            {
              lead_id: leadId,
              clinic_id: clinicId,
              status: "NEW",
            },
            { onConflict: "lead_id,clinic_id", ignoreDuplicates: true }
          )
          .then(({ error }) => {
            if (error) console.error("[Chat] Failed to ensure lead_clinic_status:", error)
          })

        // Fire TikTok Lead event on first patient message (new conversation = first contact)
        if (senderType === "patient") {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://pearlie.org"
          trackTikTokServerEvent({
            event: "Lead",
            url: `${appUrl}/clinic/${clinicId}`,
            email: lead.email || null,
            externalId: leadId,
            ip: extractIp(request),
            userAgent: extractUserAgent(request),
            properties: {
              content_name: "first_message",
              content_type: "chat",
              content_id: clinicId,
            },
          }).catch(() => {})
        }
      }
    }

    if (!conversation) {
      return NextResponse.json(
        { error: "Failed to get or create conversation" },
        { status: 500 }
      )
    }

    // If this is an appointment request, check if one was already sent for this conversation
    if (messageType === "appointment_request") {
      const { data: convCheck } = await supabase
        .from("conversations")
        .select("appointment_requested_at")
        .eq("id", conversation.id)
        .single()

      if (convCheck?.appointment_requested_at) {
        return NextResponse.json(
          { error: "An appointment request has already been sent for this clinic." },
          { status: 409 }
        )
      }
    }

    // Create message with delivery status
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        sender_type: senderType,
        content: trimmedContent,
        sent_via: "chat",
        status: "sent",
        ...(messageType === "appointment_request" ? { message_type: "appointment_request" } : {}),
      })
      .select("*")
      .single()

    if (messageError) {
      console.error("[Chat] Failed to send message:", messageError)
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      )
    }

    // Mark conversation as having an appointment request
    if (messageType === "appointment_request") {
      await supabase
        .from("conversations")
        .update({ appointment_requested_at: new Date().toISOString() })
        .eq("id", conversation.id)
    }

    // Atomically update unread counts via Postgres function (avoids read-then-write race)
    const { error: rpcError } = await supabase.rpc('increment_unread', {
      p_conversation_id: conversation.id,
      p_sender_type: senderType,
    })

    if (rpcError) {
      // Fallback: re-fetch then update if RPC not yet deployed
      console.warn("[Chat] increment_unread RPC failed, falling back:", rpcError.message)
      const { data: freshConv } = await supabase
        .from("conversations")
        .select("unread_count_clinic, unread_count_patient")
        .eq("id", conversation.id)
        .single()

      const updateData: Record<string, any> = {
        last_message_at: new Date().toISOString(),
      }
      if (senderType === "patient") {
        updateData.unread_by_clinic = true
        updateData.unread_count_clinic = ((freshConv?.unread_count_clinic) || 0) + 1
      } else {
        updateData.unread_by_patient = true
        updateData.unread_count_patient = ((freshConv?.unread_count_patient) || 0) + 1
      }

      const { error: updateError } = await supabase
        .from("conversations")
        .update(updateData)
        .eq("id", conversation.id)

      if (updateError) {
        console.error("[Chat] Failed to update conversation:", updateError)
      }
    }

    // Reset notification cycle tracking when patient replies,
    // so the clinic's next message will trigger a fresh notification.
    if (senderType === "patient") {
      await supabase
        .from("conversations")
        .update({
          notification_cycles_used: 0,
          current_notification_cycle_start: null,
          last_patient_reply_at: new Date().toISOString(),
        })
        .eq("id", conversation.id)
    }

    // Broadcast the new message for real-time delivery (bypasses RLS)
    try {
      const broadcastChannel = supabase.channel(`chat:${conversation.id}`)
      await broadcastChannel.send({
        type: "broadcast",
        event: "new_message",
        payload: { message },
      })
      await supabase.removeChannel(broadcastChannel)
    } catch (broadcastError) {
      console.error("[Chat] Broadcast error:", broadcastError)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"

    const clinicNotificationEmail = clinic.notification_email || clinic.email
    if (senderType === "patient" && clinicNotificationEmail) {
      try {
        const safeName = escapeHtml(`${lead.first_name} ${lead.last_name}`)
        const safeContent = escapeHtml(trimmedContent.substring(0, 500)) + (trimmedContent.length > 500 ? "..." : "")
        const unsubFooter = generateUnsubscribeFooterHtml(
          generateUnsubscribeHeaders(clinicNotificationEmail, "clinic_notifications")["List-Unsubscribe"].replace(/[<>]/g, "")
        )

        // Generate reply-to token so the clinic can reply directly from email
        // This is REQUIRED — if EMAIL_REPLY_SECRET is not set, the email will
        // fail and the error will be logged. Set the env var to fix.
        const replyTo = generateReplyToAddress(conversation.id, "clinic", clinicNotificationEmail)
        const threadMarker = generateThreadMarker(conversation.id)

        // Fetch recent messages for thread context (last 3, excluding current)
        let recentMessages: Array<{ sender: string; content: string; timestamp?: string }> | undefined
        try {
          const { data: recent } = await supabase
            .from("messages")
            .select("sender_type, content, created_at")
            .eq("conversation_id", conversation.id)
            .neq("id", message.id)
            .not("message_type", "in", '("bot-greeting","bot-follow-up","bot-clinic-replied")')
            .order("created_at", { ascending: false })
            .limit(3)

          if (recent && recent.length > 0) {
            recentMessages = recent.reverse().map((m: any) => ({
              sender: m.sender_type === "patient" ? escapeHtml(`${lead.first_name}`) : m.sender_type === "bot" ? "Pearlie" : escapeHtml(clinic.name),
              content: escapeHtml(m.content.substring(0, 200)) + (m.content.length > 200 ? "..." : ""),
              timestamp: new Date(m.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
            }))
          }
        } catch (recentErr) {
          console.warn("[Chat] Failed to fetch recent messages:", recentErr)
        }

        await sendRegisteredEmail({
          type: EMAIL_TYPE.CHAT_NOTIFICATION_TO_CLINIC,
          to: clinicNotificationEmail,
          data: {
            patientName: safeName,
            messagePreview: safeContent,
            inboxUrl: portalUrl("/clinic/appointments"),
            unsubscribeFooterHtml: unsubFooter,
            _conversationId: conversation.id,
            replyToAddress: replyTo,
            threadMarker,
            recentMessages,
          },
          headers: generateUnsubscribeHeaders(clinicNotificationEmail, "clinic_notifications"),
          replyTo,
          clinicId,
          leadId,
        })
      } catch (emailError) {
        // Don't fail the message send if email notification fails
        console.error("[Chat] Failed to send email notification:", emailError)
      }
    }

    // Bot auto-responder: AI-powered greeting + suggestions (template fallback)
    const botMessages: any[] = []
    const useAI = clinic.bot_intelligence !== false
    const escalationCtx = {
      clinicEmail: clinic.email,
      clinicName: clinic.name,
      patientName: `${lead.first_name} ${lead.last_name}`.trim(),
      messageContent: trimmedContent,
      conversationId: conversation.id,
      appUrl,
    }

    if (senderType === "patient" && !conversation.bot_greeted) {
      try {
        const clinicCtx = {
          name: clinic.name,
          phone: clinic.phone,
          treatments: clinic.treatments,
          price_range: clinic.price_range,
          description: clinic.description,
          facilities: clinic.facilities,
          opening_hours: clinic.opening_hours,
          accepts_nhs: clinic.accepts_nhs,
          parking_available: clinic.parking_available,
          wheelchair_accessible: clinic.wheelchair_accessible,
          treatment_prices: clinic.treatment_prices,
          show_treatment_prices: clinic.show_treatment_prices,
          offers_free_consultation: clinic.offers_free_consultation,
          available_days: clinic.available_days,
          available_hours: clinic.available_hours,
          has_before_after_images: Array.isArray(clinic.before_after_images) && clinic.before_after_images.length > 0,
        }
        const leadCtx = {
          first_name: lead.first_name,
          treatment_interest: lead.treatment_interest,
          budget_range: lead.budget_range,
          pain_score: lead.pain_score,
          has_swelling: lead.has_swelling,
          has_bleeding: lead.has_bleeding,
          additional_info: lead.additional_info,
          anxiety_level: lead.anxiety_level,
          preferred_times: lead.preferred_times,
          timing_preference: lead.timing_preference,
          cost_approach: lead.cost_approach,
          decision_values: lead.decision_values,
          location_preference: lead.location_preference,
        }
        const recentMsgs = [{ sender_type: "patient" as const, content: trimmedContent }]

        // Try AI greeting (if enabled), fall back to template
        const aiGreeting = useAI
          ? await generateIntelligentBotResponse("greeting", clinicCtx, leadCtx, recentMsgs, escalationCtx)
          : null
        const greetingContent = aiGreeting || getBotGreeting(lead.first_name || "", clinic.name)

        const { data: greetingMsg } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversation.id,
            sender_type: "bot",
            content: greetingContent,
            sent_via: "chat",
            message_type: "bot-greeting",
          })
          .select("*")
          .single()
        if (greetingMsg) botMessages.push(greetingMsg)

        // Mark conversation as bot-greeted
        await supabase
          .from("conversations")
          .update({ bot_greeted: true })
          .eq("id", conversation.id)
      } catch (botError) {
        // Don't fail the message send if bot fails
        console.error("[Chat] Bot auto-responder error:", botError)
      }
    }

    // Follow-up bot: patient sends another message before clinic has replied
    if (senderType === "patient" && conversation.bot_greeted) {
      try {
        // Check if clinic has replied in this conversation
        const { data: clinicReplies } = await supabase
          .from("messages")
          .select("id")
          .eq("conversation_id", conversation.id)
          .eq("sender_type", "clinic")
          .limit(1)

        if (!clinicReplies?.length) {
          let followUpContent: string | null = null

          if (useAI) {
            // Get recent messages for context
            const { data: recentDbMsgs } = await supabase
              .from("messages")
              .select("sender_type, content")
              .eq("conversation_id", conversation.id)
              .order("created_at", { ascending: false })
              .limit(6)

            const recentMsgs = (recentDbMsgs || [])
              .reverse()
              .map((m: any) => ({ sender_type: m.sender_type, content: m.content }))

            followUpContent = await generateIntelligentBotResponse(
              "follow_up",
              {
                name: clinic.name,
                phone: clinic.phone,
                treatments: clinic.treatments,
                price_range: clinic.price_range,
                description: clinic.description,
                facilities: clinic.facilities,
                opening_hours: clinic.opening_hours,
                accepts_nhs: clinic.accepts_nhs,
                parking_available: clinic.parking_available,
                wheelchair_accessible: clinic.wheelchair_accessible,
                treatment_prices: clinic.treatment_prices,
                show_treatment_prices: clinic.show_treatment_prices,
                offers_free_consultation: clinic.offers_free_consultation,
                available_days: clinic.available_days,
                available_hours: clinic.available_hours,
                has_before_after_images: Array.isArray(clinic.before_after_images) && clinic.before_after_images.length > 0,
              },
              {
                first_name: lead.first_name,
                treatment_interest: lead.treatment_interest,
                budget_range: lead.budget_range,
                pain_score: lead.pain_score,
                has_swelling: lead.has_swelling,
                has_bleeding: lead.has_bleeding,
                additional_info: lead.additional_info,
                anxiety_level: lead.anxiety_level,
                preferred_times: lead.preferred_times,
                timing_preference: lead.timing_preference,
                cost_approach: lead.cost_approach,
                decision_values: lead.decision_values,
                location_preference: lead.location_preference,
              },
              recentMsgs,
              escalationCtx
            )
          }

          // Use AI response or fall back to template
          const finalContent = followUpContent || getBotFollowUp(clinic.name)

          const { data: followUpMsg } = await supabase
            .from("messages")
            .insert({
              conversation_id: conversation.id,
              sender_type: "bot",
              content: finalContent,
              sent_via: "chat",
              message_type: "bot-follow-up",
            })
            .select("*")
            .single()
          if (followUpMsg) botMessages.push(followUpMsg)
        }
      } catch (followUpError) {
        console.error("[Chat] Bot follow-up error:", followUpError)
      }
    }

    // Broadcast bot messages for real-time delivery
    for (const botMsg of botMessages) {
      try {
        const broadcastChannel = supabase.channel(`chat:${conversation.id}`)
        await broadcastChannel.send({
          type: "broadcast",
          event: "new_message",
          payload: { message: botMsg },
        })
        await supabase.removeChannel(broadcastChannel)
      } catch (broadcastError) {
        console.error("[Chat] Bot broadcast error:", broadcastError)
      }
    }

    return NextResponse.json({
      success: true,
      message,
      botMessages,
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
