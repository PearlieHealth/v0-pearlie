import type { LeadAnswer, ClinicProfile } from "./contract"
import { MATCHING_CONTRACT_VERSION } from "./contract"

/**
 * Normalize lead data from database row with defaults
 * Handles missing fields, type coercion, and backwards compatibility
 */
export function normalizeLead(leadRow: any): LeadAnswer {
  const rawPriorities = leadRow.decision_values || leadRow.priorities || []
  const priorities = Array.isArray(rawPriorities)
    ? rawPriorities
    : typeof rawPriorities === "string"
      ? rawPriorities.split(",").filter(Boolean)
      : []

  const rawAnswers = leadRow.raw_answers || {}

  // Resolve blocker codes — prefer the dedicated array column, then raw_answers, then legacy single fields
  const rawBlockerCodes = leadRow.conversion_blocker_codes || rawAnswers.blocker || null
  const rawBlockerFallback = leadRow.blocker || leadRow.conversion_blocker || null
  const blockerCodes: string[] = Array.isArray(rawBlockerCodes)
    ? rawBlockerCodes
    : rawBlockerCodes
      ? [rawBlockerCodes]
      : Array.isArray(rawBlockerFallback)
        ? rawBlockerFallback
        : rawBlockerFallback
          ? [rawBlockerFallback]
          : []

  // Resolve cost approach — prefer dedicated column, then raw_answers
  const costApproach = leadRow.cost_approach || rawAnswers.cost_approach || null
  const strictBudgetMax = leadRow.strict_budget_amount || rawAnswers.strict_budget_amount || null

  return {
    id: leadRow.id,
    treatment: leadRow.treatment_interest || leadRow.treatment || "",
    postcode: leadRow.postcode || "",
    latitude: leadRow.latitude ? Number(leadRow.latitude) : undefined,
    longitude: leadRow.longitude ? Number(leadRow.longitude) : undefined,
    city: leadRow.city || undefined,
    locationPreference: leadRow.location_preference || leadRow.locationPreference || null,
    priorities,
    anxietyLevel: leadRow.anxiety_level || leadRow.anxietyLevel || null,
    budgetRange: leadRow.budget_range || leadRow.budgetRange || "unspecified",
    costApproach,
    strictBudgetMax,
    timingPreference: leadRow.preferred_timing || leadRow.timing_preference || leadRow.timingPreference || "flexible",
    preferred_times: Array.isArray(leadRow.preferred_times) ? leadRow.preferred_times : [],
    email: leadRow.email || "",
    phone: leadRow.phone || null,
    schemaVersion: leadRow.schema_version || 1,
    conversionBlocker: leadRow.conversion_blocker || leadRow.conversionBlocker || null,
    blockerCode: blockerCodes[0] || null, // Legacy single code support
    blockerCodes, // New array field for multiple blockers
    outcomePriority: leadRow.outcome_priority || leadRow.outcomePriority || null,
    outcomePriorityKey: leadRow.outcome_priority_key || leadRow.outcomePriorityKey || null,
  }
}

/**
 * Derive available_days from opening_hours object
 * Maps day names (monday, tuesday, ...) to short codes (mon, tue, ...)
 * Only includes days that are not marked as closed
 */
function deriveAvailableDays(openingHours: Record<string, any>): string[] | null {
  if (!openingHours || typeof openingHours !== "object") return null

  const dayMap: Record<string, string> = {
    monday: "mon",
    tuesday: "tue",
    wednesday: "wed",
    thursday: "thu",
    friday: "fri",
    saturday: "sat",
    sunday: "sun",
  }

  const days: string[] = []
  for (const [dayName, shortCode] of Object.entries(dayMap)) {
    const dayInfo = openingHours[dayName]
    if (dayInfo && !dayInfo.closed) {
      days.push(shortCode)
    }
  }

  return days.length > 0 ? days : null
}

/**
 * Normalize clinic data from database row
 */
export function normalizeClinic(clinicRow: any, filterKeys: string[] = []): ClinicProfile {
  const openingHours = clinicRow.opening_hours || null

  // Derive available_days from opening_hours if present, otherwise use dedicated column or default
  const derivedDays = deriveAvailableDays(openingHours)
  const available_days = derivedDays
    || (Array.isArray(clinicRow.available_days) ? clinicRow.available_days : ["mon", "tue", "wed", "thu", "fri"])

  return {
    id: clinicRow.id,
    name: clinicRow.name || "",
    postcode: clinicRow.postcode || "",
    latitude: clinicRow.latitude ? Number(clinicRow.latitude) : undefined,
    longitude: clinicRow.longitude ? Number(clinicRow.longitude) : undefined,
    priceRange: clinicRow.price_range || clinicRow.priceRange || null,
    financeAvailable: clinicRow.finance_available ?? clinicRow.financeAvailable ?? false,
    verified: clinicRow.verified ?? false,
    rating: clinicRow.rating ? Number(clinicRow.rating) : undefined,
    reviewCount: clinicRow.review_count || clinicRow.reviews_count || clinicRow.reviewCount || 0,
    treatments: Array.isArray(clinicRow.treatments) ? clinicRow.treatments : [],
    tags: Array.isArray(clinicRow.tags) ? clinicRow.tags : [],
    filterKeys: filterKeys.length > 0 ? filterKeys : clinicRow.filter_keys || clinicRow.filterKeys || [],
    available_days,
    available_hours: Array.isArray(clinicRow.available_hours) ? clinicRow.available_hours : ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
    accepts_same_day: clinicRow.accepts_same_day ?? false,
    accepts_urgent: clinicRow.accepts_urgent ?? false,
    opening_hours: openingHours,
  }
}

/**
 * Get contract version string
 */
export function getContractVersion(): string {
  return MATCHING_CONTRACT_VERSION
}
