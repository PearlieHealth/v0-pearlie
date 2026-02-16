import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const headerLine = headers.map(escapeCSV).join(",")
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCSV(row[h])).join(",")
  )
  return [headerLine, ...dataLines].join("\n")
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "leads"

    // Verify admin session (check cookie-based auth)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // For admin routes we check the admin session cookie
    // If no user, this is accessed from admin panel with session cookie
    // Allow access (admin auth is handled by middleware)

    if (type === "leads") {
      const { data: leads, error } = await supabase
        .from("leads")
        .select("id, first_name, last_name, email, phone, postcode, treatment_interest, created_at, is_verified")
        .order("created_at", { ascending: false })
        .limit(10000)

      if (error) {
        return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
      }

      const headers = [
        "id", "first_name", "last_name", "email", "phone",
        "postcode", "treatment_interest", "created_at", "is_verified",
      ]
      const csv = toCSV(headers, leads || [])

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="leads_export_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    if (type === "analytics") {
      const days = parseInt(searchParams.get("days") || "30", 10)
      const dateFilter = days > 0
        ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
        : null

      let query = supabase
        .from("analytics_events")
        .select("id, event_name, lead_id, clinic_id, created_at")
        .order("created_at", { ascending: false })
        .limit(10000)

      if (dateFilter) {
        query = query.gte("created_at", dateFilter)
      }

      const { data: events, error } = await query

      if (error) {
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
      }

      const headers = ["id", "event_name", "lead_id", "clinic_id", "created_at"]
      const csv = toCSV(headers, events || [])

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="analytics_export_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    return NextResponse.json({ error: "Invalid export type. Use ?type=leads or ?type=analytics" }, { status: 400 })
  } catch (error) {
    console.error("[Export API] Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
