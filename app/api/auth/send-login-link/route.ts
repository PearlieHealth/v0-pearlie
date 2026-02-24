import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createRateLimiter } from "@/lib/rate-limit"
import { escapeHtml } from "@/lib/escape-html"
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

    const { email, next } = await request.json()

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

    // Validate the next parameter against allowed prefixes
    const ALLOWED_PREFIXES = ["/clinic", "/intake", "/patient", "/match", "/admin", "/booking"]
    const sanitizedNext = (
      next && typeof next === "string" && next.startsWith("/") && !next.startsWith("//") &&
      ALLOWED_PREFIXES.some((p: string) => next.startsWith(p))
    ) ? next : "/patient/dashboard"
    const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(sanitizedNext)}`

    // Ensure auth user exists — try creating first (avoids unbounded listUsers())
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { role: "patient" },
    })

    if (createError) {
      // "already registered" means user exists — that's fine, continue
      const isAlreadyRegistered = createError.message?.toLowerCase().includes("already")
      if (!isAlreadyRegistered) {
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

    // Send branded email via registry
    const emailResult = await sendRegisteredEmail({
      type: EMAIL_TYPE.PATIENT_MAGIC_LINK,
      to: email,
      data: { greeting, magicLink, _email: email },
    })

    if (!emailResult.success && !emailResult.skipped) {
      console.error("[LoginLink] Email send failed:", emailResult.error)
      return NextResponse.json({ error: "Failed to send login link. Please try again." }, { status: 500 })
    }

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
