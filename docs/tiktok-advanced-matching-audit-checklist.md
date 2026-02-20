# TikTok Advanced Matching — Audit Checklist

> **For use by:** the audit branch (`claude/tiktok-advanced-matching-setup-ajDOB`)
>
> Use this checklist to review the implementation PR before merging. Each item should be verified by reading the code diff and/or testing in a preview deployment.

---

## 1. Environment & Configuration

- [ ] `NEXT_PUBLIC_TIKTOK_PIXEL_ID` is set in Vercel (Production + Preview)
- [ ] The pixel ID is **not** committed to the repository (check for hardcoded values)
- [ ] Automatic Advanced Matching is **OFF** in TikTok Events Manager

---

## 2. Pixel Script Loading (`components/analytics-scripts.tsx`)

- [ ] TikTok script block is wrapped in `{marketingConsent && process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID && (...)}`
- [ ] Script uses `strategy="afterInteractive"` (not `beforeInteractive`)
- [ ] Script ID is set (e.g., `id="tiktok-pixel"`)
- [ ] `ttq.load()` is called with the env var, not a hardcoded ID
- [ ] `ttq.page()` is called after load (tracks page views)
- [ ] The TikTok base code matches the official snippet from TikTok's documentation (no modifications to the loader)
- [ ] Script block is placed **after** the Meta Pixel block (order doesn't matter functionally, but keeps the file organized)

---

## 3. Helper Module (`lib/tiktok-pixel.ts`)

### Type Safety
- [ ] `window.ttq` is properly declared in a global interface extension
- [ ] The `identify` method signature matches TikTok's API: `{ email?, phone_number?, external_id? }`
- [ ] The `track` method signature accepts `(event: string, params?: Record<string, unknown>)`

### SHA-256 Hashing
- [ ] Uses `crypto.subtle.digest("SHA-256", ...)` (Web Crypto API)
- [ ] Input is `.trim().toLowerCase()` before hashing
- [ ] Output is hex-encoded (not base64)
- [ ] Hash function is `async` and properly `await`ed at all call sites

### Phone Normalisation
- [ ] Handles UK format: `07xxx` → `+447xxx`
- [ ] Handles already-normalised: `+447xxx` → `+447xxx`
- [ ] Strips spaces, dashes, parentheses
- [ ] Does NOT break non-UK numbers (international users)

### Consent Gating
- [ ] `identifyForTikTok()` checks `hasConsentForMarketing()` before calling `window.ttq.identify`
- [ ] `trackTikTokEvent()` checks `hasConsentForMarketing()` before calling `window.ttq.track`
- [ ] Both functions return early if `window.ttq` is undefined (pixel not loaded)
- [ ] Both functions return early on server-side (`typeof window === "undefined"`)

### Data Safety (CRITICAL — Healthcare Context)
- [ ] `identifyForTikTok` function signature ONLY accepts: `email`, `phone`, `externalId`
- [ ] **NO treatment data** is passed to any TikTok function
- [ ] **NO postcode** is passed to any TikTok function
- [ ] **NO dental concern/urgency** data is passed to any TikTok function
- [ ] **NO form step data** is passed to any TikTok function
- [ ] The `content_name` parameter in `trackTikTokEvent` contains only generic labels like `"intake_form"` or `"direct_enquiry"` (no health info)

---

## 4. Intake Form Integration (`app/intake/page.tsx`)

- [ ] Import: `import { identifyForTikTok, trackTikTokEvent } from "@/lib/tiktok-pixel"`
- [ ] `identifyForTikTok()` is called with `formData.email` and `formData.phone`
- [ ] `identifyForTikTok()` is called **before** `trackTikTokEvent("CompleteRegistration", ...)`
- [ ] `identifyForTikTok()` is `await`ed (it's async due to SHA-256)
- [ ] `trackTikTokEvent` only sends `content_name` — no treatment/health metadata
- [ ] The TikTok calls are placed near the existing `trackEvent("lead_submitted", ...)` call
- [ ] If the API call to create the lead **fails**, the TikTok event should **NOT** fire (verify it's in the success path only)

---

## 5. Direct Enquiry Form Integration (`components/clinic/direct-enquiry-form.tsx`)

- [ ] Import: `import { identifyForTikTok, trackTikTokEvent } from "@/lib/tiktok-pixel"`
- [ ] `identifyForTikTok()` is called with trimmed email and phone
- [ ] `identifyForTikTok()` is called **before** `trackTikTokEvent("CompleteRegistration", ...)`
- [ ] `identifyForTikTok()` is `await`ed
- [ ] `trackTikTokEvent` only sends `content_name` — no treatment/health metadata
- [ ] The TikTok calls are in the success path (after successful API response)

---

## 6. Book Clicked Integration (Optional — `components/clinic/profile/clinic-profile-content.tsx`)

- [ ] If implemented: import is `{ trackTikTokEvent }` only (no `identifyForTikTok` needed here)
- [ ] Event is `"ClickButton"` with `content_name: "book_appointment"`
- [ ] No PII or health data in the event parameters
- [ ] No `identify` call here (user was already identified at form submission)

---

## 7. Consent Flow Testing

### With marketing consent granted:
- [ ] TikTok pixel script loads in the DOM
- [ ] `ttq.page()` fires on navigation
- [ ] `ttq.identify()` fires on form submission (check via TikTok Pixel Helper)
- [ ] `ttq.track("CompleteRegistration")` fires on form submission
- [ ] `_ttp` cookie is set by TikTok

### Without marketing consent (or before consent):
- [ ] TikTok pixel script does **NOT** load in the DOM
- [ ] No `ttq` object exists on `window`
- [ ] No `_ttp` cookie is set
- [ ] No errors in the console (graceful degradation)

### After revoking consent:
- [ ] On the next page load, TikTok script no longer loads
- [ ] `identifyForTikTok()` and `trackTikTokEvent()` return early without firing

---

## 8. Privacy & Compliance

- [ ] Cookie policy page updated to mention TikTok / `_ttp` cookie
- [ ] Cookie is categorised as "Marketing" (not "Analytics" or "Essential")
- [ ] No plaintext PII is sent to TikTok (all values are SHA-256 hashed)
- [ ] Privacy policy mentions TikTok as a third-party data processor (if applicable under UK GDPR)

---

## 9. Build & Runtime Checks

- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes with no errors
- [ ] No TypeScript errors related to `window.ttq` types
- [ ] No console errors on pages where TikTok pixel loads
- [ ] Page load performance: TikTok script is `afterInteractive` and doesn't block rendering

---

## 10. TikTok Events Manager Verification

- [ ] Pixel shows as "Active" in TikTok Events Manager
- [ ] `PageView` events are flowing in
- [ ] `CompleteRegistration` events appear after test form submissions
- [ ] Advanced Matching data quality shows "Manual" (not "Automatic")
- [ ] Match rate is reported (may take 24-48h to populate)

---

## Red Flags to Watch For

| Red Flag | Why It Matters |
| --- | --- |
| `formData.treatments` or similar in any TikTok call | Health data leak — MUST NOT happen |
| `formData.postcode` in any TikTok call | Location data unnecessarily shared |
| `formData.urgency` or `formData.readiness` in any TikTok call | Health-adjacent data leak |
| Unhashed email/phone in `ttq.identify()` | PII sent in plaintext to TikTok |
| TikTok script loading without consent check | PECR/GDPR violation |
| `identify` called without `await` | Race condition — event fires before identify completes |
| Automatic Advanced Matching enabled in TikTok dashboard | Scrapes form fields including health data |

---

## Sign-Off

| Reviewer | Date | Status |
| --- | --- | --- |
| _______________ | __________ | Pass / Fail |

**Notes:**

---
