/**
 * AI-powered pricing extractor for dental clinic websites.
 *
 * Scrapes a clinic's website for treatment pricing information and uses AI to
 * extract structured pricing data.  Follows the same pattern as
 * lib/clinic-ingest/website-reader.ts (fetch HTML → strip → AI extraction).
 */

import { generateText, Output } from "ai"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractedPrice {
  treatment: string
  price_from: number | null
  price_to: number | null
  price_text: string
  evidence: string
}

export interface PricingExtractionResult {
  success: boolean
  prices?: ExtractedPrice[]
  source_url?: string
  error?: string
}

// Zod schema for AI output validation
const pricingOutputSchema = z.object({
  prices: z.array(
    z.object({
      treatment: z.string().describe("Name of the dental treatment (e.g., 'Check-up', 'Teeth Whitening', 'Dental Implant')"),
      price_from: z.number().nullable().describe("Starting price in GBP (null if not specified)"),
      price_to: z.number().nullable().describe("Maximum price in GBP (null if not a range)"),
      price_text: z.string().describe("The original price text as it appears on the website (e.g., 'from £50', '£200-£400')"),
      evidence: z.string().describe("The surrounding text/context from the website where this price was found"),
    }),
  ),
  has_pricing_page: z.boolean().describe("Whether the website appears to have a dedicated pricing/fees page"),
})

// ---------------------------------------------------------------------------
// Website fetching (same pattern as website-reader.ts)
// ---------------------------------------------------------------------------

async function fetchPageContent(
  url: string,
): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    let normalizedUrl = url
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      normalizedUrl = `https://${url}`
    }

    const response = await fetch(normalizedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PearlieBot/1.0; +https://pearlie.org)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return { text: "", success: false, error: `HTTP ${response.status}` }
    }

    const html = await response.text()

    // Try to find a pricing/fees page link
    const pricingLinks: string[] = []
    const linkRegex = /href=["']([^"']*(?:pric|fee|cost|tariff)[^"']*)["']/gi
    let match
    while ((match = linkRegex.exec(html)) !== null) {
      pricingLinks.push(match[1])
    }

    // Extract text content
    const textContent = html
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
      .replace(/&pound;/g, "£")
      .replace(/\s+/g, " ")
      .trim()

    let combinedText = textContent.slice(0, 6000)

    // If we found pricing page links, try to fetch them too
    if (pricingLinks.length > 0) {
      const baseUrl = new URL(normalizedUrl)
      for (const link of pricingLinks.slice(0, 2)) {
        try {
          const pricingUrl = new URL(link, baseUrl).toString()
          const pricingRes = await fetch(pricingUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; PearlieBot/1.0; +https://pearlie.org)",
            },
            signal: AbortSignal.timeout(10000),
          })
          if (pricingRes.ok) {
            const pricingHtml = await pricingRes.text()
            const pricingText = pricingHtml
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<!--[\s\S]*?-->/g, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/&pound;/g, "£")
              .replace(/\s+/g, " ")
              .trim()
            combinedText += "\n\n--- PRICING PAGE ---\n" + pricingText.slice(0, 4000)
          }
        } catch {
          // skip failed pricing page
        }
      }
    }

    return { text: combinedText.slice(0, 10000), success: true }
  } catch (error) {
    return {
      text: "",
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch website",
    }
  }
}

// ---------------------------------------------------------------------------
// AI extraction
// ---------------------------------------------------------------------------

function buildPricingPrompt(websiteText: string): string {
  return `You are analyzing a dental clinic's website to extract treatment pricing information.

WEBSITE CONTENT:
"""
${websiteText}
"""

INSTRUCTIONS:
1. Find ALL dental treatment prices mentioned on the website
2. Common treatments to look for:
   - Check-up / Examination
   - Dental hygiene / Scale & polish
   - Teeth whitening
   - Composite bonding
   - Dental veneers
   - Dental implants
   - Root canal treatment
   - Tooth extraction
   - Dental crowns
   - Invisalign / Clear aligners
   - Dentures
   - Fillings
   - Emergency appointment
   - X-rays
3. Extract the price as a number in GBP (pounds sterling)
4. If a price is a range (e.g., "£200-£400"), set price_from and price_to
5. If a price is "from £X", set price_from only and price_to to null
6. Include the exact text evidence where you found the price

IMPORTANT:
- Only extract prices that are clearly stated on the website
- Do NOT guess or estimate prices
- Prices must be in GBP (£)
- If no prices are found, return an empty prices array

Extract the pricing information now.`
}

/**
 * Extract pricing information from a dental clinic website using AI.
 */
export async function extractPricing(websiteUrl: string): Promise<PricingExtractionResult> {
  try {
    const { text, success, error } = await fetchPageContent(websiteUrl)

    if (!success || !text) {
      return {
        success: false,
        error: error || "No content extracted from website",
      }
    }

    // Quick check: does the content even mention prices?
    if (!/£|\bpound|\bprice|\bfee|\bcost|\btariff/i.test(text)) {
      return {
        success: true,
        prices: [],
        source_url: websiteUrl,
      }
    }

    const result = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: buildPricingPrompt(text),
      output: Output.object({ schema: pricingOutputSchema }),
      temperature: 0.2,
    })

    const output = result.output

    return {
      success: true,
      prices: output.prices || [],
      source_url: websiteUrl,
    }
  } catch (error) {
    console.error("[pricing-extractor] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Pricing extraction failed",
    }
  }
}
