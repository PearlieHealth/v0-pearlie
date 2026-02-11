/**
 * Treatment Value Map for Revenue Estimation
 * 
 * These values represent typical UK private dental treatment costs.
 * Used to estimate revenue opportunity when a lead submits their requirements.
 */

export interface TreatmentValue {
  minPence: number
  maxPence: number
  midPence: number
}

// Values in pence (multiply by 100 from pounds)
export const TREATMENT_VALUES: Record<string, TreatmentValue> = {
  // General Dentistry
  "checkup": { minPence: 5000, maxPence: 15000, midPence: 10000 },
  "cleaning": { minPence: 5000, maxPence: 15000, midPence: 10000 },
  "filling": { minPence: 8000, maxPence: 25000, midPence: 15000 },
  "extraction": { minPence: 10000, maxPence: 30000, midPence: 20000 },
  "root_canal": { minPence: 30000, maxPence: 80000, midPence: 55000 },
  
  // Cosmetic Dentistry
  "teeth_whitening": { minPence: 20000, maxPence: 60000, midPence: 40000 },
  "whitening": { minPence: 20000, maxPence: 60000, midPence: 40000 },
  "veneers": { minPence: 40000, maxPence: 100000, midPence: 70000 },
  "bonding": { minPence: 15000, maxPence: 40000, midPence: 27500 },
  "composite_bonding": { minPence: 15000, maxPence: 40000, midPence: 27500 },
  
  // Orthodontics
  "braces": { minPence: 200000, maxPence: 600000, midPence: 400000 },
  "invisalign": { minPence: 250000, maxPence: 550000, midPence: 400000 },
  "aligners": { minPence: 200000, maxPence: 500000, midPence: 350000 },
  "retainers": { minPence: 10000, maxPence: 30000, midPence: 20000 },
  
  // Implants & Restorative
  "implant": { minPence: 200000, maxPence: 400000, midPence: 300000 },
  "implants": { minPence: 200000, maxPence: 400000, midPence: 300000 },
  "dental_implant": { minPence: 200000, maxPence: 400000, midPence: 300000 },
  "crown": { minPence: 40000, maxPence: 100000, midPence: 70000 },
  "bridge": { minPence: 60000, maxPence: 150000, midPence: 105000 },
  "dentures": { minPence: 50000, maxPence: 200000, midPence: 125000 },
  
  // Emergency
  "emergency": { minPence: 10000, maxPence: 30000, midPence: 20000 },
  "pain": { minPence: 10000, maxPence: 30000, midPence: 20000 },
  "toothache": { minPence: 10000, maxPence: 30000, midPence: 20000 },
  
  // Periodontal
  "gum_treatment": { minPence: 20000, maxPence: 80000, midPence: 50000 },
  "deep_cleaning": { minPence: 15000, maxPence: 40000, midPence: 27500 },
  "periodontal": { minPence: 30000, maxPence: 100000, midPence: 65000 },
  
  // Default fallback
  "general": { minPence: 10000, maxPence: 50000, midPence: 30000 },
  "other": { minPence: 10000, maxPence: 50000, midPence: 30000 },
}

/**
 * Get treatment value estimate from treatment name/type
 */
export function getTreatmentValue(treatment: string): TreatmentValue {
  const normalized = treatment.toLowerCase().replace(/[^a-z_]/g, "_")
  
  // Try exact match first
  if (TREATMENT_VALUES[normalized]) {
    return TREATMENT_VALUES[normalized]
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(TREATMENT_VALUES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value
    }
  }
  
  // Return default
  return TREATMENT_VALUES.general
}

/**
 * Calculate total revenue estimate from multiple treatments
 */
export function calculateRevenueEstimate(treatments: string[]): TreatmentValue {
  if (!treatments || treatments.length === 0) {
    return TREATMENT_VALUES.general
  }
  
  let totalMin = 0
  let totalMax = 0
  let totalMid = 0
  
  for (const treatment of treatments) {
    const value = getTreatmentValue(treatment)
    totalMin += value.minPence
    totalMax += value.maxPence
    totalMid += value.midPence
  }
  
  return {
    minPence: totalMin,
    maxPence: totalMax,
    midPence: totalMid,
  }
}

/**
 * Get the primary (highest value) treatment from a list
 */
export function getPrimaryTreatment(treatments: string[]): string {
  if (!treatments || treatments.length === 0) {
    return "general"
  }
  
  let maxValue = 0
  let primaryTreatment = treatments[0]
  
  for (const treatment of treatments) {
    const value = getTreatmentValue(treatment)
    if (value.midPence > maxValue) {
      maxValue = value.midPence
      primaryTreatment = treatment
    }
  }
  
  return primaryTreatment
}
