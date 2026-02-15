# Matching & Patient Journey Audit Report

**Date:** 2026-02-15
**Branch:** main (master)
**Auditor:** Claude (full codebase access)

---

## Executive Summary

The matching engine is architecturally sound — single source of truth for scoring, deterministic reason generation, clean separation between scoring/facts/reasons. However, there are **critical bugs** around repeated match reasons, incomplete blocker handling, distance cliff edges, and substring treatment matching that directly impact patient experience and match quality.

---

## SECTION A: "WHY WE MATCHED YOU" REASONS REPETITION BUG

**Status: CONFIRMED — Root cause identified**

### What the user is seeing

Patients see the same or near-identical "Why we matched you" reason sentences across multiple clinic cards. For example, 3 clinics might all show:
- "A thoughtful match for patients considering their investment carefully."
- "Matched because they focus on supportive, patient-centred care."

### Root Causes (3 separate issues combining)

#### A1. Duplicate template text across different tags (CRITICAL)
**Files:** `lib/matching/tag-schema.ts:160-294`, `lib/matching/reasonLibrary.json`

Multiple TAG_* keys share **identical** reason text:

| Text | Appears under tags |
|------|-------------------|
| "A thoughtful match for patients considering their investment carefully." | `TAG_QUALITY_OUTCOME_FOCUSED[0]`, `TAG_FLEXIBLE_BUDGET_OK[0]`, `TAG_STRICT_BUDGET_SUPPORTIVE[0]`, `TAG_GOOD_FOR_COST_CONCERNS[0]` |
| "Matched because they focus on supportive, patient-centred care." | `TAG_CALM_REASSURING[0]`, `TAG_ANXIETY_FRIENDLY[0]` |
| "Matched with a team that takes time to explain options clearly." | `TAG_DECISION_SUPPORTIVE[0]`, `TAG_DISCUSS_OPTIONS_BEFORE_COST[0]` |
| "Experienced in supporting nervous patients." | `TAG_OK_WITH_ANXIOUS_PATIENTS[0]`, `TAG_SEDATION_AVAILABLE[0]` |
| "Provides a calm approach for patients who need reassurance." | `TAG_OK_WITH_ANXIOUS_PATIENTS[1]`, `TAG_SEDATION_AVAILABLE[1]` |
| "Matched for flexible payment plans to spread the cost." | `TAG_FINANCE_AVAILABLE[0]`, `TAG_MONTHLY_PAYMENTS_PREFERRED[0]` |

When clinic A matches on `TAG_QUALITY_OUTCOME_FOCUSED` and clinic B on `TAG_STRICT_BUDGET_SUPPORTIVE`, both get "A thoughtful match for patients considering their investment carefully." The `hasSemanticOverlap()` function in `reasons-engine.ts:94-114` only checks within a single clinic's reasons, not across clinics.

**Fix:** Give each TAG_* unique, differentiating reason templates. No two tags should share identical template strings.

#### A2. reasonComposer.ts does cross-clinic dedup but with limited variant pools
**File:** `lib/matching/reasonComposer.ts:222-332`

`composeReasonsForMultipleClinics()` tracks `usedVariants` per category to avoid reusing the same variant index. But many categories in `reasonLibrary.json` have only 1-2 variants (e.g., `budget_supportive` has exactly 1 variant, `flexible_scheduling` has 1, `continuity` has 1). Once a variant is "used" by clinic A, clinic B exhausts the pool and wraps around to the same text.

**Fix:** Expand variant pools in `reasonLibrary.json` to at least 3 variants per category. Priority categories: `budget_supportive`, `flexible_scheduling`, `continuity`, `right_fit`.

#### A3. fallbackSentences pool is only 3 items
**File:** `lib/matching/reasonLibrary.json:233-237`, `lib/matching/tag-schema.ts:359-379`

When clinics don't have enough matched tags, fallback reasons are used. There are only 3 fallbacks:
1. "Conveniently located near you."
2. "Within your preferred travel distance."
3. "Offers appointments aligned with your availability."

If 4+ clinics all need fallbacks, repeats are guaranteed (via modulo indexing in `reasons-engine.ts:418`).

**Fix:** Add 4-5 more fallback sentences (e.g., "Open during hours that suit your schedule.", "Located conveniently for your area.", "Offers booking flexibility for your preferences.").

---

## SECTION B: MATCHING ENGINE BUGS

### B1. Blocker scoring only handles WORRIED_COMPLEX (CRITICAL)
**File:** `lib/matching/scoring.ts:94-100`

The scoring engine only applies a complex case penalty for `WORRIED_COMPLEX`:
```typescript
if (blockerCodes.includes("WORRIED_COMPLEX") && !clinic.filterKeys.includes("TAG_COMPLEX_CASES_WELCOME")) {
  complexCasePenalty = 15
}
```

The other 5 blocker types (`NOT_WORTH_COST`, `NEED_MORE_TIME`, `UNSURE_OPTION`, `BAD_EXPERIENCE`, `NO_CONCERN`) are completely ignored in scoring. They are recorded in `MatchFacts.blockers` and can surface in reasons, but never affect the match score.

**Impact:** A patient who selects "I'm unsure how much this might cost" sees no scoring benefit for clinics with `TAG_GOOD_FOR_COST_CONCERNS`. A patient with "I've had a bad dental experience" gets no advantage for clinics with `TAG_BAD_EXPERIENCE_SUPPORTIVE`.

**Fix:** Add positive scoring for blocker-matching clinics:
- `NOT_WORTH_COST` + `TAG_GOOD_FOR_COST_CONCERNS` → +8 bonus
- `BAD_EXPERIENCE` + `TAG_BAD_EXPERIENCE_SUPPORTIVE` → +8 bonus
- `UNSURE_OPTION` + `TAG_OPTION_CLARITY_SUPPORT` → +5 bonus
- `NEED_MORE_TIME` + `TAG_DECISION_SUPPORTIVE` → +5 bonus
- Keep `WORRIED_COMPLEX` as penalty (current behavior is correct)

### B2. Distance scoring has step-function cliff edges
**File:** `lib/matching/scoring.ts:157-223`

Distance scoring uses hard step functions:
```
near_home:  ≤1mi=100%, ≤2mi=80%, ≤3mi=50%, ≤5mi=25%, >5mi=0%
travel_bit: ≤2mi=100%, ≤5mi=75%, ≤10mi=40%, >10mi=10%
```

A clinic at 4.9 miles gets 25% while 5.1 miles gets 0% — a 25-point cliff for `near_home`. At the boundary between tiers, a few hundred meters difference swings the score dramatically.

**Fix:** Replace step functions with smooth linear decay:
```
points = maxPoints * max(0, 1 - distance / maxRadius)
```
Where `maxRadius` depends on location preference (5mi for `near_home`, 10mi for `travel_bit`, etc.).

### B3. Treatment matching is still substring-based (MEDIUM)
**File:** `lib/matching/scoring.ts:119-155`

The treatment scoring splits the lead's treatment into terms and checks if each term appears as a substring in clinic treatments or tags:
```typescript
const hasMatch = clinic.treatments.some((t) => {
  const clinicTreatment = t.toLowerCase()
  return treatmentTerms.some(term => clinicTreatment.includes(term))
})
```

This means "root canal" would match "canal boats", "clean" would match "cleaning services", "bond" would match "bonding" (correct) but also "James Bond" (wrong if anyone entered it as a tag).

In practice, since treatment options are a fixed list (`TREATMENT_OPTIONS` in `intake-form-config.ts`), this is lower risk than it appears — patients select from predefined options, not free text. But clinic `treatments[]` and `tags[]` are free text and could contain false positive substrings.

**Fix:** Build a treatment taxonomy/alias map:
```typescript
const TREATMENT_ALIASES: Record<string, string[]> = {
  "invisalign": ["invisalign", "clear aligners", "aligners"],
  "teeth whitening": ["whitening", "teeth whitening", "bleaching"],
  ...
}
```
Match against canonical names instead of raw substring.

### B4. Only first treatment is scored for multi-treatment patients (MEDIUM)
**File:** `lib/matching/engine.ts:101-104`

```typescript
const treatments = input.treatments || (input.treatment ? [input.treatment] : [])
const treatment = treatments[0] || ""
```

`buildLeadProfile()` takes only `treatments[0]` and discards the rest. The scoring engine receives a single `lead.treatment` string. If a patient selects both "Teeth Whitening" and "Composite Bonding", only whitening is scored.

**Impact:** Multi-treatment patients get partially matched. A clinic offering only whitening scores the same as one offering both whitening and bonding.

**Fix:** Score against all requested treatments; use best match or average. The `LeadAnswer` contract would need `treatments: string[]` alongside the current `treatment: string`.

### B5. Cost scoring ignores strictBudgetAmount (LOW)
**File:** `lib/matching/scoring.ts:448-523`

When a patient selects `strict_budget` and provides a `strictBudgetAmount`, the scoring only checks:
1. Price tier compatibility (budget/mid/premium)
2. Whether clinic has the `TAG_STRICT_BUDGET_SUPPORTIVE` tag

It never compares the actual numeric budget amount against clinic procedure pricing. This is because clinics don't currently store per-procedure pricing — the `priceRange` field is a qualitative tier ("budget"/"mid"/"premium"), not a numeric range.

**Impact:** Low in current state since clinics don't have numeric pricing data. Would become significant if pricing data is added.

**Fix:** When `strictBudgetAmount` is set AND clinic has specific procedure pricing (future feature), compare against clinic's actual prices. For now, document this as a known limitation.

---

## SECTION C: PATIENT JOURNEY BUGS

### C1. Postcode geocoding silently defaults to London center on failure (CRITICAL)
**File:** `app/api/match/route.ts:41-45`

```typescript
} else {
  console.warn("[match] Geocoding failed, using default London coordinates")
  leadLat = 51.5074
  leadLon = -0.1278
}
```

If the postcodes.io API is down or returns an error, the match route silently defaults to central London coordinates. The patient sees match results as if they live in Westminster, with completely wrong distance calculations. There's no error shown to the user.

**Note:** The leads route (`app/api/leads/route.ts:98-100`) correctly returns an error when geocoding fails. The inconsistency is in the match route.

**Fix:** Return an error to the user: "We couldn't verify your postcode. Please try again." Only fall back to London coordinates for leads that already have coordinates stored (which would mean geocoding succeeded at lead creation time).

### C2. Match results page empty state exists but is good (RESOLVED from Branch 2 audit)
**File:** `app/match/[matchId]/page.tsx:630-647`

The Branch 2 audit flagged "Zero matches = blank page" but this has been fixed. The match page now shows a proper empty state:
```
"No matching clinics found"
"We couldn't find clinics matching your criteria right now..."
```
With a "Start a new search" button linking to `/intake`.

### C3. Directory listings have no visual "Listed clinic" badge (LOW)
**File:** `app/match/[matchId]/page.tsx:306-313, 736-743`

Directory listings (non-matchable clinics) do show as `"Directory listing"` text under the rating, but the differentiation is subtle. They share the same card layout and styling as matched clinics. The `tier` label shows "In our directory" or "Unverified clinic" but is small and easy to miss.

**Fix:** Add a more prominent visual indicator — a muted card background, a "Listed clinic" badge replacing the match percentage, or a distinct card border color.

### C4. Radius expansion recalculates haversine for every clinic at every step (LOW)
**File:** `lib/matching/engine.ts:548-586`

The `runMatchingEngine()` function iterates through radius steps `[5, 10, 15, 20, 999]`, filtering clinics by distance at each step. Each step calls the haversine formula for every clinic:

```typescript
for (const radiusMiles of RADIUS_STEPS) {
  const clinicsInRadius = allClinics.filter((clinic) => {
    const distMiles = haversineDistance(...)
    return distMiles <= radiusMiles
  })
```

**Fix:** Pre-compute all distances once, sort by distance, then use binary search or simple threshold filtering for each radius step.

### C5. No caching of clinic filter selections (LOW)
**File:** `app/api/match/route.ts:77-85`

Every match request fetches ALL clinic filter selections from the database:
```typescript
const { data: filterSelections } = await supabase.from("clinic_filter_selections").select("clinic_id, filter_key")
```

This table is effectively static — it only changes when an admin edits clinic tags. There's no caching.

**Fix:** Add 5-minute in-memory cache for filter selections. Invalidate on admin tag update.

### C6. Haversine formula duplicated in 4 places
**Files:**
1. `lib/matching/scoring.ts:14-23`
2. `lib/matching/engine.ts:606-615`
3. `lib/matching/reasons.ts:2-11`
4. `app/match/[matchId]/page.tsx:92-101`

Plus a 5th inline implementation in `app/api/matches/[matchId]/route.ts:229-237`.

**Fix:** Consolidate to a single `lib/utils/geo.ts` utility. Import everywhere.

### C7. Dead helper functions in features.ts
**File:** `lib/matching/features.ts:15-140`

`getDistanceMultiplier()` is imported in `scoring.ts:2` but **never called** — the import is dead. The actual distance scoring in `scoring.ts:157-223` uses its own step-function logic, completely bypassing `features.ts`.

Similarly, `getRadiusMiles()`, `getAnxietyFilterKeys()`, `getBudgetFilterKeys()`, `getBlockerFilterKeys()`, `getPriorityFilterKeys()`, and `getCostApproachFilterKeys()` are all unused legacy functions from the old scoring system. They reference old-format filter keys (like "calm", "gentle", "reassuring") that don't match the current `TAG_*` key system.

**Fix:** Delete all unused functions. Remove the dead import from `scoring.ts`.

### C8. Tag schema version never validated
**File:** `lib/matching/tag-schema.ts:22`, `lib/matching/normalize.ts`

`FORM_VERSION = "v6_blocker_multiselect_2026-02-14"` is defined but never checked against `lead.schemaVersion` or `lead.form_version` during matching. The `normalizeLead()` function reads `schemaVersion` from the DB row but never validates it against the current form version.

**Impact:** If a v3 or v4 lead is re-matched against v6 logic, the old form values may not map correctly to current tags. The backwards-compatibility mappings in `tag-schema.ts` help but aren't comprehensive — for example, `"A modern, well-equipped clinic"` maps to `TAG_CLEAR_EXPLANATIONS` which is semantically wrong.

**Fix:** Log a warning when `lead.schemaVersion` doesn't match current `SCHEMA_VERSION`. Consider adding a migration path for old leads.

### C9. Test infrastructure is broken (MEDIUM)
**File:** `lib/matching/__tests__/reasons-determinism.test.ts`

The test file exists and is well-written, but there is **no Jest or Vitest configuration** in the project. No `jest.config.ts`, no `vitest.config.ts`, no test runner in `package.json`. The test suite fails to run:

```
SyntaxError: Unexpected token, expected "from" (14:12) — TypeScript import type not supported
```

The test file uses `import type` which requires TypeScript transformation. Without `ts-jest` or `@swc/jest` configured, the tests cannot execute.

**Impact:** The tests that are supposed to "block deploy" literally cannot run. There is no CI gate enforcing match reason correctness.

**Fix:** Add test runner configuration:
```bash
npm install -D vitest @vitest/runner
```
Add `vitest.config.ts` and a `"test"` script to `package.json`.

---

## SECTION D: NEW ISSUES NOT IN BRANCH 2 AUDIT

### D1. matches/[matchId]/route.ts re-scores clinics on every GET request (PERFORMANCE)
**File:** `app/api/matches/[matchId]/route.ts:78-103`

When the match results page loads, it fetches `GET /api/matches/[matchId]`. This route re-normalizes the lead, re-scores every clinic, re-builds match facts, and re-generates reasons — even though the match was already scored during `POST /api/match`.

This means:
1. Every page reload runs the full scoring pipeline
2. Scores could differ from what was originally stored if anything changed
3. It does additional DB writes to update `match_results` with fresh breakdowns

**Fix:** Cache scored results in the `match_results` table on first match run. On GET, return cached results unless explicitly re-matching.

### D2. reasonComposer.ts and reasons-engine.ts generate reasons independently (DESIGN)
**Files:** `lib/matching/reasons-engine.ts`, `lib/matching/reasonComposer.ts`

There are two parallel reason generation systems:
1. `reasons-engine.ts` → `buildMatchReasons()` → generates `MatchReason[]` with text from `REASON_TEMPLATES` in `tag-schema.ts`
2. `reasonComposer.ts` → `composeReasonSentences()` → generates `ComposedReasons` with text from `reasonLibrary.json`

Both are used. In `matches/[matchId]/route.ts:93-113`:
- First, `buildMatchReasons()` runs
- Then `composeReasonsForMultipleClinics()` runs on top of it
- The composed bullets override the engine reasons for display

This dual system creates confusion about which templates are actually shown to users and makes template updates error-prone (you'd need to update both `tag-schema.ts` REASON_TEMPLATES and `reasonLibrary.json`).

**Fix:** Consolidate to a single reason generation pipeline. Either:
- (a) Remove `reasonComposer.ts` and enhance `reasons-engine.ts` with cross-clinic dedup
- (b) Have `reasons-engine.ts` only pick tag keys, and `reasonComposer.ts` handle all text rendering

### D3. Lead contact_value silently empty when no email or phone (LOW)
**File:** `app/api/leads/route.ts:160`

```typescript
contact_value: (email || phone || "") as string,
```

If both email and phone are empty strings (which passes validation — email is not required), `contact_value` is stored as `""`. The clinic receives a lead with no way to contact the patient.

**Fix:** Require at least one contact method. Add validation: "Please provide either an email address or phone number."

### D4. matches table accumulates duplicate match rows (LOW-MEDIUM)
**File:** `app/api/match/route.ts:108-121`

The match route creates a new `matches` row every time matching is triggered for a lead. While `match_results` are correctly cleaned up (line 125: `await supabase.from("match_results").delete().eq("lead_id", leadId)`), the parent `matches` table accumulates duplicate entries.

**Fix:** Either delete old `matches` rows for the same lead before inserting, or add a unique constraint on `lead_id` and upsert.

### D5. Intake form allows submission without email in some paths (LOW)
**File:** `app/api/leads/route.ts:103-104`

```typescript
const email = validatedData.email && (validatedData.email as string).trim() !== "" ? validatedData.email : null
```

The validation function (`validateLeadData`) does not require email — it only requires `firstName`, `lastName`, `treatmentInterest`, and `postcode`. A lead can be created with no email. On the match page, OTP verification requires email, creating a dead end for email-less leads.

**Fix:** Make email required in `validateLeadData()`, or add a fallback path for phone-only leads on the match page.

### D6. No rate limiting on match/lead creation endpoints (SECURITY)
**Files:** `app/api/match/route.ts`, `app/api/leads/route.ts`

Neither endpoint has rate limiting. An attacker could:
- Create thousands of leads (filling the database)
- Trigger thousands of match computations (CPU/DB exhaustion)
- Spam the postcodes.io API (potential IP ban)

**Fix:** Add rate limiting (e.g., 5 leads per IP per hour, 10 match requests per IP per hour).

### D7. Admin test-match endpoint has no auth check visible in route (SECURITY)
**File:** `app/api/admin/test-match/route.ts`

Need to verify admin auth is enforced. If the admin middleware doesn't cover `/api/admin/*` routes, the test-match endpoint could be publicly accessible.

---

## SECTION E: FEATURE SUGGESTIONS

### E1. Multi-treatment scoring
Currently a patient who selects "Invisalign" and "Teeth Whitening" only gets scored on the first. Implement multi-treatment scoring where the match score considers all requested treatments.

### E2. "Why not this clinic" transparency
When a patient sees a "possible" tier match, add a subtle explanation of what's missing: "This clinic doesn't offer evening appointments, which you said matters to you."

### E3. Re-match with updated preferences
Allow patients to adjust their priorities on the match results page and re-run matching without going through the full intake form again.

### E4. Clinic response time tracking
Track how quickly clinics respond to leads. Surface "Usually responds within 2 hours" on clinic cards to build confidence.

### E5. Weighted priority ordering
Currently all priorities in Q4 are treated equally. Consider letting patients rank their priorities (1st, 2nd, 3rd) and weight scoring accordingly.

### E6. Seasonal/time-based availability matching
The current availability scoring uses static clinic hours. Consider integrating real-time availability if clinics provide it.

---

## SECTION F: COMPARISON WITH BRANCH 2 AUDIT

| Branch 2 Issue | Status in Current Code | Notes |
|---|---|---|
| #1: Blocker scoring only handles WORRIED_COMPLEX | **CONFIRMED** — Still only WORRIED_COMPLEX penalty at `scoring.ts:94-100` | Other blockers ignored in scoring |
| #2: Distance cliff edges | **CONFIRMED** — Step functions at `scoring.ts:157-223` | 25%→0% cliff at 5mi for near_home |
| #3: Treatment matching substring-based | **CONFIRMED** — `scoring.ts:119-155` | Lower risk than audit suggested due to fixed treatment options |
| #4: Only first treatment scored | **CONFIRMED** — `engine.ts:101-104` takes `treatments[0]` only | Multi-treatment patients partially matched |
| #5: Zero matches = blank page | **FIXED** — Empty state at `page.tsx:630-647` with CTA | Working correctly |
| #6: Cost scoring ignores actual budget amount | **CONFIRMED** — `scoring.ts:448-523` | But clinics lack numeric pricing data, so low impact |
| #7: Availability defaults give full points with missing data | **FIXED** — `scoring.ts:424-426` caps at 50% when `!hasAvailabilityData` | Working correctly |
| #8: Duplicate match_results accumulate on re-match | **FIXED** — `match/route.ts:125` deletes before insert | `matches` table still accumulates (see D4) |
| #9: Radius expansion recalculates haversine | **CONFIRMED** — `engine.ts:548-586` | Performance issue |
| #10: No caching of clinic filter selections | **CONFIRMED** — `match/route.ts:77-85` | Full table scan every request |
| #11: Directory listings not visually differentiated | **PARTIALLY FIXED** — Text says "Directory listing" but no prominent badge | Subtle differentiation only |
| #12: Postcode geocoding silently defaults to London | **CONFIRMED** — `match/route.ts:42-44` still defaults to 51.5074, -0.1278 | Leads route correctly returns error |
| #13: Haversine calculated in 3 places | **WORSE** — Now in 5 places (scoring.ts, engine.ts, reasons.ts, page.tsx, matches/[matchId]/route.ts) | |
| #14: Dead distance helper functions | **CONFIRMED** — `features.ts:15-140` all unused | Plus dead import in scoring.ts |
| #15: rawAnswers reconstructed by API | **FIXED** — `leads/route.ts:110-115` stores form's rawAnswers directly | Working correctly |
| #16: Tag schema version never validated | **CONFIRMED** — No validation anywhere | Version mismatch goes undetected |

### Summary: Branch 2 Accuracy

- **8 of 16** Branch 2 issues confirmed as still present
- **4 of 16** have been fixed since that audit
- **1** is worse than reported (haversine now in 5 places)
- **3** are confirmed but lower impact than Branch 2 suggested
- Branch 2 missed the **reasons repetition bug** (the most visible issue to users)
- Branch 2 missed the **dual reason generation system**, **re-scoring on every GET**, **test infrastructure broken**, and **security concerns**

---

## PRIORITY RANKING

### P0 — Fix immediately (visible to every patient)
1. **A1+A2+A3: Reasons repetition** — Unique templates per tag, expand variant pools, more fallbacks
2. **C1: Postcode geocoding silent default** — Return error instead of wrong London coordinates

### P1 — Fix before next release
3. **B1: Blocker scoring** — Add positive scoring for all blocker types
4. **C9: Test infrastructure** — Configure test runner so deploy gate works
5. **B2: Distance cliff edges** — Smooth linear decay

### P2 — Important improvements
6. **D1: Re-scoring on every GET** — Cache match results
7. **B4: Multi-treatment scoring** — Score all requested treatments
8. **D2: Dual reason system** — Consolidate to single pipeline
9. **C6: Haversine duplication** — Single geo utility
10. **D4: Duplicate matches rows** — Clean up on re-match

### P3 — Polish
11. **B3: Treatment taxonomy** — Build alias map
12. **C7: Dead features.ts functions** — Delete unused code
13. **C8: Schema version validation** — Add warning
14. **C3: Directory listing visual** — More prominent badge
15. **D6: Rate limiting** — Add basic protections

---

## VERIFICATION CHECKLIST

- [ ] Test match flow with London postcode → verify no repeated reason sentences across clinics
- [ ] Test with postcode API down → verify error message (not silent London default)
- [ ] Test with multiple blockers (NOT_WORTH_COST, BAD_EXPERIENCE) → verify scoring impact
- [ ] Test with 3+ clinics sharing same tags → verify reason differentiation
- [ ] Test re-match on same lead → verify no duplicate matches rows
- [ ] Run `lib/matching/__tests__/reasons-determinism.test.ts` → verify it actually executes
- [ ] Test multi-treatment selection → verify only first is scored (documenting current behavior)
- [ ] Test distance scoring at boundary values (4.9mi vs 5.1mi for near_home) → observe cliff
