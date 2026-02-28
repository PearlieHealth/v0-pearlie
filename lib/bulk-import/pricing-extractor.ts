/**
 * AI-powered pricing extractor for dental clinic websites.
 *
 * Scrapes a clinic's website for treatment pricing information and uses AI to
 * extract structured pricing data in the EXACT same TreatmentCategory[] format
 * used by the clinic dashboard (lib/treatment-pricing-config.ts).
 *
 * Output maps directly into the `treatment_prices` JSONB column on the clinics
 * table — the same field the admin/clinic profile editor reads and writes.
 */

import { generateText, Output } from "ai"
import { z } from "zod"
import {
  DEFAULT_TREATMENT_CATEGORIES,
  type TreatmentCategory,
} from "@/lib/treatment-pricing-config"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PricingExtractionResult {
  success: boolean
  categories?: TreatmentCategory[]
  source_url?: string
  error?: string
}

// Zod schema matching TreatmentCategory[] exactly
const treatmentItemSchema = z.object({
  name: z.string().describe("Treatment name — use one of the known names if it matches"),
  price: z.string().describe("Price as a string, e.g. '65', '200', '3500'. Use 'from ' prefix for starting prices (e.g. 'from 150'). Leave empty string '' if not found on website."),
  description: z.string().describe("Brief description of the treatment"),
})

const pricingOutputSchema = z.object({
  categories: z.array(
    z.object({
      category: z.string().describe("Category name matching our standard categories"),
      treatments: z.array(treatmentItemSchema),
    }),
  ),
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

/**
 * Build the prompt that tells the AI exactly which categories and treatment
 * names to use — matching DEFAULT_TREATMENT_CATEGORIES from the clinic
 * dashboard.
 */
function buildPricingPrompt(websiteText: string): string {
  // Serialise the default categories so the AI knows the exact shape
  const categoryList = DEFAULT_TREATMENT_CATEGORIES.map((cat) => {
    const treatments = cat.treatments.map((t) => `    - ${t.name}`).join("\n")
    return `  ${cat.category}:\n${treatments}`
  }).join("\n\n")

  return `You are analyzing a UK dental clinic's website to extract treatment pricing.

WEBSITE CONTENT:
"""
${websiteText}
"""

TARGET OUTPUT FORMAT:
Return an array of treatment categories. Each category has a "category" name and
a "treatments" array. Each treatment has "name", "price" (string), and "description".

Use EXACTLY these category names and treatment names when there is a match.
Only include categories and treatments where you found at least one price on the website.

KNOWN CATEGORIES AND TREATMENT NAMES:
${categoryList}

PRICE FORMAT RULES:
- "price" is always a STRING, never a number
- For a single price: just the number, e.g. "65" or "3500"
- For a range: use the lower price, e.g. "200" (not "200-400")
- For "from £X": use "from 150" format
- Strip the £ symbol — just the number
- If a treatment is listed on the website but no price is shown, set price to ""

IMPORTANT:
- Only extract prices clearly stated on the website — do NOT guess
- Map website treatment names to the closest known treatment name above
- If the website lists a treatment not in the known list, you may add it to the
  most appropriate category with a descriptive name
- Only return categories that have at least one treatment with a non-empty price
- All prices are in GBP (£)

Extract now.`
}

/**
 * Extract pricing information from a dental clinic website using AI.
 * Returns TreatmentCategory[] — the same format used by the clinic dashboard.
 */
export async function extractPricing(
  websiteUrl: string,
): Promise<PricingExtractionResult> {
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
        categories: [],
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

    if (!output) {
      return { success: false, error: "AI did not return structured pricing data" }
    }

    // Filter to only categories that have at least one priced treatment
    const categoriesWithPrices = (output.categories || []).filter((cat) =>
      cat.treatments.some((t) => t.price !== ""),
    )

    return {
      success: true,
      categories: categoriesWithPrices,
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
