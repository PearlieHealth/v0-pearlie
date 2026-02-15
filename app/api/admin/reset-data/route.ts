import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

// ── In-memory rate limiter for reset data operations ──
const RESET_WINDOW_MS = 60 * 60 * 1000 // 1-hour window
const MAX_RESET_ATTEMPTS = 3            // max resets per window

const resetAttempts = new Map<string, { count: number; firstAttempt: number }>()

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

function isResetRateLimited(ip: string): { limited: boolean; retryAfterSecs: number } {
  const record = resetAttempts.get(ip)
  if (!record) return { limited: false, retryAfterSecs: 0 }

  // Window expired – reset
  const elapsed = Date.now() - record.firstAttempt
  if (elapsed > RESET_WINDOW_MS) {
    resetAttempts.delete(ip)
    return { limited: false, retryAfterSecs: 0 }
  }

  if (record.count >= MAX_RESET_ATTEMPTS) {
    const retryAfterSecs = Math.ceil((RESET_WINDOW_MS - elapsed) / 1000)
    return { limited: true, retryAfterSecs }
  }

  return { limited: false, retryAfterSecs: 0 }
}

function recordResetAttempt(ip: string) {
  const record = resetAttempts.get(ip)
  if (!record || Date.now() - record.firstAttempt > RESET_WINDOW_MS) {
    resetAttempts.set(ip, { count: 1, firstAttempt: Date.now() })
  } else {
    record.count++
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication using the shared auth guard
    const auth = await verifyAdminAuth()
    if (!auth.authenticated) return auth.response

    // Rate-limit check
    const ip = getClientIp(request)
    const { limited, retryAfterSecs } = isResetRateLimited(ip)
    if (limited) {
      return NextResponse.json(
        { error: `Too many reset attempts. Try again in ${Math.ceil(retryAfterSecs / 60)} minutes.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSecs) } },
      )
    }

    // Verify confirmation code from request
    const { confirmationCode } = await request.json()
    if (confirmationCode !== "RESET-ALL-DATA") {
      return NextResponse.json({ error: "Invalid confirmation code" }, { status: 400 })
    }

    const supabase = await createClient()

    // Delete in order respecting foreign key constraints
    const tables = [
      "lead_outcomes",
      "lead_clinic_status", 
      "lead_actions",
      "lead_events",
      "lead_matches",
      "bookings",
      "appointments",
      "match_results",
      "match_runs",
      "match_sessions",
      "matches",
      "analytics_events",
      "events",
      "email_logs",
      "leads",
    ]

    const results: { table: string; deleted: number; error?: string }[] = []

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000") // Delete all rows
        .select("*", { count: "exact", head: true })

      if (error) {
        // Try alternative delete for tables that might have different constraints
        const { error: error2 } = await supabase
          .from(table)
          .delete()
          .gte("created_at", "1970-01-01")
        
        results.push({ 
          table, 
          deleted: 0, 
          error: error2 ? error2.message : "Deleted with fallback method"
        })
      } else {
        results.push({ table, deleted: count || 0 })
      }
    }

    // Record this reset attempt to enforce rate limiting
    recordResetAttempt(ip)

    return NextResponse.json({
      success: true,
      message: "All transactional data has been reset",
      results
    })
  } catch (error) {
    console.error("[Reset Data Error]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reset data" },
      { status: 500 }
    )
  }
}
