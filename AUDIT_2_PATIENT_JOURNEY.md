# Patient Journey Audit — End-to-End Flow

**Date:** 2026-02-16
**Scope:** Landing → Intake → Verification → Match results → Clinic profile → Choose clinic / Lead creation → Messaging / Booking intent
**Out of scope:** Security, SEO, clinic-side dashboard, admin panel

---

## Journey Overview

```
Landing Page (/)
  ↓ CTA "Find my clinic"
Intake Form (/intake)  — 8–12 steps depending on flow
  ↓ POST /api/leads  →  POST /api/match
Match Results (/match/[matchId])
  ↓ OTP / Google verification gate
  ↓ (verified)
Clinic Cards displayed
  ↓ "View Profile"              ↓ "Message"                ↓ Date picker → "Confirm Booking"
Clinic Profile (/clinic/[id])   Chat widget opens          Booking Confirm (/booking/confirm)
  ↓ Enquire / Message / Book    ↓ Send messages             ↓ POST /api/booking/request
  ↓                              ↓                           ↓
Lead created → Clinic notified  Conversation created        Email to clinic with confirm/decline links
```

---

## Step-by-Step Journey Table

### 1. Landing Page (`/`)

| Aspect | Detail |
|--------|--------|
| **Files** | `app/page.tsx`, `components/main-nav.tsx`, `components/mobile-nav-menu.tsx`, `components/clinic-carousel.tsx`, `components/loading-animation.tsx` |
| **Expected behaviour** | Hero section with animated headline, trust bar, "How it works" steps, comparison table, testimonials, CTA buttons all pointing to `/intake`. If user has a previous match in localStorage (`pearlie_last_match`, <30 days), show "Return to previous match" + "Start new search" dual CTAs instead. |
| **Entry points to intake** | 4 CTAs: hero button, trusted-clinics section button, bottom CTA section button, nav "Find my clinic" button. All link to `/intake`. |
| **Nav "My account" link** | Links to `/patient/login`. |
| **Failure modes** | |
| **F1 — Loading animation blocks mobile** | `showLoading` defaults to `true` on desktop (width ≥ 768). Content is set to `invisible` while loading animation plays. If `LoadingAnimation` never fires `onComplete`, content stays hidden forever. No timeout fallback. | ⚠️ LOW |
| **F2 — Stale localStorage match link** | `pearlie_last_match` is cleaned if >30 days, but a match deleted server-side (e.g. admin reset) would produce a working link that leads to a 404 on `/match/[id]`. Match page handles this with an error UI and "Start a new search" button, so not a dead end but a confusing detour. | ⚠️ LOW |
| **F3 — "How it works" scroll target** | `document.getElementById("how-it-works")` is used with `scrollIntoView`. Works correctly — the section has `id="how-it-works"`. | ✅ OK |

---

### 2. Intake Form (`/intake`)

| Aspect | Detail |
|--------|--------|
| **Files** | `app/intake/page.tsx` (1,344 lines), `lib/intake-form-config.ts`, `lib/intake/validation.ts`, `components/postcode-input.tsx` |
| **Expected behaviour** | Multi-step wizard. Two flows: **Planning** (10–12 steps) and **Emergency** (6 steps). Steps auto-advance on single-select, require explicit "Continue" on multi-select. Progress bar shows %. Form state persisted to localStorage (two independent systems — see F5). |
| **Planning flow** | Q1 Treatment → Q2 Postcode → Q2.5 Travel Distance → Q3 Priorities (max 2) → Q3.5 Anxiety → Q5 Concerns (max 2) → Q5.5 Best Time → Q6 When to Start → Q7 Cost Mindset → [Q7.5 Monthly Payments OR Q7.6 Budget Handling] → Q8 Contact Details → Submit |
| **Emergency flow** | Q1 Treatment (emergency only) → Q2 Postcode → Q2.5 Urgency → Q3.5 Anxiety → Q5.5 Best Time → Q8 Contact Details → Submit |
| **Submit sequence** | `POST /api/leads` → lead created → `POST /api/match` (with 3 retries, exponential backoff) → redirect to `/match/[matchId]` |
| **Failure modes** | |
| **F4 — Outside London hard block** | If postcode resolves to a region != "London" via postcodes.io, an `AlertDialog` blocks further progress. User can dismiss the dialog, but `postcodeValid` remains `false` so the Continue button stays disabled. **This is correct behaviour** but the dialog just says "Got it" — no waitlist signup or email capture to notify when expanding. Patient is a dead end. | 🔴 DEAD END |
| **F5 — Dual localStorage persistence race** | Two independent `useEffect` hooks save form state: one to `pearlie_intake_progress` (lines 104–115) and one to `pearlie_form_draft` (lines 307–319). Both fire on `[formData, step]` changes. On restore, both are read (lines 85–101 and 284–304). The `pearlie_form_draft` restore runs in a `setTimeout(() => setStep(targetStep), 100)` which can race with the `pearlie_intake_progress` restore that sets step synchronously. In practice the later effect wins, but this is fragile. | ⚠️ MEDIUM |
| **F6 — Postcode API failure = silent pass** | `PostcodeInput` catches network errors and sets `onValidChange(true)` (line 73), allowing the user to continue with an unverified postcode. If postcodes.io is down, the lead creation API will attempt geocoding again, and if that also fails, returns a 400 error — but by then the user has filled out the entire form. | ⚠️ MEDIUM |
| **F7 — Email not validated client-side** | Step 8 checks `formData.email` is truthy but performs no email format validation. Invalid emails (e.g. "foo") pass the form but may fail OTP send later, or worse, create a lead with an invalid email that can never be verified. The server-side `validateLeadData` also doesn't regex-validate email format. | 🔴 BUG |
| **F8 — Phone not validated at all** | Phone field accepts any string. No regex, no length check, no format hint beyond placeholder. | ⚠️ LOW |
| **F9 — Match failure after successful lead** | If all 3 match retries fail, the error toast says "Please try again or contact support" but the lead is already created. Pressing "Get my clinic matches" again creates a duplicate lead (unless duplicate detection catches it within 10 minutes). The `pearlie_failed_lead_id` is saved to localStorage but nothing consumes it — there's no retry mechanism on the UI. | 🔴 DEAD END |
| **F10 — Google Sign-In commented out** | Lines 1248–1281: the entire Google sign-in option on step 8 is wrapped in `{/* ... */}`. The "or" divider is also commented out. This means the only submission path is the manual "Get my clinic matches" button. Not a bug, but the code is still present and may confuse future developers. | ℹ️ INFO |
| **F11 — No back button on step 1** | The back button is `disabled` when `currentStepIndex === 0`. There's no way to exit the form except browser back or closing the tab. No "X" close button or "Return to home" link. | ⚠️ LOW |
| **F12 — Form abandonment tracking** | `beforeunload` fires `sendBeacon` to `/api/track`. If the user navigates within the SPA (e.g. clicking a link), `beforeunload` does NOT fire, so SPA-internal abandonments are not tracked. | ⚠️ LOW |

---

### 3. OTP / Email Verification (`/match/[matchId]` — verification gate)

| Aspect | Detail |
|--------|--------|
| **Files** | `app/match/[matchId]/page.tsx` (lines 499–548), `components/otp-verification.tsx`, `app/api/otp/send/route.ts`, `app/api/otp/verify/route.ts`, `lib/otp/generate.ts` |
| **Expected behaviour** | Match page loads and checks `isVerified` from the API response. If `false`, shows a verification gate: Google Sign-In button + OTP email code entry. OTP is 6 digits, auto-sent on mount, expires in 10 minutes, max 5 failed attempts. On success: sets `isVerified = true`, creates Supabase auth user for the patient, clears OTP hash. Also checks for existing Google session and auto-verifies if emails match. |
| **Verification bypass** | Google OAuth sign-in: if user signs in and their Google email matches the lead email, `POST /api/leads/[leadId]/verify-google` auto-marks the lead as verified. |
| **Failure modes** | |
| **F13 — OTP email deliverability = black box** | If Resend fails to deliver the email (spam filter, typo in email, etc.), the user sees "Sending verification code..." then the 6-digit input, but never receives a code. They can resend after 60s cooldown but there's no fallback (e.g. SMS, or "wrong email?" link). The `onBack` prop is passed but only renders a "Go back" link if provided — on the match page it is NOT provided (`onBack` is not passed to `OTPVerification`), so there's no way to go back and correct the email. | 🔴 DEAD END |
| **F14 — 5-attempt lockout with no recovery** | After 5 failed OTP attempts, the API returns 429 "Too many failed attempts. Please request a new code." The UI shows this error, and the "Resend" button is available. However, `sendOTP` resets `verification_attempts` to 0 on re-send, so recovery IS possible via resend. | ✅ OK |
| **F15 — Google auto-verify silent failure** | If the Google session check fails or the emails don't match, it silently falls through to OTP. The user isn't told why Google verification didn't work. | ⚠️ LOW |
| **F16 — Match page loads full data before verification** | `fetchInitialMatches()` runs on mount regardless of verification status. The API at `GET /api/matches/[matchId]` returns full clinic data including names, addresses, scores, and reasons. The verification gate only hides the UI — the data is already fetched and stored in `allClinicsData` state. A user could inspect network traffic to see all match data without verifying. (Note: this is a privacy concern, not a flow issue.) | ℹ️ INFO |

---

### 4. Match Results (`/match/[matchId]` — post-verification)

| Aspect | Detail |
|--------|--------|
| **Files** | `app/match/[matchId]/page.tsx`, `app/api/matches/[matchId]/route.ts`, `components/match-filters-panel.tsx`, `components/clinics-map.tsx`, `components/clinic-date-picker.tsx` |
| **Expected behaviour** | Shows ranked clinic cards (top 2 initially, "Show more" to reveal additional). Each card shows: clinic name, rating, verified badge, distance, match %, match breakdown popover, "Why we matched you" reasons, highlight chips, date picker for booking, and action buttons (View Profile, Call Clinic, Message). Filters panel on sidebar. List/Map toggle. |
| **Clinic card actions** | "View Profile" → navigates to `/clinic/[slug]?matchId=...&leadId=...`. "Call Clinic" → `tel:` link + tracks action. "Message" → navigates to clinic profile with `?chat=open`. Date picker → navigates to `/booking/confirm?clinicId=...&leadId=...&date=...&time=...`. |
| **Failure modes** | |
| **F17 — Zero matches = dead end** | If `allClinicsData.length === 0`, shows "No matching clinics found" with a "Start a new search" link to `/intake`. This is correct but could feel like a failure to the user who just spent 5 minutes filling out a form. No alternative actions offered (e.g. waitlist, browse directory, widen search). | 🔴 DEAD END |
| **F18 — Expansion banner is informational only** | When nearest clinic is >5 miles away, a banner says "We're expanding to your area." But there's no email capture, no notify-me button, no action. The user sees clinics that are far away with no promise of follow-up. | ⚠️ MEDIUM |
| **F19 — "Show more" increments by 1** | `setVisibleClinicsCount(prev => prev + 1)` — each click reveals exactly one more clinic. If there are 10 additional clinics, the user must click 10 times. Should probably increment by 2–3. | ⚠️ LOW |
| **F20 — handleClinicClick navigates to `/clinic/` not `/clinic/`** | Line 323: `window.location.href = /clinic/${clinicSlug}?matchId=${matchId}&leadId=${leadId || ''}`. This uses `window.location.href` (hard navigation) instead of `router.push()` (SPA navigation), causing a full page reload. The Link components on "View Profile" button (line 955) correctly use Next.js `<Link>` for SPA navigation. Inconsistent behaviour between clicking the clinic name vs. clicking "View Profile". | ⚠️ LOW |
| **F21 — leadId can be null in booking URL** | Line 943: `leadId=${match.lead_id}` where `match = { lead_id: leadId }` and `leadId` comes from state. If for some reason the leadId wasn't set (e.g. API returned no lead_id), the booking URL gets `leadId=null` as a string, which the booking page would try to fetch and fail. | ⚠️ LOW |
| **F22 — Filters can produce zero visible clinics** | Applying strict filters (e.g. verified only + <2 miles + free consultation) could filter out all clinics. A `needsExpansion` fallback exists but only triggers when `filters.distanceMiles !== null && filteredAndRankedClinics.length < 2`. Other filter combos that yield 0 results show an empty list with no guidance. | ⚠️ MEDIUM |
| **F23 — Match page not linked from anywhere after initial visit** | After the initial redirect from intake, the only way back is: localStorage `pearlie_last_match` on the home page (if verified), or the patient dashboard `/patient/dashboard` (if logged in). No link in the header, no email confirmation with a link to results. If the user closes the tab, finding their results again depends entirely on localStorage or logging in. | ⚠️ MEDIUM |

---

### 5. Clinic Profile View (`/clinic/[clinicId]`)

| Aspect | Detail |
|--------|--------|
| **Files** | `app/clinic/[clinicId]/page.tsx`, `components/clinic/profile/clinic-profile-content.tsx`, `components/clinic/profile/overview-tab.tsx`, `components/clinic/profile/services-tab.tsx`, `components/clinic/profile/reviews-tab.tsx`, `components/clinic/profile/details-tab.tsx`, `components/clinic/embedded-clinic-chat.tsx`, `components/clinic/direct-enquiry-form.tsx` |
| **Expected behaviour** | Full clinic profile page with: map, name/address, highlight badges, patient context banner (if from a match), tabbed content (Overview, Services, Reviews, Details). Right sidebar (desktop): date picker, "Message Clinic" / "Enquire now" button, embedded chat. Mobile: sticky bottom bar with "Message" + "Request a Visit" buttons that open bottom sheets. |
| **Route resolution** | `/clinic/[clinicId]` accepts both UUIDs and slugs. If a UUID is used but the clinic has a slug, the URL is silently replaced via `router.replace()` for clean URLs. Legacy route `/clinics/[clinicId]` (plural) redirects to `/clinic/[clinicId]` (singular). |
| **Match context** | If `?matchId=...` is in the URL, the page fetches match data to show "Why we matched you" reasons and patient context banner. |
| **Failure modes** | |
| **F24 — Clinic not found = basic error** | If the API returns !ok, `clinic` stays null and shows "Clinic not found" with a "Go back" button (`router.back()`). If the user arrived directly (no history), `router.back()` navigates to an empty tab. Should offer a "Go to home" fallback. | ⚠️ LOW |
| **F25 — "Book" without leadId redirects home** | In `handleBookAppointment()` line 158: if there's no `lead?.id`, `window.location.href = "/"`. This silently redirects to the homepage instead of explaining why booking isn't possible or prompting the user to complete the intake form. | 🔴 BROKEN FLOW |
| **F26 — Chat requires verification but no OTP on this page** | The embedded chat's `handleSend()` checks `lead.is_verified`. If unverified, returns 403 with "Please verify your email before sending messages." The error is shown in the chat panel. But there's no OTP verification component embedded in the clinic profile page — the user has to go back to the match page to verify. Not intuitive. | 🔴 BROKEN FLOW |
| **F27 — Direct enquiry form creates orphan lead** | If a user visits `/clinic/[id]` directly (no matchId, no leadId), the chat opens a `DirectEnquiryForm`. This creates a lead via `POST /api/leads/direct` with `source: "direct_profile"`, then shows OTP verification. However, after verification, `onLeadCreated` sets a local `directLeadId` in state, but no match record is created (only a `match_results` row). The user can now chat but has no match page to return to. If they close the tab, the lead exists in the system but the patient has no way to find their conversation again unless they log in via `/patient/login`. | ⚠️ MEDIUM |
| **F28 — Mobile chat/booking sheets don't prevent body scroll** | The mobile bottom sheets use `fixed inset-0` overlays but don't add `overflow-hidden` to the body. The user can potentially scroll the page behind the overlay. | ⚠️ LOW |

---

### 6. Choose Clinic / Lead Creation

| Aspect | Detail |
|--------|--------|
| **Files** | `app/api/leads/route.ts`, `app/api/leads/direct/route.ts`, `app/api/lead-actions/route.ts` |
| **Expected behaviour** | Two lead creation paths: (1) **Intake form** → `POST /api/leads` creates lead with full form data, then `POST /api/match` creates match + match_results. (2) **Direct profile enquiry** → `POST /api/leads/direct` creates lightweight lead with name/email/phone/treatment/urgency, plus match_results and lead_clinic_status rows for the specific clinic. |
| **Clinic notification** | When a patient clicks "Book" or "Call" from the match page, `POST /api/lead-actions` records the action and sends a detailed email to the clinic with patient details, form answers, conversion tips, and confirm/decline links (if booking). For direct profile leads, clinic is notified on OTP verification via `sendDirectLeadClinicNotification`. |
| **Failure modes** | |
| **F29 — Duplicate lead detection is narrow** | Duplicate check in `POST /api/leads` matches on `email + postcode + treatment_interest` within 10 minutes. If a user submits the same data with different treatments or after 10 minutes, a new lead is created. For `/api/leads/direct`, there is NO duplicate detection — repeatedly submitting the form creates multiple leads. | ⚠️ MEDIUM |
| **F30 — Rate limiting is in-memory only** | `createRateLimiter` stores counts in a JS Map. In a serverless environment (Vercel), each cold start resets the map. Effective rate limiting requires an external store (Redis, Supabase). | ⚠️ MEDIUM |
| **F31 — Lead action email can fail silently** | `sendClinicNotification` logs errors to `email_logs` table but the patient is never informed if the clinic wasn't notified. The booking confirmation page shows "They will contact you within 24-48 hours" regardless. | ⚠️ LOW |

---

### 7. Messaging / Chat

| Aspect | Detail |
|--------|--------|
| **Files** | `components/clinic-chat-widget.tsx` (floating widget), `components/clinic/embedded-clinic-chat.tsx` (in-page), `app/api/chat/send/route.ts`, `app/api/chat/messages/route.ts`, `hooks/use-chat-channel.ts` |
| **Expected behaviour** | Patient sends a message via `POST /api/chat/send`. Server creates/finds a conversation, inserts the message, triggers bot auto-responder (greeting + suggestions on first message, follow-up on subsequent messages before clinic replies). Realtime updates via Supabase channels + 30s polling fallback. Bot messages drip-fed with 1.5s typing delay. Email notification sent to clinic on each patient message. |
| **Bot behaviour** | First message: AI greeting (or template fallback) + AI suggestions. Subsequent messages (before clinic replies): AI follow-up (or template). After clinic replies: no more bot messages. Bot intelligence can be disabled per-clinic via `bot_intelligence` setting. |
| **Failure modes** | |
| **F32 — Unverified patients blocked from messaging** | `POST /api/chat/send` returns 403 if `lead.is_verified === false`. The embedded chat shows the error "Please verify your email before sending messages." But the clinic profile page has no OTP component — the patient must navigate back to `/match/[id]` to verify. This is the same as F26 above — it's a significant flow break. | 🔴 BROKEN FLOW |
| **F33 — Chat widget vs. embedded chat duplication** | Two separate chat components exist: `ClinicChatWidget` (floating bubble, used on unknown pages) and `EmbeddedClinicChat` (inline, used on clinic profile). They share the same APIs and realtime channel but have independent state. If both were rendered simultaneously, messages could appear in both with different timing. In practice, only `EmbeddedClinicChat` is used on the clinic profile page. `ClinicChatWidget` appears unused in the current flow. | ℹ️ INFO |
| **F34 — No message persistence for anonymous visitors** | If a visitor without a leadId opens the chat, they see `DirectEnquiryForm`. After creating a lead and verifying, the chat opens empty. Their original intent message that prompted them to "Enquire now" is lost — they have to re-type it. | ⚠️ LOW |

---

### 8. Booking Intent (`/booking/confirm`)

| Aspect | Detail |
|--------|--------|
| **Files** | `app/booking/confirm/page.tsx`, `app/api/booking/request/route.ts`, `app/api/lead-actions/route.ts`, `app/booking/clinic-response/page.tsx`, `app/api/booking/clinic-response/route.ts` |
| **Expected behaviour** | Patient selects a date/time from the clinic date picker (on match page or clinic profile) → redirected to `/booking/confirm?clinicId=...&leadId=...&date=...&time=...`. Page shows clinic info, appointment details, patient identity confirmation, and "Confirm Booking" button. On confirm: `POST /api/booking/request` updates the lead with booking details, generates a booking token, sends clinic notification email with confirm/decline links. Patient sees success page with "What happens next" info. |
| **Clinic response flow** | Clinic clicks confirm/decline link in email → `/booking/clinic-response?token=...&action=confirm|decline` → `POST /api/booking/clinic-response` updates booking status. |
| **Failure modes** | |
| **F35 — Booking page fetches lead data without auth** | `GET /api/leads/${leadId}` is called to display patient info. This endpoint may expose patient PII (name, email, treatment) to anyone with the leadId (a UUID, but still guessable if leaked). No authentication check on this fetch. | ⚠️ MEDIUM |
| **F36 — "Back to results" link uses leadId not matchId** | Line 203: `<Link href={/match/${leadId}}>` — this uses the leadId as if it were a matchId. This will 404 because the match page expects a matchId, not a leadId. Should be using the matchId from search params (but it's not available on this page). | 🔴 BUG |
| **F37 — No patient confirmation email** | After the patient confirms the booking, they see a success page but receive no email confirmation. The clinic gets an email, but the patient has no record of the booking details (date, time, clinic) outside of the browser tab. If they close the tab, the information is lost. | 🔴 MISSING |
| **F38 — Missing query params = poor error** | If any of `clinicId`, `leadId`, `date`, or `time` are missing from the URL, the page shows "Missing booking information. Please go back to your matches and select a time slot." with only a "Go back home" link. No smart recovery. | ⚠️ LOW |
| **F39 — Date picker availability is static/hardcoded** | `ClinicDatePicker` receives `availableDays` and `availableHours` props, but these come from the clinic database record which defaults to `["mon", "tue", "wed", "thu", "fri"]` and standard hours. There's no real-time availability checking — the "booking" is a request, not a confirmed slot. This expectation mismatch could frustrate patients who think they've booked a specific time. | ⚠️ MEDIUM |

---

### 9. Patient Dashboard & Return Visits (`/patient/dashboard`)

| Aspect | Detail |
|--------|--------|
| **Files** | `app/patient/dashboard/page.tsx`, `app/patient/login/page.tsx`, `app/api/patient/matches/route.ts`, `app/api/auth/send-login-link/route.ts` |
| **Expected behaviour** | Authenticated patients see their matches, conversations, and unread message counts. Login via Google OAuth or magic link email. Dashboard lists matches (treatment, postcode, date, clinic count) and conversations (clinic name, last message time, unread indicator). |
| **Failure modes** | |
| **F40 — Patient account creation is implicit** | Supabase auth users are created during OTP verification (`app/api/otp/verify/route.ts` line 98–133) or magic link login (`app/api/auth/send-login-link/route.ts` line 68–79). The patient is never told they have an "account" — no welcome email, no password, no explicit signup. They discover the dashboard only if they click "My account" in the nav. | ⚠️ MEDIUM |
| **F41 — Magic link for unknown emails creates user** | `send-login-link` creates a new Supabase auth user if one doesn't exist (line 68). But if the email has no associated leads, the dashboard shows empty lists. The user has no idea why. Error message on creation failure says "We couldn't find an account with that email. Please complete the intake form first." — but this only triggers if `createUser` itself fails, not if the user simply has no leads. | ⚠️ LOW |
| **F42 — Conversation links go to clinic profile, not a chat view** | Line 314: conversations link to `/clinic/${conv.clinic_id}?leadId=${conv.lead_id}`. This opens the full clinic profile page, and the chat panel isn't auto-opened (no `chat=open` param). The user has to manually click "Message" to see their conversation. | ⚠️ MEDIUM |

---

### 10. Legacy / Orphan Routes

| Route | Status | Detail |
|-------|--------|--------|
| `/book` | ⚠️ ORPHAN | Complete standalone intake form (618 lines) with different field names, no postcode validation, no matching integration. Submit handler calls `alert("Thank you!")`. Not linked from anywhere in the main flow. Appears to be a v0 prototype that was never removed. |
| `/clinics/[clinicId]` | ✅ Redirect | Redirects to `/clinic/[clinicId]` (singular). Preserves query params. |
| `/intake/google-complete` | ⚠️ UNUSED | Page for completing intake after Google sign-in OAuth callback. Referenced in commented-out code on the intake form (lines 1252). Not reachable via any active flow. |
| `/auth/confirm` | ⚠️ UNKNOWN | Email confirmation page. Not referenced by any active patient flow. May be used by Supabase auth internally. |

---

## Summary of Critical Issues

### Dead Ends (patient flow terminates with no recovery)

| ID | Location | Issue | Severity |
|----|----------|-------|----------|
| F4 | Intake / Postcode | Outside-London patients are hard-blocked with no waitlist, no email capture, no alternative | 🔴 HIGH |
| F9 | Intake / Submit | Match failure after lead creation leaves patient stuck with a toast error and no retry UI | 🔴 HIGH |
| F13 | Match / OTP | OTP email not received = no way to verify, no way to go back and fix email, no alternative auth | 🔴 HIGH |
| F17 | Match Results | Zero matches after completing the entire form = "Start new search" is the only option | 🔴 HIGH |

### Broken Flows (patient hits a wall mid-journey)

| ID | Location | Issue | Severity |
|----|----------|-------|----------|
| F25 | Clinic Profile | Booking without leadId silently redirects to homepage | 🔴 HIGH |
| F26/F32 | Clinic Profile / Chat | Unverified patients can't message, but verification is only available on match page | 🔴 HIGH |
| F36 | Booking Confirm | "Back to results" link uses leadId as matchId → 404 | 🔴 HIGH |
| F37 | Booking Confirm | No confirmation email to patient — booking details lost if tab closed | 🔴 HIGH |

### Missing Error States / Degraded UX

| ID | Location | Issue | Severity |
|----|----------|-------|----------|
| F5 | Intake | Dual localStorage persistence systems can race | ⚠️ MEDIUM |
| F6 | Intake | Postcode API failure silently allows invalid postcodes through | ⚠️ MEDIUM |
| F7 | Intake | No email format validation on client or server `validateLeadData` | 🔴 MEDIUM |
| F18 | Match Results | Expansion banner has no actionable CTA (no waitlist/notify) | ⚠️ MEDIUM |
| F22 | Match Results | Aggressive filtering can yield 0 results with no guidance | ⚠️ MEDIUM |
| F23 | Match Results | No durable link to match results (email, SMS, or bookmark prompt) | ⚠️ MEDIUM |
| F27 | Clinic Profile | Direct enquiry creates lead but patient has no way to find it later | ⚠️ MEDIUM |
| F29 | Lead Creation | No duplicate detection for direct profile leads | ⚠️ MEDIUM |
| F30 | Lead Creation | In-memory rate limiting resets on serverless cold starts | ⚠️ MEDIUM |
| F35 | Booking | Lead data fetched without authentication | ⚠️ MEDIUM |
| F39 | Booking | Static availability creates false expectation of confirmed slots | ⚠️ MEDIUM |
| F40 | Dashboard | Implicit account creation — patient never told they have an account | ⚠️ MEDIUM |
| F42 | Dashboard | Conversation links don't auto-open chat panel | ⚠️ MEDIUM |

---

## Recommended Priority Fixes

1. **Add OTP / verification to clinic profile page** (fixes F26, F32) — patients hitting "Message" or "Enquire" should be able to verify in-place, not be forced back to the match page.

2. **Add email format validation** (fixes F7) — client-side regex on step 8 and server-side in `validateLeadData`.

3. **Fix booking "Back to results" link** (fixes F36) — pass `matchId` through to the booking confirmation page and use it in the back link.

4. **Send patient booking confirmation email** (fixes F37) — after successful booking request, send the patient an email with date, time, clinic name, and clinic contact info.

5. **Add match failure retry UI** (fixes F9) — if matching fails, show a "Retry matching" button that calls `POST /api/match` with the existing `leadId` instead of forcing a full form re-submission.

6. **Add waitlist/notify for outside-London patients** (fixes F4) — capture email and postcode so the patient can be notified when their area is served.

7. **Email match results link to patient** (fixes F23) — after verification, send an email with a direct link to their match results page.

8. **Show zero-match alternatives** (fixes F17) — when no clinics match, offer to browse the directory, widen the search radius, or join a waitlist.
