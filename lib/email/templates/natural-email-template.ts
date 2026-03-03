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
