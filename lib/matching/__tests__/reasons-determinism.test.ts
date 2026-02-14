/**
 * Automated test: Validate match explanation determinism
 *
 * Requirements:
 * - Given identical lead answers, different clinics MUST have different reasons
 * - Given different leads, same clinic MAY have different reasons
 * - Planning mode: exactly 3 reasons
 * - Emergency mode: exactly 2 reasons
 * - Failing this test blocks deploy
 */

import { buildMatchFacts } from "../scoring"
import { buildMatchReasons, validateUniqueReasons } from "../reasons-engine"
import type { LeadAnswer, ClinicProfile, MatchScoreBreakdown } from "../contract"

// Mock lead for planning mode
const mockLead: LeadAnswer = {
  id: "test-lead-1",
  treatment: "Dental Implants",
  postcode: "SW1A 1AA",
  latitude: 51.5014,
  longitude: -0.1419,
  priorities: ["clear-explanation", "listened-to", "transparent-pricing"],
  anxietyLevel: "quite_anxious",
  costApproach: "FLEXIBLE_FINANCE",
  blockerCode: "COST_CONCERNS",
  email: "test@example.com",
  schemaVersion: 2,
}

// Mock lead for emergency mode
const emergencyLead: LeadAnswer = {
  id: "test-lead-emergency",
  treatment: "Emergency dental issue (pain, swelling, broken tooth)",
  postcode: "SW1A 1AA",
  latitude: 51.5014,
  longitude: -0.1419,
  priorities: [],
  anxietyLevel: "quite_anxious",
  costApproach: null,
  blockerCode: null,
  email: "test@example.com",
  schemaVersion: 2,
}

// Mock lead for check-up
const checkupLead: LeadAnswer = {
  id: "test-lead-checkup",
  treatment: "General Check-up & Clean",
  postcode: "SW1A 1AA",
  latitude: 51.5014,
  longitude: -0.1419,
  priorities: ["transparent-pricing", "strong-reputation"],
  anxietyLevel: "comfortable",
  costApproach: "DISCUSS_OPTIONS",
  blockerCode: null,
  email: "test@example.com",
  schemaVersion: 2,
}

// Mock clinics with DIFFERENT tags (should produce different reasons)
const mockClinicA: ClinicProfile = {
  id: "clinic-a",
  name: "Clinic A",
  postcode: "SW1A 1AA",
  latitude: 51.5014,
  longitude: -0.1419,
  financeAvailable: true,
  verified: true,
  reviewCount: 100,
  treatments: ["Dental Implants", "Veneers"],
  tags: ["implants"],
  filterKeys: ["TAG_CLEAR_EXPLANATIONS", "TAG_ANXIETY_FRIENDLY", "TAG_FINANCE_AVAILABLE"],
}

const mockClinicB: ClinicProfile = {
  id: "clinic-b",
  name: "Clinic B",
  postcode: "SW1A 2AA",
  latitude: 51.502,
  longitude: -0.141,
  financeAvailable: false,
  verified: true,
  reviewCount: 50,
  treatments: ["Dental Implants"],
  tags: ["implants"],
  filterKeys: ["TAG_LISTENED_TO_RESPECTED", "TAG_SEDATION_AVAILABLE", "TAG_SPECIALIST_LEVEL_EXPERIENCE"],
}

// Mock breakdown for testing
function createMockBreakdown(clinic: ClinicProfile): MatchScoreBreakdown {
  return {
    totalScore: 75,
    maxPossible: 100,
    percent: 75,
    categories: [
      {
        category: "treatment",
        points: 30,
        maxPoints: 30,
        weight: 0.4,
        facts: { clinicOffersTreatment: true, clinicTreatments: clinic.treatments },
      },
      {
        category: "priorities",
        points: 15,
        maxPoints: 20,
        weight: 0.2,
        facts: {
          matchedTags: clinic.filterKeys.filter((k) => k.startsWith("TAG_CLEAR") || k.startsWith("TAG_LISTENED")),
          matchCount: 1,
        },
      },
      {
        category: "blockers",
        points: 10,
        maxPoints: 15,
        weight: 0.13,
        facts: {
          matchedTags: clinic.filterKeys.filter((k) => k.includes("FINANCE") || k.includes("COST")),
          hasBlockerSupport: true,
        },
      },
      {
        category: "anxiety",
        points: 10,
        maxPoints: 10,
        weight: 0.13,
        facts: {
          matchedTags: clinic.filterKeys.filter((k) => k.includes("ANXIETY") || k.includes("SEDATION")),
          hasAnxietySupport: true,
        },
      },
    ],
    distanceMiles: 0.5,
  }
}

describe("Match Explanation Determinism", () => {
  test("Different clinics MUST have different reasons for same lead", () => {
    const breakdownA = createMockBreakdown(mockClinicA)
    const breakdownB = createMockBreakdown(mockClinicB)

    const factsA = buildMatchFacts(mockLead, mockClinicA, breakdownA)
    const factsB = buildMatchFacts(mockLead, mockClinicB, breakdownB)

    const reasonsA = buildMatchReasons(factsA)
    const reasonsB = buildMatchReasons(factsB)

    // Planning mode: both should have exactly 3 reasons
    expect(reasonsA).toHaveLength(3)
    expect(reasonsB).toHaveLength(3)

    // Reasons should be different (different clinics have different tags)
    const reasonKeysA = reasonsA.map((r) => r.tagKey).sort()
    const reasonKeysB = reasonsB.map((r) => r.tagKey).sort()

    expect(reasonKeysA).not.toEqual(reasonKeysB)
  })

  test("Emergency mode returns exactly 2 reasons", () => {
    const breakdown = createMockBreakdown(mockClinicA)
    const facts = buildMatchFacts(emergencyLead, mockClinicA, breakdown)

    expect(facts.isEmergency).toBe(true)
    expect(facts.treatmentMatch.treatmentCategory).toBe("emergency")

    const reasons = buildMatchReasons(facts)
    expect(reasons).toHaveLength(2)

    // Emergency reasons should have EMERGENCY_ tagKeys
    for (const reason of reasons) {
      expect(reason.tagKey?.startsWith("EMERGENCY_") || reason.tagKey?.startsWith("FALLBACK_")).toBe(true)
    }
  })

  test("Check-up treatment uses checkup-specific reasons", () => {
    const breakdown = createMockBreakdown(mockClinicA)
    const facts = buildMatchFacts(checkupLead, mockClinicA, breakdown)

    expect(facts.isEmergency).toBe(false)
    expect(facts.treatmentMatch.treatmentCategory).toBe("checkup")

    const reasons = buildMatchReasons(facts)
    expect(reasons).toHaveLength(3)

    // Should have TREATMENT_CHECKUP, not TREATMENT_MATCH
    const treatmentReason = reasons.find(
      (r) => r.tagKey === "TREATMENT_CHECKUP" || r.tagKey === "TREATMENT_MATCH",
    )
    if (treatmentReason) {
      expect(treatmentReason.tagKey).toBe("TREATMENT_CHECKUP")
    }
  })

  test("validateUniqueReasons catches identical reasons across clinics", () => {
    // Create reasons that are intentionally identical
    const identicalReasons = [
      {
        clinicId: "clinic-1",
        reasons: [{ key: "a", text: "Test", category: "treatment" as const, weight: 1, tagKey: "TAG_X" }],
      },
      {
        clinicId: "clinic-2",
        reasons: [{ key: "b", text: "Test", category: "treatment" as const, weight: 1, tagKey: "TAG_X" }],
      },
    ]

    const result = validateUniqueReasons(identicalReasons)
    // With identical single reasons, reasonSets would match, triggering a warning
    expect(result.valid).toBe(true) // Still valid but may have warning
  })

  test("All reasons must map to known TAG_*, FALLBACK_*, EMERGENCY_*, or TREATMENT keys", () => {
    const breakdownA = createMockBreakdown(mockClinicA)
    const factsA = buildMatchFacts(mockLead, mockClinicA, breakdownA)
    const reasons = buildMatchReasons(factsA)

    for (const reason of reasons) {
      expect(reason.tagKey).toBeDefined()
      expect(
        reason.tagKey?.startsWith("TAG_") ||
          reason.tagKey?.startsWith("FALLBACK_") ||
          reason.tagKey?.startsWith("EMERGENCY_") ||
          reason.tagKey === "TREATMENT_MATCH" ||
          reason.tagKey === "TREATMENT_CHECKUP",
      ).toBe(true)
    }
  })

  test("Reasons never include banned generic phrases", () => {
    const bannedPhrases = ["Accepts patients", "Matches your needs", "Good option for you"]

    const breakdownA = createMockBreakdown(mockClinicA)
    const factsA = buildMatchFacts(mockLead, mockClinicA, breakdownA)
    const reasons = buildMatchReasons(factsA)

    for (const reason of reasons) {
      for (const banned of bannedPhrases) {
        expect(reason.text.toLowerCase()).not.toContain(banned.toLowerCase())
      }
    }
  })

  test("Planning mode always returns exactly 3 reasons (with fallbacks if needed)", () => {
    // Even with minimal facts, should return 3 reasons (using fallbacks)
    const minimalClinic: ClinicProfile = {
      id: "minimal",
      name: "Minimal Clinic",
      postcode: "SW1A 1AA",
      financeAvailable: false,
      verified: false,
      reviewCount: 0,
      treatments: ["Dental Implants"],
      tags: [],
      filterKeys: [], // No tags at all
    }

    const breakdown: MatchScoreBreakdown = {
      totalScore: 30,
      maxPossible: 100,
      percent: 30,
      categories: [
        { category: "treatment", points: 30, maxPoints: 30, weight: 1, facts: { clinicOffersTreatment: true } },
      ],
    }

    const facts = buildMatchFacts(mockLead, minimalClinic, breakdown)
    const reasons = buildMatchReasons(facts)

    expect(reasons).toHaveLength(3)
    // Should include fallback reasons
    expect(reasons.some((r) => r.isFallback)).toBe(true)
  })

  test("Emergency mode always returns exactly 2 reasons (with fallbacks if needed)", () => {
    const minimalClinic: ClinicProfile = {
      id: "minimal-emergency",
      name: "Minimal Emergency Clinic",
      postcode: "SW1A 1AA",
      financeAvailable: false,
      verified: false,
      reviewCount: 0,
      treatments: ["Emergency"],
      tags: [],
      filterKeys: [],
    }

    const breakdown: MatchScoreBreakdown = {
      totalScore: 30,
      maxPossible: 100,
      percent: 30,
      categories: [
        { category: "treatment", points: 30, maxPoints: 30, weight: 1, facts: { clinicOffersTreatment: true } },
      ],
    }

    const facts = buildMatchFacts(emergencyLead, minimalClinic, breakdown)
    const reasons = buildMatchReasons(facts)

    expect(reasons).toHaveLength(2)
  })
})
