// Bulletproof reason generator with deterministic fallback templates
// Uses hash-based selection for variation across clinics while maintaining stability

import crypto from "crypto"

export type ReasonCode =
  | "TREATMENT_MATCH"
  | "BUDGET_MATCH"
  | "FINANCE_AVAILABLE"
  | "PRIORITY_ANXIOUS"
  | "PRIORITY_QUALITY"
  | "PRIORITY_CONVENIENCE"
  | "PRIORITY_SPEED"
  | "DISTANCE_CLOSE"
  | "AVAILABLE_SOON"
  | "HIGHLY_RATED"
  | "VERIFIED_CLINIC"

export interface ReasonFacts {
  clinic_name: string
  distance_miles?: number
  matched_treatment?: string
  matched_priorities?: string[]
  price_range?: string
  finance_available?: boolean
  reviews_count?: number
  rating?: number
  verified?: boolean
  availability?: string
}

interface ReasonOutput {
  title: string
  bullets: string[]
  footer: string
  codes: ReasonCode[]
  source: "ai" | "fallback"
}

// Template pools for each reason code (4-6 variants each)
// Following template: Matched because [patient priority] + [clinic attribute] + [patient benefit]
const REASON_TEMPLATES: Record<ReasonCode, string[]> = {
  TREATMENT_MATCH: [
    "Matched for their strong track record with {treatment}.",
    "Matched because they're experienced with {treatment} cases like yours.",
    "Matched for their expertise delivering quality {treatment} outcomes.",
    "Matched because their team is well-trained in {treatment} procedures.",
    "Matched for advanced techniques that support your {treatment} needs.",
  ],
  BUDGET_MATCH: [
    "Matched for transparent {price_range} pricing that fits your budget.",
    "Matched because their pricing aligns with what you're looking for.",
    "Matched for clear cost structures in the {price_range} range.",
    "Matched because you'll know exactly what treatment costs upfront.",
    "Matched for their straightforward pricing approach.",
  ],
  FINANCE_AVAILABLE: [
    "Matched for flexible payment plans to spread the cost.",
    "Matched because they offer finance options that suit your budget.",
    "Matched for monthly payment options making care more accessible.",
    "Matched because spreading costs helps reduce financial stress.",
    "Matched for their range of payment solutions.",
  ],
  PRIORITY_ANXIOUS: [
    "Matched for their calm, gentle approach and patient comfort focus.",
    "Matched because anxious patients consistently feel safe here.",
    "Matched for their supportive environment that eases dental anxiety.",
    "Matched because their team understands nervous patients.",
    "Matched for their patient-led approach that helps you feel in control.",
  ],
  PRIORITY_QUALITY: [
    "Matched for their consistently high patient satisfaction.",
    "Matched because patients praise their care quality and outcomes.",
    "Matched for their commitment to clinical excellence.",
    "Matched because their track record reflects quality care.",
    "Matched for the positive experiences patients consistently report.",
  ],
  PRIORITY_CONVENIENCE: [
    "Matched for convenient scheduling that fits your life.",
    "Matched because their location works well for you.",
    "Matched for their flexible booking options.",
    "Matched because getting appointments is straightforward.",
    "Matched for their patient-friendly scheduling approach.",
  ],
  PRIORITY_SPEED: [
    "Matched for fast appointment availability.",
    "Matched because they offer quick booking options.",
    "Matched for minimal waiting times.",
    "Matched because you won't have to wait long to be seen.",
    "Matched for their efficient scheduling system.",
  ],
  DISTANCE_CLOSE: [
    "Matched at just {distance} miles from you.",
    "Matched for their convenient nearby location.",
    "Matched because travel time is minimal at {distance} miles.",
    "Matched for easy accessibility from your area.",
    "Matched as a local option close to you.",
  ],
  AVAILABLE_SOON: [
    "Matched for appointments available this week.",
    "Matched because they can see you quickly.",
    "Matched for prompt consultation availability.",
    "Matched because you won't have to wait long to get started.",
    "Matched for their good appointment availability.",
  ],
  HIGHLY_RATED: [
    "Matched for their {rating}★ rating from {reviews_count}+ patients.",
    "Matched because patients consistently rate them highly.",
    "Matched for their excellent {rating}★ patient feedback.",
    "Matched because {reviews_count}+ patients trust them.",
    "Matched for their strong reputation and reviews.",
  ],
  VERIFIED_CLINIC: [
    "Matched as a verified clinic with strong patient feedback.",
    "Matched because they're fully registered and regulated.",
    "Matched for their verified clinical standards.",
    "Matched because their credentials are independently confirmed.",
    "Matched as an accredited practice you can trust.",
  ],
}

// Category groupings for bullet selection
const CATEGORY_GROUPS = {
  treatment_finance: ["TREATMENT_MATCH", "BUDGET_MATCH", "FINANCE_AVAILABLE"] as ReasonCode[],
  priorities: ["PRIORITY_ANXIOUS", "PRIORITY_QUALITY", "PRIORITY_CONVENIENCE", "PRIORITY_SPEED"] as ReasonCode[],
  logistics: ["DISTANCE_CLOSE", "AVAILABLE_SOON", "HIGHLY_RATED", "VERIFIED_CLINIC"] as ReasonCode[],
}

/**
 * Generate a stable hash for deterministic template selection
 */
function hashForSelection(leadId: string, clinicId: string, seed: string): number {
  const combined = `${leadId}-${clinicId}-${seed}`
  const hash = crypto.createHash("md5").update(combined).digest("hex")
  return Number.parseInt(hash.substring(0, 8), 16)
}

/**
 * Select a template deterministically from a pool
 */
function selectTemplate(templates: string[], leadId: string, clinicId: string, reasonCode: string): string {
  const hash = hashForSelection(leadId, clinicId, reasonCode)
  const index = hash % templates.length
  return templates[index]
}

/**
 * Interpolate facts into template
 */
function interpolate(template: string, facts: ReasonFacts): string {
  return template
    .replace("{treatment}", facts.matched_treatment || "your treatment")
    .replace("{price_range}", facts.price_range || "mid-range")
    .replace("{distance}", facts.distance_miles?.toFixed(1) || "3.0")
    .replace("{rating}", facts.rating?.toFixed(1) || "4.5")
    .replace("{reviews_count}", facts.reviews_count?.toString() || "50")
}

/**
 * Generate fallback reasons deterministically
 * Returns 3 bullets: 1 from each category group
 */
export function generateFallbackReasons(
  reasonCodes: ReasonCode[],
  facts: ReasonFacts,
  leadId: string,
  clinicId: string,
): ReasonOutput {
  const selectedBullets: string[] = []
  const usedCodes: ReasonCode[] = []

  // Select 1 bullet from each category
  for (const [category, categoryReasonCodes] of Object.entries(CATEGORY_GROUPS)) {
    // Find available reason codes in this category
    const availableCodes = reasonCodes.filter((code) => categoryReasonCodes.includes(code))

    if (availableCodes.length > 0) {
      // Pick the first available code deterministically
      const hash = hashForSelection(leadId, clinicId, category)
      const selectedCode = availableCodes[hash % availableCodes.length]

      const templates = REASON_TEMPLATES[selectedCode]
      const template = selectTemplate(templates, leadId, clinicId, selectedCode)
      const bullet = interpolate(template, facts)

      selectedBullets.push(bullet)
      usedCodes.push(selectedCode)
    }
  }

  // Ensure we have exactly 3 bullets
  while (selectedBullets.length < 3 && reasonCodes.length > 0) {
    const remainingCodes = reasonCodes.filter((code) => !usedCodes.includes(code))
    if (remainingCodes.length === 0) break

    const code = remainingCodes[0]
    const templates = REASON_TEMPLATES[code]
    const template = selectTemplate(templates, leadId, clinicId, code)
    const bullet = interpolate(template, facts)

    selectedBullets.push(bullet)
    usedCodes.push(code)
  }

  return {
    title: "Why we matched you",
    bullets: selectedBullets.slice(0, 3), // Ensure exactly 3
    footer: "Most patients book one of these clinics",
    codes: usedCodes,
    source: "fallback",
  }
}

/**
 * Attempt AI reason generation with fallback
 */
export async function generateReasonsWithAI(
  reasonCodes: ReasonCode[],
  facts: ReasonFacts,
  leadId: string,
  clinicId: string,
  promptVersion = "v1",
): Promise<ReasonOutput & { ai_model?: string; ai_error_code?: string }> {

  // For now, always use fallback until AI circuit breaker is implemented
  // TODO: Implement AI generation with Groq and circuit breaker
  const fallback = generateFallbackReasons(reasonCodes, facts, leadId, clinicId)

  return {
    ...fallback,
    ai_error_code: "not_implemented",
  }
}
