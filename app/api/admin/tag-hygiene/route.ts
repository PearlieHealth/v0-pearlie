import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { REASON_TEMPLATES, PROFILE_HIGHLIGHT_TAGS, isMatchingTag } from "@/lib/matching/tag-schema"
import { verifyAdminAuth } from "@/lib/admin-auth"

// All canonical tags that are allowed
const CANONICAL_MATCHING_TAGS = Object.keys(REASON_TEMPLATES)
const CANONICAL_TAGS = new Set([...CANONICAL_MATCHING_TAGS, ...PROFILE_HIGHLIGHT_TAGS])

const Q4_TAGS = [
  "TAG_CLEAR_EXPLANATIONS",
  "TAG_LISTENED_TO_RESPECTED",
  "TAG_CALM_REASSURING",
  "TAG_CLEAR_PRICING_UPFRONT",
  "TAG_FLEXIBLE_APPOINTMENTS",
  "TAG_SPECIALIST_LEVEL_EXPERIENCE",
  "TAG_STRONG_REPUTATION_REVIEWS",
]

const Q8_TAGS = [
  "TAG_DISCUSS_OPTIONS_BEFORE_COST",
  "TAG_MONTHLY_PAYMENTS_PREFERRED",
  "TAG_FLEXIBLE_BUDGET_OK",
  "TAG_STRICT_BUDGET_SUPPORTIVE",
]

// Minimum thresholds
const MIN_MATCHING_TAGS_FOR_OK = 6
const MIN_MATCHING_TAGS_FOR_WEAK = 1

export type MatchableStatus = "NOT_MATCHABLE" | "WEAK" | "OK"

export interface ClinicTagData {
  clinicId: string
  clinicName: string
  tags: string[]
  invalidTags: string[]
  validTags: string[]
  matchingTagCount: number
  highlightTagCount: number
  status: MatchableStatus
  missingCategories: string[]
  treatments: string[]
  isArchived: boolean
}

export async function GET() {
  const auth = await verifyAdminAuth()
  if (!auth.authenticated) return auth.response

  try {
    const supabase = await createClient()

    const { data: clinics, error: clinicsError } = await supabase
      .from("clinics")
      .select("id, name, treatments, is_archived")
      .order("name")

    if (clinicsError) throw clinicsError

    const { data: selections, error: selectionsError } = await supabase
      .from("clinic_filter_selections")
      .select("clinic_id, filter_key")

    if (selectionsError) throw selectionsError

    const clinicTagMap = new Map<string, string[]>()
    for (const selection of selections || []) {
      const existing = clinicTagMap.get(selection.clinic_id) || []
      existing.push(selection.filter_key)
      clinicTagMap.set(selection.clinic_id, existing)
    }

    const clinicData: ClinicTagData[] = (clinics || []).map((clinic) => {
      const tags = clinicTagMap.get(clinic.id) || []
      const invalidTags = tags.filter((tag) => !CANONICAL_TAGS.has(tag))
      const validTags = tags.filter((tag) => CANONICAL_TAGS.has(tag))
      const matchingTags = validTags.filter((tag) => isMatchingTag(tag))
      const highlightTags = validTags.filter((tag) => tag.startsWith("HIGHLIGHT_"))

      const missingCategories: string[] = []
      const hasQ4Tag = matchingTags.some((tag) => Q4_TAGS.includes(tag))
      const hasQ8Tag = matchingTags.some((tag) => Q8_TAGS.includes(tag))
      const hasTreatments = Array.isArray(clinic.treatments) && clinic.treatments.length > 0

      if (!hasQ4Tag) missingCategories.push("Q4 (What matters most)")
      if (!hasQ8Tag) missingCategories.push("Q8 (Cost approach)")
      if (!hasTreatments) missingCategories.push("Treatment capabilities")

      let status: MatchableStatus = "OK"
      if (matchingTags.length === 0 || !hasTreatments) {
        status = "NOT_MATCHABLE"
      } else if (matchingTags.length < MIN_MATCHING_TAGS_FOR_OK) {
        status = "WEAK"
      }

      return {
        clinicId: clinic.id,
        clinicName: clinic.name,
        tags,
        invalidTags,
        validTags,
        matchingTagCount: matchingTags.length,
        highlightTagCount: highlightTags.length,
        status,
        missingCategories,
        treatments: clinic.treatments || [],
        isArchived: clinic.is_archived === true,
      }
    })

    const activeClinics = clinicData.filter((c) => !c.isArchived)
    const archivedClinics = clinicData.filter((c) => c.isArchived)

    activeClinics.sort((a, b) => {
      const statusOrder = { NOT_MATCHABLE: 0, WEAK: 1, OK: 2 }
      return statusOrder[a.status] - statusOrder[b.status]
    })

    archivedClinics.sort((a, b) => a.clinicName.localeCompare(b.clinicName))

    return NextResponse.json({
      clinics: activeClinics,
      archivedClinics: archivedClinics,
    })
  } catch (error) {
    console.error("[TAG_HYGIENE_ERROR]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { clinicId } = body

    if (!clinicId) {
      return NextResponse.json({ error: "clinicId is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: selections, error: selectionsError } = await supabase
      .from("clinic_filter_selections")
      .select("id, filter_key")
      .eq("clinic_id", clinicId)

    if (selectionsError) throw selectionsError

    const invalidSelections = (selections || []).filter((s) => !CANONICAL_TAGS.has(s.filter_key))

    if (invalidSelections.length === 0) {
      return NextResponse.json({ removedCount: 0, message: "No invalid tags found" })
    }

    const { error: deleteError } = await supabase
      .from("clinic_filter_selections")
      .delete()
      .in(
        "id",
        invalidSelections.map((s) => s.id),
      )

    if (deleteError) throw deleteError

    return NextResponse.json({
      removedCount: invalidSelections.length,
      removedTags: invalidSelections.map((s) => s.filter_key),
    })
  } catch (error) {
    console.error("[TAG_HYGIENE_DELETE_ERROR]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
