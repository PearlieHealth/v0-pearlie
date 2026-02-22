# Pearlie Patient Lifecycle — Audit & Redesign Plan

---

## PART A: Current State Audit

### A1. Identity & Verification — What Exists Today

| Question | Current Answer |
|----------|---------------|
| When is a user "verified"? | `leads.is_verified = true` after OTP success |
| How long does verification last? | Forever — `is_verified` never resets |
| What actions require verification? | Sending chat messages, requesting appointments |
| Is there re-verification? | No. Once verified, always verified. But **session** can expire (Supabase JWT ~1hr + refresh token) |

**Gap**: Verification (lead-level) and authentication (session-level) are conflated in the UX. A verified user whose session expired sees a full login form — not a quick re-auth.

### A2. Session Logic — What Persists Where

| Scope | What persists |
|-------|--------------|
| Within one session | Auth JWT cookie, selected clinic/conversation in React state |
| Across sessions (same device) | Supabase refresh token cookie, `localStorage` match data |
| Across devices | Nothing — cookies are per-browser |
| Across days/months | DB: leads, matches, conversations, messages, booking status. All permanent. |

**Gap**: No "remember me" or device linking. A patient on phone + laptop has two disconnected sessions.

### A3. Patient Intent States — What Exists Today

| State | How it's tracked | Transitions |
|-------|-----------------|-------------|
| 1. New (intake not started) | No lead record exists | → Intake completed |
| 2. Intake completed | `leads` row created, `is_verified = false` | → OTP verified |
| 3. OTP verified | `leads.is_verified = true`, Supabase auth user created | → Matches viewed |
| 4. Matches viewed | `matches.status = 'viewed'` (set on page load) | → Chat started OR Appointment requested |
| 5. Chat started | `conversations` row exists | → Ongoing conversation |
| 6. Appointment requested | `conversations.appointment_requested_at` set, `leads.booking_status = 'pending'` | → Confirmed / Declined / Expired(?) |
| 7. Appointment confirmed | `leads.booking_status = 'confirmed'` | → Completed(?) |
| 8. Returning user (new issue) | New `/intake` submission → new `leads` row + new `matches` row | Same cycle again |

**Gaps identified**:
- No "completed" state for appointments
- No "expired" state — pending requests live forever
- No "archived" state for old searches
- `matches.status` has `'booked'` but nothing ever sets it

---

## PART B: Correct Behaviour Decisions

### B1. Verification should be frictionless after first OTP

**Rule**: Once `is_verified = true`, the patient should NEVER see an OTP prompt again within the same product flow.

- "My Account" click → if session active, go straight to dashboard
- "My Account" click → if session expired, show a **quick re-auth** (email + OTP), NOT a "send login link" wall
- Chat or booking action → if verified but session expired, re-auth inline (don't bounce to `/patient/login`)
- Email magic link click → auto-login, land directly on target page

**What needs to change**:
- `main-nav.tsx` "My Account" link should be **session-aware**: link to `/patient/dashboard` if authenticated, `/patient/login` if not
- Patient login page already handles redirect if authenticated (middleware + client check) — the bug we just fixed ensures the session actually gets established

### B2. Chat must be ONE unified system

**Current state**: Already correct at the data layer. `UNIQUE(clinic_id, lead_id)` enforces one conversation per pair. All chat surfaces (dashboard, clinic profile, booking page) query the same `conversations` + `messages` tables.

**Risk area**: If a patient does two separate searches and both match the same clinic, they get TWO conversations with that clinic (different `lead_id`). The dashboard shows the clinic twice in the inbox.

**Decision**: This is acceptable for now — the conversations are contextually different (different treatment needs). But the UI should clarify which search each conversation belongs to.

**No structural change needed** — just a UI label improvement (show treatment interest on conversation list items).

### B3. Return to matches — always allowed

**Current state**: Already correct. Dashboard shows full match history. Patient can click any previous match to see those clinics. "Looking for another treatment?" button always visible.

**No change needed.**

### B4. Multiple appointment requests — allowed across clinics

**Current state**: Already correct at the architecture level.
- Deduplication is per-conversation (per clinic), NOT global
- Patient CAN request from clinic A, B, and C independently
- Each gets separate email, separate booking flow

**What's missing**:
- No way to **cancel** a pending request (button stays disabled forever)
- No **expiry** on pending requests (they live forever as "pending")
- No **completed** state after the appointment actually happens
- No visibility into request status from the dashboard (just "Requested" badge in chat)

### B5. Appointment request lifecycle — needs redesign

**Current states**: `pending` → `confirmed` | `declined` (that's it)

**Proposed states**:

```
requested  →  clinic_responded  →  confirmed  →  completed
    ↓              ↓                    ↓
 expired       declined            cancelled
    ↓              ↓                    ↓
 archived      archived            archived
```

**Rules**:
- `requested`: Patient sent request, waiting for clinic
- `clinic_responded`: Clinic proposed date/time (intermediate, if we add negotiation later)
- `confirmed`: Both sides agreed on date/time
- `completed`: Appointment happened (auto-set N days after confirmed date, or clinic marks it)
- `declined`: Clinic explicitly declined
- `cancelled`: Patient or clinic cancelled after confirmation
- `expired`: Auto-transition after 30 days if still `requested` with no clinic response
- `archived`: Terminal state for expired/declined/cancelled — visible in history only

**Key rule**: No state blocks new requests. A patient with 3 expired requests can still make a 4th.

---

## PART C: Lifecycle Redesign

### C1. Patient State Machine

```
                    ┌──────────────────────────────────────────────────┐
                    │                                                  │
   [Landing Page] ──→ [Intake Form] ──→ [OTP Verify] ──→ [Match Results]
                                              │                │
                                              │          ┌─────┴──────┐
                                              │          │            │
                                              ▼          ▼            ▼
                                        [Dashboard]  [Message     [Request
                                              │       Clinic]    Appointment]
                                              │          │            │
                                              │          ▼            ▼
                                              │     [Ongoing     [Booking
                                              │      Chat]       Lifecycle]
                                              │          │            │
                                              ▼          ▼            ▼
                                        [New Search] ────────────────┘
                                              │              (can always
                                              │               start new)
                                              ▼
                                        [New Matches] → (repeat cycle)
```

### C2. What persists per session vs per account

| Data | Scope | Storage |
|------|-------|---------|
| Auth session (JWT) | Per session, per device | Supabase cookie (auto-refresh) |
| Selected conversation | Per session | React state (ephemeral) |
| Leads (all searches) | Per account, permanent | `leads` table |
| Matches (all results) | Per account, permanent | `matches` table |
| Conversations | Per account, permanent | `conversations` table |
| Messages | Per account, permanent | `messages` table |
| Booking requests | Per account, permanent | `leads.booking_*` columns |
| Appointment status | Per account, permanent | `leads.booking_status` |
| Verification status | Per account, permanent | `leads.is_verified` |

**Nothing should be lost on session expiry.** All state lives in the DB. Session is just an auth gate.

### C3. Appointment request lifecycle rules

1. **Creation**: Patient picks date/time → `booking_status = 'requested'`, message posted in chat
2. **Clinic notification**: Email with confirm/decline links (existing flow)
3. **Clinic confirms**: `booking_status = 'confirmed'`, `booking_confirmed_at` set, patient notified via email + chat bot message
4. **Clinic declines**: `booking_status = 'declined'`, reason stored, patient notified. **Patient can request again** (clear `appointment_requested_at` on the conversation so button re-enables)
5. **Patient cancels** (NEW): Patient clicks cancel in dashboard → `booking_status = 'cancelled'`, clinic notified. Conversation `appointment_requested_at` cleared.
6. **Auto-expiry** (NEW): Cron/scheduled job checks for `booking_status = 'requested'` older than 30 days → sets `booking_status = 'expired'`. Clears `appointment_requested_at` on conversation.
7. **Completed** (NEW): Auto-set 1 day after `booking_date` if status is still `confirmed`. Or clinic marks via dashboard.
8. **Archived**: Expired, declined, cancelled, and completed requests move to history view. Never block new requests.

**Critical rule**: Declining/expiring/cancelling MUST clear `conversations.appointment_requested_at` so the "Request appointment" button re-enables.

### C4. Multi-search & multi-clinic interaction rules

1. Each intake form submission = 1 lead + 1 match set
2. Patient can have unlimited leads (unlimited searches)
3. Each lead can match to multiple clinics
4. Each (lead, clinic) pair = max 1 conversation
5. Each conversation = max 1 active appointment request at a time
6. But after decline/cancel/expire, a new request can be made in the same conversation
7. Different leads with the same clinic = separate conversations (this is correct — different treatment context)
8. Dashboard shows all conversations across all leads, sorted by `last_message_at`
9. Match history shows all previous searches, clickable to revisit

### C5. Abuse risk identification

| Risk | Current mitigation | Recommended addition |
|------|-------------------|---------------------|
| Spam appointment requests | 1 per conversation, rate limit on API | Add: max 5 active requests across all clinics at once |
| Fake leads / email spam | OTP verification required | Sufficient for now |
| Message spam to clinics | 10 msgs/min/conversation rate limit | Sufficient |
| Multiple accounts same person | None | Low priority — not harmful |
| Review manipulation | N/A (no reviews from patients yet) | Add review gating to confirmed appointments only (when reviews launch) |
| Bot/scraper abuse | Rate limiting on all endpoints | Add: CAPTCHA on intake form if abuse detected |

### C6. Navigation & session-awareness

**"My Account" in main nav should be smarter**:

| User state | "My Account" behavior |
|------------|----------------------|
| Authenticated patient | Link to `/patient/dashboard` directly |
| Unauthenticated but verified (session expired) | Link to `/patient/login` → quick OTP re-auth → redirect to dashboard |
| Never verified | Link to `/patient/login` → full OTP flow |

**Implementation approach**: Make the nav component check auth state on mount (lightweight `supabase.auth.getSession()` call — no server round-trip needed, reads from cookie). Show different href based on result.

### C7. Email link → auto-login → correct destination

| Email type | Link destination | Current state |
|-----------|-----------------|---------------|
| Clinic replied to message | `/patient/messages?conversationId=X` | Working (magic link) |
| Appointment request confirmation | `/patient/dashboard` | Working (magic link) |
| Clinic confirmed booking | `/booking/confirm?token=X` | No auto-login (gap) |
| Clinic declined booking | `/booking/clinic-response?token=X` | No auto-login (gap) |

**Fix needed**: Booking confirmation/decline pages should also use magic links for auto-login, or at minimum redirect to dashboard after action.

---

## PART D: Implementation Priority

### Phase 1 — Session & Auth Fixes (Quick Wins)

1. **[DONE]** Fix intake OTP session token generation (the bug we just fixed)
2. Make "My Account" nav link session-aware (show dashboard link if logged in)
3. Add session expiry detection in chat — show "Session expired, please re-login" instead of generic error

### Phase 2 — Appointment Lifecycle

4. Add "Cancel request" button for patients (clears `appointment_requested_at`, sets `booking_status = 'cancelled'`)
5. Re-enable "Request appointment" button after decline/cancel/expire (clear `appointment_requested_at`)
6. Add `booking_status = 'expired'` auto-transition (30-day rule) — can be a daily cron or checked on page load
7. Add `booking_status = 'completed'` auto-transition (1 day after `booking_date`)
8. Show appointment status clearly in dashboard (not just hidden in chat)

### Phase 3 — UX Polish

9. Show treatment context label on conversation list items (disambiguate multi-search conversations)
10. Add booking confirmation/decline magic links (auto-login)
11. Add "appointment history" section to dashboard showing all past/current requests with statuses

### Phase 4 — Abuse Prevention (When Needed)

12. Cap active appointment requests (e.g., max 5 concurrent pending)
13. Gate future reviews to confirmed appointments only
14. Add intake form rate limiting / CAPTCHA if bot abuse detected

---

## Summary

The core architecture is sound. The main gaps are:

1. **Session establishment** after intake OTP was broken → **now fixed**
2. **Appointment lifecycle is incomplete** — no cancel, no expiry, no completed state
3. **Nav is not session-aware** — "My Account" always goes to login page
4. **No appointment status visibility** outside of chat thread

The product should let patients compare freely, message multiple clinics, request multiple appointments, and return anytime. Restrictions should only exist to prevent abuse, not to funnel behavior.
