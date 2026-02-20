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

### PII Safety
- [ ] `identifyForTikTok` function signature ONLY accepts: `email`, `phone`, `externalId`
- [ ] **NO unhashed email/phone** is sent to TikTok — all PII must go through SHA-256
- [ ] `identify` is only called at form submission and OTP verification points

---

## 4. Intake Form — `CompleteRegistration` + `identify` (`app/intake/page.tsx`)

- [ ] Import: `import { identifyForTikTok, trackTikTokEvent } from "@/lib/tiktok-pixel"`
- [ ] `identifyForTikTok()` is called with `formData.email` and `formData.phone`
- [ ] `identifyForTikTok()` is called **before** `trackTikTokEvent("CompleteRegistration", ...)`
- [ ] `identifyForTikTok()` is `await`ed (it's async due to SHA-256)
- [ ] `trackTikTokEvent("CompleteRegistration", ...)` includes event metadata: `content_name`, `treatment`, `postcode`, `flow`, `urgency`, `cost_approach`
- [ ] The TikTok calls are placed near the existing `trackEvent("lead_submitted", ...)` call
- [ ] If the API call to create the lead **fails**, the TikTok event should **NOT** fire (verify it's in the success path only)

---

## 5. Direct Enquiry Form — `CompleteRegistration` + `identify` (`components/clinic/direct-enquiry-form.tsx`)

- [ ] Import: `import { identifyForTikTok, trackTikTokEvent } from "@/lib/tiktok-pixel"`
- [ ] `identifyForTikTok()` is called with trimmed email and phone
- [ ] `identifyForTikTok()` is called **before** `trackTikTokEvent("CompleteRegistration", ...)`
- [ ] `identifyForTikTok()` is `await`ed
- [ ] `trackTikTokEvent("CompleteRegistration", ...)` includes `content_name` and `treatment`
- [ ] The TikTok calls are in the success path (after successful API response)

---

## 6. OTP Verification — `CompleteRegistration` + `identify`

### Match page (`app/match/[matchId]/page.tsx`)
- [ ] `handleVerificationSuccess` is made `async`
- [ ] `identifyForTikTok()` is called with `leadEmail` (available at line 111) and `leadId`
- [ ] `identifyForTikTok()` is `await`ed
- [ ] `trackTikTokEvent("CompleteRegistration", { content_name: "otp_verified_match" })` fires
- [ ] Both calls are placed before the existing `trackEvent("email_verified", ...)` at line 440

### Direct enquiry OTP (`components/clinic/direct-enquiry-form.tsx`)
- [ ] `onVerified` callback is made `async`
- [ ] `identifyForTikTok()` is called with `email.trim()` and `phone.trim()`
- [ ] `identifyForTikTok()` is `await`ed
- [ ] `trackTikTokEvent("CompleteRegistration", { content_name: "otp_verified_direct" })` fires
- [ ] Both calls are placed before the existing `trackEvent("email_verified", ...)` at line 95

---

## 7. Message Clinic Clicks — `Contact`

### Match page (`app/match/[matchId]/page.tsx`)
- [ ] "Message Clinic" button/link near line 935 fires `trackTikTokEvent("Contact", { content_name: "message_clinic_match_page" })`
- [ ] Click handler doesn't break the existing `<Link>` navigation

### Clinic profile — desktop (`components/clinic/profile/clinic-profile-content.tsx`)
- [ ] "Message Clinic" button near line 607 fires `trackTikTokEvent("Contact", { content_name: "message_clinic_profile" })`
- [ ] Existing `setShowChat(!showChat)` behaviour is preserved

### Clinic profile — mobile (`components/clinic/profile/clinic-profile-content.tsx`)
- [ ] "Message Clinic" button near line 822 fires `trackTikTokEvent("Contact", { content_name: "message_clinic_profile_mobile" })`
- [ ] Existing `setShowMobileChat(true)` behaviour is preserved

---

## 8. Booking Flow

### Select time slot — match page (`app/match/[matchId]/page.tsx`)
- [ ] `onSelectSlot` callback near line 921 fires `trackTikTokEvent("InitiateCheckout", { content_name: "select_time_slot" })` before `window.location.href` redirect

### Confirm request — clinic profile (`components/clinic/profile/clinic-profile-content.tsx`)
- [ ] `handleBookAppointment` near line 189 fires `trackTikTokEvent("PlaceAnOrder", { content_name: "confirm_request" })`

### Booking confirmed inline — clinic profile (`components/clinic/profile/clinic-profile-content.tsx`)
- [ ] `handleConfirmBooking` near line 269 fires `trackTikTokEvent("PlaceAnOrder", { content_name: "booking_confirmed_inline" })`

### Booking confirmed standalone (`app/booking/confirm/page.tsx`)
- [ ] After `setConfirmed(true)` at line 117, fires `trackTikTokEvent("PlaceAnOrder", { content_name: "booking_confirmed_standalone" })`

---

## 9. Event Mapping Verification

| User Action | Pearlie Event | TikTok Event | `identify` call? | File |
| --- | --- | --- | --- | --- |
| Page loads | (automatic) | `PageView` via `ttq.page()` | No | `analytics-scripts.tsx` |
| Submits intake form | `lead_submitted` | `CompleteRegistration` | **Yes** | `app/intake/page.tsx` |
| Submits direct enquiry | `lead_submitted` | `CompleteRegistration` | **Yes** | `direct-enquiry-form.tsx` |
| Completes OTP (match page) | `email_verified` | `CompleteRegistration` | **Yes** | `app/match/[matchId]/page.tsx` |
| Completes OTP (direct enquiry) | `email_verified` | `CompleteRegistration` | **Yes** | `direct-enquiry-form.tsx` |
| Clicks "Message Clinic" | — | `Contact` | No | match page + clinic profile (3 buttons) |
| Selects time slot (match page) | — | `InitiateCheckout` | No | `app/match/[matchId]/page.tsx` |
| Confirm request (clinic profile) | `book_clicked` | `PlaceAnOrder` | No | `clinic-profile-content.tsx` |
| Booking confirmed (inline) | `booking_confirmed_inline` | `PlaceAnOrder` | No | `clinic-profile-content.tsx` |
| Booking confirmed (standalone) | — | `PlaceAnOrder` | No | `app/booking/confirm/page.tsx` |

### NOT implemented (future — requires server-side Events API)

| Clinic Action | TikTok Event | Why it can't use the pixel |
| --- | --- | --- |
| Clinic confirms appointment in dashboard | `CompletePayment` | Clinic staff's browser, not patient's — pixel can't fire for patient |

---

## 10. Consent Flow Testing

### With marketing consent granted:
- [ ] TikTok pixel script loads in the DOM
- [ ] `ttq.page()` fires on navigation
- [ ] `ttq.identify()` fires on form submission (check via TikTok Pixel Helper)
- [ ] `ttq.track("CompleteRegistration")` fires on form submission and OTP verification
- [ ] `ttq.track("Contact")` fires on "Message Clinic" click
- [ ] `ttq.track("PlaceAnOrder")` fires on booking confirmation
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

## 11. Privacy & Compliance

- [ ] Cookie policy page updated to mention TikTok / `_ttp` cookie
- [ ] Cookie is categorised as "Marketing" (not "Analytics" or "Essential")
- [ ] No plaintext PII is sent to TikTok (all values are SHA-256 hashed)
- [ ] Event metadata (treatments, postcode, etc.) is non-PII conversion context only — never combined with unhashed identifiers

---

## 12. Build & Runtime Checks

- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes with no errors
- [ ] No TypeScript errors related to `window.ttq` types
- [ ] No console errors on pages where TikTok pixel loads
- [ ] Page load performance: TikTok script is `afterInteractive` and doesn't block rendering

---

## 13. TikTok Events Manager Verification

- [ ] Pixel shows as "Active" in TikTok Events Manager
- [ ] `PageView` events are flowing in
- [ ] `CompleteRegistration` events appear after test form submissions and OTP
- [ ] `Contact` events appear after "Message Clinic" clicks
- [ ] `PlaceAnOrder` events appear after booking confirmations
- [ ] Advanced Matching data quality shows "Manual" (not "Automatic")
- [ ] Match rate is reported (may take 24-48h to populate)

---

## Red Flags to Watch For

| Red Flag | Why It Matters |
| --- | --- |
| Unhashed email/phone in `ttq.identify()` | PII sent in plaintext to TikTok |
| TikTok script loading without consent check | PECR/GDPR violation |
| `identify` called without `await` | Race condition — event fires before identify completes |
| Automatic Advanced Matching enabled in TikTok dashboard | Scrapes form fields — could capture health data from DOM |
| `ttq.track` called outside of consent-gated helper | Bypasses consent management |
| `handleVerificationSuccess` or `onVerified` not made async | `await identifyForTikTok()` won't actually await |
| Missing events in the mapping table above | Incomplete implementation |

---

## Sign-Off

| Reviewer | Date | Status |
| --- | --- | --- |
| _______________ | __________ | Pass / Fail |

**Notes:**

---
