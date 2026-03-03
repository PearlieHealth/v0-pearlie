/**
 * Natural email template — renders AI-generated (or fallback) patient enquiry
 * emails in a plain, non-branded format that looks like a real email.
 *
 * No teal headers, no badges, no Pearlie branding in the body.
 * Just a clean, professional email with a tiny footer link to the dashboard.
 */

import { escapeHtml } from "@/lib/escape-html"
import { portalUrl } from "@/lib/clinic-url"

export interface NaturalEmailTemplateData {
  /** The plain-text body (from AI or fallback). Newlines → <br>/<p> */
  emailBody: string
  /** Whether this was AI-generated (for internal logging, not shown) */
  aiGenerated: boolean
  /** Dashboard URL for the subtle footer link */
  dashboardPath?: string
}

/**
 * Convert plain-text email body to simple HTML paragraphs.
 * Double newlines become paragraph breaks, single newlines become <br>.
 */
function textToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map(para => {
      const escaped = escapeHtml(para.trim())
      // Preserve single line breaks within paragraphs (for signature)
      const withBreaks = escaped.replace(/\n/g, "<br>")
      return `<p style="margin: 0 0 16px 0; line-height: 1.6;">${withBreaks}</p>`
    })
    .join("\n")
}

export function renderNaturalEmail(data: NaturalEmailTemplateData): string {
  const bodyHtml = textToHtml(data.emailBody)
  const dashboardUrl = data.dashboardPath
    ? portalUrl(data.dashboardPath)
    : portalUrl("/clinic/leads")

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 0; background-color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
      <div style="font-size: 15px; color: #1a1a1a; line-height: 1.6;">
        ${bodyHtml}
      </div>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 11px; color: #999;">
        <a href="${dashboardUrl}" style="color: #999; text-decoration: underline;">View in clinic dashboard</a>
      </div>
    </div>
  </body>
</html>`
}

// ---------------------------------------------------------------------------
// Natural chat notification (patient message → clinic)
// ---------------------------------------------------------------------------

export interface NaturalChatToClinicData {
  patientName: string
  messagePreview: string
  inboxUrl: string
  unsubscribeFooterHtml: string
  replyToAddress?: string
  threadMarker?: string
  recentMessages?: { sender: string; content: string; timestamp?: string }[]
}

function renderNaturalRecentMessages(messages: { sender: string; content: string; timestamp?: string }[]): string {
  if (!messages || messages.length === 0) return ""
  return messages
    .map(m => {
      const ts = m.timestamp ? ` (${escapeHtml(m.timestamp)})` : ""
      return `<p style="margin: 0 0 12px 0; font-size: 14px; color: #555; line-height: 1.5;"><strong style="color: #333;">${escapeHtml(m.sender)}</strong>${ts}<br>${escapeHtml(m.content)}</p>`
    })
    .join("\n")
}

export function renderNaturalChatToClinicEmail(data: NaturalChatToClinicData): string {
  const threadMarker = data.threadMarker || ""
  const recentHtml = data.recentMessages && data.recentMessages.length > 0
    ? `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee;">
        <p style="margin: 0 0 12px 0; font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.03em;">Earlier in this conversation</p>
        ${renderNaturalRecentMessages(data.recentMessages)}
      </div>`
    : ""

  const replyCta = data.replyToAddress
    ? `<p style="margin: 24px 0 0; font-size: 13px; color: #666;">You can reply directly to this email.</p>`
    : `<p style="margin: 24px 0 0; font-size: 13px; color: #666;"><a href="${data.inboxUrl}" style="color: #666; text-decoration: underline;">Reply in your inbox</a></p>`

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 0; background-color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
      <div style="font-size: 15px; color: #1a1a1a; line-height: 1.6;">
        <p style="margin: 0 0 16px 0; white-space: pre-wrap;">${escapeHtml(data.messagePreview)}</p>
      </div>
      ${recentHtml}
      ${replyCta}
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 11px; color: #999;">
        <a href="${data.inboxUrl}" style="color: #999; text-decoration: underline;">View in clinic dashboard</a>
        ${data.unsubscribeFooterHtml}
      </div>
    </div>
    ${threadMarker}
  </body>
</html>`
}

// ---------------------------------------------------------------------------
// Natural clinic response nudge (follow-up: patient waiting)
// ---------------------------------------------------------------------------

export interface NaturalClinicNudgeData {
  clinicName: string
  patientName: string
  waitTimeHours: number
  messagePreview: string
  inboxUrl: string
  unsubscribeFooterHtml: string
}

export function renderNaturalClinicNudgeEmail(data: NaturalClinicNudgeData): string {
  const waitLabel = data.waitTimeHours >= 24
    ? `${Math.round(data.waitTimeHours / 24)} day${Math.round(data.waitTimeHours / 24) !== 1 ? "s" : ""}`
    : `${data.waitTimeHours} hour${data.waitTimeHours !== 1 ? "s" : ""}`

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 0; background-color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
      <div style="font-size: 15px; color: #1a1a1a; line-height: 1.6;">
        <p style="margin: 0 0 16px 0;">Hi,</p>
        <p style="margin: 0 0 16px 0;">I sent you a message ${waitLabel} ago and just wanted to check you received it. I'm still keen to book an appointment if you have availability.</p>
        <p style="margin: 0 0 16px 0; padding: 12px 16px; background: #f9f9f9; border-radius: 6px; color: #444; font-size: 14px; white-space: pre-wrap;">${escapeHtml(data.messagePreview)}</p>
        <p style="margin: 0 0 16px 0;">Would be great to hear back when you get a chance.</p>
        <p style="margin: 0;">Kind regards,<br>${escapeHtml(data.patientName)}</p>
      </div>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 11px; color: #999;">
        <a href="${data.inboxUrl}" style="color: #999; text-decoration: underline;">View in clinic dashboard</a>
        ${data.unsubscribeFooterHtml}
      </div>
    </div>
  </body>
</html>`
}
