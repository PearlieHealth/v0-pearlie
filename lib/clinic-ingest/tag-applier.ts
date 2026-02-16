/**
 * Tag Applier - Safely applies AI-extracted tags to clinics
 * 
 * STRICT RULES:
 * - Only apply tags with confidence >= 0.65
 * - NEVER remove existing manual tags
 * - Mark auto-tags as source = "ai_website"
 * - Store evidence_snippets for audit
 * - Admin must review and accept tags before final save
 */

import { createAdminClient } from "@/lib/supabase/admin"
import type { ClinicSignalOutput, AllowedExtractionTag } from "./website-reader"
import { CANONICAL_TAG_KEYS } from "@/lib/matching/tag-schema"

export const CONFIDENCE_THRESHOLD = 0.65

export interface TagSuggestion {
  tag: AllowedExtractionTag
  confidence: number
  evidence: string
  matchSentence: string
  accepted: boolean
}

export interface TagApplicationResult {
  success: boolean
  appliedTags: string[]
  skippedTags: string[]
  error?: string
}

/**
 * Filter suggestions to only those meeting confidence threshold
 * and matching canonical tags
 */
export function filterValidSuggestions(
  signals: ClinicSignalOutput,
  confidenceThreshold = CONFIDENCE_THRESHOLD
): TagSuggestion[] {
  const suggestions: TagSuggestion[] = []
  
  for (const tag of signals.matched_tags) {
    const confidence = signals.confidence[tag]
    
    // Skip if below threshold
    if (!confidence || confidence < confidenceThreshold) continue
    
    // Verify tag is canonical
    if (!CANONICAL_TAG_KEYS.includes(tag)) {
      console.warn(`[tag-applier] Skipping non-canonical tag: ${tag}`)
      continue
    }
    
    suggestions.push({
      tag,
      confidence,
      evidence: signals.evidence_snippets[tag] || "",
      matchSentence: signals.suggested_match_sentences[tag] || "",
      accepted: false, // Default to not accepted - admin must review
    })
  }
  
  // Sort by confidence descending
  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Get existing manual tags for a clinic
 */
export async function getExistingTags(clinicId: string): Promise<{
  manualTags: string[]
  aiTags: string[]
}> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from("clinic_filter_selections")
    .select("filter_key, source")
    .eq("clinic_id", clinicId)
  
  if (error) {
    console.error("[tag-applier] Error fetching existing tags:", error)
    return { manualTags: [], aiTags: [] }
  }
  
  const manualTags: string[] = []
  const aiTags: string[] = []
  
  for (const row of data || []) {
    if (row.source === "ai_website") {
      aiTags.push(row.filter_key)
    } else {
      manualTags.push(row.filter_key)
    }
  }
  
  return { manualTags, aiTags }
}

/**
 * Apply accepted tags to a clinic
 * - Only applies tags that admin has accepted
 * - Never removes existing manual tags
 * - Stores source and evidence for audit
 */
export async function applyAcceptedTags(
  clinicId: string,
  acceptedSuggestions: TagSuggestion[]
): Promise<TagApplicationResult> {
  if (acceptedSuggestions.length === 0) {
    return {
      success: true,
      appliedTags: [],
      skippedTags: [],
    }
  }
  
  const supabase = createAdminClient()
  
  try {
    // Get existing tags to avoid duplicates
    const { manualTags, aiTags } = await getExistingTags(clinicId)
    const existingTagSet = new Set([...manualTags, ...aiTags])
    
    const toApply: TagSuggestion[] = []
    const skipped: string[] = []
    
    for (const suggestion of acceptedSuggestions) {
      if (!suggestion.accepted) {
        skipped.push(suggestion.tag)
        continue
      }
      
      // Skip if already exists
      if (existingTagSet.has(suggestion.tag)) {
        skipped.push(suggestion.tag)
        continue
      }
      
      toApply.push(suggestion)
    }
    
    if (toApply.length === 0) {
      return {
        success: true,
        appliedTags: [],
        skippedTags: skipped,
      }
    }
    
    // Insert new AI tags
    const insertData = toApply.map(s => ({
      clinic_id: clinicId,
      filter_key: s.tag,
      source: "ai_website",
      evidence: s.evidence,
    }))
    
    const { error } = await supabase
      .from("clinic_filter_selections")
      .insert(insertData)
    
    if (error) throw error
    
    // Log the application for audit
    await logTagApplication(clinicId, toApply)
    
    return {
      success: true,
      appliedTags: toApply.map(s => s.tag),
      skippedTags: skipped,
    }
  } catch (error) {
    console.error("[tag-applier] Error applying tags:", error)
    return {
      success: false,
      appliedTags: [],
      skippedTags: [],
      error: error instanceof Error ? error.message : "Failed to apply tags",
    }
  }
}

/**
 * Log tag application for audit trail
 */
async function logTagApplication(
  clinicId: string,
  appliedTags: TagSuggestion[]
): Promise<void> {
  const supabase = createAdminClient()
  
  try {
    await supabase.from("clinic_audit_log").insert({
      action: "ai_tags_applied",
      entity_type: "clinic",
      entity_id: clinicId,
      details: {
        tags: appliedTags.map(t => ({
          tag: t.tag,
          confidence: t.confidence,
          evidence: t.evidence,
        })),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[tag-applier] Error logging tag application:", error)
  }
}

/**
 * Apply extracted tags from website analysis
 * Tags are inserted with source='ai_website' for admin review
 * Returns counts of added vs skipped tags
 */
export async function applyExtractedTags(
  clinicId: string,
  signals: ClinicSignalOutput,
  supabase?: ReturnType<typeof createAdminClient>
): Promise<{
  added: string[]
  skipped: string[]
  errors: string[]
}> {
  const client = supabase || createAdminClient()
  const added: string[] = []
  const skipped: string[] = []
  const errors: string[] = []

  try {
    // Get existing tags to avoid duplicates
    const { manualTags, aiTags } = await getExistingTags(clinicId)
    const existingTagSet = new Set([...manualTags, ...aiTags])

    // Filter to valid suggestions above threshold
    const validSuggestions = filterValidSuggestions(signals)

    for (const suggestion of validSuggestions) {
      // Skip if already exists
      if (existingTagSet.has(suggestion.tag)) {
        skipped.push(suggestion.tag)
        continue
      }

      try {
        const { error } = await client
          .from("clinic_filter_selections")
          .insert({
            clinic_id: clinicId,
            filter_key: suggestion.tag,
            source: "ai_website",
            evidence: suggestion.evidence,
          })

        if (error) {
          if (error.code === "23505") {
            // Unique constraint violation - already exists
            skipped.push(suggestion.tag)
          } else {
            errors.push(`${suggestion.tag}: ${error.message}`)
          }
        } else {
          added.push(suggestion.tag)
          existingTagSet.add(suggestion.tag) // Track to avoid duplicates
        }
      } catch (err) {
        errors.push(`${suggestion.tag}: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    }

    // Log the extraction for audit
    if (added.length > 0) {
      try {
        await client.from("clinic_audit_log").insert({
          action: "ai_tags_extracted",
          entity_type: "clinic",
          entity_id: clinicId,
          details: {
            added,
            skipped,
            timestamp: new Date().toISOString(),
          },
        })
      } catch {
        // Don't fail on audit log error
      }
    }

  } catch (error) {
    console.error("[tag-applier] Error applying extracted tags:", error)
    errors.push(error instanceof Error ? error.message : "Unknown error")
  }

  return { added, skipped, errors }
}

/**
 * Log failed ingest attempt
 */
export async function logIngestFailure(
  clinicId: string,
  url: string,
  reason: string
): Promise<void> {
  const supabase = createAdminClient()
  
  try {
    await supabase.from("clinic_audit_log").insert({
      action: "clinic_ingest_failed",
      entity_type: "clinic",
      entity_id: clinicId,
      details: {
        url,
        reason,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[tag-applier] Error logging ingest failure:", error)
  }
}

/**
 * Remove AI-generated tags (admin action only)
 * Manual tags are never affected
 */
export async function removeAiTags(
  clinicId: string,
  tagsToRemove: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()
  
  try {
    const { error } = await supabase
      .from("clinic_filter_selections")
      .delete()
      .eq("clinic_id", clinicId)
      .eq("source", "ai_website")
      .in("filter_key", tagsToRemove)
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error("[tag-applier] Error removing AI tags:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove tags",
    }
  }
}
