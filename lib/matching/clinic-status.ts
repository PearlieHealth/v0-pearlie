/**
 * Canonical clinic status helpers
 * Single source of truth for "is this clinic available for patient matching"
 *
 * RULE: A clinic is "live" (available for matching) if:
 * - is_archived = false (or null/undefined)
 *
 * This is used by:
 * - Matching engine (lib/matching/engine.ts)
 * - Match Readiness / Tag Hygiene (app/admin/tag-hygiene)
 * - Live Flow Test (app/api/admin/live-flow-test)
 * - Pilot Checklist (app/api/admin/pilot-checklist)
 */

import { CANONICAL_TAG_KEYS } from "./tag-schema"

export interface ClinicStatusFields {
  is_archived?: boolean | null
  verified?: boolean | null
  // Filter keys for tag count
  filterKeys?: string[]
}

/**
 * Check if a clinic is "live" (available for patient matching)
 * A clinic is live if it's not archived
 *
 * @param clinic - Clinic object with at least is_archived field
 * @returns true if clinic should appear in patient matching
 */
export function isClinicLive(clinic: { is_archived?: boolean | null }): boolean {
  // "Active" in Clinic Directory = not archived = live for matching
  return clinic.is_archived !== true
}

/**
 * Check if a clinic is verified (partner with confirmed details)
 * Verified clinics appear in primary match results.
 * Non-verified clinics only appear in "Load more" as directory listings.
 *
 * @param clinic - Clinic object with verified field
 * @returns true if clinic is a verified partner
 */
export function isClinicVerified(clinic: { verified?: boolean | null }): boolean {
  return clinic.verified === true
}

/**
 * Get the Supabase filter for fetching live clinics
 * Use this in all queries that need to fetch live clinics
 *
 * Returns the field and value to use in .eq() or .neq()
 */
export function getLiveClinicFilter(): { field: "is_archived"; value: false } {
  return { field: "is_archived", value: false }
}

/**
 * Minimum number of matching tags for a clinic to be "matchable"
 * Clinics with fewer tags are excluded from patient results
 */
export const MIN_MATCHING_TAGS = 3

/**
 * Check if a clinic has enough matching tags to be "matchable"
 * NOT_MATCHABLE clinics are excluded from patient results entirely
 *
 * @param filterKeys - Array of tag keys assigned to the clinic
 * @returns true if clinic has enough tags to generate reasons
 */
export function isClinicMatchable(filterKeys: string[]): boolean {
  const matchingTags = (filterKeys || []).filter(
    (key) => key && key.startsWith("TAG_") && CANONICAL_TAG_KEYS.includes(key),
  )
  return matchingTags.length >= MIN_MATCHING_TAGS
}

/**
 * Get the count of canonical matching tags for a clinic
 *
 * @param filterKeys - Array of tag keys assigned to the clinic
 * @returns Number of valid matching tags
 */
export function getMatchingTagCount(filterKeys: string[]): number {
  return (filterKeys || []).filter((key) => key && key.startsWith("TAG_") && CANONICAL_TAG_KEYS.includes(key)).length
}

/**
 * Determine clinic match readiness status based on tag count
 *
 * @param tagCount - Number of matching tags
 * @returns Status string: NOT_MATCHABLE, WEAK, or OK
 */
export function getClinicMatchStatus(tagCount: number): "NOT_MATCHABLE" | "WEAK" | "OK" {
  if (tagCount < 3) return "NOT_MATCHABLE"
  if (tagCount < 6) return "WEAK"
  return "OK"
}

/**
 * Full clinic status check combining live + matchable + verified
 *
 * @param clinic - Clinic object with status fields
 * @returns Object with live, matchable, verified, and tagCount
 */
export function getClinicStatus(clinic: ClinicStatusFields): {
  isLive: boolean
  isMatchable: boolean
  isVerified: boolean
  tagCount: number
  status: "NOT_MATCHABLE" | "WEAK" | "OK"
} {
  const isLive = isClinicLive(clinic)
  const isVerified = isClinicVerified(clinic)
  const tagCount = getMatchingTagCount(clinic.filterKeys || [])
  const isMatchable = tagCount >= MIN_MATCHING_TAGS
  const status = getClinicMatchStatus(tagCount)

  return { isLive, isMatchable, isVerified, tagCount, status }
}
