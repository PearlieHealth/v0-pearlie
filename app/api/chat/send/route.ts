import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Resend } from "resend"
import { getBotGreeting, getBotSuggestions } from "@/lib/chat-bot"

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

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, is_verified, first_name, last_name, email")
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

    // Get clinic details including email for notifications
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name, email")
      .eq("id", clinicId)
      .single()

    if (clinicError || !clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    // Get or create conversation using limit instead of single to avoid errors
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, bot_greeted")
      .eq("lead_id", leadId)
      .eq("clinic_id", clinicId)
      .limit(1)

    let conversation = conversations?.[0] as { id: string; bot_greeted?: boolean } | undefined

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

    // Create message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        sender_type: senderType,
        content: trimmedContent,
        sent_via: "chat",
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

    // Update conversation with unread flag
    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        unread_by_clinic: senderType === "patient" ? true : undefined,
        unread_by_patient: senderType === "clinic" ? true : undefined,
      })
      .eq("id", conversation.id)

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

    // Bot auto-responder: send greeting + suggestions on first patient message
    const botMessages: any[] = []
    if (senderType === "patient" && !conversation.bot_greeted) {
      try {
        // Insert bot greeting (slight delay so it appears after patient message)
        const greetingContent = getBotGreeting(lead.first_name || "", clinic.name)
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

        // Insert suggestions message
        const suggestionsContent = getBotSuggestions(clinic.name)
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
