import { SupabaseClient } from "@supabase/supabase-js"

/**
 * Logs an affiliate financial event to the immutable audit trail.
 * Non-blocking — errors are swallowed to never break the main flow.
 */
export async function logAffiliateAudit(
  supabase: SupabaseClient,
  params: {
    affiliate_id: string
    action: string
    entity_type: "referral_conversion" | "affiliate_payout"
    entity_id: string
    details?: Record<string, unknown>
    performed_by?: string
  }
) {
  try {
    await supabase.from("affiliate_audit_log").insert({
      affiliate_id: params.affiliate_id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      details: params.details || {},
      performed_by: params.performed_by || "system",
    })
  } catch {
    // Audit logging must never break the main flow
  }
}

/**
 * Normalizes an email for identity matching:
 * - Lowercases and trims
 * - Strips +aliases for all providers
 * - Strips dots for Gmail/Googlemail
 */
export function normalizeEmail(email: string): string {
  if (!email) return email
  email = email.toLowerCase().trim()
  const [rawLocal, domain] = email.split("@")
  if (!rawLocal || !domain) return email

  let local = rawLocal.split("+")[0]

  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "")
  }

  return `${local}@${domain}`
}
