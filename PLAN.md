# Patient Flow Fix Plan — Detailed Assessment

## Item 1: Pending chat broken without active lead

**How can this happen?**
Patient visits dashboard → `activeLeadId` is derived from `latestMatch?.lead_id` (line 220). If the patient has no matches yet (e.g. new account, or all matches expired), `activeLeadId` is `null`. Patient clicks "Message" on a clinic card → `openConversationForClinic()` runs → line 680 checks `if (clinic && activeLeadId)` → both conditions must be true → with null `activeLeadId`, the entire block is skipped. Nothing happens. No error, no feedback.

**Fix:** Add a guard that shows a toast/error when `activeLeadId` is null, so the patient knows why messaging isn't working.

**Impact:** Zero risk. We're adding a user-facing message where currently nothing happens. No existing flow changes.

**Files to change:**
- `app/patient/dashboard/page.tsx` — add an `else` branch at ~line 680 that shows a toast: "Please complete a search first to message a clinic."

---

## Item 2: Session expiry not proactively detected

**How can this happen?**
Patient opens dashboard, session is valid. They leave the tab open for hours. Supabase session expires (default 1 hour). There's no `onAuthStateChange()` listener. The realtime subscription stops receiving messages silently. Polling continues but 401s are caught and ignored. Patient types a message → POST to `/api/chat/send` → gets 401 → error finally shown.

**Fix:** Add a Supabase `onAuthStateChange()` listener in the dashboard. When event is `SIGNED_OUT` or `TOKEN_REFRESHED` fails, show a "Your session has expired. Please log in again." banner with a login link.

**Impact:** Low risk. This is purely additive — a new `useEffect` that listens to auth state. Does not change any existing logic. Only adds a UI notification.

**Files to change:**
- `app/patient/dashboard/page.tsx` — add `useEffect` with `supabase.auth.onAuthStateChange()`, add an `isSessionExpired` state, and render a banner when true.

---

## Item 3: OTP hash cleared before session token generated

**How can this happen?**
Patient enters correct OTP → `verify/route.ts` line 69-75 immediately sets `otp_hash: null` and `verification_attempts: 0`. Then line 126, it calls `supabase.auth.admin.generateLink()` to get a session token. If this call fails (Supabase outage, timeout, rate limit), the OTP is already gone. Patient can't retry with the same code — they must request a new one.

**Fix:** Move the OTP hash clearing to AFTER the session token is successfully generated. Only clear the hash when `tokenHash` is confirmed.

**Impact:** Low risk. The change is: swap the order of two operations. If the token generation succeeds (99% of cases), behavior is identical. If it fails, the patient can retry their code instead of being stuck.

**Risk check:** Could this allow unlimited retries? No — the attempt counter is already at the correct value (not cleared on failure), and the 10-minute expiry still applies. We just preserve the hash until the full flow succeeds.

**Files to change:**
- `app/api/auth/patient-otp/verify/route.ts` — move the `update({ otp_hash: null, verification_attempts: 0 })` call from line 69 to after the `generateLink()` call succeeds (after line 131).

---

## Item 4: Reschedule accepts past dates

**How can this happen?**
Clinic uses the reschedule action → POST `/api/booking/clinic-action` with `action: "reschedule"`, `newDate`, `newTime`. Lines 109-124 update the lead with the new date. There's no validation that `newDate` is in the future. A typo like "2025-01-15" instead of "2026-01-15" would be accepted.

**Fix:** Add a date validation check before the reschedule update. If `newDate` is before today, return 400 error.

**Impact:** Zero risk. We're adding a guard condition before an existing update. No existing success path changes. Only blocks invalid dates.

**Files to change:**
- `app/api/booking/clinic-action/route.ts` — add 3-4 lines before the reschedule block that validates `new Date(newDate) >= today`.

---

## Item 5: `/book` page still publicly accessible

**How can this happen?**
Anyone navigates to `pearlie.org/book`. The page renders a fully functional-looking (but broken) intake form from v0 that uses hardcoded treatment lists and doesn't connect to the current APIs.

**Fix:** Delete `app/book/page.tsx` and `app/book/layout.tsx`. No code anywhere in the codebase links to `/book`. No API routes reference it. No redirects point to it. It uses only shared UI components (Button, Card, Input) that are used everywhere else — no dead code will be left behind.

**Impact:** Zero risk. The page is completely orphaned — no inbound links, no programmatic references, no shared state. Deleting it removes 2 files.

**Files to delete:**
- `app/book/page.tsx`
- `app/book/layout.tsx`

---

## Item 6: Duplicate lead creation on network failure

**How can this happen?**
Patient submits intake form → `handleSubmit()` runs → lead is created via POST to API → then POST to `/api/match` is attempted. If the match call fails (network error, 500, timeout), `localStorage.pearlie_form_draft` is NOT cleared (it's only cleared at line 521, after successful match). Patient sees error, refreshes page → form is still populated from localStorage → they re-submit → a NEW lead is created with duplicate data.

**Fix:** Clear `localStorage.pearlie_form_draft` immediately after the lead is successfully created, not after the match succeeds. The match can still be retried separately using `matchRetryLeadId` (which is already stored in localStorage at line 514).

**Impact:** Low risk. The form draft is only used to restore the form on page load. After the lead exists in the DB, there's no reason to keep the draft — the patient should never re-submit the same data. The retry mechanism for matching already works independently via `pearlie_failed_lead_id`.

**Files to change:**
- `app/intake/page.tsx` — move `localStorage.removeItem("pearlie_form_draft")` from line 521 to right after the lead creation succeeds (before the match attempt).

---

## Item 7: Realtime appointment status

**Decision:** Skip. Patients can wait 30 seconds for polling to catch up.

---

## Item 8: Expiry notification

**Decision:** Skip. If the appointment was requested and nobody acts on it for 30 days, auto-expire silently is the correct behavior.

---

## Item 9: Auto-complete without attendance verification

**Decision:** Agree — auto-complete should NOT happen without clinic confirmation. Currently `app/api/patient/matches/route.ts` lines 89-112 auto-mark confirmed appointments as "completed" 1 day after the booking date. This needs to be removed.

**Fix:** Remove the auto-complete logic entirely. Confirmed appointments stay as "confirmed" until the clinic explicitly marks them as "completed" (or they hit the 30-day expiry).

**Impact:** Medium risk. Need to verify:
1. What happens to "confirmed" appointments that are past their date but not completed? → They remain "confirmed" — harmless, just means the patient sees "confirmed" status in their dashboard.
2. Is there a clinic UI to mark as completed? → Will need to check, but removing auto-complete is still correct regardless.
3. Does any dashboard logic depend on "completed" status? → Will audit before implementing.

**Files to change:**
- `app/api/patient/matches/route.ts` — remove the auto-complete block (~lines 89-112).

---

## Item 10: Cancellation email to clinic

**Decision:** Not needed. There is no patient cancellation flow — the patient has to text the clinic directly via chat. No code change needed.

---

## Item 11: "My Account" nav doesn't distinguish clinic vs patient

**How it works now:** `main-nav.tsx` checks `isAuthenticated` (boolean). If true → link to `/patient/dashboard`. If false → link to `/patient/login`. It doesn't check the user's role. Clinic users see "My account" → `/patient/dashboard` → middleware catches it and redirects to `/clinic`. This causes an unnecessary round-trip redirect.

**Fix:** Fetch the user's role from `session.user.user_metadata.role` during the existing `useEffect` and set a `userRole` state. Then:
- `role === "clinic"` → link to `/clinic`
- Authenticated non-clinic → link to `/patient/dashboard`
- Not authenticated → link to `/patient/login`

**Impact:** Very low risk. The `getSession()` call already happens on line 19. We're just reading one extra field from the response we already have. The link destination changes, but for clinic users it's going to the same place they'd end up anyway (after the redirect). For patient users, nothing changes.

**Files to change:**
- `components/main-nav.tsx` — add `userRole` state, read from session, update href logic.
- `components/mobile-nav-menu.tsx` — same change.

---

## Item 12: In-memory rate limiting ineffective on Vercel

**How important is this?**

Moderately important in theory, but low priority in practice. On Vercel, each serverless function invocation can run on a different instance. Each instance has its own `Map()`. So an attacker sending 100 requests might hit 20 different instances, each seeing only ~5 requests — below the limit.

**However:** The rate limits protect against casual abuse (bot spam, accidental double-clicks), not determined attackers. The OTP flow has a separate, database-backed rate limit (stored in the `leads` table: `verification_attempts` and `verification_sent_at`). So the most critical flow is already properly protected at the DB level.

**Decision:** No change. The in-memory rate limiter still catches same-instance bursts and the DB-backed limits protect the critical paths. A Redis/KV upgrade is a "when we scale" concern.

---

## Item 13: Re-request rate limit after decline

**Should we add a limit?**

Yes. Currently after a clinic declines a booking, `booking_status` is set to `declined` and `appointment_requested_at` is cleared on the conversation. The patient can immediately re-request the same clinic.

**Fix:** Add a check: count previous declined leads for the same `email + clinic_id` pair. If 3 or more declines exist, block the request with a message: "This clinic has declined your previous requests. Please message them directly."

**Impact:** Low risk. Adds a single query in `/api/booking/request` before allowing the request. Existing success paths are unchanged. Only blocks the 4th+ request to a clinic that has declined 3 times.

**Files to change:**
- `app/api/booking/request/route.ts` — add a declined count check after the pending count check.

---

## Item 14: Pending count cap OR-filter edge case

**Current code** (booking/request, lines 79-82):
```js
const pendingFilter = lead.user_id
  ? `user_id.eq.${lead.user_id},email.eq.${lead.email}`
  : `email.eq.${lead.email}`
```

**Problem:** When `user_id` exists, it uses OR (user_id OR email). If the patient changed their email, old leads with the old email won't be counted. If two patients share an email (edge case), both are counted together.

**Fix:** When `user_id` exists, count by `user_id` only (not OR with email). When no `user_id`, count by email only:
```js
const pendingFilter = lead.user_id
  ? `user_id.eq.${lead.user_id}`
  : `email.eq.${lead.email}`
```

**Impact:** Zero risk. Simplifies the filter. In practice, both approaches give nearly identical results since email and user_id are 1:1 in normal use.

**Files to change:**
- `app/api/booking/request/route.ts` — simplify the OR filter.

---

## Item 15: Conversation list message preview enrichment can corrupt order

**Explanation:**
When the patient opens their inbox, the API fetches all conversations ordered by `last_message_at`. Then for each conversation, it fetches the latest message preview in parallel using `Promise.allSettled`. If one preview fetch fails, that conversation gets `latest_message: null` but is still included. After enrichment, the code re-sorts by `last_message_at`.

**After re-reading the code (lines 73-93):** The re-sort uses `last_message_at` from the **conversation record** (not the enriched message). Failed enrichments don't change the `last_message_at` field. The order is preserved correctly. The re-sort is redundant but harmless.

**Decision:** No change needed. The code is correct. The re-sort is a safety net, not a bug.

---

## Item 16: 1500ms hardcoded navigation delay after OTP verify

**What it is:** After the patient successfully verifies their OTP and the session is established, there's a `setTimeout(() => router.replace(...), 1500)` on line 138 of `app/patient/login/page.tsx`. The patient waits 1.5 seconds staring at a success screen before being redirected.

**Why it exists:** Mobile browsers (especially Safari) can be slow to persist cookies. The Supabase session cookie needs to be written before the redirect, or the middleware on the next page will think the patient isn't logged in and bounce them back to login.

**Fix:** Replace the fixed 1500ms delay with a polling approach:
1. After `verifyOtp` succeeds, start a loop that calls `supabase.auth.getUser()` every 200ms.
2. When `getUser()` returns a user (confirming the cookie is persisted), redirect immediately.
3. Timeout after 3 seconds and redirect anyway (fallback).

**Benefits:** On fast connections/desktop, redirect happens in ~200ms instead of 1500ms. On slow mobile, it still works via the fallback.

**What will it affect?** Only the post-OTP redirect timing. The session establishment logic is unchanged. The `getUser()` call is already used once on line 131 — we'd just poll it a few more times.

**Risk:** Very low. If polling somehow fails, the 3-second fallback ensures the redirect still happens (longer than current 1.5s, but more robust).

**Files to change:**
- `app/patient/login/page.tsx` — replace the `setTimeout` on line 138 with a polling loop.

---

## Item 17: Quick prompts inconsistent between desktop and mobile

**What it is:** On the patient dashboard, there are "quick prompt" buttons (pre-written messages like "What treatments do you offer?"). On desktop, they always show. On mobile, they only show if `messages.length <= 2` — they disappear once there are more than 2 messages.

This means desktop patients always see quick prompts (even mid-conversation), while mobile patients only see them at the start. Inconsistent behavior.

**Fix:** Apply the same `messages.length <= 2` condition on both platforms. Once a conversation is rolling, quick prompts are clutter.

**Impact:** Zero risk. Pure UI consistency change.

**Files to change:**
- `app/patient/dashboard/page.tsx` — apply the `messages.length <= 2` condition on the desktop quick prompt section.

---

## Item 18: Bot message delay lost on page reload

**Decision:** Skip. On reload, bot messages are historical — they should show immediately. The typing delay is only for real-time responses. Current behavior is correct.

---

## Item 19: Appointment date formatting

**Fix:** Standardize to short format with time, e.g. "Mon, 15 Feb at 2:30 PM" across all views.

**Impact:** Zero risk. Pure display change.

**Files to change:** Will audit all date formatting call sites in dashboard, clinic-action, and notification templates.

---

## Item 20: No conversation/message pagination

**What does it improve?** For patients with 10+ conversations and 100+ messages each, it would speed up initial page load and reduce data transfer.

**What does it affect?** Adding pagination requires API changes (limit/offset params) and frontend changes (infinite scroll or "load more" button). Medium-sized refactor.

**Decision:** Skip for now. Most patients have 1-5 conversations with <50 messages. This becomes a concern at scale.

---

## Item 21: Dead v0 match API — can we delete?

**Yes, safely.** `app/api/matches/route.ts` (POST) creates a match record. It is called from **zero places** in the codebase. Tagged with `[v0]` console logs.

**Important:** `app/api/matches/[matchId]/route.ts` (GET) IS actively used by 3 files. Only delete the POST route, NOT the dynamic GET route.

**Impact:** Zero risk. No code calls the POST route.

**Files to delete:**
- `app/api/matches/route.ts` (the POST handler only)

---

## Item 22: Email idempotency key fields not in Zod schemas

**What this is:** Each email type has a Zod schema that validates template data. For example, `patientOtpSchema` requires `{ otp: string }`. But the idempotency key generator uses `data._email` — a field NOT in the schema.

**How it actually works:** The idempotency key generator (line 63 in `lib/email/send.ts`) receives `params.data` (the raw input, which includes `_email`). The template renderer (line 99) receives `parseResult.data` (the Zod-parsed output, which strips unknown fields). So `_email` is available for dedup but stripped before rendering.

**Is this a bug?** No. It works as designed. The `_` prefixed fields are metadata for idempotency, intentionally not in the template schema. If a caller forgets `_email`, the key becomes `patient_otp:undefined:123456` — still unique per OTP, just less specific. The email still sends correctly.

**Decision:** No change needed. Working as designed.

---

## Item 23: Clinic users accidentally downgrading session on /patient/login

**What this is:** The middleware lets clinic users stay on `/patient/login` (the comment says "they can sign in with a different account"). If they go through the OTP flow, their clinic session gets replaced with a patient session. No warning is shown.

**How it happens in practice:** Clinic user clicks "My account" (which currently always points to `/patient/login` when they're on the public site — this is Item 11's bug). They see the patient login form, enter a patient email, verify OTP, and lose their clinic session.

**Will fixing Item 11 fix this?** Yes, for the primary path. Once "My account" correctly links clinic users to `/clinic`, they won't accidentally land on `/patient/login`. The edge case of manually navigating to `/patient/login` is acceptable.

**Decision:** Fixed by Item 11. No additional change needed.

---

## Implementation Order

### Batch 1 — Zero-risk deletions and guards:
| # | Description | Risk |
|---|-------------|------|
| 5 | Delete orphaned `/book` page | Zero |
| 21 | Delete dead POST `/api/matches` | Zero |
| 4 | Validate reschedule date > today | Zero |
| 14 | Simplify pending count filter | Zero |

### Batch 2 — Low-risk behavioral fixes:
| # | Description | Risk |
|---|-------------|------|
| 3 | Move OTP hash clearing after token generation | Low |
| 6 | Clear form draft after lead creation | Low |
| 1 | Add toast for messaging without active lead | Zero |
| 11 | Fix "My Account" nav to check role | Low |

### Batch 3 — Medium additions:
| # | Description | Risk |
|---|-------------|------|
| 2 | Session expiry detection banner | Low |
| 13 | Re-request limit (3 declines per clinic) | Low |
| 16 | Replace fixed delay with polling | Low |
| 9 | Remove auto-complete logic | Medium |
| 17 | Standardize quick prompts | Zero |
| 19 | Standardize date formatting | Zero |

### Skipped:
| # | Reason |
|---|--------|
| 7 | Not needed — 30s polling is fine |
| 8 | Not needed — silent 30-day expiry is correct |
| 10 | Not needed — no patient cancellation flow |
| 12 | Not important enough now — DB limits protect critical paths |
| 15 | Code is correct — no bug |
| 18 | Current reload behavior is correct |
| 20 | Not needed at current scale |
| 22 | Working as designed |
| 23 | Fixed by Item 11 |
