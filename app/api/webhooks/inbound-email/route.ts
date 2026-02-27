/**
 * Inbound Email Webhook — receives email replies via Resend and routes them
 * back into the corresponding Pearlie chat conversation.
 *
 * Flow:
 * 1. Verify Resend webhook signature (Svix format)
 * 2. Check idempotency (resend message ID)
 * 3. Extract + verify reply token from To address
 * 4. Validate sender email matches expected participant
 * 5. Parse email body (strip quoted text, signatures)
 * 6. Insert message into conversation (sent_via: 'email')
 * 7. Broadcast via Realtime for instant delivery
 * 8. Update unread counts + conversation state
 * 9. Trigger outbound notification to other party
 * 10. Log everything to inbound_email_log
 */
import { type NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyReplyToken } from "@/lib/email-reply-token"
import { parseEmailReply, sanitizeReplyContent } from "@/lib/email-reply-parser"
import { escapeHtml } from "@/lib/escape-html"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { generateUnsubscribeFooterHtml, generateUnsubscribeHeaders } from "@/lib/unsubscribe"
import { generateReplyToAddress, generateThreadMarker } from "@/lib/email-reply-token"

// ---------------------------------------------------------------------------
// Svix webhook signature verification (matches Resend's format)
// ---------------------------------------------------------------------------

function verifyWebhookSignature(
  body: string,
  headers: { svixId: string; svixTimestamp: string; svixSignature: string },
  secret: string
): boolean {
  try {
    // Resend webhook secrets start with "whsec_" — strip it and base64-decode
    const secretBytes = Buffer.from(
      secret.startsWith("whsec_") ? secret.slice(6) : secret,
      "base64"
    )

    // Message to sign: "{svix_id}.{svix_timestamp}.{body}"
    const message = `${headers.svixId}.${headers.svixTimestamp}.${body}`
    const expected = createHmac("sha256", secretBytes).update(message).digest("base64")

    // Signature header may contain multiple signatures: "v1,sig1 v1,sig2"
    const signatures = headers.svixSignature.split(" ")
    for (const sig of signatures) {
      const sigValue = sig.startsWith("v1,") ? sig.slice(3) : sig
      try {
        if (timingSafeEqual(Buffer.from(expected), Buffer.from(sigValue))) {
          return true
        }
      } catch {
        // Length mismatch — try next signature
      }
    }

    return false
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Helper: log inbound email to DB
// ---------------------------------------------------------------------------

async function logInboundEmail(
  supabase: ReturnType<typeof createAdminClient>,
  data: {
    resend_message_id?: string
    from_email: string
    to_address: string
    conversation_id?: string
    message_id?: string
    status: string
    rejection_reason?: string
    raw_subject?: string
    parsed_body?: string
  }
) {
  try {
    await supabase.from("inbound_email_log").insert(data)
  } catch (err) {
    console.error("[InboundEmail] Failed to log:", err)
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  // Read raw body for signature verification
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  // 1. Verify webhook signature
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (webhookSecret) {
    const svixId = request.headers.get("svix-id") || ""
    const svixTimestamp = request.headers.get("svix-timestamp") || ""
    const svixSignature = request.headers.get("svix-signature") || ""

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.warn("[InboundEmail] Missing svix headers")
      return NextResponse.json({ error: "Missing signature headers" }, { status: 401 })
    }

    // Reject if timestamp is more than 5 minutes old (replay protection)
    const timestampSec = parseInt(svixTimestamp, 10)
    const nowSec = Math.floor(Date.now() / 1000)
    if (isNaN(timestampSec) || Math.abs(nowSec - timestampSec) > 300) {
      console.warn("[InboundEmail] Timestamp too old or invalid:", svixTimestamp)
      return NextResponse.json({ error: "Invalid timestamp" }, { status: 401 })
    }

    if (!verifyWebhookSignature(rawBody, { svixId, svixTimestamp, svixSignature }, webhookSecret)) {
      console.warn("[InboundEmail] Signature verification failed")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  } else {
    console.warn("[InboundEmail] RESEND_WEBHOOK_SECRET not set — skipping verification (DEV ONLY)")
  }

  // Parse the webhook payload
  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Resend wraps the email data in a "data" field for email.received events
  const eventType = payload.type
  if (eventType !== "email.received") {
    // Not an inbound email event — acknowledge and ignore
    return NextResponse.json({ ok: true, skipped: "not_email_received" })
  }

  const emailData = payload.data
  if (!emailData) {
    return NextResponse.json({ error: "Missing email data" }, { status: 400 })
  }

  const fromEmail = extractEmailAddress(emailData.from)
  const toAddresses: string[] = Array.isArray(emailData.to) ? emailData.to : [emailData.to]
  const resendMessageId = emailData.message_id || payload.id || null
  const subject = emailData.subject || ""
  const textBody = emailData.text || null
  const htmlBody = emailData.html || null

  // 2. Check idempotency
  if (resendMessageId) {
    const { data: existing } = await supabase
      .from("inbound_email_log")
      .select("id")
      .eq("resend_message_id", resendMessageId)
      .limit(1)
      .maybeSingle()

    if (existing) {
      console.log("[InboundEmail] Duplicate webhook, skipping:", resendMessageId)
      return NextResponse.json({ ok: true, skipped: "duplicate" })
    }
  }

  // 3. Find the reply token from To addresses
  let tokenAddress: string | null = null
  for (const addr of toAddresses) {
    const cleaned = extractEmailAddress(addr)
    if (cleaned.startsWith("reply+")) {
      tokenAddress = cleaned
      break
    }
  }

  if (!tokenAddress) {
    await logInboundEmail(supabase, {
      resend_message_id: resendMessageId,
      from_email: fromEmail,
      to_address: toAddresses.join(", "),
      status: "rejected",
      rejection_reason: "no_reply_token",
      raw_subject: subject,
    })
    return NextResponse.json({ error: "No reply token found in To address" }, { status: 400 })
  }

  // 4. Verify the token
  const tokenResult = verifyReplyToken(tokenAddress)
  if (!tokenResult.ok) {
    await logInboundEmail(supabase, {
      resend_message_id: resendMessageId,
      from_email: fromEmail,
      to_address: tokenAddress,
      status: "rejected",
      rejection_reason: `token_${tokenResult.reason}`,
      raw_subject: subject,
    })
    console.warn("[InboundEmail] Token verification failed:", tokenResult.reason)
    return NextResponse.json({ error: `Invalid token: ${tokenResult.reason}` }, { status: 400 })
  }

  const { conversationId, senderType, participantEmail } = tokenResult.payload

  // 5. Verify sender email matches expected participant
  if (fromEmail.toLowerCase() !== participantEmail.toLowerCase()) {
    await logInboundEmail(supabase, {
      resend_message_id: resendMessageId,
      from_email: fromEmail,
      to_address: tokenAddress,
      conversation_id: conversationId,
      status: "rejected",
      rejection_reason: "sender_mismatch",
      raw_subject: subject,
    })
    console.warn(`[InboundEmail] Sender mismatch: got ${fromEmail}, expected ${participantEmail}`)
    return NextResponse.json({ error: "Sender email does not match" }, { status: 403 })
  }

  // 6. Load conversation
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, clinic_id, lead_id, conversation_state, muted_by_patient, notification_cycles_used, current_notification_cycle_start, unread_count_clinic, unread_count_patient, clinic_first_reply_at")
    .eq("id", conversationId)
    .single()

  if (convError || !conversation) {
    await logInboundEmail(supabase, {
      resend_message_id: resendMessageId,
      from_email: fromEmail,
      to_address: tokenAddress,
      conversation_id: conversationId,
      status: "rejected",
      rejection_reason: "conversation_not_found",
      raw_subject: subject,
    })
    console.error("[InboundEmail] Conversation not found:", conversationId)
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  // 7. If conversation is closed, re-open it
  if (conversation.conversation_state === "closed") {
    await supabase
      .from("conversations")
      .update({ conversation_state: "open" })
      .eq("id", conversationId)
    console.log("[InboundEmail] Re-opened closed conversation:", conversationId)
  }

  // 8. Parse email body — strip quoted text and signatures
  const parsed = parseEmailReply(textBody, htmlBody)
  const cleanBody = sanitizeReplyContent(parsed.body)

  if (!cleanBody) {
    await logInboundEmail(supabase, {
      resend_message_id: resendMessageId,
      from_email: fromEmail,
      to_address: tokenAddress,
      conversation_id: conversationId,
      status: "rejected",
      rejection_reason: "empty_body",
      raw_subject: subject,
      parsed_body: "",
    })
    return NextResponse.json({ error: "Empty reply body" }, { status: 400 })
  }

  // 9. Insert message into conversation
  const { data: message, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_type: senderType,
      content: cleanBody,
      sent_via: "email",
      status: "sent",
    })
    .select("*")
    .single()

  if (msgError) {
    console.error("[InboundEmail] Failed to insert message:", msgError)
    await logInboundEmail(supabase, {
      resend_message_id: resendMessageId,
      from_email: fromEmail,
      to_address: tokenAddress,
      conversation_id: conversationId,
      status: "rejected",
      rejection_reason: "insert_failed",
      raw_subject: subject,
      parsed_body: cleanBody,
    })
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
  }

  // 10. Broadcast via Realtime
  try {
    const broadcastChannel = supabase.channel(`chat:${conversationId}`)
    await broadcastChannel.send({
      type: "broadcast",
      event: "new_message",
      payload: { message },
    })
    await supabase.removeChannel(broadcastChannel)
  } catch (broadcastError) {
    console.error("[InboundEmail] Broadcast error:", broadcastError)
  }

  // 11. Update unread counts and conversation metadata
  const { error: rpcError } = await supabase.rpc("increment_unread", {
    p_conversation_id: conversationId,
    p_sender_type: senderType,
  })

  const updateData: Record<string, any> = {
    last_message_at: new Date().toISOString(),
  }

  if (senderType === "patient") {
    updateData.unread_by_clinic = true
    updateData.unread_by_patient = false
    updateData.unread_count_patient = 0
    updateData.last_patient_reply_at = new Date().toISOString()
    // Reset notification cycles on patient reply (same as chat send route)
    updateData.notification_cycles_used = 0
    updateData.current_notification_cycle_start = null
  } else {
    updateData.unread_by_patient = true
    updateData.unread_by_clinic = false
    updateData.unread_count_clinic = 0
  }

  // Fallback if increment_unread RPC not available
  if (rpcError) {
    console.warn("[InboundEmail] increment_unread RPC failed, falling back:", rpcError.message)
    if (senderType === "patient") {
      updateData.unread_count_clinic = (conversation.unread_count_clinic || 0) + 1
    } else {
      updateData.unread_count_patient = (conversation.unread_count_patient || 0) + 1
    }
  }

  await supabase
    .from("conversations")
    .update(updateData)
    .eq("id", conversationId)

  // 12. Send notification email to the other party
  try {
    if (senderType === "patient") {
      await notifyClinic(supabase, conversation, cleanBody)
    } else {
      await notifyPatient(supabase, conversation, cleanBody)
    }
  } catch (notifyError) {
    console.error("[InboundEmail] Notification error:", notifyError)
  }

  // 13. Log success
  await logInboundEmail(supabase, {
    resend_message_id: resendMessageId,
    from_email: fromEmail,
    to_address: tokenAddress,
    conversation_id: conversationId,
    message_id: message.id,
    status: "processed",
    raw_subject: subject,
    parsed_body: cleanBody,
  })

  console.log(`[InboundEmail] Successfully processed reply for conversation ${conversationId} from ${senderType}`)

  return NextResponse.json({ ok: true, messageId: message.id })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract bare email address from "Name <email>" or just "email" format.
 */
function extractEmailAddress(raw: string): string {
  if (!raw) return ""
  const match = raw.match(/<([^>]+)>/)
  return (match ? match[1] : raw).trim().toLowerCase()
}

/**
 * Send notification email to the clinic when patient replies via email.
 */
async function notifyClinic(
  supabase: ReturnType<typeof createAdminClient>,
  conversation: any,
  messageContent: string
) {
  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, email, notification_email")
    .eq("id", conversation.clinic_id)
    .single()

  if (!clinic) return

  const clinicEmail = clinic.notification_email || clinic.email
  if (!clinicEmail) return

  const { data: lead } = await supabase
    .from("leads")
    .select("first_name, last_name, email")
    .eq("id", conversation.lead_id)
    .single()

  if (!lead) return

  const safeName = escapeHtml(`${lead.first_name} ${lead.last_name}`.trim())
  const safeContent = escapeHtml(messageContent.substring(0, 500)) + (messageContent.length > 500 ? "..." : "")
  const unsubFooter = generateUnsubscribeFooterHtml(
    generateUnsubscribeHeaders(clinicEmail, "clinic_notifications")["List-Unsubscribe"].replace(/[<>]/g, "")
  )

  // Generate reply-to token for the clinic to reply back
  const replyTo = generateReplyToAddress(conversation.id, "clinic", clinicEmail)

  const { portalUrl } = await import("@/lib/clinic-url")

  await sendRegisteredEmail({
    type: EMAIL_TYPE.CHAT_NOTIFICATION_TO_CLINIC,
    to: clinicEmail,
    data: {
      patientName: safeName,
      messagePreview: safeContent,
      inboxUrl: portalUrl("/clinic/appointments"),
      unsubscribeFooterHtml: unsubFooter,
      _conversationId: conversation.id,
      replyToAddress: replyTo,
      threadMarker: generateThreadMarker(conversation.id),
    },
    headers: generateUnsubscribeHeaders(clinicEmail, "clinic_notifications"),
    replyTo,
    clinicId: conversation.clinic_id,
    leadId: conversation.lead_id,
  })
}

/**
 * Send notification email to the patient when clinic replies via email.
 * Follows the same throttling rules as the clinic-reply route.
 */
async function notifyPatient(
  supabase: ReturnType<typeof createAdminClient>,
  conversation: any,
  messageContent: string
) {
  // Throttling logic (matches clinic-reply route)
  const NOTIFICATION_WINDOW_MS = 15 * 60 * 1000
  const MAX_NOTIFICATION_CYCLES = 2
  const now = new Date()

  let shouldNotify = true
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

  if (!shouldNotify) return

  // Update notification cycle tracking
  const isNewCycle = !conversation.current_notification_cycle_start ||
    (now.getTime() - new Date(conversation.current_notification_cycle_start).getTime() >= NOTIFICATION_WINDOW_MS)

  const notificationUpdate: Record<string, any> = {
    current_notification_cycle_start: now.toISOString(),
  }
  if (isNewCycle) {
    notificationUpdate.notification_cycles_used = (conversation.notification_cycles_used || 0) + 1
  }

  await supabase
    .from("conversations")
    .update(notificationUpdate)
    .eq("id", conversation.id)

  const { data: lead } = await supabase
    .from("leads")
    .select("email, first_name")
    .eq("id", conversation.lead_id)
    .single()

  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, id")
    .eq("id", conversation.clinic_id)
    .single()

  if (!lead?.email || !clinic) return

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
  const safeFirstName = lead.first_name ? escapeHtml(lead.first_name) : ""
  const safeClinicName = escapeHtml(clinic.name)
  const safeContent = escapeHtml(messageContent.substring(0, 500)) + (messageContent.length > 500 ? "..." : "")
  const unsubFooter = generateUnsubscribeFooterHtml(
    generateUnsubscribeHeaders(lead.email, "patient_notifications")["List-Unsubscribe"].replace(/[<>]/g, "")
  )

  // Generate magic link for "View & Reply" button
  const messagesPath = `/patient/dashboard`
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(messagesPath)}`
  let viewReplyUrl = `${appUrl}${messagesPath}`

  try {
    const { data: linkData } = await supabase.auth.admin.generateLink({
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
    console.warn("[InboundEmail] Failed to generate magic link:", linkErr)
  }

  // Generate reply-to token for the patient to reply back
  const replyTo = generateReplyToAddress(conversation.id, "patient", lead.email)

  await sendRegisteredEmail({
    type: EMAIL_TYPE.CLINIC_REPLY_TO_PATIENT,
    to: lead.email,
    data: {
      patientFirstName: safeFirstName,
      clinicName: safeClinicName,
      messagePreview: safeContent,
      viewReplyUrl,
      unsubscribeFooterHtml: unsubFooter,
      _conversationId: conversation.id,
      _notificationCycle: notificationUpdate.notification_cycles_used || conversation.notification_cycles_used || 0,
      replyToAddress: replyTo,
      threadMarker: generateThreadMarker(conversation.id),
    },
    headers: generateUnsubscribeHeaders(lead.email, "patient_notifications"),
    replyTo,
    clinicId: conversation.clinic_id,
    leadId: conversation.lead_id,
  })
}
