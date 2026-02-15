/**
 * ReasonComposer: Transforms match tags into human-readable sentences
 * 
 * This module takes the existing match results (tags, weights) and composes
 * 2-4 natural language sentences for the "Why this clinic matches you" section.
 * 
 * IMPORTANT: This does NOT change scoring, ranking, or tag selection.
 * It only transforms the already-selected tags into readable sentences.
 */

import reasonLibrary from "./reasonLibrary.json"
import type { MatchReason, MatchFacts } from "./contract"

export interface ComposedReasons {
  bullets: string[]           // 2-4 short sentences for card display
  longBullets?: string[]      // Extended explanations for clinic page
  tagsUsed: string[]          // Tag IDs that contributed
  templatesUsed: string[]     // Template IDs for analytics/debug
  confidence: number          // 0-1 based on tag match quality
}

interface ReasonCategory {
  label: string
  tagKeys: string[]
  variants?: string[]
  shortVariants?: string[]
  longVariants?: string[]
}

// Simple hash function for deterministic variant selection
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// Get deterministic variant index based on patient + clinic + category
function getVariantIndex(patientId: string, clinicId: string, categoryKey: string, variantCount: number): number {
  const seed = `${patientId}_${clinicId}_${categoryKey}`
  return simpleHash(seed) % variantCount
}

// Map tag keys to their category in the library
function findCategoryForTag(tagKey: string): { categoryKey: string; category: ReasonCategory } | null {
  const categories = reasonLibrary.categories as Record<string, ReasonCategory>
  
  for (const [categoryKey, category] of Object.entries(categories)) {
    if (category.tagKeys.includes(tagKey)) {
      return { categoryKey, category }
    }
  }
  return null
}

/**
 * Compose human-readable reason sentences from match facts
 * 
 * @param patientId - For deterministic variant selection
 * @param clinicId - For deterministic variant selection
 * @param matchReasons - The existing MatchReason array from reasons-engine
 * @param matchFacts - Optional: full match facts for treatment name substitution
 * @returns ComposedReasons with bullets array
 */
export function composeReasonSentences(
  patientId: string,
  clinicId: string,
  matchReasons: MatchReason[],
  matchFacts?: MatchFacts
): ComposedReasons {
  const bullets: string[] = []
  const longBullets: string[] = []
  const tagsUsed: string[] = []
  const templatesUsed: string[] = []
  const usedCategories = new Set<string>()
  
  // Detect if this is an emergency match (emergency reasons have EMERGENCY_ tagKeys)
  const isEmergency = matchReasons.some(r => r.tagKey?.startsWith("EMERGENCY_"))
  const maxBullets = isEmergency ? 2 : 3

  // Sort reasons by weight (highest first)
  const sortedReasons = [...matchReasons].sort((a, b) => (b.weight || 0) - (a.weight || 0))

  // Take top contributing tags (excluding fallbacks first)
  const primaryReasons = sortedReasons.filter(r => !r.isFallback).slice(0, 4)

  for (const reason of primaryReasons) {
    if (bullets.length >= maxBullets) break
    
    const tagKey = reason.tagKey
    if (!tagKey) continue
    
    // Skip if this is a fallback and we already have enough
    if (reason.isFallback && bullets.length >= (isEmergency ? 1 : 2)) continue
    
    // Find the category for this tag
    const categoryMatch = findCategoryForTag(tagKey)
    
    if (categoryMatch && !usedCategories.has(categoryMatch.categoryKey)) {
      const { categoryKey, category } = categoryMatch
      
      // Use shortVariants for card display, fall back to variants for backwards compat
      const shortPool = category.shortVariants || category.variants || []
      const longPool = category.longVariants || category.variants || []
      
      if (shortPool.length === 0) continue
      
      // Get deterministic variant index
      const variantIndex = getVariantIndex(patientId, clinicId, categoryKey, shortPool.length)
      const longIndex = longPool.length > 0 ? variantIndex % longPool.length : 0
      
      let shortSentence = shortPool[variantIndex]
      let longSentence = longPool[longIndex] || shortSentence
      
      // Handle treatment name substitution
      if ((categoryKey === "treatment_match" || categoryKey === "specialist_experience") && matchFacts?.treatmentMatch?.requested) {
        shortSentence = shortSentence.replace(/{treatment}/g, matchFacts.treatmentMatch.requested)
        longSentence = longSentence.replace(/{treatment}/g, matchFacts.treatmentMatch.requested)
      }

      bullets.push(shortSentence)
      longBullets.push(longSentence)
      tagsUsed.push(tagKey)
      templatesUsed.push(`${categoryKey}_${variantIndex}`)
      usedCategories.add(categoryKey)
    } else if (!categoryMatch && reason.text) {
      // For emergency/custom tags with no category in library, use the reason text directly
      if (!bullets.includes(reason.text)) {
        bullets.push(reason.text)
        longBullets.push(reason.text)
        tagsUsed.push(tagKey)
        templatesUsed.push(`direct_${tagKey}`)
      }
    }
  }

  // If we still need more sentences, use fallback reasons
  const minBullets = isEmergency ? 2 : 2
  if (bullets.length < minBullets) {
    const fallbackReasons = sortedReasons.filter(r => r.isFallback)
    for (const reason of fallbackReasons) {
      if (bullets.length >= 2) break
      
      const tagKey = reason.tagKey
      if (!tagKey || tagsUsed.includes(tagKey)) continue
      
      // Use the original reason text as fallback
      if (reason.text && !bullets.includes(reason.text)) {
        bullets.push(reason.text)
        longBullets.push(reason.text) // Ensure longBullets is also populated
        tagsUsed.push(tagKey)
        templatesUsed.push(`fallback_${tagKey}`)
      }
    }
  }
  
  // Ensure minimum sentences using library fallbacks
  const minRequired = isEmergency ? 2 : 2
  if (bullets.length < minRequired) {
    const fallbackSentences = reasonLibrary.fallbackSentences as string[]
    const neededCount = minRequired - bullets.length

    for (let i = 0; i < neededCount && i < fallbackSentences.length; i++) {
      const index = getVariantIndex(patientId, clinicId, `fallback_${i}`, fallbackSentences.length)
      bullets.push(fallbackSentences[index])
      longBullets.push(fallbackSentences[index])
      templatesUsed.push(`library_fallback_${index}`)
    }
  }
  
  // NOTE: Closing sentences removed - they were too generic and the same across clinics
  // Each clinic should differentiate on specific matching reasons, not generic platitudes
  
  // Calculate confidence based on non-fallback reasons
  const nonFallbackCount = matchReasons.filter(r => !r.isFallback).length
  const confidence = Math.min(1, nonFallbackCount / 3)
  
  return {
    bullets,
    longBullets,
    tagsUsed,
    templatesUsed,
    confidence
  }
}

/**
 * Compose reasons for multiple clinics ensuring no repetition
 * This is the preferred method when processing a batch of matches
 */
export function composeReasonsForMultipleClinics(
  patientId: string,
  clinics: Array<{
    clinicId: string
    matchReasons: MatchReason[]
    matchFacts?: MatchFacts
  }>
): Map<string, ComposedReasons> {
  const results = new Map<string, ComposedReasons>()
  const usedVariants = new Map<string, Set<number>>() // categoryKey -> used variant indices
  
  for (const clinic of clinics) {
    const composed = composeReasonSentencesWithTracking(
      patientId,
      clinic.clinicId,
      clinic.matchReasons,
      clinic.matchFacts,
      usedVariants
    )
    results.set(clinic.clinicId, composed)
  }
  
  return results
}

/**
 * Internal: Compose with variant tracking to avoid repetition
 */
function composeReasonSentencesWithTracking(
  patientId: string,
  clinicId: string,
  matchReasons: MatchReason[],
  matchFacts: MatchFacts | undefined,
  usedVariants: Map<string, Set<number>>
): ComposedReasons {
  const bullets: string[] = []
  const longBullets: string[] = []
  const tagsUsed: string[] = []
  const templatesUsed: string[] = []
  const usedCategories = new Set<string>()
  
  // Detect emergency mode
  const isEmergency = matchReasons.some(r => r.tagKey?.startsWith("EMERGENCY_"))
  const maxBullets = isEmergency ? 2 : 3

  // Sort reasons by weight (highest first)
  const sortedReasons = [...matchReasons].sort((a, b) => (b.weight || 0) - (a.weight || 0))

  // Take top contributing tags (excluding fallbacks first)
  const primaryReasons = sortedReasons.filter(r => !r.isFallback).slice(0, 4)

  for (const reason of primaryReasons) {
    if (bullets.length >= maxBullets) break

    const tagKey = reason.tagKey
    if (!tagKey) continue
    if (reason.isFallback && bullets.length >= (isEmergency ? 1 : 2)) continue

    const categoryMatch = findCategoryForTag(tagKey)

    if (categoryMatch && !usedCategories.has(categoryMatch.categoryKey)) {
      const { categoryKey, category } = categoryMatch

      const shortPool = category.shortVariants || category.variants || []
      const longPool = category.longVariants || category.variants || []

      if (shortPool.length === 0) continue

      if (!usedVariants.has(categoryKey)) {
        usedVariants.set(categoryKey, new Set())
      }
      const usedIndices = usedVariants.get(categoryKey)!

      let variantIndex = getVariantIndex(patientId, clinicId, categoryKey, shortPool.length)
      let attempts = 0

      while (usedIndices.has(variantIndex) && attempts < shortPool.length) {
        variantIndex = (variantIndex + 1) % shortPool.length
        attempts++
      }

      usedIndices.add(variantIndex)

      const longIndex = longPool.length > 0 ? variantIndex % longPool.length : 0
      let shortSentence = shortPool[variantIndex]
      let longSentence = longPool[longIndex] || shortSentence

      // Handle treatment name substitution
      if ((categoryKey === "treatment_match" || categoryKey === "specialist_experience") && matchFacts?.treatmentMatch?.requested) {
        shortSentence = shortSentence.replace(/{treatment}/g, matchFacts.treatmentMatch.requested)
        longSentence = longSentence.replace(/{treatment}/g, matchFacts.treatmentMatch.requested)
      }

      bullets.push(shortSentence)
      longBullets.push(longSentence)
      tagsUsed.push(tagKey)
      templatesUsed.push(`${categoryKey}_v${variantIndex}`)
      usedCategories.add(categoryKey)
    } else if (!categoryMatch && reason.text) {
      // For emergency/custom tags not in library, use reason text directly
      if (!bullets.includes(reason.text)) {
        bullets.push(reason.text)
        longBullets.push(reason.text)
        tagsUsed.push(tagKey)
        templatesUsed.push(`direct_${tagKey}`)
      }
    }
  }
  
  // Fallback handling
  if (bullets.length < 2) {
    const fallbackSentences = reasonLibrary.fallbackSentences as string[]
    
    if (!usedVariants.has("fallback")) {
      usedVariants.set("fallback", new Set())
    }
    const usedFallbacks = usedVariants.get("fallback")!
    
    while (bullets.length < 2 && usedFallbacks.size < fallbackSentences.length) {
      let index = getVariantIndex(patientId, clinicId, `fb_${bullets.length}`, fallbackSentences.length)
      let attempts = 0
      
      while (usedFallbacks.has(index) && attempts < fallbackSentences.length) {
        index = (index + 1) % fallbackSentences.length
        attempts++
      }
      
      usedFallbacks.add(index)
      bullets.push(fallbackSentences[index])
      longBullets.push(fallbackSentences[index]) // Ensure longBullets is also populated
      templatesUsed.push(`fallback_v${index}`)
    }
  }
  
  const nonFallbackCount = matchReasons.filter(r => !r.isFallback).length
  const confidence = Math.min(1, nonFallbackCount / 3)
  
  return { bullets, longBullets, tagsUsed, templatesUsed, confidence }
}

/**
 * Compose reasons from raw match data (simpler interface)
 * Used when you have tag arrays but not full MatchReason objects
 */
export function composeReasonsFromTags(
  patientId: string,
  clinicId: string,
  tags: string[],
  treatmentName?: string
): ComposedReasons {
  // Convert tags to MatchReason-like objects
  const mockReasons: MatchReason[] = tags.map((tag, index) => ({
    key: `${tag}_${clinicId}`,
    text: tag,
    category: "priorities" as const,
    weight: 1 - (index * 0.1), // Decreasing weight by position
    tagKey: tag,
    isFallback: tag.startsWith("FALLBACK_")
  }))
  
  const mockFacts: Partial<MatchFacts> = {
    treatmentMatch: treatmentName ? {
      requested: treatmentName,
      clinicOffers: true,
      matchedTreatments: [treatmentName],
      treatmentCategory: "cosmetic" as const,
    } : undefined
  }
  
  return composeReasonSentences(patientId, clinicId, mockReasons, mockFacts as MatchFacts)
}

/**
 * Get sentence variants for a specific category (for admin preview)
 */
export function getCategoryVariants(categoryKey: string): string[] {
  const categories = reasonLibrary.categories as Record<string, ReasonCategory>
  return categories[categoryKey]?.variants || []
}

/**
 * Get all available categories (for admin UI)
 */
export function getAllCategories(): Array<{ key: string; label: string; tagKeys: string[] }> {
  const categories = reasonLibrary.categories as Record<string, ReasonCategory>
  return Object.entries(categories).map(([key, cat]) => ({
    key,
    label: cat.label,
    tagKeys: cat.tagKeys
  }))
}
