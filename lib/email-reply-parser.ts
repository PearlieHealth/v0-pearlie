/**
 * Email Reply Parser — extracts the new content from an inbound email reply,
 * stripping quoted history, signatures, and common email client artifacts.
 *
 * Handles Gmail, Outlook, Apple Mail, Yahoo, and most common patterns.
 */

// ---------------------------------------------------------------------------
// Quoted text markers (order matters — check most specific first)
// ---------------------------------------------------------------------------

const QUOTE_PATTERNS: RegExp[] = [
  // Gmail: "On Mon, Jan 1, 2026 at 12:00 PM Someone <email> wrote:"
  /^On .{1,80} wrote:\s*$/m,

  // Outlook: "From: Name <email>"
  /^From:\s+.+$/m,

  // Outlook: "-----Original Message-----"
  /^-{2,}\s*Original Message\s*-{2,}/im,

  // Apple Mail / generic: "On Jan 1, 2026, at 12:00 PM, Someone wrote:"
  /^On .{1,80}, .{1,40} wrote:\s*$/m,

  // Generic separator lines
  /^_{3,}\s*$/m,
  /^-{3,}\s*$/m,

  // Quoted block starting with ">"
  /^>+\s/m,

  // Yahoo: "On [date], [name] <[email]> wrote:"
  /^On \w+day, .{1,80} wrote:\s*$/m,

  // French: "Le ... a écrit :"
  /^Le .{1,80} a écrit\s*:\s*$/m,

  // German: "Am ... schrieb ..."
  /^Am .{1,80} schrieb .{1,80}:\s*$/m,

  // Pearlie's own thread marker
  /<!-- pearlie-thread:[a-f0-9-]+ -->/,
]

// ---------------------------------------------------------------------------
// Signature markers
// ---------------------------------------------------------------------------

const SIGNATURE_PATTERNS: RegExp[] = [
  // Common signature separators
  /^--\s*$/m,
  /^—\s*$/m,
  /^_{3,}$/m,

  // "Sent from my iPhone/iPad/Galaxy/etc."
  /^Sent from my /im,
  /^Sent from Mail for /im,
  /^Sent from Outlook/im,
  /^Sent from Yahoo/im,
  /^Get Outlook for /im,
]

// ---------------------------------------------------------------------------
// HTML stripping
// ---------------------------------------------------------------------------

/**
 * Convert HTML email body to plain text, preserving basic structure.
 */
export function htmlToPlainText(html: string): string {
  return html
    // Remove style and script tags with content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    // Convert <br> and block elements to newlines
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|tr|li|h[1-6]|blockquote)[^>]*>/gi, "\n")
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    // Collapse multiple newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// ---------------------------------------------------------------------------
// Core parser
// ---------------------------------------------------------------------------

export interface ParsedEmailReply {
  /** The new reply content (cleaned) */
  body: string
  /** Whether quoted text was found and stripped */
  hadQuotedText: boolean
  /** The original text before stripping (for debugging) */
  originalText: string
}

/**
 * Parse an inbound email reply and extract only the new content.
 *
 * @param text - The email body (plain text preferred, or HTML that will be converted)
 * @param html - Optional HTML body (used if text is empty)
 */
export function parseEmailReply(text: string | null, html: string | null): ParsedEmailReply {
  // Prefer plain text; fall back to HTML conversion
  let content = (text || "").trim()
  if (!content && html) {
    content = htmlToPlainText(html)
  }

  if (!content) {
    return { body: "", hadQuotedText: false, originalText: "" }
  }

  const originalText = content

  // First pass: find the earliest quote marker and truncate everything after it
  let earliestQuoteIndex = content.length
  let hadQuotedText = false

  for (const pattern of QUOTE_PATTERNS) {
    const match = content.match(pattern)
    if (match && match.index !== undefined && match.index < earliestQuoteIndex) {
      earliestQuoteIndex = match.index
      hadQuotedText = true
    }
  }

  if (hadQuotedText) {
    content = content.slice(0, earliestQuoteIndex)
  }

  // Second pass: find and remove signature
  let earliestSigIndex = content.length
  for (const pattern of SIGNATURE_PATTERNS) {
    const match = content.match(pattern)
    if (match && match.index !== undefined && match.index < earliestSigIndex) {
      // Only treat as signature if there's content before it
      if (match.index > 10) {
        earliestSigIndex = match.index
        hadQuotedText = true
      }
    }
  }

  content = content.slice(0, earliestSigIndex)

  // Clean up
  content = content
    // Remove leading/trailing whitespace
    .trim()
    // Collapse multiple blank lines to one
    .replace(/\n{3,}/g, "\n\n")
    // Remove trailing whitespace on each line
    .replace(/[ \t]+$/gm, "")

  return {
    body: content,
    hadQuotedText,
    originalText,
  }
}

/**
 * Sanitize email reply content for safe storage.
 * Removes potential XSS, trims to max length.
 */
export function sanitizeReplyContent(body: string, maxLength = 5000): string {
  let safe = body
    // Remove any HTML tags that might have survived
    .replace(/<[^>]+>/g, "")
    // Remove null bytes
    .replace(/\0/g, "")
    // Trim to max length
    .slice(0, maxLength)
    .trim()

  return safe
}
