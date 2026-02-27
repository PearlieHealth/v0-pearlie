/**
 * Email Reply Token — stateless HMAC-signed tokens for reply-to-email routing.
 *
 * Each outgoing chat notification email includes a Reply-To header like:
 *   reply+{token}@reply.pearlie.org
 *
 * Token format (compact binary, 31 bytes → 42 chars base64url):
 *   Bytes 0-15:  conversation UUID (16 bytes, raw binary)
 *   Byte 16:     sender type (0x00 = patient, 0x01 = clinic)
 *   Bytes 17-20: issued-at timestamp (4 bytes, uint32 big-endian, unix seconds)
 *   Bytes 21-30: HMAC-SHA256 truncated to 10 bytes (80-bit security)
 *
 * Local part: "reply+" (6) + 42 chars = 48 chars (under RFC 5321's 64-char limit).
 *
 * Sender email verification is done by looking up the conversation participant
 * in the database rather than encoding the email in the token.
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
  /** Unix timestamp (seconds) when the token was created */
  issuedAt: number
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Tokens older than this are rejected */
const TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60 // 30 days

/** Total binary token length: 16 (UUID) + 1 (sender) + 4 (timestamp) + 10 (HMAC) */
const TOKEN_BYTE_LENGTH = 31
const PAYLOAD_BYTE_LENGTH = 21
const HMAC_BYTE_LENGTH = 10

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
// UUID ↔ bytes helpers
// ---------------------------------------------------------------------------

function uuidToBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, "")
  if (hex.length !== 32) {
    throw new Error("Invalid UUID format")
  }
  return Buffer.from(hex, "hex")
}

function bytesToUuid(bytes: Buffer): string {
  const hex = bytes.toString("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a reply-to token for a conversation participant.
 * Returns the full Reply-To email address.
 *
 * The participantEmail parameter is accepted for API compatibility but is NOT
 * encoded in the token (verified from DB on inbound instead).
 */
export function generateReplyToAddress(
  conversationId: string,
  senderType: "patient" | "clinic",
  participantEmail: string
): string {
  const secret = getSecret()
  const issuedAt = Math.floor(Date.now() / 1000)

  // Build binary payload: UUID (16) + senderType (1) + timestamp (4) = 21 bytes
  const payload = Buffer.alloc(PAYLOAD_BYTE_LENGTH)
  uuidToBytes(conversationId).copy(payload, 0)
  payload[16] = senderType === "patient" ? 0x00 : 0x01
  payload.writeUInt32BE(issuedAt >>> 0, 17)

  // HMAC-SHA256 over payload, truncated to 10 bytes
  const hmac = createHmac("sha256", secret).update(payload).digest()
  const hmacTruncated = hmac.subarray(0, HMAC_BYTE_LENGTH)

  // Combine: 21 + 10 = 31 bytes → base64url = 42 chars
  const token = Buffer.concat([payload, hmacTruncated])
  const tokenStr = token.toString("base64url")

  const domain = getReplyDomain()
  return `reply+${tokenStr}@${domain}`
}

/**
 * Verify and decode a reply-to token from an inbound email address.
 * Returns the decoded payload or an error reason.
 *
 * Note: participantEmail is no longer in the token. The caller must verify
 * the sender email by looking up the conversation participant in the database.
 */
export function verifyReplyToken(
  replyToAddress: string
): { ok: true; payload: ReplyTokenPayload } | { ok: false; reason: string } {
  try {
    // Extract token from "reply+{token}@domain" or just the token itself
    let tokenStr = replyToAddress
    if (tokenStr.includes("@")) {
      const localPart = tokenStr.split("@")[0]
      if (!localPart.startsWith("reply+")) {
        return { ok: false, reason: "invalid_format" }
      }
      tokenStr = localPart.slice("reply+".length)
    }

    // Decode base64url → 31 bytes
    const token = Buffer.from(tokenStr, "base64url")
    if (token.length !== TOKEN_BYTE_LENGTH) {
      return { ok: false, reason: "invalid_length" }
    }

    const payload = token.subarray(0, PAYLOAD_BYTE_LENGTH)
    const hmacReceived = token.subarray(PAYLOAD_BYTE_LENGTH, TOKEN_BYTE_LENGTH)

    // Verify HMAC
    const secret = getSecret()
    const hmacExpected = createHmac("sha256", secret)
      .update(payload)
      .digest()
      .subarray(0, HMAC_BYTE_LENGTH)

    if (!timingSafeEqual(hmacReceived, hmacExpected)) {
      return { ok: false, reason: "invalid_signature" }
    }

    // Decode payload fields
    const conversationId = bytesToUuid(payload.subarray(0, 16))
    const senderByte = payload[16]
    const senderType = senderByte === 0x00 ? "patient" : "clinic"
    const issuedAt = payload.readUInt32BE(17)

    if (senderByte !== 0x00 && senderByte !== 0x01) {
      return { ok: false, reason: "invalid_sender_type" }
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

/**
 * Generate RFC 5322 email threading headers for a conversation.
 *
 * Uses a deterministic Message-ID anchor per conversation so that all
 * notification emails in the same conversation thread together in
 * Gmail / Outlook / Apple Mail.
 */
export function generateEmailThreadHeaders(conversationId: string): Record<string, string> {
  const domain = process.env.REPLY_EMAIL_DOMAIN || "reply.pearlie.org"
  const anchor = `<pearlie-thread-${conversationId}@${domain}>`
  return {
    References: anchor,
    "In-Reply-To": anchor,
  }
}
