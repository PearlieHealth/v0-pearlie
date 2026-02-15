import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function POST(request: Request) {
  try {
    // Verify admin authentication using the shared auth guard
    const auth = await verifyAdminAuth()
    if (!auth.authenticated) return auth.response

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
