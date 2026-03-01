import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { generateText } from "ai"

/**
 * POST /api/admin/clinics/bulk-generate-descriptions
 *
 * Generates AI-powered "about us" descriptions for clinics that currently
 * have only a generic location sentence (from bulk import).
 *
 * Processes one clinic at a time, called sequentially from the client
 * to show progress and avoid timeouts.
 *
 * Body: { clinicId: string }
 */
export async function POST(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { clinicId } = await request.json()

    if (!clinicId) {
      return NextResponse.json({ error: "clinicId is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: clinic, error } = await supabase
      .from("clinics")
      .select("id, name, address, postcode, description, website, treatments, treatment_prices, google_rating, google_review_count, featured_review, opening_hours")
      .eq("id", clinicId)
      .single()

    if (error || !clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    // Build context for the AI from available clinic data
    const contextParts: string[] = []
    contextParts.push(`Clinic name: ${clinic.name}`)
    contextParts.push(`Location: ${clinic.address}, ${clinic.postcode}`)

    if (clinic.google_rating) {
      contextParts.push(`Google rating: ${clinic.google_rating}/5 (${clinic.google_review_count || 0} reviews)`)
    }

    if (clinic.treatments && clinic.treatments.length > 0) {
      contextParts.push(`Treatments offered: ${clinic.treatments.join(", ")}`)
    }

    if (clinic.treatment_prices && clinic.treatment_prices.length > 0) {
      const categories = clinic.treatment_prices
        .map((cat: any) => cat.category)
        .filter(Boolean)
      if (categories.length > 0) {
        contextParts.push(`Treatment categories: ${categories.join(", ")}`)
      }
    }

    if (clinic.opening_hours && typeof clinic.opening_hours === "object") {
      const days = Object.entries(clinic.opening_hours)
        .filter(([, v]) => v && v !== "Closed")
        .map(([day, hours]) => `${day}: ${hours}`)
      if (days.length > 0) {
        contextParts.push(`Opening hours: ${days.join(", ")}`)
      }
    }

    if (clinic.featured_review) {
      contextParts.push(`Featured patient review: "${clinic.featured_review.slice(0, 300)}"`)
    }

    // Try to fetch website content for additional context
    let websiteContent = ""
    if (clinic.website) {
      try {
        let url = clinic.website
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = `https://${url}`
        }
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; PearlieBot/1.0; +https://pearlie.org)",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(10000),
        })

        if (res.ok) {
          const html = await res.text()
          websiteContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 4000)
        }
      } catch {
        // Non-critical — continue without website content
      }
    }

    if (websiteContent) {
      contextParts.push(`Website content excerpt: "${websiteContent}"`)
    }

    const prompt = `You are writing a short "About Us" description for a dental clinic's profile page on Pearlie, a dental clinic matching platform.

CLINIC DATA:
${contextParts.join("\n")}

INSTRUCTIONS:
- Write 2-3 sentences (40-80 words) describing this dental practice
- Use a warm, professional, third-person tone (e.g. "The clinic offers..." not "We offer...")
- Highlight what makes this clinic distinctive based on the data available
- Mention the area/neighbourhood naturally (e.g. "Based in Clapham" not the full address)
- If available, reference their specialties, patient experience, or notable features
- Do NOT mention specific prices, ratings, or review counts
- Do NOT use superlatives like "best", "top", "leading", "#1"
- Do NOT make claims not supported by the data
- Do NOT include the clinic name at the start — it's already shown as the page title
- Output ONLY the description text, no quotes or labels`

    const result = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
      temperature: 0.7,
    })

    const description = result.text?.trim()

    if (!description || description.length < 20) {
      return NextResponse.json({
        clinicId: clinic.id,
        clinicName: clinic.name,
        status: "failed",
        error: "AI returned empty or too-short description",
      })
    }

    // Update the clinic description
    const { error: updateError } = await supabase
      .from("clinics")
      .update({ description, updated_at: new Date().toISOString() })
      .eq("id", clinicId)

    if (updateError) {
      return NextResponse.json({
        clinicId: clinic.id,
        clinicName: clinic.name,
        status: "failed",
        error: updateError.message,
      })
    }

    return NextResponse.json({
      clinicId: clinic.id,
      clinicName: clinic.name,
      status: "updated",
      description,
    })
  } catch (error) {
    console.error("[bulk-generate-descriptions] Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
