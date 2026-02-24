import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createRateLimiter } from "@/lib/rate-limit"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { getAppUrl } from "@/lib/clinic-url"

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
    const appUrl = getAppUrl()
    const redirectTo = `${appUrl}/auth/confirm`

    // Generate a recovery link server-side (does NOT send an email)
    const { data, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo },
    })

    if (linkError) {
      // Don't reveal whether the email exists — always return success
      console.error("[ResetPassword] Error generating link:", linkError.message)
      return NextResponse.json({
        success: true,
        message: "If an account exists with that email, a password reset link has been sent.",
      })
    }

    let resetLink = data.properties?.action_link
    if (!resetLink) {
      console.error("[ResetPassword] No action_link returned")
      return NextResponse.json({
        success: true,
        message: "If an account exists with that email, a password reset link has been sent.",
      })
    }

    // Ensure the redirect_to in the reset link points to our production URL
    // (Supabase may use whatever Site URL is configured in the project settings)
    try {
      const linkUrl = new URL(resetLink)
      const currentRedirect = linkUrl.searchParams.get("redirect_to")
      if (currentRedirect) {
        const redirectHost = new URL(currentRedirect).hostname
        const appHost = new URL(appUrl).hostname
        if (redirectHost !== appHost) {
          linkUrl.searchParams.set("redirect_to", redirectTo)
          resetLink = linkUrl.toString()
        }
      }
    } catch {
      // If URL parsing fails, use the link as-is
    }

    // Send branded email via registry
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await sendRegisteredEmail({
      type: EMAIL_TYPE.PASSWORD_RESET,
      to: normalizedEmail,
      data: { resetUrl: resetLink, expiresAt, _email: normalizedEmail },
    })

    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, a password reset link has been sent.",
    })
  } catch (error) {
    console.error("[ResetPassword] Unexpected error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
