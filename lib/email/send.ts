/**
 * Unified email sending function.
 *
 * Wraps the existing sendEmailWithRetry() with:
 * 1. Zod payload validation (prevents broken templates)
 * 2. Idempotency check (prevents duplicate sends via email_logs unique index)
 * 3. Unsubscribe checks (respects email_preferences)
 * 4. Template rendering via the registry
 * 5. Automatic List-Unsubscribe headers
 * 6. Universal logging to email_logs (every email, with idempotency key)
 */
import { EMAIL_REGISTRY, type EmailType } from "./registry"
import { EMAIL_FROM } from "@/lib/email-config"
import { sendEmailWithRetry } from "@/lib/email-send"
import { isUnsubscribed, generateUnsubscribeHeaders } from "@/lib/unsubscribe"
import { createAdminClient } from "@/lib/supabase/admin"

export interface SendRegisteredEmailParams {
  type: EmailType
  to: string
  /** Template data — validated against the registry's Zod schema. */
  data: Record<string, any>
  /** Additional email headers (e.g. pre-built unsubscribe headers). */
  headers?: Record<string, string>
  replyTo?: string
  /** Context for logging — not used in the template. */
  clinicId?: string
  leadId?: string
  waitlistId?: string
}

export interface SendRegisteredEmailResult {
  success: boolean
  skipped?: boolean
  reason?: string
  messageId?: string
  error?: string
  validationErrors?: any
}

export async function sendRegisteredEmail(
  params: SendRegisteredEmailParams
): Promise<SendRegisteredEmailResult> {
  const entry = EMAIL_REGISTRY[params.type]
  if (!entry) {
    return { success: false, error: `Unknown email type: ${params.type}` }
  }

  // 1. Validate payload
  const parseResult = entry.payloadSchema.safeParse(params.data)
  if (!parseResult.success) {
    console.error(`[Email] Payload validation failed for ${params.type}:`, parseResult.error.flatten())
    return {
      success: false,
      error: "Payload validation failed",
      validationErrors: parseResult.error.flatten(),
    }
  }

  // 2. Check idempotency (prevent duplicate sends)
  let idempotencyKey: string | null = null
  if (entry.idempotencyKey) {
    idempotencyKey = entry.idempotencyKey(params.data)
    try {
      const supabase = createAdminClient()
      const { data: existing } = await supabase
        .from("email_logs")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .eq("status", "sent")
        .limit(1)
        .maybeSingle()

      if (existing) {
        console.log(`[Email] Skipping duplicate ${params.type}, key=${idempotencyKey}`)
        return { success: true, skipped: true, reason: "duplicate" }
      }
    } catch (err) {
      console.error(`[Email] Idempotency check failed for ${params.type}:`, err)
      // Continue sending if the check fails
    }
  }

  // 3. Check unsubscribe
  if (entry.unsubscribeCategory) {
    try {
      const unsubscribed = await isUnsubscribed(params.to, entry.unsubscribeCategory)
      if (unsubscribed) {
        console.log(`[Email] Skipping ${params.type} to ${params.to}: unsubscribed from ${entry.unsubscribeCategory}`)
        return { success: true, skipped: true, reason: "unsubscribed" }
      }
    } catch (err) {
      console.error(`[Email] Unsubscribe check failed for ${params.type}:`, err)
      // Continue sending if the check fails
    }
  }

  // 4. Render HTML
  const html = entry.generateHtml(parseResult.data)

  // 5. Compute subject
  const subject =
    typeof entry.defaultSubject === "function"
      ? entry.defaultSubject(parseResult.data)
      : entry.defaultSubject

  // 6. Build headers
  const allHeaders: Record<string, string> = { ...params.headers }
  if (entry.unsubscribeCategory && !allHeaders["List-Unsubscribe"]) {
    Object.assign(allHeaders, generateUnsubscribeHeaders(params.to, entry.unsubscribeCategory))
  }

  // 7. Send via Resend
  const result = await sendEmailWithRetry({
    from: EMAIL_FROM[entry.fromAddress],
    to: params.to,
    subject,
    html,
    headers: Object.keys(allHeaders).length > 0 ? allHeaders : undefined,
    replyTo: params.replyTo,
  })

  // 8. Log to email_logs (always, with idempotency key)
  try {
    const supabase = createAdminClient()
    await supabase.from("email_logs").insert({
      email_type: params.type,
      to_email: params.to,
      subject,
      status: result.success ? "sent" : "failed",
      error: result.error || null,
      provider_message_id: result.messageId || null,
      from_address: EMAIL_FROM[entry.fromAddress],
      clinic_id: params.clinicId || null,
      lead_id: params.leadId || null,
      idempotency_key: idempotencyKey,
      html_body: html,
    })
  } catch (logError) {
    // Never let logging failure break the send
    console.error(`[Email] Failed to log email to DB:`, logError)
  }

  return result
}
