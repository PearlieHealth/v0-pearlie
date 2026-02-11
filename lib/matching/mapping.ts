// lib/matching/mapping.ts

export const VALUE_TO_TAGS: Record<string, string[]> = {
  "Clear explanations and honest advice": ["clear-explanations", "trusted-local", "second-opinion-friendly"],
  "No pressure or upselling": ["no-pressure", "value-focused"],
  "Experienced with my treatment": [], // handled via treatment + capability tags
  "Calm and reassuring approach (good with anxious patients)": ["calm-care", "good-with-anxious-patients"],
  "Clear pricing before treatment": ["clear-pricing", "value-focused"],
  "Convenient location and availability": ["evenings-weekends", "central-london"], // location handled separately via distance
}

export const BLOCKER_TO_TAGS: Record<string, string[]> = {
  Cost: ["affordable", "value-focused", "clear-pricing", "finance-available"],
  "Monthly payments not available": ["finance-available"],
  "I need more time": ["no-pressure", "second-opinion-friendly", "clear-explanations"],
  "I’m not fully confident yet": ["clear-explanations", "trusted-local", "second-opinion-friendly", "no-pressure"],
  "Fear or anxiety": ["calm-care", "good-with-anxious-patients"],
  "Nothing — I just want the right clinic": ["trusted-local", "clear-explanations"], // “confidence / trust” intent
}

// Treatment interest → required clinic.treatments match + optional capability boost tag
export const TREATMENT_TO_CAPABILITY_TAG: Record<string, string | null> = {
  Invisalign: "invisalign-experienced",
  "Dental Implants": "implants-experienced",
  Implants: "implants-experienced",
  Veneers: "cosmetic-experts",
  "Composite Bonding": "cosmetic-experts",
  "Teeth Whitening": "cosmetic-experts",
  Whitening: "cosmetic-experts",
  "General check-up": "general-dentistry",
  "General Dentistry": "general-dentistry",
}

// Distance buckets (miles) → labels + scoring handled in Step 5
export const DISTANCE_BUCKETS = [
  { maxMiles: 2, label: "Very close" },
  { maxMiles: 5, label: "Close" },
  { maxMiles: 8, label: "Reasonable" },
  { maxMiles: 12, label: "Further" },
  { maxMiles: Number.POSITIVE_INFINITY, label: "Far" },
]

// London MVP expansion rule
export const EXPANSION_THRESHOLD_MILES = 5

// Helper: flatten desired tags from a lead (values + blocker)
export function deriveDesiredTags(input: {
  decision_values?: string[] | null
  conversion_blocker?: string | null
}) {
  const tags = new Set<string>()

  for (const v of input.decision_values ?? []) {
    for (const t of VALUE_TO_TAGS[v] ?? []) tags.add(t)
  }
  if (input.conversion_blocker) {
    for (const t of BLOCKER_TO_TAGS[input.conversion_blocker] ?? []) tags.add(t)
  }

  return Array.from(tags)
}
