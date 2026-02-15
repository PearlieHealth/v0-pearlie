import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createRateLimiter } from "@/lib/rate-limit"
import { escapeHtml } from "@/lib/escape-html"
import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"

// Rate limiters: per-IP and per-email
const ipLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxAttempts: 10 })
const emailLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxAttempts: 3 })

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request)
    const ipCheck = ipLimiter.check(ip)
    if (ipCheck.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ipCheck.retryAfterSecs) } },
      )
    }

    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase()
    const emailCheck = emailLimiter.check(normalizedEmail)
    if (emailCheck.limited) {
      return NextResponse.json(
        { error: "Too many requests for this email. Please try again later." },
        { status: 429, headers: { "Retry-After": String(emailCheck.retryAfterSecs) } },
      )
    }

    // Record attempts before processing
    ipLimiter.record(ip)
    emailLimiter.record(normalizedEmail)

    const supabase = createAdminClient()
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
    const redirectTo = `${appUrl}/auth/callback?next=/patient/dashboard`

    // Check if user exists in Supabase auth; if not, create them first
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const userExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (!userExists) {
      // Don't auto-confirm — the magic link click will confirm the email
      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { role: "patient" },
      })

      if (createError) {
        console.error("[LoginLink] Error creating user:", createError)
        return NextResponse.json(
          { error: "We couldn't find an account with that email. Please complete the intake form first." },
          { status: 404 }
        )
      }
    }

    // Generate a magic link server-side (does NOT send an email)
    const { data, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    })

    if (linkError) {
      console.error("[LoginLink] Error generating link:", linkError)
      return NextResponse.json({ error: "Failed to generate login link" }, { status: 500 })
    }

    let magicLink = data.properties?.action_link
    if (!magicLink) {
      return NextResponse.json({ error: "Failed to generate login link" }, { status: 500 })
    }

    // Ensure the redirect_to in the magic link points to our production URL
    // (Supabase may use whatever Site URL is configured in the project settings)
    try {
      const linkUrl = new URL(magicLink)
      const currentRedirect = linkUrl.searchParams.get("redirect_to")
      if (currentRedirect) {
        const redirectHost = new URL(currentRedirect).hostname
        const appHost = new URL(appUrl).hostname
        if (redirectHost !== appHost) {
          linkUrl.searchParams.set("redirect_to", redirectTo)
          magicLink = linkUrl.toString()
        }
      }
    } catch {
      // If URL parsing fails, use the link as-is
    }

    // Look up the patient's name from their lead for personalization
    let greeting = "Hi there"
    const { data: lead } = await supabase
      .from("leads")
      .select("first_name")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (lead?.first_name) {
      greeting = `Hi ${escapeHtml(lead.first_name)}`
    }

    // Send branded email via Resend
    await sendEmailWithRetry({
      from: EMAIL_FROM.NOREPLY,
      to: email,
      subject: "Your Pearlie login link",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f7f4; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 24px; font-weight: 600; color: #1a1a1a; margin: 0;">Pearlie</h1>
            </div>

            <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6; margin-bottom: 8px;">
              ${greeting},
            </p>

            <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6; margin-bottom: 24px;">
              Click the button below to sign in to your Pearlie account and view your matched clinics.
            </p>

            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${magicLink}" style="display: inline-block; background: linear-gradient(to right, #907EFF, #ED64A6); color: white; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px;">
                Sign in to Pearlie
              </a>
            </div>

            <p style="font-size: 14px; color: #888; line-height: 1.5; margin-bottom: 8px;">
              This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

            <p style="font-size: 12px; color: #aaa; text-align: center;">
              Pearlie - Find your perfect dental clinic match
            </p>
          </div>
        </body>
        </html>
      `,
    })

    return NextResponse.json({
      success: true,
      message: "Login link sent",
      email: email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
    })
  } catch (error) {
    console.error("[LoginLink] Unexpected error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
