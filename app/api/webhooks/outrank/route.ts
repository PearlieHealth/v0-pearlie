import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

interface OutrankArticle {
  id: string
  title: string
  slug: string
  content_markdown: string
  content_html?: string
  meta_description?: string
  image_url?: string
  tags?: string[]
  created_at: string
}

interface OutrankWebhookPayload {
  event_type: string
  timestamp: string
  data: {
    articles: OutrankArticle[]
  }
}

export async function POST(request: NextRequest) {
  // Verify Bearer token
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")
  const secret = process.env.OUTRANK_WEBHOOK_SECRET

  if (!secret) {
    console.error("[outrank/webhook] OUTRANK_WEBHOOK_SECRET not configured")
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    )
  }

  if (!token || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: OutrankWebhookPayload

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (payload.event_type !== "publish_articles") {
    // Acknowledge unknown events without error
    return NextResponse.json({ received: true, skipped: true })
  }

  const articles = payload.data?.articles
  if (!Array.isArray(articles) || articles.length === 0) {
    return NextResponse.json(
      { error: "No articles in payload" },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const results = await Promise.allSettled(
    articles.map(async (article) => {
      const { error } = await supabase.from("seo_articles").upsert(
        {
          id: article.id,
          title: article.title,
          slug: article.slug,
          content_markdown: article.content_markdown,
          content_html: article.content_html || null,
          meta_description: article.meta_description || null,
          image_url: article.image_url || null,
          tags: article.tags || [],
          source: "outrank",
          published_at: article.created_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )

      if (error) {
        console.error(
          `[outrank/webhook] Failed to upsert article ${article.id}:`,
          error
        )
        throw error
      }

      return article.id
    })
  )

  const succeeded = results.filter((r) => r.status === "fulfilled").length
  const failed = results.filter((r) => r.status === "rejected").length

  console.log(
    `[outrank/webhook] Processed ${articles.length} articles: ${succeeded} succeeded, ${failed} failed`
  )

  return NextResponse.json({
    received: true,
    processed: succeeded,
    failed,
  })
}
