import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAuth } from "@/lib/admin-auth"
import { generateText } from "ai"

/**
 * POST /api/admin/clinics/bulk-generate-descriptions
 *
 * Extracts the "About Us" description from a clinic's website.
 * Falls back to AI generation only when no about content is found.
 *
 * Processes one clinic at a time, called sequentially from the client.
 *
 * Body: { clinicId: string }
 */

/** Fetch and strip HTML from a URL */
async function fetchPageText(url: string): Promise<string> {
  let normalised = url
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    normalised = `https://${url}`
  }

  const res = await fetch(normalised, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; PearlieBot/1.0; +https://pearlie.org)",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(12000),
  })

  if (!res.ok) return ""

  const html = await res.text()
  return html
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
}

/**
 * Try to find an /about, /about-us, or /our-practice page linked from the
 * homepage.  Returns the text of the best candidate page, or "" if none found.
 */
async function fetchAboutPageText(baseUrl: string): Promise<string> {
  let normalised = baseUrl
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    normalised = `https://${baseUrl}`
  }

  // Common about page paths dental clinics use
  const aboutPaths = [
    "/about",
    "/about-us",
    "/about-us/",
    "/about/",
    "/our-practice",
    "/our-practice/",
    "/the-practice",
    "/the-practice/",
    "/our-team",
    "/our-team/",
    "/who-we-are",
    "/our-story",
  ]

  // Try each candidate path
  for (const path of aboutPaths) {
    try {
      const url = new URL(path, normalised).href
      const text = await fetchPageText(url)
      // If we got meaningful content (not a 404 page with little text)
      if (text.length > 200) {
        return text.slice(0, 6000)
      }
    } catch {
      continue
    }
  }

  return ""
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const { clinicId } = await request.json()

    if (!clinicId) {
      return NextResponse.json(
        { error: "clinicId is required" },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    const { data: clinic, error } = await supabase
      .from("clinics")
      .select(
        "id, name, address, postcode, description, website, treatments, treatment_prices, google_rating, google_review_count, featured_review, opening_hours",
      )
      .eq("id", clinicId)
      .single()

    if (error || !clinic) {
      return NextResponse.json(
        { error: "Clinic not found" },
        { status: 404 },
      )
    }

    // ---- No website — nothing to scrape ----
    if (!clinic.website) {
      return NextResponse.json({
        clinicId: clinic.id,
        clinicName: clinic.name,
        status: "skipped",
        error: "No website URL",
      })
    }

    // ---- Step 1: Try to scrape the about page ----
    let aboutText = ""
    try {
      aboutText = await fetchAboutPageText(clinic.website)
    } catch {
      // non-critical
    }

    // If no about page found, try the homepage
    let homepageText = ""
    if (!aboutText) {
      try {
        homepageText = await fetchPageText(clinic.website)
        homepageText = homepageText.slice(0, 6000)
      } catch {
        // non-critical
      }
    }

    const scrapedText = aboutText || homepageText

    if (!scrapedText || scrapedText.length < 100) {
      return NextResponse.json({
        clinicId: clinic.id,
        clinicName: clinic.name,
        status: "skipped",
        error: "Could not fetch website content",
      })
    }

    // ---- Step 2: Use AI to extract the about us description ----
    const source = aboutText ? "about page" : "homepage"

    const prompt = `You are reading a dental clinic's ${source} to extract their "About Us" description for their profile on Pearlie.

CLINIC NAME: ${clinic.name}

WEBSITE CONTENT:
"""
${scrapedText}
"""

TASK:
Extract the clinic's own "About Us" / practice description from the website content above.

RULES:
- Find and extract the section where the clinic describes themselves, their practice, their philosophy, or their team
- Condense it to 2-4 sentences (50-120 words) — keep the clinic's own voice and key points
- Use third-person (e.g. "The practice offers..." not "We offer...")
- Keep factual claims the clinic makes about themselves (e.g. "established in 2005", "family-run practice")
- Do NOT include specific prices, phone numbers, or full addresses
- Do NOT add information that isn't on their website
- Do NOT use superlatives like "best", "top", "leading", "#1" unless the clinic itself uses them
- Do NOT include the clinic name at the start — it's already shown as the page title
- If you cannot find any about/description content on the page, respond with exactly: NO_ABOUT_FOUND

Output ONLY the description text (or NO_ABOUT_FOUND), no quotes or labels.`

    const result = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
      temperature: 0.3,
    })

    const extracted = result.text?.trim()

    if (!extracted || extracted === "NO_ABOUT_FOUND" || extracted.length < 20) {
      // ---- Fallback: generate a description from available data ----
      const contextParts: string[] = []
      contextParts.push(`Clinic name: ${clinic.name}`)
      contextParts.push(`Location: ${clinic.address}, ${clinic.postcode}`)

      if (clinic.treatments && clinic.treatments.length > 0) {
        contextParts.push(
          `Treatments offered: ${clinic.treatments.join(", ")}`,
        )
      }
      if (clinic.featured_review) {
        contextParts.push(
          `Featured patient review: "${clinic.featured_review.slice(0, 300)}"`,
        )
      }

      const fallbackPrompt = `Write a short "About Us" description (2-3 sentences, 40-80 words) for a dental clinic profile page.

CLINIC DATA:
${contextParts.join("\n")}

RULES:
- Third-person tone (e.g. "The practice offers..." not "We offer...")
- Mention the area naturally (e.g. "Based in Clapham")
- Do NOT mention specific prices, ratings, or review counts
- Do NOT use superlatives like "best", "top", "leading", "#1"
- Do NOT include the clinic name at the start
- Output ONLY the description text, no quotes or labels`

      const fallbackResult = await generateText({
        model: "openai/gpt-4o-mini",
        prompt: fallbackPrompt,
        temperature: 0.7,
      })

      const fallbackDesc = fallbackResult.text?.trim()
      if (!fallbackDesc || fallbackDesc.length < 20) {
        return NextResponse.json({
          clinicId: clinic.id,
          clinicName: clinic.name,
          status: "skipped",
          error: "No about content found on website",
        })
      }

      const { error: updateError } = await supabase
        .from("clinics")
        .update({
          description: fallbackDesc,
          updated_at: new Date().toISOString(),
        })
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
        status: "generated",
        description: fallbackDesc,
        source: "ai-fallback",
      })
    }

    // ---- Step 3: Save the extracted description ----
    const { error: updateError } = await supabase
      .from("clinics")
      .update({
        description: extracted,
        updated_at: new Date().toISOString(),
      })
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
      description: extracted,
      source,
    })
  } catch (error) {
    console.error("[bulk-generate-descriptions] Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
