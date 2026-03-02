/**
 * Cron: Check for unanswered patient messages.
 *
 * Runs periodically (e.g. every 30 minutes via Vercel Cron).
 *
 * Two-stage notification flow:
 *   Stage 1 (2 hrs) — Nudge the CLINIC: "Patient X is waiting for your reply"
 *   Stage 2 (4 hrs) — Email the PATIENT: "Here are alternative clinics nearby"
 *
 * Spam prevention:
 *   - clinic_nudge_sent flag: nudge is sent at most ONCE per conversation
 *   - alt_clinics_email_sent flag: alternative email is sent at most ONCE per conversation
 *   - idempotencyKey in email registry: prevents duplicates even if cron runs twice
 *   - emailsSentThisBatch: prevents multiple emails to same recipient in one run
 *   - Only fires on conversations where awaiting_clinic_reply = true (cleared on clinic reply)
 *   - Respects unsubscribe preferences via sendRegisteredEmail pipeline
 *   - Respects daily email cap (12/day) enforced by sendRegisteredEmail
 *   - Closed conversations are excluded
 *
 * Also recomputes clinic_response_stats for aggregate response metrics.
 */
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { generateUnsubscribeFooterHtml } from "@/lib/unsubscribe"
import { escapeHtml } from "@/lib/escape-html"

// Defaults (overridden by admin settings in matching_config)
const DEFAULT_NUDGE_THRESHOLD_HOURS = 2
const DEFAULT_ALT_CLINICS_THRESHOLD_HOURS = 4
// Max conversations to process per cron run
const BATCH_SIZE = 25
// Max alternative clinics to suggest in the patient email
const MAX_ALT_CLINICS = 3

interface ResponseTrackingSettings {
  clinicNudgeEnabled: boolean
  altClinicsEmailEnabled: boolean
  nudgeThresholdHours: number
  altClinicsThresholdHours: number
}

async function loadSettings(supabase: ReturnType<typeof createAdminClient>): Promise<ResponseTrackingSettings> {
  const defaults: ResponseTrackingSettings = {
    clinicNudgeEnabled: false,
    altClinicsEmailEnabled: false,
    nudgeThresholdHours: DEFAULT_NUDGE_THRESHOLD_HOURS,
    altClinicsThresholdHours: DEFAULT_ALT_CLINICS_THRESHOLD_HOURS,
  }
  try {
    const { data } = await supabase
      .from("matching_config")
      .select("config_value")
      .eq("config_key", "response_tracking_settings")
      .maybeSingle()
    if (data?.config_value) {
      return { ...defaults, ...data.config_value }
    }
  } catch (err) {
    console.warn("[check-unanswered] Failed to load settings, using defaults:", err)
  }
  return defaults
}

export async function GET(request: Request) {
  try {
    // Verify Vercel Cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
    const now = Date.now()

    // Load admin-controlled settings
    const settings = await loadSettings(supabase)

    let clinicNudgesSent = 0
    let clinicNudgesProcessed = 0
    let patientEmailsSent = 0
    let patientEmailsProcessed = 0

    // ─── Stage 1: Nudge clinics ─────────────────────────────────────────
    // Only runs if clinicNudgeEnabled is toggled ON in admin
    if (settings.clinicNudgeEnabled) {
    const nudgeCutoff = new Date(now - settings.nudgeThresholdHours * 60 * 60 * 1000).toISOString()

    const { data: needsNudge } = await supabase
      .from("conversations")
      .select("id, clinic_id, lead_id, awaiting_clinic_reply_since")
      .eq("awaiting_clinic_reply", true)
      .eq("clinic_nudge_sent", false)
      .lt("awaiting_clinic_reply_since", nudgeCutoff)
      .neq("conversation_state", "closed")
      .order("awaiting_clinic_reply_since", { ascending: true })
      .limit(BATCH_SIZE)

    clinicNudgesProcessed = (needsNudge || []).length

    // Track clinics we've already nudged this batch to avoid duplicates
    const clinicNudgedThisBatch = new Set<string>()

    for (const convo of needsNudge || []) {
      try {
        // Skip if we already nudged this clinic about a different conversation in this batch
        if (clinicNudgedThisBatch.has(convo.clinic_id)) {
          await supabase
            .from("conversations")
            .update({ clinic_nudge_sent: true, clinic_nudge_sent_at: new Date().toISOString() })
            .eq("id", convo.id)
          continue
        }

        // Fetch clinic + lead info
        const [{ data: clinic }, { data: lead }] = await Promise.all([
          supabase.from("clinics").select("name, notification_email").eq("id", convo.clinic_id).single(),
          supabase.from("leads").select("first_name, last_name, email").eq("id", convo.lead_id).single(),
        ])

        if (!clinic) continue

        // Get the clinic's notification email (or fall back to clinic_users)
        let clinicEmail = clinic.notification_email
        if (!clinicEmail) {
          const { data: clinicUser } = await supabase
            .from("clinic_users")
            .select("email")
            .eq("clinic_id", convo.clinic_id)
            .eq("is_active", true)
            .limit(1)
            .single()
          clinicEmail = clinicUser?.email
        }

        if (!clinicEmail) {
          // No email — mark so we don't retry
          await supabase
            .from("conversations")
            .update({ clinic_nudge_sent: true, clinic_nudge_sent_at: new Date().toISOString() })
            .eq("id", convo.id)
          continue
        }

        const patientName = [lead?.first_name, lead?.last_name].filter(Boolean).join(" ") || "A patient"
        const waitTimeHours = Math.max(1, Math.round((now - new Date(convo.awaiting_clinic_reply_since).getTime()) / (60 * 60 * 1000)))

        // Fetch the last patient message for a preview
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content")
          .eq("conversation_id", convo.id)
          .eq("sender_type", "patient")
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        const messagePreview = lastMsg?.content
          ? escapeHtml(lastMsg.content.substring(0, 300)) + (lastMsg.content.length > 300 ? "..." : "")
          : "(message)"

        const clinicUnsubFooter = generateUnsubscribeFooterHtml(
          `${appUrl}/api/unsubscribe?email=${encodeURIComponent(clinicEmail)}&category=clinic_notifications`
        )

        const inboxUrl = `${appUrl}/clinic/inbox`

        const result = await sendRegisteredEmail({
          type: EMAIL_TYPE.CLINIC_RESPONSE_NUDGE,
          to: clinicEmail,
          data: {
            clinicName: escapeHtml(clinic.name),
            patientName: escapeHtml(patientName),
            waitTimeHours,
            messagePreview,
            inboxUrl,
            unsubscribeFooterHtml: clinicUnsubFooter,
            _conversationId: convo.id,
            _clinicId: convo.clinic_id,
          },
          clinicId: convo.clinic_id,
        })

        clinicNudgedThisBatch.add(convo.clinic_id)

        // Mark nudge as sent
        await supabase
          .from("conversations")
          .update({ clinic_nudge_sent: true, clinic_nudge_sent_at: new Date().toISOString() })
          .eq("id", convo.id)

        if (result.success && !result.skipped) {
          clinicNudgesSent++
        }
      } catch (err) {
        console.error(`[check-unanswered] Nudge error for conversation ${convo.id}:`, err)
      }
    }
    } // end if (settings.clinicNudgeEnabled)

    // ─── Stage 2: Email patients alternatives ───────────────────────────
    // Only runs if altClinicsEmailEnabled is toggled ON in admin
    if (settings.altClinicsEmailEnabled) {
    const altCutoff = new Date(now - settings.altClinicsThresholdHours * 60 * 60 * 1000).toISOString()

    const { data: needsAltEmail } = await supabase
      .from("conversations")
      .select("id, clinic_id, lead_id, awaiting_clinic_reply_since")
      .eq("awaiting_clinic_reply", true)
      .eq("clinic_nudge_sent", true)           // Stage 1 must have fired first
      .eq("alt_clinics_email_sent", false)      // Only send once
      .lt("awaiting_clinic_reply_since", altCutoff)
      .neq("conversation_state", "closed")
      .order("awaiting_clinic_reply_since", { ascending: true })
      .limit(BATCH_SIZE)

    patientEmailsProcessed = (needsAltEmail || []).length
    const patientEmailedThisBatch = new Set<string>()

    for (const convo of needsAltEmail || []) {
      try {
        const { data: lead } = await supabase
          .from("leads")
          .select("id, first_name, email, postcode, lat, long, treatment_interest")
          .eq("id", convo.lead_id)
          .single()

        if (!lead?.email) {
          await supabase
            .from("conversations")
            .update({ alt_clinics_email_sent: true, alt_clinics_email_sent_at: new Date().toISOString() })
            .eq("id", convo.id)
          continue
        }

        const emailLower = lead.email.toLowerCase()

        // Skip if we already emailed this patient about a different conversation in this batch
        if (patientEmailedThisBatch.has(emailLower)) {
          await supabase
            .from("conversations")
            .update({ alt_clinics_email_sent: true, alt_clinics_email_sent_at: new Date().toISOString() })
            .eq("id", convo.id)
          continue
        }

        const { data: originalClinic } = await supabase
          .from("clinics")
          .select("name")
          .eq("id", convo.clinic_id)
          .single()

        if (!originalClinic) continue

        const altClinics = await findAlternativeClinics(supabase, lead, convo.clinic_id, appUrl)

        const waitTimeHours = Math.max(1, Math.round(
          (now - new Date(convo.awaiting_clinic_reply_since).getTime()) / (60 * 60 * 1000)
        ))

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

        patientEmailedThisBatch.add(emailLower)

        // Mark conversation as emailed — this is the permanent "sent once" flag
        await supabase
          .from("conversations")
          .update({
            alt_clinics_email_sent: true,
            alt_clinics_email_sent_at: new Date().toISOString(),
          })
          .eq("id", convo.id)

        if (result.success && !result.skipped) {
          patientEmailsSent++
        }
      } catch (err) {
        console.error(`[check-unanswered] Alt email error for conversation ${convo.id}:`, err)
      }
    }
    } // end if (settings.altClinicsEmailEnabled)

    // ─── 3. Recompute clinic response stats (always runs) ───────────────
    await recomputeClinicStats(supabase)

    return NextResponse.json({
      settings: {
        clinicNudgeEnabled: settings.clinicNudgeEnabled,
        altClinicsEmailEnabled: settings.altClinicsEmailEnabled,
      },
      clinicNudges: { processed: clinicNudgesProcessed, sent: clinicNudgesSent },
      altClinicEmails: { processed: patientEmailsProcessed, sent: patientEmailsSent },
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

  const result = sortedClinics
    .slice(0, MAX_ALT_CLINICS * 2)
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
    const { data: clinicIds } = await supabase
      .from("response_time_log")
      .select("clinic_id")

    if (!clinicIds || clinicIds.length === 0) return

    const uniqueClinicIds = [...new Set(clinicIds.map(r => r.clinic_id))]

    for (const clinicId of uniqueClinicIds) {
      try {
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
