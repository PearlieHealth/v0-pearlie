# Patient Dashboard Deep Audit Report

**Branch audited:** `claude/fix-messaging-issues-uaA8H`
**Date:** 2026-02-17
**Files reviewed:** ~5,000+ lines across 10 key files

---

## Issues by Severity

### CRITICAL (breaks booking or messaging)

#### C1. Mobile: chat thread does NOT switch when patient selects a different clinic
**File:** `app/patient/dashboard/page.tsx:578-585`
**Impact:** Patient could message the WRONG clinic after switching selection on mobile.

`handleSelectClinic` only calls `openConversationForClinic` on desktop (`if (!isMobile)`). On mobile, tapping a different clinic updates the hero booking card, but the chat overlay still shows the previous clinic's conversation. If the patient then opens the chat drawer via the sticky bar or "Message clinic" button, they may send a message to the previously selected clinic's thread.

```javascript
function handleSelectClinic(clinicId: string) {
  setSelectedClinicId(clinicId)
  // On desktop, also open the clinic's conversation in the right panel
  if (!isMobile) {                          // <-- MOBILE EXCLUDED
    openConversationForClinic(clinicId)
  }
  window.scrollTo({ top: 0, behavior: "smooth" })
}
```

**Fix:** Also call `openConversationForClinic(clinicId)` on mobile (without opening the chat drawer), so that the pending-chat or selected-conversation state stays in sync with the selected clinic.

---

#### C2. Patient sender type is NOT authenticated in `/api/chat/send`
**File:** `app/api/chat/send/route.ts:54-69 vs 93-99`
**Impact:** Any authenticated user (or unauthenticated if auth isn't checked) can send messages as any patient by providing an arbitrary `leadId` + `clinicId`.

When `senderType === "patient"`, the endpoint only checks that the lead is verified (`lead.is_verified`). It does NOT verify that the requesting user owns that lead. The clinic path correctly authenticates and checks `clinic_users`. A malicious user who knows a lead UUID could impersonate another patient.

**Fix:** Add auth check for patient senders: verify the authenticated user's ID or email matches the lead's `user_id` or `email`.

---

#### C3. Broken import from `@/components/ui/drawer`
**File:** `app/patient/dashboard/page.tsx:30-31`
**Impact:** Empty import may cause build error or runtime warning.

```javascript
import {
  // Drawer removed — mobile chat uses a plain fixed overlay for iOS keyboard compatibility
} from "@/components/ui/drawer"
```

This imports nothing from `@/components/ui/drawer`. Depending on bundler config, this may throw if the module doesn't exist or produce an unnecessary chunk load.

**Fix:** Remove the empty import entirely.

---

### HIGH (confusing / conversion drop)

#### H1. No typing indicator sent from dashboard chat composer
**File:** `app/patient/dashboard/page.tsx:1164-1169`
**Impact:** Clinics never see that the patient is typing when the patient uses the dashboard chat. Reduces perceived engagement from clinic side.

The dashboard's `<Input onChange>` handler only calls `setNewMessage(e.target.value)`. It never calls `sendTyping()` from the `useChatChannel` hook. The dedicated messages page (`app/patient/messages/page.tsx:366-368`) correctly calls `sendTyping()` on every input change.

**Fix:** Add `sendTyping()` (destructured from `useChatChannel`) to the onChange handler in both the desktop and mobile chat composers.

---

#### H2. No error feedback when message sending fails (dashboard)
**File:** `app/patient/dashboard/page.tsx:520-524`
**Impact:** If a message fails to send (network error, rate limit, verification required), the patient sees nothing. The message just disappears.

The `handleSend` function catches errors and `console.error`s them, but never shows an error to the user. The messages page properly shows error state with `setError(...)`.

**Fix:** Add an error state and display it in the chat composer area (e.g., "Failed to send. Tap to retry.").

---

#### H3. Mobile sticky bar only shows "Message" -- no booking CTA
**File:** `app/patient/dashboard/page.tsx:1340-1355`
**Impact:** On mobile, once the primary booking CTAs scroll out of view, the only sticky action is "Message clinic". The appointment booking CTA is lost, reducing conversion.

**Fix:** Add a secondary "Request appointment" button to the sticky bar, or change it to "Book" as the primary with "Message" as secondary.

---

#### H4. Quick prompts disappear after first message on mobile
**File:** `app/patient/dashboard/page.tsx:1300-1313`
**Impact:** On mobile, quick prompts (e.g. "Do you have availability today?") are only shown when `messages.length === 0`. Desktop shows them always (line 1150-1160). Mobile patients lose a helpful UX element after their first message.

**Fix:** Show quick prompts on mobile regardless of message count (same as desktop), or at least keep them visible for the first few messages.

---

#### H5. No fallback polling for messages in dashboard
**File:** `app/patient/dashboard/page.tsx` (missing)
**Impact:** The messages page has 30-second polling (`app/patient/messages/page.tsx:110-114`), but the dashboard relies entirely on Supabase Realtime. If Realtime disconnects silently, the patient won't see new clinic replies until they navigate away and back.

**Fix:** Add a fallback polling interval (30-60s) for the active conversation in the dashboard, same as the messages page.

---

#### H6. No analytics events on dashboard
**File:** `app/patient/dashboard/page.tsx` (missing entirely)
**Impact:** Cannot measure conversion funnel. No tracking for: recommended clinic viewed, "Book" clicked, "Message" clicked, clinic switched, chat created, or message sent. The match page has Intersection Observer tracking, but dashboard has none.

**Fix:** Instrument key events: `dashboard_viewed`, `clinic_card_viewed`, `message_cta_clicked`, `appointment_cta_clicked`, `clinic_switched`, `message_sent`, attributed to `matchId`, `clinicId`, `patientId`.

---

#### H7. Stale closure in `handleMessageClick` and `handleRequestAppointment` useCallback
**File:** `app/patient/dashboard/page.tsx:587-589, 591-655`
**Impact:** `handleMessageClick` captures a stale reference to `openConversationForClinic`. While the dependency array partially compensates (it includes `inboxConversations`), `openConversationForClinic` itself is not in the deps. This could cause the conversation lookup to use stale `allClinics` or `activeLeadId` in edge cases (e.g., match history switch).

**Fix:** Either wrap `openConversationForClinic` in `useCallback` with proper deps, or move the logic inline. Same for `handleRequestAppointment`.

---

#### H8. "Usually replies quickly" is hardcoded on mobile chat header
**File:** `app/patient/dashboard/page.tsx:1211`
**Impact:** This text appears for ALL clinics regardless of actual response time. Could erode trust if the clinic never replies or takes days.

**Fix:** Either remove it, or base it on actual average response time data (if available). At minimum, change to something neutral like "Online chat".

---

### MEDIUM (polish)

#### M1. N+1 query in patient conversations API
**File:** `app/api/patient/conversations/route.ts:54-69`
**Impact:** For each conversation, a separate query fetches the latest message. A patient with 20 conversations causes 21 database queries. Performance degrades with scale.

**Fix:** Use a SQL join, subquery, or `LATERAL JOIN` to fetch latest messages in a single query. Or use Supabase's `select` with a sub-relation if schema supports it.

---

#### M2. Inbox "Messages" header lacks background color (scrolls through)
**File:** `app/patient/dashboard/page.tsx:970`
**Impact:** The inbox header is `sticky top-0 z-10` but has no explicit background. When scrolling the inbox list, conversation items show through the header text.

**Fix:** Add `bg-white` or `bg-[#f8f7f4]` to the sticky header div.

---

#### M3. Google Maps iframe reloads on every clinic switch
**File:** `components/match/booking-card.tsx:460-474`
**Impact:** Each clinic switch destroys and recreates an iframe, causing a visible flicker and extra network requests. The map embed key is embedded client-side in the URL.

**Fix:** Consider using a static map image (Google Static Maps API) for the card, or cache/preload the iframe. Alternatively, use a lightweight map placeholder and only load the full embed on interaction.

---

#### M4. Unread count update is not atomic (race condition)
**File:** `app/api/chat/send/route.ts:226-232`
**Impact:** `unread_count_clinic` is read from the initial conversation fetch, then incremented and written back. If two messages are sent simultaneously, the count could be off by one.

```javascript
updateData.unread_count_clinic = ((conversation as any).unread_count_clinic || 0) + 1
```

**Fix:** Use a Postgres RPC or raw SQL with `SET unread_count_clinic = unread_count_clinic + 1` for atomic increment.

---

#### M5. Refresh loses conversation selection
**File:** `app/patient/dashboard/page.tsx` (state-only)
**Impact:** If the patient refreshes mid-chat, `selectedConvId` is lost. The inbox auto-selects the first unread or first conversation, which may differ from what the patient was viewing.

**Fix:** Persist `selectedConvId` in the URL as a query parameter (e.g., `?conv=uuid`) or in sessionStorage.

---

#### M6. Appointment picker shows all days as available when clinic has no opening_hours
**File:** `components/match/booking-card.tsx:213-243`
**Impact:** When `opening_hours` is empty AND `available_days` is empty, the `isOpen` flag defaults to `true` for all 14 days. The patient sees full availability when none may exist.

**Fix:** If no schedule data exists, show a message like "Opening hours unavailable — message the clinic to check availability" instead of showing all days.

---

#### M7. `formatPriceRange` defaults empty string to "Mid-range"
**File:** `components/match/booking-card.tsx:124-129`
**Impact:** If `price_range` is `""` or missing, the display shows "Mid-range" which could be inaccurate. Minor but potentially misleading.

**Fix:** Return an empty string or "Not specified" for missing values, and only show the price range row when data exists.

---

#### M8. Potential bot message duplication via Realtime + response
**File:** `app/patient/dashboard/page.tsx:492-518` and `app/api/chat/send/route.ts:467-480`
**Impact:** Bot messages are returned in the API response AND broadcast via Realtime. The client adds them from the response (with typing delay) and the `useChatChannel` hook may also receive them. Dedup by `msg.id` should prevent visual duplicates, but timing edge cases could briefly show a message twice.

**Fix:** Either skip broadcasting bot messages (since they're in the response), or add a flag to the broadcast to let the sender filter them out.

---

#### M9. Race condition in `handleRequestAppointment`
**File:** `app/patient/dashboard/page.tsx:591-655`
**Impact:** The function calls `openConversationForClinic(selectedClinicId)` (which sets pending chat state) and then immediately fires `fetch("/api/chat/send")`. If the fetch resolves while React is still processing the pending chat state update, the conversation ID from the response may conflict with the pending state.

**Fix:** Chain the operations: set up the conversation state first, then send the message. Or handle conversation creation entirely in the send response handler.

---

### LOW (nice-to-have)

#### L1. No message delivery status indicators in dashboard chat
**File:** `app/patient/dashboard/page.tsx:1097-1146`
**Impact:** The messages page shows sent/delivered/read status icons (`StatusIcon` component). The dashboard chat doesn't show any delivery status — patient doesn't know if message was delivered.

---

#### L2. Mobile inbox (mobileInboxOpen) shows conversation list but not clinic images
**File:** `app/patient/dashboard/page.tsx:1006-1049`
**Impact:** Unlike the dedicated messages page which uses letter avatars for all clinics, the dashboard inbox shows clinic images where available. Inconsistency between the two pages, but low impact.

---

#### L3. No message grouping by date in dashboard chat
**File:** `app/patient/dashboard/page.tsx:1097-1146`
**Impact:** The messages page groups messages by date ("Today", "Yesterday", etc.). The dashboard chat shows a flat list with only timestamps. Minor UX difference.

---

#### L4. Accessibility: many interactive elements lack ARIA labels
**Impact:** Screen reader users will have difficulty navigating. Specific issues:
- Mobile inbox toggle button (line 719) has no `aria-label`
- Mobile chat close button (line 1214) has no `aria-label`
- Sign-out avatar button on mobile has no `aria-label`
- Clinic switching cards have no `role="radio"` or equivalent
- Message composer input has no visible `<label>`, only placeholder

---

#### L5. Accessibility: focus not trapped in mobile chat overlay
**File:** `app/patient/dashboard/page.tsx:1189-1337`
**Impact:** When mobile chat overlay is open, keyboard/screen reader users can tab to elements behind it. Body scroll is locked but focus is not.

---

#### L6. Accessibility: contrast may not meet WCAG AA for some text
**Impact:** Text like `text-[#907EFF]/60` (purple at 60% opacity) on light backgrounds may fall below 4.5:1 contrast ratio. Affects: Pearlie bot label, some muted text.

---

#### L7. Clinic profile link in messages page points to wrong URL
**File:** `app/patient/messages/page.tsx:319, 677-688`
**Impact:** Links to `/clinic/${selectedConversation.clinic_id}?leadId=...` — this appears to be the clinic's own dashboard route, not a public profile. Patient clicking this would likely get an unauthorized error.

---

#### L8. Messages page doesn't use clinic images for avatars
**File:** `app/patient/messages/page.tsx`
**Impact:** Always shows letter avatar (purple circle with initial), never loads clinic images even though the data is available in `conv.clinics?.images`. Dashboard inbox does use images.

---

---

## Prioritized Fix Plan (conversion impact order)

### Phase 1: Critical Fixes (must fix before launch)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | **C1** — Mobile chat thread doesn't switch on clinic select | Small | Prevents wrong-clinic messaging |
| 2 | **C2** — Patient auth not verified in `/api/chat/send` | Small | Security: prevents impersonation |
| 3 | **C3** — Remove broken empty import from drawer | Trivial | Prevents build errors |

### Phase 2: Conversion-Critical Improvements

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 4 | **H3** — Add booking CTA to mobile sticky bar | Small | Direct conversion lift |
| 5 | **H2** — Add error feedback for failed message sends | Small | Prevents silent message loss |
| 6 | **H1** — Add sendTyping() to dashboard composer | Trivial | Clinic engagement signal |
| 7 | **H4** — Show quick prompts after first message on mobile | Trivial | UX parity with desktop |
| 8 | **H5** — Add fallback polling for dashboard chat | Small | Reliability for messages |

### Phase 3: Data & Reliability

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 9 | **H6** — Instrument analytics events on dashboard | Medium | Enables conversion measurement |
| 10 | **M4** — Make unread count update atomic | Small | Data accuracy |
| 11 | **M1** — Fix N+1 query in conversations API | Medium | API performance |
| 12 | **M5** — Persist conversation selection across refresh | Small | UX continuity |
| 13 | **M9** — Fix race condition in appointment request flow | Medium | Prevents state confusion |

### Phase 4: Polish

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 14 | **H7** — Fix stale closures in useCallback | Small | Prevents edge-case bugs |
| 15 | **H8** — Remove/conditionalise "Usually replies quickly" | Trivial | Trust accuracy |
| 16 | **M2** — Add background to inbox sticky header | Trivial | Visual fix |
| 17 | **M3** — Optimize map embed on clinic switch | Medium | Performance |
| 18 | **M6** — Handle missing opening hours in appointment picker | Small | Data accuracy |
| 19 | **M7** — Fix price range default value | Trivial | Data accuracy |
| 20 | **M8** — Deduplicate bot messages (response vs realtime) | Small | Prevents flicker |

### Phase 5: Accessibility & Nice-to-Have

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 21 | **L4** — Add ARIA labels to interactive elements | Medium | Accessibility compliance |
| 22 | **L5** — Trap focus in mobile chat overlay | Small | Accessibility compliance |
| 23 | **L6** — Fix contrast ratios | Small | Accessibility compliance |
| 24 | **L7** — Fix clinic profile link URL | Trivial | Prevents broken navigation |
| 25 | **L1** — Add delivery status indicators to dashboard chat | Small | UX parity |
| 26 | **L3** — Add date grouping to dashboard chat | Small | UX parity |
| 27 | **L8** — Use clinic images in messages page avatars | Trivial | Visual consistency |

---

## Summary

- **3 Critical issues** (wrong-clinic messaging on mobile, unauthenticated patient sends, broken import)
- **8 High issues** (no typing indicators, no error feedback, missing booking CTA on sticky bar, no analytics)
- **9 Medium issues** (N+1 queries, race conditions, missing data handling)
- **8 Low issues** (accessibility, visual consistency, UX parity between pages)

The most impactful fix for conversion is **C1 + H3**: ensuring mobile users can switch clinics correctly AND always see a booking CTA. These two fixes together address the core mobile conversion path.
