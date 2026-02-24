import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendRegisteredEmail } from "@/lib/email/send"
import { EMAIL_TYPE } from "@/lib/email/registry"
import { generateUnsubscribeFooterHtml } from "@/lib/unsubscribe"

const BATCH_SIZE = 20

export async function GET(request: Request) {
  try {
    // Verify Vercel Cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Find matches older than 2 hours that haven't been nudged yet
    const { data: matches, error: matchError } = await supabase
      .from("matches")
      .select("id, lead_id, clinic_ids, created_at")
      .is("nudge_email_sent_at", null)
      .lt("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE)

    if (matchError) {
      console.error("[match-nudge] Error fetching matches:", matchError)
      return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 })
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ processed: 0 })
    }

    // Group matches by lead_id so each patient gets at most one email
    const matchesByLead = new Map<string, typeof matches>()
    for (const match of matches) {
      const existing = matchesByLead.get(match.lead_id) || []
      existing.push(match)
      matchesByLead.set(match.lead_id, existing)
    }

    let nudged = 0

    for (const [leadId, leadMatches] of matchesByLead) {
      try {
        // Collect all match IDs for this lead (to mark them all as nudged)
        const matchIds = leadMatches.map((m) => m.id)

        // Use the most recent match for the email content
        const latestMatch = leadMatches[leadMatches.length - 1]

        // Check if the patient has sent any messages across ALL conversations
        const { data: conversations } = await supabase
          .from("conversations")
          .select("id")
          .eq("lead_id", leadId)

        if (conversations && conversations.length > 0) {
          const convIds = conversations.map((c) => c.id)
          const { data: patientMsg } = await supabase
            .from("messages")
            .select("id")
            .in("conversation_id", convIds)
            .eq("sender_type", "patient")
            .limit(1)
            .single()

          if (patientMsg) {
            // Patient already messaged — mark ALL their matches as nudged, skip email
            await supabase
              .from("matches")
              .update({ nudge_email_sent_at: new Date().toISOString() })
              .in("id", matchIds)
            continue
          }
        }

        // Fetch lead details for the email
        const { data: lead } = await supabase
          .from("leads")
          .select("first_name, email, postcode")
          .eq("id", leadId)
          .single()

        if (!lead?.email) {
          // No email — mark all matches so we don't retry
          await supabase
            .from("matches")
            .update({ nudge_email_sent_at: new Date().toISOString() })
            .in("id", matchIds)
          continue
        }

        // Aggregate total clinic count across all matches for this lead
        const allClinicIds = new Set<string>()
        for (const m of leadMatches) {
          if (m.clinic_ids) {
            for (const cid of m.clinic_ids) allClinicIds.add(cid)
          }
        }
        const clinicCount = allClinicIds.size || latestMatch.clinic_ids?.length || 0
        const firstName = lead.first_name || "there"
        const postcode = lead.postcode || "your area"
        const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
        const matchPath = `/match/${latestMatch.id}`
        const matchUrl = `${appUrl}${matchPath}`

        // Generate magic link so patient is auto-logged in when they click
        const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(matchPath)}`
        let matchLink = matchUrl // fallback: plain link

        try {
          const { data: linkData } = await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: lead.email,
            options: { redirectTo },
          })
          if (linkData?.properties?.action_link) {
            matchLink = linkData.properties.action_link
            // Ensure redirect_to points to our app URL (Supabase may use Site URL)
            try {
              const linkUrl = new URL(matchLink)
              const currentRedirect = linkUrl.searchParams.get("redirect_to")
              if (currentRedirect) {
                const redirectHost = new URL(currentRedirect).hostname
                const appHost = new URL(appUrl).hostname
                if (redirectHost !== appHost) {
                  linkUrl.searchParams.set("redirect_to", redirectTo)
                  matchLink = linkUrl.toString()
                }
              }
            } catch {}
          }
        } catch (linkErr) {
          console.warn("[match-nudge] Failed to generate magic link:", linkErr)
        }

        const unsubFooter = generateUnsubscribeFooterHtml(
          `${appUrl}/api/unsubscribe?email=${encodeURIComponent(lead.email)}&category=patient_notifications`
        )

        const result = await sendRegisteredEmail({
          type: EMAIL_TYPE.MATCH_NUDGE,
          to: lead.email,
          data: {
            firstName,
            clinicCount,
            postcode,
            matchLink,
            unsubscribeFooterHtml: unsubFooter,
            // Internal fields for idempotency key (prefixed with _)
            _leadId: leadId,
          },
          leadId,
        })

        if (result.skipped) {
          console.log(`[match-nudge] Skipped lead ${leadId}: ${result.reason}`)
        }

        // Mark ALL matches for this lead as nudged (whether sent or skipped)
        await supabase
          .from("matches")
          .update({ nudge_email_sent_at: new Date().toISOString() })
          .in("id", matchIds)

        if (result.success && !result.skipped) {
          nudged++
        }
      } catch (err) {
        console.error(`[match-nudge] Error processing lead ${leadId}:`, err)
      }
    }

    return NextResponse.json({ processed: matches.length, leads: matchesByLead.size, nudged })
  } catch (error) {
    console.error("[match-nudge] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
