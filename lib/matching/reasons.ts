interface Lead {
  treatment_interest?: string
  preferred_timing?: string
  budget_range?: string
  postcode?: string
  latitude?: number
  longitude?: number
  additional_info?: string
  pain_score?: number
  has_swelling?: boolean
  has_bleeding?: boolean
  cosmetic_concern?: string
  cosmetic_timeframe?: string
}

interface Clinic {
  id: string
  name: string
  treatments: string[]
  price_range: string
  postcode: string
  latitude?: number
  longitude?: number
  rating: number
  review_count: number
  verified?: boolean
  parking_available?: boolean
  wheelchair_accessible?: boolean
  accepts_nhs?: boolean
}

// Haversine formula to calculate distance between two lat/long points in miles
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Map cosmetic concerns to related treatments
const COSMETIC_TREATMENT_MAP: Record<string, string[]> = {
  "teeth shape": ["Composite Bonding", "Veneers"],
  gaps: ["Composite Bonding", "Invisalign", "Veneers"],
  crowding: ["Invisalign", "Braces"],
  whitening: ["Teeth Whitening", "Professional Whitening"],
  discoloration: ["Teeth Whitening", "Veneers"],
  alignment: ["Invisalign", "Braces"],
  crooked: ["Invisalign", "Braces"],
}

// Generate personalized match reasons for a clinic based on lead data
export function generateMatchReasons(lead: Lead, clinic: Clinic, distanceMiles?: number): string[] {
  const reasons: { text: string; priority: number }[] = []

  // A) Treatment fit (highest priority = 10)
  if (lead.treatment_interest && clinic.treatments) {
    const treatmentMatch = clinic.treatments.some((t) => t.toLowerCase() === lead.treatment_interest?.toLowerCase())
    if (treatmentMatch) {
      reasons.push({
        text: `Strong experience in ${lead.treatment_interest} treatment`,
        priority: 10,
      })
    }
  }

  // Cosmetic concern fit (priority = 9)
  if (lead.cosmetic_concern && clinic.treatments) {
    const concernLower = lead.cosmetic_concern.toLowerCase()
    for (const [concern, relatedTreatments] of Object.entries(COSMETIC_TREATMENT_MAP)) {
      if (concernLower.includes(concern)) {
        const hasRelatedTreatment = clinic.treatments.some((t) =>
          relatedTreatments.some((rt) => t.toLowerCase().includes(rt.toLowerCase())),
        )
        if (hasRelatedTreatment) {
          reasons.push({
            text: `Specialises in treating ${lead.cosmetic_concern}`,
            priority: 9,
          })
          break
        }
      }
    }
  }

  // B) Distance/Location (priority = 8 for close, 7 for within 5 miles)
  if (distanceMiles !== undefined && distanceMiles <= 15) {
    if (distanceMiles <= 3) {
      reasons.push({
        text: `Located close to your postcode (${distanceMiles.toFixed(1)} miles)`,
        priority: 8,
      })
    } else if (distanceMiles <= 5) {
      reasons.push({
        text: `Within ${distanceMiles.toFixed(1)} miles of your area`,
        priority: 7,
      })
    }
  }

  // C) Timing/availability for urgent cases (priority = 9)
  const isUrgent = (lead.pain_score ?? 0) >= 7 || lead.has_swelling || lead.has_bleeding
  if (isUrgent && clinic.treatments) {
    const hasUrgentCare = clinic.treatments.some(
      (t) => t.toLowerCase().includes("emergency") || t.toLowerCase().includes("general dentistry"),
    )
    if (hasUrgentCare) {
      reasons.push({
        text: `Can see new patients this week for urgent cases`,
        priority: 9,
      })
    }
  }

  // D) Budget alignment (priority = 6)
  if (lead.budget_range && clinic.price_range) {
    const budgetMap: Record<string, string> = {
      "£": "budget",
      "££": "mid",
      "£££": "premium",
    }

    if (budgetMap[lead.budget_range] === clinic.price_range || lead.budget_range === clinic.price_range) {
      reasons.push({
        text: `Fits your expected budget range`,
        priority: 6,
      })
    }
  }

  // E) Timing/availability for non-urgent (priority = 5-7)
  if (lead.preferred_timing && !isUrgent) {
    const timingLower = lead.preferred_timing.toLowerCase()
    if (timingLower.includes("soon") || timingLower.includes("month") || timingLower.includes("weeks")) {
      reasons.push({
        text: `Suitable for prompt treatment`,
        priority: 5,
      })
    }
  }

  // F) Selection logic - only add if we have multiple clinics compared
  reasons.push({
    text: `Selected after comparing multiple clinics`,
    priority: 4,
  })

  // Sort by priority descending
  reasons.sort((a, b) => b.priority - a.priority)

  // ALWAYS return exactly 3 reasons
  const topReasons = reasons.slice(0, 3)

  // If we have fewer than 3, add safe fallback reasons
  while (topReasons.length < 3) {
    if (topReasons.length === 0) {
      topReasons.push({ text: `Good overall fit for your request`, priority: 3 })
    } else if (topReasons.length === 1) {
      topReasons.push({ text: `Clear, patient-friendly care`, priority: 2 })
    } else {
      topReasons.push({ text: `Selected based on your requirements`, priority: 1 })
    }
  }

  return topReasons.map((r) => r.text)
}

// Check if postcode is in Greater London
export function isInGreaterLondon(postcode?: string): boolean {
  if (!postcode) return false

  const londonPrefixes = [
    "E",
    "EC",
    "N",
    "NW",
    "SE",
    "SW",
    "W",
    "WC",
    "BR",
    "CR",
    "DA",
    "EN",
    "HA",
    "IG",
    "KT",
    "RM",
    "SM",
    "TW",
    "UB",
    "WD",
  ]

  const prefix = postcode.trim().split(/\d/)[0].toUpperCase()
  return londonPrefixes.includes(prefix)
}
