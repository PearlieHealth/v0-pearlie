/**
 * Shared base HTML wrapper for all Pearlie emails.
 * Provides consistent branding: teal gradient header, footer, and responsive layout.
 */

export interface BaseLayoutOptions {
  /** Header title (e.g. "Reset Your Password") */
  title: string
  /** Optional subtitle below the title */
  subtitle?: string
  /** Inner body HTML content */
  body: string
  /** Optional footer HTML (added above the standard Pearlie footer) */
  footer?: string
  /** Header gradient style — defaults to teal brand */
  headerStyle?: "brand" | "dark" | "green"
}

const HEADER_STYLES = {
  brand: "background: linear-gradient(135deg, #0fbcb0 0%, #0da399 100%);",
  dark: "background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);",
  green: "background: linear-gradient(135deg, #059669 0%, #047857 100%);",
} as const

export function wrapInBaseLayout({
  title,
  subtitle,
  body,
  footer,
  headerStyle = "brand",
}: BaseLayoutOptions): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f8f7f4;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden;">
        <div style="${HEADER_STYLES[headerStyle]} color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 600;">${title}</h1>
          ${subtitle ? `<p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">${subtitle}</p>` : ""}
        </div>
        <div style="padding: 30px;">
          ${body}
        </div>
      </div>
      ${footer ? `<div style="padding: 20px;">${footer}</div>` : ""}
      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">Pearlie &mdash; Find your perfect dental clinic match</p>
        <p style="margin: 4px 0 0;"><a href="https://pearlie.org" style="color: #0fbcb0; text-decoration: none;">pearlie.org</a></p>
      </div>
    </div>
  </body>
</html>`
}
