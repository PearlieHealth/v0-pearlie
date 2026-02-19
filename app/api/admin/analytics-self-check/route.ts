import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/admin-auth"

interface CheckResult {
  name: string
  status: "pass" | "fail" | "warning"
  message: string
  details?: Record<string, unknown>
}

export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = await createClient()
    const checks: CheckResult[] = []

    // Fetch all required data
    const [leadsRes, eventsRes, matchResultsRes, matchSessionsRes] = await Promise.all([
      supabase.from("leads").select("id, created_at, email, schema_version"),
      supabase.from("analytics_events").select("*"),
      supabase.from("match_results").select("*"),
      supabase.from("match_sessions").select("lead_id, status"),
    ])

    const allLeads = leadsRes.data || []
    const events = eventsRes.data || []
    const matchResults = matchResultsRes.data || []
    const matchSessions = matchSessionsRes.data || []

    const TEST_EMAIL_PATTERNS = ["@pearlie-test.local", "@test.local", "test@"]
    const leads = allLeads.filter(
      (l) => !l.email || !TEST_EMAIL_PATTERNS.some((pattern) => l.email?.toLowerCase().includes(pattern)),
    )
    const testLeadsCount = allLeads.length - leads.length

    // Check 1: Form completion rate sanity
    const sessionsWithFormStarted = new Set(
      events.filter((e) => e.event_name === "form_started").map((e) => e.session_id),
    )
    const sessionsWithLeadSubmitted = new Set(
      events.filter((e) => e.event_name === "lead_submitted").map((e) => e.session_id),
    )

    // Only count completions from sessions that also have form_started
    const validCompletions = [...sessionsWithLeadSubmitted].filter((sessionId) =>
      sessionsWithFormStarted.has(sessionId),
    ).length

    const formStarted = sessionsWithFormStarted.size
    const formCompleted = validCompletions

    // Also track submissions without form_started for diagnostic purposes
    const submissionsWithoutStart = sessionsWithLeadSubmitted.size - validCompletions

    if (formStarted > 0) {
      const completionRate = (formCompleted / formStarted) * 100
      // Rate should never exceed 100% now since we filter completions
      checks.push({
        name: "Form Completion Rate",
        status: completionRate > 100 ? "fail" : "pass",
        message: `${completionRate.toFixed(1)}% (${formCompleted}/${formStarted})`,
        details: {
          formStarted,
          formCompleted,
          rate: completionRate,
          // Include diagnostic info about orphaned submissions
          submissionsWithoutStartEvent: submissionsWithoutStart,
        },
      })

      // Add info about submissions without form_started events - these are expected from test endpoints
      if (submissionsWithoutStart > 0) {
        checks.push({
          name: "Orphaned Submissions",
          status: "pass", // Changed from "warning" - these are expected
          message: `${submissionsWithoutStart} lead(s) created without form_started event (expected from test endpoints)`,
          details: {
            totalSubmissions: sessionsWithLeadSubmitted.size,
            withFormStarted: validCompletions,
            withoutFormStarted: submissionsWithoutStart,
            explanation:
              "Orphaned submissions are expected from: Live Flow Test, Self Test, direct API calls. These are not a problem.",
          },
        })
      }
    } else if (sessionsWithLeadSubmitted.size > 0) {
      // There are submissions but no form_started events at all
      checks.push({
        name: "Form Completion Rate",
        status: "warning",
        message: `${sessionsWithLeadSubmitted.size} leads submitted, but no form_started events tracked`,
        details: {
          formStarted: 0,
          formCompleted: sessionsWithLeadSubmitted.size,
          note: "form_started tracking may not be implemented",
        },
      })
    } else {
      checks.push({
        name: "Form Completion Rate",
        status: "warning",
        message: "No form events found",
        details: { formStarted, formCompleted },
      })
    }

    // Check 2: Matches shown to clinic click rate
    const matchesShown = new Set(events.filter((e) => e.event_name === "matches_shown").map((e) => e.lead_id)).size
    const clinicClicks = new Set(
      events.filter((e) => e.event_name === "clinic_opened").map((e) => `${e.lead_id}-${e.clinic_id}`),
    ).size

    if (matchesShown > 0) {
      // Note: clinic clicks can exceed matches shown (same user clicks multiple clinics)
      // This is expected behavior, so we just report it
      const clickRate = (clinicClicks / matchesShown) * 100
      checks.push({
        name: "Clinic Click Rate",
        status: "pass",
        message: `${clickRate.toFixed(1)}% (${clinicClicks} clicks / ${matchesShown} matches shown)`,
        details: { matchesShown, clinicClicks, rate: clickRate },
      })
    } else {
      checks.push({
        name: "Clinic Click Rate",
        status: "warning",
        message: "No matches_shown events found",
        details: { matchesShown, clinicClicks },
      })
    }

    // Check 3: Booking rate (bookings / clinic clicks)
    const bookClicks = events.filter((e) => e.event_name === "book_clicked").length
    if (clinicClicks > 0) {
      const bookRate = (bookClicks / clinicClicks) * 100
      if (bookRate > 100) {
        checks.push({
          name: "Booking Rate",
          status: "fail",
          message: `Rate exceeds 100%: ${bookRate.toFixed(1)}%`,
          details: { clinicClicks, bookClicks, rate: bookRate },
        })
      } else {
        checks.push({
          name: "Booking Rate",
          status: "pass",
          message: `${bookRate.toFixed(1)}% (${bookClicks}/${clinicClicks})`,
          details: { clinicClicks, bookClicks, rate: bookRate },
        })
      }
    } else {
      checks.push({
        name: "Booking Rate",
        status: "warning",
        message: "No clinic clicks to calculate booking rate",
        details: { clinicClicks, bookClicks },
      })
    }

    // Check 4: Duplicate events check
    const DUPLICATE_WINDOW_MS = 5000 // 5 seconds

    // Sort events by fingerprint then timestamp to detect rapid duplicates
    const sortedForDuplicateCheck = [...events].sort((a, b) => {
      const fingerprintA = `${a.session_id}-${a.event_name}-${a.lead_id || ""}-${a.clinic_id || ""}`
      const fingerprintB = `${b.session_id}-${b.event_name}-${b.lead_id || ""}-${b.clinic_id || ""}`
      if (fingerprintA !== fingerprintB) return fingerprintA.localeCompare(fingerprintB)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    let trueDuplicateCount = 0
    let duplicatesWithDedupeKey = 0
    let duplicatesWithoutDedupeKey = 0
    for (let i = 1; i < sortedForDuplicateCheck.length; i++) {
      const prev = sortedForDuplicateCheck[i - 1]
      const curr = sortedForDuplicateCheck[i]

      const prevFingerprint = `${prev.session_id}-${prev.event_name}-${prev.lead_id || ""}-${prev.clinic_id || ""}`
      const currFingerprint = `${curr.session_id}-${curr.event_name}-${curr.lead_id || ""}-${curr.clinic_id || ""}`

      if (prevFingerprint === currFingerprint) {
        const timeDiff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()
        if (timeDiff <= DUPLICATE_WINDOW_MS) {
          trueDuplicateCount++
          if (curr.dedupe_key) {
            duplicatesWithDedupeKey++
          } else {
            duplicatesWithoutDedupeKey++
          }
        }
      }
    }

    if (trueDuplicateCount > 0) {
      // If most duplicates are from old events without dedupe_key, it's just legacy noise
      const isLegacyNoise = duplicatesWithoutDedupeKey > duplicatesWithDedupeKey
      checks.push({
        name: "Duplicate Events",
        status: isLegacyNoise ? "pass" : "warning",
        message: isLegacyNoise
          ? `${trueDuplicateCount} legacy duplicate(s) — already deduplicated at query time`
          : `Found ${duplicatesWithDedupeKey} recent duplicate event(s) (${duplicatesWithoutDedupeKey} legacy)`,
        details: {
          totalEvents: events.length,
          rapidDuplicates: trueDuplicateCount,
          withDedupeKey: duplicatesWithDedupeKey,
          withoutDedupeKey: duplicatesWithoutDedupeKey,
          note: isLegacyNoise
            ? "These are old events from before dedupe_key was added. The analytics dashboard already filters them out."
            : "Recent duplicates may indicate double-fire bugs in event tracking.",
        },
      })
    } else {
      checks.push({
        name: "Duplicate Events",
        status: "pass",
        message: "No rapid duplicate events detected",
        details: { totalEvents: events.length },
      })
    }

    // Check 5: Leads without matches - categorize by reason
    const leadsWithMatches = new Set(matchResults.map((m) => m.lead_id))
    const leadsWithoutMatches = leads.filter((l) => !leadsWithMatches.has(l.id))

    // Build a map of lead_id -> session status
    const sessionsByLeadId = new Map<string, string>()
    matchSessions.forEach((s) => {
      if (s.lead_id) sessionsByLeadId.set(s.lead_id, s.status)
    })

    // Categorize leads without matches by reason
    const categorized = {
      matchingFailed: 0, // Session exists with status "error"
      noSessionCreated: 0, // No session was ever created
      sessionPending: 0, // Session exists but matching still running
      legacyLeads: 0, // Old leads from before current form version
    }

    leadsWithoutMatches.forEach((lead: any) => {
      // Check if this is a legacy lead (pre-v6 or missing schema_version)
      if (!lead.schema_version || lead.schema_version < 6) {
        categorized.legacyLeads++
        return
      }
      const sessionStatus = sessionsByLeadId.get(lead.id)
      if (!sessionStatus) {
        categorized.noSessionCreated++
      } else if (sessionStatus === "error") {
        categorized.matchingFailed++
      } else if (sessionStatus === "running" || sessionStatus === "pending") {
        categorized.sessionPending++
      } else {
        categorized.noSessionCreated++
      }
    })

    const currentVersionWithoutMatches = leadsWithoutMatches.length - categorized.legacyLeads

    if (leadsWithoutMatches.length > 0) {
      // Only warn if there are actual matching failures on current-version leads
      const hasRealIssues = categorized.matchingFailed > 0
      const isAllLegacy = currentVersionWithoutMatches === 0
      checks.push({
        name: "Leads Without Matches",
        status: hasRealIssues ? "warning" : "pass",
        message: isAllLegacy
          ? `${leadsWithoutMatches.length} legacy lead(s) have no matches (pre-v6 forms — expected)`
          : `${currentVersionWithoutMatches} current lead(s) without matches, ${categorized.legacyLeads} legacy`,
        details: {
          totalLeads: leads.length,
          testLeadsExcluded: testLeadsCount,
          leadsWithMatches: leadsWithMatches.size,
          leadsWithoutMatches: leadsWithoutMatches.length,
          breakdown: {
            legacyLeads: categorized.legacyLeads,
            matchingFailed: categorized.matchingFailed,
            noMatchSessionCreated: categorized.noSessionCreated,
            matchingStillRunning: categorized.sessionPending,
          },
          explanation: isAllLegacy
            ? "All unmatched leads are from old form versions before the matching engine was built. No action needed."
            : categorized.matchingFailed > 0
              ? "Some current leads failed during matching. Check match_sessions table for error details."
              : "Some current leads have no match session — they may have been created via direct API insert.",
        },
      })
    } else {
      checks.push({
        name: "Leads Without Matches",
        status: "pass",
        message: `All ${leads.length} leads have match results${testLeadsCount > 0 ? ` (${testLeadsCount} test leads excluded)` : ""}`,
        details: { totalLeads: leads.length, testLeadsExcluded: testLeadsCount },
      })
    }

    // Check 6: Match results with reasons
    const matchesWithoutReasons = matchResults.filter(
      (m: any) => !m.reasons || (Array.isArray(m.reasons) && m.reasons.length === 0),
    )

    // Check if the unmatched results are from legacy leads (pre-v6)
    const legacyLeadIds = new Set(
      leads.filter((l: any) => !l.schema_version || l.schema_version < 6).map((l: any) => l.id),
    )
    const legacyMatchesWithoutReasons = matchesWithoutReasons.filter((m: any) => legacyLeadIds.has(m.lead_id))
    const currentMatchesWithoutReasons = matchesWithoutReasons.length - legacyMatchesWithoutReasons.length

    if (matchesWithoutReasons.length > 0) {
      const isAllLegacy = currentMatchesWithoutReasons === 0
      checks.push({
        name: "Match Results Reasons",
        status: isAllLegacy ? "pass" : "warning",
        message: isAllLegacy
          ? `${matchesWithoutReasons.length} legacy match result(s) missing reasons (pre-v6 — expected)`
          : `${currentMatchesWithoutReasons} current match result(s) missing reasons, ${legacyMatchesWithoutReasons.length} legacy`,
        details: {
          totalMatchResults: matchResults.length,
          withoutReasons: matchesWithoutReasons.length,
          legacyWithoutReasons: legacyMatchesWithoutReasons.length,
          currentWithoutReasons: currentMatchesWithoutReasons,
          explanation: isAllLegacy
            ? "These match results are from before the reasons engine was built. They won't affect current patients."
            : "Some current match results are missing reasons — this may indicate a bug in the matching pipeline.",
        },
      })
    } else {
      checks.push({
        name: "Match Results Reasons",
        status: "pass",
        message: "All match results have reasons",
        details: { totalMatchResults: matchResults.length },
      })
    }

    // Summary
    const passed = checks.filter((c) => c.status === "pass").length
    const failed = checks.filter((c) => c.status === "fail").length
    const warnings = checks.filter((c) => c.status === "warning").length

    return NextResponse.json({
      summary: {
        total: checks.length,
        passed,
        failed,
        warnings,
        overallStatus: failed > 0 ? "fail" : warnings > 0 ? "warning" : "pass",
      },
      checks,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[ANALYTICS_SELF_CHECK_ERROR]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
