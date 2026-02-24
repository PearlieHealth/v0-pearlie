import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAppUrl } from "@/lib/clinic-url"

const UNSUBSCRIBE_SECRET = process.env.SUPABASE_JWT_SECRET || ""

/**
 * Generate an HMAC-signed unsubscribe token containing email + category.
 */
function generateToken(email: string, category: string): string {
  const payload = `${email}:${category}`
  const hmac = crypto.createHmac("sha256", UNSUBSCRIBE_SECRET)
  hmac.update(payload)
  const signature = hmac.digest("hex")
  return Buffer.from(JSON.stringify({ email, category, sig: signature })).toString("base64url")
}

/**
 * Verify and decode an unsubscribe token.
 */
export function verifyToken(token: string): { email: string; category: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"))
    const { email, category, sig } = decoded
    if (!email || !category || !sig) return null

    const payload = `${email}:${category}`
    const hmac = crypto.createHmac("sha256", UNSUBSCRIBE_SECRET)
    hmac.update(payload)
    const expected = hmac.digest("hex")

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null
    }

    return { email, category }
  } catch {
    return null
  }
}

/**
 * Generate a full unsubscribe URL for inclusion in emails.
 */
export function generateUnsubscribeUrl(email: string, category: string): string {
  const baseUrl = getAppUrl()
  const token = generateToken(email, category)
  return `${baseUrl}/api/unsubscribe?token=${token}`
}

/**
 * Generate an HTML footer for notification emails with unsubscribe link.
 */
export function generateUnsubscribeFooterHtml(unsubscribeUrl: string): string {
  return `
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="font-size: 12px; color: #9ca3af;">
        <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> from these notifications
      </p>
    </div>
  `
}

/**
 * Generate List-Unsubscribe headers for RFC 8058 compliance.
 */
export function generateUnsubscribeHeaders(email: string, category: string): Record<string, string> {
  const url = generateUnsubscribeUrl(email, category)
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  }
}

/**
 * Check if an email address has unsubscribed from a given category.
 */
export async function isUnsubscribed(email: string, category: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("email_preferences")
      .select("id")
      .eq("email", email.toLowerCase())
      .eq("category", category)
      .single()
    return !!data
  } catch {
    return false
  }
}
