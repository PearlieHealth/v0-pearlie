import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Resend } from "resend"
import { getBotGreeting, getBotSuggestions } from "@/lib/chat-bot"
import { generateIntelligentBotResponse } from "@/lib/chat-bot-ai"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { leadId, clinicId, content, senderType } = await request.json()

    if (!leadId || !clinicId || !content) {
      return NextResponse.json(
        { error: "Lead ID, Clinic ID, and content are required" },
        { status: 400 }
      )
    }

    if (!["patient", "clinic"].includes(senderType)) {
      return NextResponse.json(
        { error: "Invalid sender type" },
        { status: 400 }
      )
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
      .select("id, is_verified, first_name, last_name, email, treatment_interest, budget_range, pain_score, has_swelling, has_bleeding, additional_info")
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

    // Get clinic details (extended for AI bot context + email notifications)
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name, email, phone, treatments, price_range, description, facilities, opening_hours, accepts_nhs, parking_available, wheelchair_accessible, bot_intelligence")
      .eq("id", clinicId)
      .single()

    if (clinicError || !clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    // Get or create conversation using limit instead of single to avoid errors
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, bot_greeted, unread_count_clinic, unread_count_patient")
      .eq("lead_id", leadId)
      .eq("clinic_id", clinicId)
      .limit(1)

    let conversation = conversations?.[0] as { id: string; bot_greeted?: boolean; unread_count_clinic?: number; unread_count_patient?: number } | undefined

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
      }
    }

    if (!conversation) {
      return NextResponse.json(
        { error: "Failed to get or create conversation" },
        { status: 500 }
      )
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

    // Update conversation: set unread flags, increment unread counts, update timestamp
    const updateData: Record<string, any> = {
      last_message_at: new Date().toISOString(),
    }
    if (senderType === "patient") {
      updateData.unread_by_clinic = true
      updateData.unread_count_clinic = ((conversation as any).unread_count_clinic || 0) + 1
    } else {
      updateData.unread_by_patient = true
      updateData.unread_count_patient = ((conversation as any).unread_count_patient || 0) + 1
    }

    const { error: updateError } = await supabase
      .from("conversations")
      .update(updateData)
      .eq("id", conversation.id)

    if (updateError) {
      console.error("[Chat] Failed to update conversation:", updateError)
    }

    // Send email notification to clinic when patient sends a message
    // Only send if RESEND_VERIFIED_DOMAIN is set (indicating domain is verified)
    const verifiedDomain = process.env.RESEND_VERIFIED_DOMAIN
    if (senderType === "patient" && clinic.email && verifiedDomain) {
      try {
        await resend.emails.send({
          from: `MyDentalFly <notifications@${verifiedDomain}>`,
          to: clinic.email,
          subject: `New message from ${lead.first_name} ${lead.last_name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #0d9488; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">New Patient Message</h1>
              </div>
              <div style="padding: 30px; background-color: #f9fafb;">
                <p style="color: #374151; font-size: 16px;">
                  You have received a new message from <strong>${lead.first_name} ${lead.last_name}</strong>:
                </p>
                <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #0d9488;">
                  <p style="color: #4b5563; margin: 0; white-space: pre-wrap;">${trimmedContent.substring(0, 500)}${trimmedContent.length > 500 ? "..." : ""}</p>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://mydentalfly.com"}/clinic/inbox" 
                     style="background-color: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    View in Inbox
                  </a>
                </div>
              </div>
              <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
                <p>This is an automated message from MyDentalFly</p>
              </div>
            </div>
          `,
        })
      } catch (emailError) {
        // Don't fail the message send if email notification fails
        console.error("[Chat] Failed to send email notification:", emailError)
      }
    }

    // Bot auto-responder: AI-powered greeting + suggestions (template fallback)
    const botMessages: any[] = []
    const useAI = clinic.bot_intelligence !== false

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
        }
        const leadCtx = {
          first_name: lead.first_name,
          treatment_interest: lead.treatment_interest,
          budget_range: lead.budget_range,
          pain_score: lead.pain_score,
          has_swelling: lead.has_swelling,
          has_bleeding: lead.has_bleeding,
          additional_info: lead.additional_info,
        }
        const recentMsgs = [{ sender_type: "patient" as const, content: trimmedContent }]

        // Try AI greeting (if enabled), fall back to template
        const aiGreeting = useAI
          ? await generateIntelligentBotResponse("greeting", clinicCtx, leadCtx, recentMsgs)
          : null
        const greetingContent = aiGreeting || getBotGreeting(lead.first_name || "", clinic.name)

        const { data: greetingMsg } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversation.id,
            sender_type: "bot",
            content: greetingContent,
            sent_via: "chat",
          })
          .select("*")
          .single()
        if (greetingMsg) botMessages.push(greetingMsg)

        // Try AI suggestions (if enabled), fall back to template
        const aiSuggestions = useAI
          ? await generateIntelligentBotResponse("suggestions", clinicCtx, leadCtx, recentMsgs)
          : null
        const suggestionsContent = aiSuggestions || getBotSuggestions(clinic.name)

        const { data: suggestionsMsg } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversation.id,
            sender_type: "bot",
            content: suggestionsContent,
            sent_via: "chat",
          })
          .select("*")
          .single()
        if (suggestionsMsg) botMessages.push(suggestionsMsg)

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
    if (senderType === "patient" && conversation.bot_greeted && useAI) {
      try {
        // Check if clinic has replied in this conversation
        const { data: clinicReplies } = await supabase
          .from("messages")
          .select("id")
          .eq("conversation_id", conversation.id)
          .eq("sender_type", "clinic")
          .limit(1)

        if (!clinicReplies?.length) {
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

          const followUpResponse = await generateIntelligentBotResponse(
            "follow_up",
            {
              name: clinic.name,
              phone: clinic.phone,
              treatments: clinic.treatments,
              price_range: clinic.price_range,
              description: clinic.description,
              opening_hours: clinic.opening_hours,
              accepts_nhs: clinic.accepts_nhs,
              parking_available: clinic.parking_available,
              wheelchair_accessible: clinic.wheelchair_accessible,
            },
            {
              first_name: lead.first_name,
              treatment_interest: lead.treatment_interest,
              budget_range: lead.budget_range,
              pain_score: lead.pain_score,
              has_swelling: lead.has_swelling,
              has_bleeding: lead.has_bleeding,
              additional_info: lead.additional_info,
            },
            recentMsgs
          )

          if (followUpResponse) {
            const { data: followUpMsg } = await supabase
              .from("messages")
              .insert({
                conversation_id: conversation.id,
                sender_type: "bot",
                content: followUpResponse,
                sent_via: "chat",
              })
              .select("*")
              .single()
            if (followUpMsg) botMessages.push(followUpMsg)
          }
        }
      } catch (followUpError) {
        console.error("[Chat] Bot follow-up error:", followUpError)
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
