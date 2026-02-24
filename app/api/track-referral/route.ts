import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createRateLimiter } from "@/lib/rate-limit"

// Rate limit: 20 referral clicks per IP per minute
const referralRateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxAttempts: 20 })

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"

    // Rate limit by IP
    const check = referralRateLimiter.check(ip)
    if (check.limited) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(check.retryAfterSecs) } }
      )
    }

    const body = await request.json()
    const { referral_code, landing_page, utm_source, utm_medium, utm_campaign } = body

    // Validate referral code format: alphanumeric + hyphens, max 32 chars
    if (
      !referral_code ||
      typeof referral_code !== "string" ||
      !/^[a-zA-Z0-9-]{1,32}$/.test(referral_code)
    ) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Look up affiliate by referral code
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id")
      .eq("referral_code", referral_code)
      .eq("status", "approved")
      .single()

    if (!affiliate) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 })
    }

    // Dedup: skip if same IP + affiliate clicked within last 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: recentClick } = await supabase
      .from("referrals")
      .select("id")
      .eq("affiliate_id", affiliate.id)
      .eq("visitor_ip", ip)
      .gte("created_at", tenMinAgo)
      .limit(1)
      .maybeSingle()

    if (recentClick) {
      // Already tracked this click recently — silently succeed
      referralRateLimiter.record(ip)
      return NextResponse.json({ ok: true })
    }

    // Insert referral record with IP and truncated fields
    await supabase.from("referrals").insert({
      affiliate_id: affiliate.id,
      visitor_ip: ip,
      landing_page: typeof landing_page === "string" ? landing_page.slice(0, 500) : null,
      utm_source: typeof utm_source === "string" ? utm_source.slice(0, 100) : null,
      utm_medium: typeof utm_medium === "string" ? utm_medium.slice(0, 100) : null,
      utm_campaign: typeof utm_campaign === "string" ? utm_campaign.slice(0, 200) : null,
    })

    referralRateLimiter.record(ip)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
