/**
 * Cron: Check for unanswered patient messages.
 *
 * Runs periodically (e.g. every 30 minutes via Vercel Cron).
 * For each conversation where a patient has been waiting > STALE_THRESHOLD_HOURS
 * without a clinic reply and we haven't already sent an alternative-clinics email,
 * we:
 *   1. Find nearby alternative clinics for the patient
 *   2. Send the patient an "alternative clinics" email
 *   3. Mark the conversation so we don't email again
 *
 * Also recomputes clinic_response_stats for aggregate response metrics.
 */
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { generateUnsubscribeFooterHtml } from "@/lib/unsubscribe"
import { escapeHtml } from "@/lib/escape-html"

// How long (hours) before we send the "alternative clinics" email
const STALE_THRESHOLD_HOURS = 4
// Max conversations to process per cron run
const BATCH_SIZE = 25
// Max alternative clinics to suggest
const MAX_ALT_CLINICS = 3

export async function GET(request: Request) {
  try {
    // Verify Vercel Cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"

    // ─── 1. Find stale conversations ────────────────────────────────────
    const staleCutoff = new Date(Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString()

    const { data: staleConvos, error: staleError } = await supabase
      .from("conversations")
      .select("id, clinic_id, lead_id, awaiting_clinic_reply_since")
      .eq("awaiting_clinic_reply", true)
      .eq("alt_clinics_email_sent", false)
      .lt("awaiting_clinic_reply_since", staleCutoff)
      .neq("conversation_state", "closed")
      .order("awaiting_clinic_reply_since", { ascending: true })
      .limit(BATCH_SIZE)

    if (staleError) {
      console.error("[check-unanswered] Error fetching stale conversations:", staleError)
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
    }

    if (!staleConvos || staleConvos.length === 0) {
      // Still recompute stats even if no stale conversations
      await recomputeClinicStats(supabase)
      return NextResponse.json({ processed: 0, emailed: 0 })
    }

    let emailed = 0
    const emailsSentThisBatch = new Set<string>()

    for (const convo of staleConvos) {
      try {
        // Fetch lead info
        const { data: lead } = await supabase
          .from("leads")
          .select("id, first_name, email, postcode, lat, long, treatment_interest")
          .eq("id", convo.lead_id)
          .single()

        if (!lead?.email) {
          // No email — mark so we don't retry
          await supabase
            .from("conversations")
            .update({ alt_clinics_email_sent: true, alt_clinics_email_sent_at: new Date().toISOString() })
            .eq("id", convo.id)
          continue
        }

        const emailLower = lead.email.toLowerCase()

        // Skip if we already emailed this patient in this batch
        if (emailsSentThisBatch.has(emailLower)) {
          await supabase
            .from("conversations")
            .update({ alt_clinics_email_sent: true, alt_clinics_email_sent_at: new Date().toISOString() })
            .eq("id", convo.id)
          continue
        }

        // Fetch the original clinic name
        const { data: originalClinic } = await supabase
          .from("clinics")
          .select("name")
          .eq("id", convo.clinic_id)
          .single()

        if (!originalClinic) continue

        // Find alternative clinics near the patient (exclude the original clinic)
        const altClinics = await findAlternativeClinics(
          supabase,
          lead,
          convo.clinic_id,
          appUrl,
        )

        // Calculate wait time in hours
        const waitTimeHours = Math.round(
          (Date.now() - new Date(convo.awaiting_clinic_reply_since).getTime()) / (60 * 60 * 1000)
        )

        const unsubFooter = generateUnsubscribeFooterHtml(
          `${appUrl}/api/unsubscribe?email=${encodeURIComponent(lead.email)}&category=patient_notifications`
        )

        // Generate magic link for the dashboard URL
        const dashboardPath = "/patient/dashboard"
        const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(dashboardPath)}`
        let dashboardUrl = `${appUrl}${dashboardPath}`

        try {
          const { data: linkData } = await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: lead.email,
            options: { redirectTo },
          })
          if (linkData?.properties?.action_link) {
            dashboardUrl = linkData.properties.action_link
            try {
              const linkUrl = new URL(dashboardUrl)
              const currentRedirect = linkUrl.searchParams.get("redirect_to")
              if (currentRedirect) {
                const redirectHost = new URL(currentRedirect).hostname
                const appHost = new URL(appUrl).hostname
                if (redirectHost !== appHost) {
                  linkUrl.searchParams.set("redirect_to", redirectTo)
                  dashboardUrl = linkUrl.toString()
                }
              }
            } catch {}
          }
        } catch (linkErr) {
          console.warn("[check-unanswered] Failed to generate magic link:", linkErr)
        }

        const result = await sendRegisteredEmail({
          type: EMAIL_TYPE.ALTERNATIVE_CLINICS,
          to: lead.email,
          data: {
            firstName: escapeHtml(lead.first_name || "there"),
            originalClinicName: escapeHtml(originalClinic.name),
            waitTimeHours,
            alternativeClinics: altClinics,
            dashboardUrl,
            unsubscribeFooterHtml: unsubFooter,
            _conversationId: convo.id,
            _leadId: lead.id,
          },
          leadId: lead.id,
        })

        emailsSentThisBatch.add(emailLower)

        // Mark conversation as emailed
        await supabase
          .from("conversations")
          .update({
            alt_clinics_email_sent: true,
            alt_clinics_email_sent_at: new Date().toISOString(),
          })
          .eq("id", convo.id)

        if (result.success && !result.skipped) {
          emailed++
        }
      } catch (err) {
        console.error(`[check-unanswered] Error processing conversation ${convo.id}:`, err)
      }
    }

    // ─── 2. Recompute clinic response stats ─────────────────────────────
    await recomputeClinicStats(supabase)

    return NextResponse.json({
      processed: staleConvos.length,
      emailed,
    })
  } catch (error) {
    console.error("[check-unanswered] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Find alternative clinics for a patient, sorted by proximity and response rate.
 */
async function findAlternativeClinics(
  supabase: ReturnType<typeof createAdminClient>,
  lead: { postcode?: string; lat?: number; long?: number; treatment_interest?: string },
  excludeClinicId: string,
  appUrl: string,
): Promise<{ name: string; avgResponseMins: number | null; treatments: string[]; viewUrl: string }[]> {
  // Find nearby clinics, preferring those with good response stats
  // Use lat/long proximity if available, otherwise just fetch verified clinics
  let query = supabase
    .from("clinics")
    .select("id, name, treatments, lat, long")
    .eq("verified", true)
    .neq("id", excludeClinicId)
    .limit(20)

  const { data: clinics } = await query

  if (!clinics || clinics.length === 0) return []

  // If patient has lat/long, sort by distance
  let sortedClinics = clinics
  if (lead.lat && lead.long) {
    sortedClinics = clinics
      .map(c => ({
        ...c,
        distance: c.lat && c.long
          ? Math.sqrt(Math.pow(c.lat - lead.lat!, 2) + Math.pow(c.long - lead.long!, 2))
          : Infinity,
      }))
      .sort((a, b) => a.distance - b.distance)
  }

  // Fetch response stats for these clinics
  const clinicIds = sortedClinics.map(c => c.id)
  const { data: stats } = await supabase
    .from("clinic_response_stats")
    .select("clinic_id, avg_response_time_mins, response_rate")
    .in("clinic_id", clinicIds)

  const statsMap = new Map(
    (stats || []).map(s => [s.clinic_id, s])
  )

  // Pick top N clinics, preferring those with good response rates
  const result = sortedClinics
    .slice(0, MAX_ALT_CLINICS * 2) // Take more than needed, then filter
    .map(c => {
      const s = statsMap.get(c.id)
      return {
        name: escapeHtml(c.name),
        avgResponseMins: s?.avg_response_time_mins ?? null,
        treatments: (c.treatments || []).slice(0, 3).map((t: string) => escapeHtml(t)),
        viewUrl: `${appUrl}/clinic/${c.id}`,
        responseRate: s?.response_rate ?? 0,
      }
    })
    // Prefer clinics that actually respond
    .sort((a, b) => (b.responseRate || 0) - (a.responseRate || 0))
    .slice(0, MAX_ALT_CLINICS)
    .map(({ responseRate, ...rest }) => rest)

  return result
}

/**
 * Recompute aggregate response metrics for all clinics.
 * Updates the clinic_response_stats materialised table.
 */
async function recomputeClinicStats(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<void> {
  try {
    // Get all clinics that have response_time_log entries
    const { data: clinicIds } = await supabase
      .from("response_time_log")
      .select("clinic_id")

    if (!clinicIds || clinicIds.length === 0) return

    const uniqueClinicIds = [...new Set(clinicIds.map(r => r.clinic_id))]

    for (const clinicId of uniqueClinicIds) {
      try {
        // Fetch all response times for this clinic
        const { data: logs } = await supabase
          .from("response_time_log")
          .select("response_time_seconds, clinic_replied_at")
          .eq("clinic_id", clinicId)

        if (!logs || logs.length === 0) continue

        const responded = logs.filter(l => l.clinic_replied_at !== null)
        const unanswered = logs.filter(l => l.clinic_replied_at === null)
        const responseTimes = responded
          .map(l => l.response_time_seconds!)
          .filter(t => t !== null && t !== undefined)
          .sort((a, b) => a - b)

        const totalResponses = responded.length
        const totalUnanswered = unanswered.length
        const totalAll = totalResponses + totalUnanswered
        const responseRate = totalAll > 0 ? (totalResponses / totalAll) * 100 : 0

        let avgMins = null
        let medianMins = null
        let p95Mins = null

        if (responseTimes.length > 0) {
          const sum = responseTimes.reduce((a, b) => a + b, 0)
          avgMins = (sum / responseTimes.length) / 60

          const mid = Math.floor(responseTimes.length / 2)
          medianMins = (responseTimes.length % 2 === 0
            ? (responseTimes[mid - 1] + responseTimes[mid]) / 2
            : responseTimes[mid]) / 60

          const p95Index = Math.ceil(responseTimes.length * 0.95) - 1
          p95Mins = responseTimes[Math.min(p95Index, responseTimes.length - 1)] / 60
        }

        await supabase
          .from("clinic_response_stats")
          .upsert({
            clinic_id: clinicId,
            avg_response_time_mins: avgMins,
            median_response_time_mins: medianMins,
            p95_response_time_mins: p95Mins,
            total_responses: totalResponses,
            total_unanswered: totalUnanswered,
            response_rate: Math.round(responseRate * 10) / 10,
            last_computed_at: new Date().toISOString(),
          }, { onConflict: "clinic_id" })
      } catch (err) {
        console.error(`[check-unanswered] Error computing stats for clinic ${clinicId}:`, err)
      }
    }
  } catch (err) {
    console.error("[check-unanswered] Error recomputing clinic stats:", err)
  }
}
