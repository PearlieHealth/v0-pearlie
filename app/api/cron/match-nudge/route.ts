import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmailWithRetry } from "@/lib/email-send"
import { EMAIL_FROM } from "@/lib/email-config"
import { generateUnsubscribeFooterHtml, generateUnsubscribeHeaders } from "@/lib/unsubscribe"

const BATCH_SIZE = 10

export async function GET(request: Request) {
  try {
    // Verify Vercel Cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Find matches older than 2 hours that haven't been nudged
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

    let nudged = 0

    for (const match of matches) {
      try {
        // Check if the patient has sent any messages across ALL conversations
        const { data: conversations } = await supabase
          .from("conversations")
          .select("id")
          .eq("lead_id", match.lead_id)

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
            // Patient already messaged, mark as nudged so we skip them next time
            await supabase
              .from("matches")
              .update({ nudge_email_sent_at: new Date().toISOString() })
              .eq("id", match.id)
            continue
          }
        }

        // Fetch lead details for the email
        const { data: lead } = await supabase
          .from("leads")
          .select("first_name, email, postcode")
          .eq("id", match.lead_id)
          .single()

        if (!lead?.email) {
          // No email, skip and mark
          await supabase
            .from("matches")
            .update({ nudge_email_sent_at: new Date().toISOString() })
            .eq("id", match.id)
          continue
        }

        const clinicCount = match.clinic_ids?.length || 0
        const firstName = lead.first_name || "there"
        const postcode = lead.postcode || "your area"
        const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://pearlie.org"
        const matchPath = `/match/${match.id}`
        const matchUrl = `${appUrl}${matchPath}`

        const unsubHeaders = generateUnsubscribeHeaders(lead.email, "patient_notifications")
        const unsubUrl = unsubHeaders["List-Unsubscribe"].replace(/[<>]/g, "")
        const unsubFooter = generateUnsubscribeFooterHtml(unsubUrl)

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

        await sendEmailWithRetry({
          from: EMAIL_FROM.NOTIFICATIONS,
          to: lead.email,
          subject: "Your clinic matches are waiting",
          headers: unsubHeaders,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">Your matches are waiting</h1>
              </div>
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
                Hi ${firstName}, you matched with <strong>${clinicCount} clinic${clinicCount !== 1 ? "s" : ""}</strong> near <strong>${postcode}</strong>. Your personalised matches are ready to view.
              </p>
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${matchLink}" style="display: inline-block; background: #0fbcb0; color: white; padding: 14px 36px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  View matches
                </a>
              </div>
              <p style="font-size: 14px; color: #666; line-height: 1.5;">
                Message a clinic to ask about treatments, availability, or anything else. They typically reply within a few hours.
              </p>
              <p style="font-size: 12px; color: #999; text-align: center; margin-top: 32px;">
                Pearlie &mdash; Finding your perfect dental match
              </p>
              ${unsubFooter}
            </div>
          `,
        })

        // Mark as nudged
        await supabase
          .from("matches")
          .update({ nudge_email_sent_at: new Date().toISOString() })
          .eq("id", match.id)

        nudged++
      } catch (err) {
        console.error(`[match-nudge] Error processing match ${match.id}:`, err)
      }
    }

    return NextResponse.json({ processed: matches.length, nudged })
  } catch (error) {
    console.error("[match-nudge] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
