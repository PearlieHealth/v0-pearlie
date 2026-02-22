import { Resend } from "resend"

let _resend: Resend | null = null
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

interface SendEmailParams {
  from: string
  to: string | string[]
  subject: string
  html: string
  headers?: Record<string, string>
  replyTo?: string
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send email with retry (up to 3 attempts with exponential backoff).
 * Skips retry on validation errors (4xx). Returns result instead of throwing.
 */
export async function sendEmailWithRetry(
  params: SendEmailParams,
  maxRetries = 2
): Promise<SendEmailResult> {
  // Sandbox mode: skip Resend API call, return mock success
  if (process.env.EMAIL_SANDBOX_MODE === "true") {
    const mockId = `sandbox-${Date.now()}`
    console.log(`[SANDBOX] Would send to ${params.to}: ${params.subject}`)
    return { success: true, messageId: mockId }
  }

  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await getResend().emails.send(params)
      if (error) {
        lastError = error
        // Don't retry validation errors
        if (error.message?.includes("validation") || error.name === "validation_error") {
          return { success: false, error: error.message }
        }
        if (attempt < maxRetries) {
          await sleep(Math.pow(2, attempt) * 500)
          continue
        }
        return { success: false, error: error.message }
      }
      return { success: true, messageId: data?.id }
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 500)
        continue
      }
    }
  }
  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : "Unknown email error",
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
