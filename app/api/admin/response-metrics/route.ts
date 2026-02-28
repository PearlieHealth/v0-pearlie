/**
 * Admin API: Clinic Response Metrics
 *
 * GET /api/admin/response-metrics
 *   Returns aggregate response stats for all clinics plus a list of
 *   currently unanswered conversations.
 *
 * Query params:
 *   - clinicId: Filter to a single clinic
 *   - sort: "avg_time" | "response_rate" | "unanswered" (default: "avg_time")
 *   - order: "asc" | "desc" (default: "asc")
 */
import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = createAdminClient()
    const searchParams = request.nextUrl.searchParams
    const clinicId = searchParams.get("clinicId")
    const sort = searchParams.get("sort") || "avg_time"
    const order = searchParams.get("order") || "asc"

    // ─── 1. Clinic response stats ───────────────────────────────────────
    let statsQuery = supabase
      .from("clinic_response_stats")
      .select("*, clinics(name)")

    if (clinicId) {
      statsQuery = statsQuery.eq("clinic_id", clinicId)
    }

    // Map sort param to column
    const sortColumn: Record<string, string> = {
      avg_time: "avg_response_time_mins",
      response_rate: "response_rate",
      unanswered: "total_unanswered",
      total: "total_responses",
    }
    const col = sortColumn[sort] || "avg_response_time_mins"
    statsQuery = statsQuery.order(col, { ascending: order === "asc", nullsFirst: false })

    const { data: stats, error: statsError } = await statsQuery

    if (statsError) {
      console.error("[response-metrics] Error fetching stats:", statsError)
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }

    // ─── 2. Currently unanswered conversations ─────────────────────────
    let unansweredQuery = supabase
      .from("conversations")
      .select("id, clinic_id, lead_id, awaiting_clinic_reply_since, alt_clinics_email_sent, alt_clinics_email_sent_at, clinics(name), leads(first_name, last_name, email, treatment_interest)")
      .eq("awaiting_clinic_reply", true)
      .neq("conversation_state", "closed")
      .order("awaiting_clinic_reply_since", { ascending: true })

    if (clinicId) {
      unansweredQuery = unansweredQuery.eq("clinic_id", clinicId)
    }

    const { data: unanswered, error: unansweredError } = await unansweredQuery.limit(100)

    if (unansweredError) {
      console.error("[response-metrics] Error fetching unanswered:", unansweredError)
    }

    // ─── 3. Platform-wide summary ──────────────────────────────────────
    const allStats = stats || []
    const totalClinics = allStats.length
    const totalResponsesAll = allStats.reduce((s, c) => s + (c.total_responses || 0), 0)
    const totalUnansweredAll = allStats.reduce((s, c) => s + (c.total_unanswered || 0), 0)
    const avgResponseRateAll = totalClinics > 0
      ? allStats.reduce((s, c) => s + (c.response_rate || 0), 0) / totalClinics
      : 0

    // Platform-wide average response time (weighted by response count)
    let platformAvgMins = null
    const totalWeightedTime = allStats.reduce((s, c) => {
      if (c.avg_response_time_mins != null && c.total_responses > 0) {
        return s + c.avg_response_time_mins * c.total_responses
      }
      return s
    }, 0)
    if (totalResponsesAll > 0) {
      platformAvgMins = totalWeightedTime / totalResponsesAll
    }

    // ─── 4. Recent response time log (for drill-down) ──────────────────
    let recentLogsQuery = supabase
      .from("response_time_log")
      .select("id, conversation_id, clinic_id, lead_id, patient_message_at, clinic_replied_at, response_time_seconds, clinics(name), leads(first_name, last_name)")
      .order("patient_message_at", { ascending: false })
      .limit(50)

    if (clinicId) {
      recentLogsQuery = recentLogsQuery.eq("clinic_id", clinicId)
    }

    const { data: recentLogs } = await recentLogsQuery

    return NextResponse.json({
      summary: {
        totalClinicsTracked: totalClinics,
        totalResponses: totalResponsesAll,
        totalUnanswered: totalUnansweredAll,
        avgResponseRate: Math.round(avgResponseRateAll * 10) / 10,
        platformAvgResponseMins: platformAvgMins !== null ? Math.round(platformAvgMins * 10) / 10 : null,
        currentlyWaiting: (unanswered || []).length,
      },
      clinicStats: (stats || []).map(s => ({
        clinicId: s.clinic_id,
        clinicName: (s as any).clinics?.name || "Unknown",
        avgResponseMins: s.avg_response_time_mins !== null ? Math.round(s.avg_response_time_mins * 10) / 10 : null,
        medianResponseMins: s.median_response_time_mins !== null ? Math.round(s.median_response_time_mins * 10) / 10 : null,
        p95ResponseMins: s.p95_response_time_mins !== null ? Math.round(s.p95_response_time_mins * 10) / 10 : null,
        totalResponses: s.total_responses,
        totalUnanswered: s.total_unanswered,
        responseRate: s.response_rate,
        lastComputed: s.last_computed_at,
      })),
      unansweredConversations: (unanswered || []).map(c => ({
        conversationId: c.id,
        clinicId: c.clinic_id,
        clinicName: (c as any).clinics?.name || "Unknown",
        leadId: c.lead_id,
        patientName: `${(c as any).leads?.first_name || ""} ${(c as any).leads?.last_name || ""}`.trim() || "Unknown",
        patientEmail: (c as any).leads?.email || "",
        treatment: (c as any).leads?.treatment_interest || "",
        waitingSince: c.awaiting_clinic_reply_since,
        waitingHours: Math.round((Date.now() - new Date(c.awaiting_clinic_reply_since).getTime()) / (60 * 60 * 1000)),
        altEmailSent: c.alt_clinics_email_sent,
        altEmailSentAt: c.alt_clinics_email_sent_at,
      })),
      recentLogs: (recentLogs || []).map(l => ({
        id: l.id,
        conversationId: l.conversation_id,
        clinicId: l.clinic_id,
        clinicName: (l as any).clinics?.name || "Unknown",
        patientName: `${(l as any).leads?.first_name || ""} ${(l as any).leads?.last_name || ""}`.trim() || "Unknown",
        patientMessageAt: l.patient_message_at,
        clinicRepliedAt: l.clinic_replied_at,
        responseTimeSecs: l.response_time_seconds,
        responseTimeMins: l.response_time_seconds !== null ? Math.round(l.response_time_seconds / 60 * 10) / 10 : null,
        status: l.clinic_replied_at ? "replied" : "waiting",
      })),
    })
  } catch (error) {
    console.error("[response-metrics] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
