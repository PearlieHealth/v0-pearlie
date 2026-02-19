import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createRateLimiter } from "@/lib/rate-limit"

// 5 waitlist signups per IP per hour
const waitlistLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, maxAttempts: 5 })

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const ipCheck = waitlistLimiter.check(ip)
    if (ipCheck.limited) {
      return NextResponse.json(
        { error: `Too many requests. Please try again later.` },
        { status: 429, headers: { "Retry-After": String(ipCheck.retryAfterSecs) } }
      )
    }
    waitlistLimiter.record(ip)

    const { email, postcode, area } = await request.json()

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Upsert into location_waitlist (ignore duplicates)
    await supabase
      .from("location_waitlist")
      .upsert(
        {
          email: email.toLowerCase().trim(),
          postcode: postcode || "unknown",
          area: area || "unknown",
        },
        { onConflict: "email,postcode" }
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[waitlist] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
