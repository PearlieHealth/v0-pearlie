/**
 * Website Reader - AI-powered clinic website analysis
 * 
 * Scrapes clinic websites and uses Groq AI to extract:
 * - Tone and messaging style
 * - Key claims and selling points
 * - Patient experience signals
 * - Maps to canonical tags for matching
 */

import { generateText, Output } from "ai"
import { z } from "zod"
import { CANONICAL_TAG_KEYS, REASON_TEMPLATES } from "@/lib/matching/tag-schema"

// Allowed tags that can be extracted from website content
export type AllowedExtractionTag = (typeof CANONICAL_TAG_KEYS)[number]

// Output schema for AI extraction
export interface ClinicSignalOutput {
  tone: string[]
  keywords: string[]
  claims: string[]
  patient_experience_signals: string[]
  matched_tags: AllowedExtractionTag[]
  confidence: Record<string, number>
  evidence_snippets: Record<string, string>
  suggested_match_sentences: Record<string, string>
}

export interface ExtractionResult {
  success: boolean
  signals?: ClinicSignalOutput
  pagesScraped?: number
  error?: string
}

// Use Vercel AI Gateway for model access (auto-configured)

// Zod schema for AI output validation
const signalOutputSchema = z.object({
  tone: z.array(z.string()).describe("Descriptive words for the clinic's communication tone (e.g., 'calm', 'professional', 'friendly', 'clinical')"),
  keywords: z.array(z.string()).describe("Key terms and phrases the clinic emphasizes"),
  claims: z.array(z.string()).describe("Specific claims or promises the clinic makes"),
  patient_experience_signals: z.array(z.string()).describe("Phrases indicating patient experience focus"),
  matched_tags: z.array(z.string()).describe("Tag keys from the allowed list that match the website content"),
  confidence: z.record(z.string(), z.number()).describe("Confidence score (0-1) for each matched tag"),
  evidence_snippets: z.record(z.string(), z.string()).describe("Quote from website supporting each tag"),
  suggested_match_sentences: z.record(z.string(), z.string()).describe("Human-readable reason sentence for each tag"),
})

/**
 * Fetch and extract text content from a URL
 */
async function fetchWebsiteContent(url: string): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    // Normalize URL
    let normalizedUrl = url
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      normalizedUrl = `https://${url}`
    }

    const response = await fetch(normalizedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PearlieBot/1.0; +https://pearlie.org)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    })

    if (!response.ok) {
      return { text: "", success: false, error: `HTTP ${response.status}` }
    }

    const html = await response.text()
    
    // Extract text content (basic HTML stripping)
    const textContent = html
      // Remove script and style tags with content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, "")
      // Remove all HTML tags
      .replace(/<[^>]+>/g, " ")
      // Decode HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim()

    // Limit to ~8000 chars for AI context
    const truncated = textContent.slice(0, 8000)

    return { text: truncated, success: true }
  } catch (error) {
    console.error("[website-reader] Fetch error:", error)
    return { 
      text: "", 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch website" 
    }
  }
}

/**
 * Build the AI prompt with allowed tags
 */
function buildExtractionPrompt(websiteText: string): string {
  // Create tag list with descriptions for AI
  const tagDescriptions = CANONICAL_TAG_KEYS.map(tag => {
    const description = REASON_TEMPLATES[tag] || tag
    return `- ${tag}: "${description}"`
  }).join("\n")

  return `You are analyzing a dental clinic's website to extract signals about their practice style and patient experience.

WEBSITE CONTENT:
"""
${websiteText}
"""

ALLOWED TAGS (only use tags from this list):
${tagDescriptions}

INSTRUCTIONS:
1. Analyze the website content for tone, keywords, claims, and patient experience signals
2. Match the content to ONLY the allowed tags listed above
3. For each matched tag, provide:
   - A confidence score (0.0 to 1.0) based on how strongly the evidence supports the tag
   - A direct quote or paraphrase from the website as evidence
   - A human-readable sentence explaining why this tag applies

IMPORTANT:
- Only match tags where you find clear evidence (confidence >= 0.65)
- Evidence must come directly from the website content
- Be conservative - don't guess or assume
- Focus on patient experience and care approach signals

Extract the signals now.`
}

/**
 * Extract clinic signals from website using AI
 */
export async function extractClinicSignals(websiteUrl: string): Promise<ExtractionResult> {
  try {
    // Step 1: Fetch website content
    const { text, success, error } = await fetchWebsiteContent(websiteUrl)
    
    if (!success || !text) {
      return { 
        success: false, 
        error: error || "No content extracted from website" 
      }
    }

    // Step 2: Use AI to extract signals
    const prompt = buildExtractionPrompt(text)

    const result = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
      output: Output.object({ schema: signalOutputSchema }),
      temperature: 0.3, // Lower temperature for more consistent results
    })
    
    const object = result.output

    // Step 3: Validate and filter to only canonical tags
    const validTags = object.matched_tags.filter(tag => 
      CANONICAL_TAG_KEYS.includes(tag)
    ) as AllowedExtractionTag[]

    // Filter confidence and evidence to only valid tags
    const filteredConfidence: Record<string, number> = {}
    const filteredEvidence: Record<string, string> = {}
    const filteredSentences: Record<string, string> = {}

    for (const tag of validTags) {
      if (object.confidence[tag]) {
        filteredConfidence[tag] = object.confidence[tag]
      }
      if (object.evidence_snippets[tag]) {
        filteredEvidence[tag] = object.evidence_snippets[tag]
      }
      if (object.suggested_match_sentences[tag]) {
        filteredSentences[tag] = object.suggested_match_sentences[tag]
      }
    }

    const signals: ClinicSignalOutput = {
      tone: object.tone || [],
      keywords: object.keywords || [],
      claims: object.claims || [],
      patient_experience_signals: object.patient_experience_signals || [],
      matched_tags: validTags,
      confidence: filteredConfidence,
      evidence_snippets: filteredEvidence,
      suggested_match_sentences: filteredSentences,
    }

    return {
      success: true,
      signals,
      pagesScraped: 1,
    }
  } catch (error) {
    console.error("[website-reader] AI extraction error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "AI extraction failed",
    }
  }
}

/**
 * Extract signals from multiple pages (homepage + about/team pages)
 */
export async function extractClinicSignalsDeep(websiteUrl: string): Promise<ExtractionResult> {
  // For now, just use single page extraction
  // Could be extended to crawl about/team/services pages
  return extractClinicSignals(websiteUrl)
}
