/**
 * Email Reply Token — stateless HMAC-signed tokens for reply-to-email routing.
 *
 * Each outgoing chat notification email includes a Reply-To header like:
 *   reply+{token}@reply.pearlie.org
 *
 * The token encodes: conversationId, senderType (who will REPLY), participantEmail, timestamp.
 * Signed with HMAC-SHA256 so tokens can't be forged.
 */
import { createHmac, timingSafeEqual } from "crypto"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReplyTokenPayload {
  /** The conversation this reply belongs to */
  conversationId: string
  /** Who is replying: 'patient' or 'clinic' */
  senderType: "patient" | "clinic"
  /** The expected email address of the replier */
  participantEmail: string
  /** Unix timestamp (seconds) when the token was created */
  issuedAt: number
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Tokens older than this are rejected */
const TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60 // 30 days

function getSecret(): string {
  const secret = process.env.EMAIL_REPLY_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("EMAIL_REPLY_SECRET must be set and at least 32 characters")
  }
  return secret
}

function getReplyDomain(): string {
  return process.env.REPLY_EMAIL_DOMAIN || "reply.pearlie.org"
}

// ---------------------------------------------------------------------------
// Encoding helpers (base64url — URL-safe, no padding)
// ---------------------------------------------------------------------------

function toBase64Url(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function fromBase64Url(b64: string): string {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/")
  return Buffer.from(padded, "base64").toString("utf-8")
}

// ---------------------------------------------------------------------------
// HMAC
// ---------------------------------------------------------------------------

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("base64url")
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    // Lengths differ
    return false
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a reply-to token for a conversation participant.
 * Returns the full Reply-To email address.
 */
export function generateReplyToAddress(
  conversationId: string,
  senderType: "patient" | "clinic",
  participantEmail: string
): string {
  const secret = getSecret()
  const issuedAt = Math.floor(Date.now() / 1000)

  // Payload format: conversationId:senderType:email:timestamp
  const payload = `${conversationId}:${senderType}:${participantEmail}:${issuedAt}`
  const encoded = toBase64Url(payload)
  const signature = sign(payload, secret)

  const token = `${encoded}.${signature}`
  const domain = getReplyDomain()

  return `reply+${token}@${domain}`
}

/**
 * Verify and decode a reply-to token from an inbound email address.
 * Returns the decoded payload or an error reason.
 */
export function verifyReplyToken(
  replyToAddress: string
): { ok: true; payload: ReplyTokenPayload } | { ok: false; reason: string } {
  try {
    // Extract token from "reply+{token}@domain" or just the token itself
    let token = replyToAddress
    if (token.includes("@")) {
      const localPart = token.split("@")[0]
      if (!localPart.startsWith("reply+")) {
        return { ok: false, reason: "invalid_format" }
      }
      token = localPart.slice("reply+".length)
    }

    // Split into encoded payload and signature
    const dotIndex = token.lastIndexOf(".")
    if (dotIndex === -1) {
      return { ok: false, reason: "invalid_format" }
    }

    const encoded = token.slice(0, dotIndex)
    const signature = token.slice(dotIndex + 1)

    // Decode payload
    const payload = fromBase64Url(encoded)

    // Verify HMAC
    const secret = getSecret()
    if (!verifySignature(payload, signature, secret)) {
      return { ok: false, reason: "invalid_signature" }
    }

    // Parse payload: conversationId:senderType:email:timestamp
    const parts = payload.split(":")
    if (parts.length < 4) {
      return { ok: false, reason: "invalid_payload" }
    }

    // Email may contain colons (rare but possible), so rejoin everything between index 2 and last
    const conversationId = parts[0]
    const senderType = parts[1]
    const issuedAt = parseInt(parts[parts.length - 1], 10)
    const participantEmail = parts.slice(2, parts.length - 1).join(":")

    if (senderType !== "patient" && senderType !== "clinic") {
      return { ok: false, reason: "invalid_sender_type" }
    }

    if (isNaN(issuedAt)) {
      return { ok: false, reason: "invalid_timestamp" }
    }

    // Check expiry
    const now = Math.floor(Date.now() / 1000)
    if (now - issuedAt > TOKEN_MAX_AGE_SECONDS) {
      return { ok: false, reason: "expired" }
    }

    return {
      ok: true,
      payload: {
        conversationId,
        senderType: senderType as "patient" | "clinic",
        participantEmail,
        issuedAt,
      },
    }
  } catch {
    return { ok: false, reason: "parse_error" }
  }
}

/**
 * Generate the hidden thread marker for email body (backup identification).
 */
export function generateThreadMarker(conversationId: string): string {
  return `<!-- pearlie-thread:${conversationId} -->`
}

/**
 * Extract conversation ID from a hidden thread marker in email HTML body.
 */
export function extractThreadMarker(htmlBody: string): string | null {
  const match = htmlBody.match(/<!-- pearlie-thread:([a-f0-9-]+) -->/)
  return match ? match[1] : null
}
