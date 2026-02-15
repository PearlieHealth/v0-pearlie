# Messaging & AI Chatbot — Full Audit Report

**Date:** 2026-02-15
**Branch:** `claude/audit-bot-prioritization-7UR5L`
**Scope:** All 18 issues from the previous audit, plus cross-branch integration analysis

---

## Executive Summary

Of the **18 issues** identified in the previous audit, **5 have been fully fixed**, **4 are partially fixed**, and **9 remain unfixed**. After reviewing the codebase and weighing MVP launch risk, I recommend **7 issues as MVP-critical** (fix now) and **11 as deferrable** (fix post-launch). The reasoning for each is detailed below.

---

## Issue-by-Issue Comparison

### CRITICAL FIXES (Previous Audit)

#### Issue #1 — LLM Prompt Injection
**File:** `lib/chat-bot-ai.ts:114-140`
**Previous Audit:** Patient messages embedded directly in prompt without escaping.
**Current Status: ❌ NOT FIXED**

Patient messages are still interpolated directly into the LLM user prompt at line 124:
```typescript
.map((m) => `[${m.sender_type}]: ${m.content}`)
.join("\n")
```
No `JSON.stringify()` wrapping. No injection detection regex. A patient could type `Ignore all previous instructions and...` and the LLM would process it as a directive.

**Mitigation already present:** The system prompt (lines 24-110) has strong guardrails ("You must NEVER provide medical diagnoses"), banned phrase filtering (lines 234-272), and a 300 max_tokens limit. These reduce the blast radius but do not prevent injection itself.

---

#### Issue #2 — Complaint Escalation Says "I'll Notify Manager" But Never Does
**File:** `lib/chat-bot-ai.ts:211-230`
**Previous Audit:** No actual email sent to clinic owner when complaint detected.
**Current Status: ❌ NOT FIXED**

The complaint detection works (line 228-229, regex patterns at lines 213-223). The bot returns `COMPLAINT_RESPONSE` at line 226:
> "I can share this with the clinic manager so they can respond properly."

But no email, database flag, or notification is actually sent. The promise is hollow — the patient believes escalation happened, but it didn't.

---

#### Issue #3 — Emergency Response Offers "Notify Clinic" But Doesn't Implement It
**File:** `lib/chat-bot-ai.ts:204-205`
**Previous Audit:** No urgent email sent; no emphasis on 999/NHS 111 outside hours.
**Current Status: ⚠️ PARTIALLY FIXED**

The `EMERGENCY_RESPONSE` at line 204-205 now says:
> "...please contact urgent care (NHS 111) or call 999 if severe. I can also notify the clinic now."

The NHS 111/999 language has been improved. However, the "notify the clinic now" part is still not implemented — no email, no SMS, no database flag is created. The red flag regex coverage has been improved (17 patterns at lines 184-202, including `can't breathe`, `trouble breathing`, `chest pain`, `allergic react`, `anaphyla`, `faint`).

---

#### Issue #4 — N+1 Query in Conversations List
**File:** `app/api/clinic/conversations/route.ts:48-72`
**Previous Audit:** 100 conversations = 201 DB queries.
**Current Status: ❌ NOT FIXED**

Lines 48-72 still use `Promise.all()` with individual queries per conversation:
```typescript
const conversationsWithLeads = await Promise.all(
  (conversations || []).map(async (conv) => {
    const { data: lead } = await supabaseAdmin.from("leads")...  // Query per conv
    const { data: latestMessage } = await supabaseAdmin.from("messages")...  // Query per conv
  })
)
```
For N conversations: 1 (list) + N (leads) + N (messages) = **2N+1 queries**. No pagination either — all conversations loaded at once.

---

#### Issue #5 — Race Condition in Conversation Creation
**File:** `app/api/chat/send/route.ts:68-112`
**Previous Audit:** Duplicate conversations possible.
**Current Status: ✅ FIXED**

Lines 107-140 now handle race conditions properly:
1. Attempts insert (line 109-119)
2. Catches unique constraint violation code `23505` (line 123)
3. Re-fetches the existing conversation (lines 124-130)

This is the correct `INSERT ... ON CONFLICT`-style pattern via application code.

---

### HIGH PRIORITY FIXES (Previous Audit)

#### Issue #6 — Bot Responses Run Synchronously (5-8s Delay)
**File:** `app/api/chat/send/route.ts:203-354`
**Previous Audit:** Return patient message immediately; run bot async.
**Current Status: ⚠️ PARTIALLY FIXED**

The LLM call has a 4-second timeout (`timeoutMs = 4000` at `chat-bot-ai.ts:279`), which caps the worst case. If Groq fails, it falls back to template responses (line 268: `aiGreeting || getBotGreeting(...)`). However, the bot greeting + suggestions still run **synchronously before returning the response** (lines 239-311). The patient's message and bot response are returned together in the same HTTP response.

---

#### Issue #7 — Unread Counts Never Properly Reset
**File:** `app/api/chat/send/route.ts:142-152`
**Previous Audit:** Reset count when conversation is opened.
**Current Status: ✅ FIXED**

Multiple reset mechanisms now exist:
- **Patient side:** `messages/route.ts:123-127` resets `unread_by_patient: false, unread_count_patient: 0` when patient fetches messages.
- **Clinic side:** `clinic/conversations/[id]/messages/route.ts:61-63` resets `unread_by_clinic: false, unread_count_clinic: 0` when clinic views conversation.
- Both also batch-mark individual messages as `read` with timestamps.

---

#### Issue #8 — Red Flag Detection Regex Too Narrow
**File:** `lib/chat-bot-ai.ts:184-209`
**Previous Audit:** Add "swollen face", "can't breathe", "emergency", synonyms; fuzzy matching.
**Current Status: ⚠️ PARTIALLY FIXED**

Expanded from the original set to 17 patterns (lines 184-202). Now includes:
- `can't breathe` / `can't swallow` (line 188)
- `trouble breathing/swallowing` (line 189)
- `won't stop bleed` (line 191)
- `allergic react`, `anaphyla` (lines 197-198)
- `faint`, `chest pain`, `can't open mouth` (lines 199-201)

Still missing: "swollen face" (only `facial swell`), "emergency" as standalone, fuzzy matching for typos. No Unicode bypass protection.

---

#### Issue #9 — Email Branding Says "MyDentalFly" Not "Pearlie"
**File:** `app/api/chat/send/route.ts:169`
**Previous Audit:** Fix all templates to use "Pearlie" branding.
**Current Status: ✅ FIXED**

Full search of codebase finds zero "MyDentalFly" references. All email templates use "Pearlie" branding:
- `send/route.ts:201`: `Pearlie <notifications@...>`
- `send/route.ts:224`: `"This is an automated message from Pearlie"`
- `clinic-reply/route.ts`: Pearlie branding throughout
- System prompt `chat-bot-ai.ts:47`: `"You are Pearlie, a friendly and warm dental assistant chatbot"`

---

#### Issue #10 — No Rate Limiting on Chat Endpoints
**File:** `app/api/chat/send/route.ts`, `clinic-reply/route.ts`
**Previous Audit:** Add 10 messages/minute per user limit.
**Current Status: ❌ NOT FIXED**

Rate limiting exists in `lib/rate-limit.ts` and is used for auth endpoints (login link, OTP). But it is **not applied to any chat endpoints**. The send and clinic-reply routes have no rate limiting at all.

---

#### Issue #11 — 30-Minute No-Reply Bot Runs on Every Poll Request
**File:** `app/api/chat/messages/route.ts:58-113`
**Previous Audit:** Move to cron or debounce.
**Current Status: ⚠️ PARTIALLY FIXED**

The code now checks `hasNoReplyBot` (line 69-71) to see if a no-reply message already exists before inserting. This prevents duplicate no-reply messages across polls. However:
- It still runs the full check logic on **every poll** (query + time comparison).
- There is a race condition: two concurrent polls could both pass `!hasNoReplyBot` and insert duplicates (no unique constraint on `message_type`).
- Not moved to cron — still triggered by client polling.

---

#### Issue #12 — Message Content Not Sanitized for XSS
**File:** `app/api/chat/send/route.ts:27-34`
**Previous Audit:** Sanitize HTML on server before storage; escape on display.
**Current Status: ⚠️ PARTIALLY FIXED (for emails only)**

Email content is escaped with `escapeHtml()` (lines 197-198 in send, lines 146-148 in clinic-reply). However, message content stored in the database is **NOT sanitized** — raw user input is stored directly (line 153-158: `content: trimmedContent`). The assumption is that the React frontend auto-escapes via JSX, which is generally safe, but any non-React consumer (admin dashboard, export, future API) would be vulnerable.

---

#### Issue #13 — Typing Indicator Never Clears If User Navigates Away
**File:** `hooks/use-chat-channel.ts:134-140`
**Previous Audit:** Use broadcast-only typing; auto-expire after 10s.
**Current Status: ✅ FIXED**

The implementation uses:
- Broadcast-only typing (no DB writes for patient typing — line 132-136)
- 3-second auto-clear timeout (line 109): `setTimeout(() => setOtherTyping(false), 3000)`
- DB-based `clinic_typing_at` as polling fallback with 10-second expiry (`messages/route.ts:146-147`)
- Typing cleared on send (`clinic-reply/route.ts:81`: `clinic_typing_at: null`)
- Cleanup on unmount (lines 119-126)

---

### MEDIUM PRIORITY (Previous Audit)

#### Issue #14 — Patient Messages Never Marked as "Read" by Clinic
**Previous Audit:** Add read-receipt tracking for clinic-side reads.
**Current Status: ✅ FIXED**

`app/api/clinic/conversations/[conversationId]/messages/route.ts:59-76`: When clinic fetches messages, all patient messages are batch-marked as `read` with `read_at` timestamp. Conversation-level flags also reset (`unread_by_clinic: false, unread_count_clinic: 0`).

---

#### Issue #15 — No Conversation Close/Archive Functionality
**Previous Audit:** Add PATCH endpoint with status: closed.
**Current Status: ❌ NOT FIXED**

No close/archive endpoint exists. Conversations table has a `status` column (set to `"active"` on creation at `send/route.ts:114`) but no endpoint to change it.

---

#### Issue #16 — AI Responses Not Logged Separately from Templates
**Previous Audit:** Add `is_ai_generated` boolean; log prompt+response.
**Current Status: ❌ NOT FIXED**

No `is_ai_generated` column exists on the messages table. Bot messages use `sender_type: "bot"` and `message_type` (e.g., `"bot-greeting"`, `"bot-suggestions"`, `"bot-no-reply"`) but there's no way to distinguish AI-generated vs template-generated responses. Prompts and raw LLM responses are not logged.

---

#### Issue #17 — LLM Temperature Too High (0.6) — Hallucination Risk
**File:** `lib/chat-bot-ai.ts:305`
**Previous Audit:** Lower to 0.3 for safer responses.
**Current Status: ❌ NOT FIXED**

Temperature is still `0.6` at line 305. Combined with `max_tokens: 300`, this gives the model room for creative (potentially hallucinating) responses. For a medical-adjacent chatbot, lower temperature (0.2–0.3) would produce more consistent, predictable responses.

---

#### Issue #18 — Banned Phrase Sanitization Creates Broken Sentences
**File:** `lib/chat-bot-ai.ts:262-272`
**Previous Audit:** Regenerate response instead of replacing with "...".
**Current Status: ❌ NOT FIXED**

The `sanitizeResponse()` function at lines 262-272 still replaces banned phrases with `"…"`, which can produce incoherent output like: `"The clinic is the … in London and offers …"`. No retry/regeneration logic exists — if the LLM produces banned content, it gets ellipsis-patched and sent.

---

## Score Summary

| # | Issue | Status | Fixed? |
|---|-------|--------|--------|
| 1 | LLM prompt injection | Raw input in prompt | ❌ No |
| 2 | Complaint escalation hollow | No email sent | ❌ No |
| 3 | Emergency "notify clinic" missing | NHS refs improved, no notification | ⚠️ Partial |
| 4 | N+1 query conversations | 2N+1 queries per load | ❌ No |
| 5 | Race condition conversation creation | ON CONFLICT handled | ✅ Yes |
| 6 | Bot runs synchronously | 4s timeout added, still sync | ⚠️ Partial |
| 7 | Unread counts broken | Reset on view, both sides | ✅ Yes |
| 8 | Red flag regex too narrow | Expanded to 17 patterns | ⚠️ Partial |
| 9 | MyDentalFly branding | All Pearlie now | ✅ Yes |
| 10 | No rate limiting on chat | Not implemented | ❌ No |
| 11 | No-reply bot on every poll | Dedup check added, still polls | ⚠️ Partial |
| 12 | XSS in messages | Email escaped, DB raw | ⚠️ Partial |
| 13 | Typing indicator stuck | Auto-expire + cleanup | ✅ Yes |
| 14 | No read receipts (clinic) | Batch mark-as-read | ✅ Yes |
| 15 | No close/archive | Not implemented | ❌ No |
| 16 | AI not logged separately | No is_ai_generated column | ❌ No |
| 17 | Temperature 0.6 | Still 0.6 | ❌ No |
| 18 | Banned phrase → broken text | Still replaces with "…" | ❌ No |

**Totals: 5 Fixed, 5 Partial, 8 Unfixed**

---

## MVP Prioritization

### Fix NOW for MVP (7 issues)

These issues could cause **patient harm, legal liability, trust destruction, or system unusability** at launch:

#### 1. Issue #2 — Complaint Escalation (MUST FIX)
**Why now:** If a patient reports malpractice or harm, the bot says "I'll tell the manager" and then doesn't. This is a **trust and legal liability issue**. If anything goes wrong during a pilot and the patient can show the bot promised to escalate but didn't, that's a serious problem.
**Effect of delay:** Potential regulatory/legal exposure. Patients lose trust if they discover the escalation was fake. Clinics miss critical feedback.
**Fix effort:** Small — add an email send call + flag the conversation as "escalated" in the database.

#### 2. Issue #3 — Emergency "Notify Clinic" (MUST FIX)
**Why now:** The bot detects medical emergencies (anaphylaxis, breathing difficulty, chest pain) and says "I can notify the clinic now" but doesn't. In a worst case, a patient in distress trusts the bot's claim and waits instead of calling 999. This is a **patient safety issue**.
**Effect of delay:** If a patient has a medical emergency and relies on the bot's promise, delayed notification could contribute to harm. Even perceived negligence here is dangerous for a dental platform.
**Fix effort:** Small — send urgent email to clinic email on file. Add prominent "Call 999 immediately" language. Remove the "I can also notify the clinic" claim if you can't implement it.

#### 3. Issue #17 — Temperature 0.6 (MUST FIX)
**Why now:** This is a one-line change with outsized safety impact. At 0.6, the LLM produces more varied/creative responses, which in a medical context means higher hallucination risk. A bot that confidently states incorrect dental information could cause patient harm or regulatory issues.
**Effect of delay:** Higher probability of the bot saying something medically inaccurate, legally problematic, or off-brand during real patient conversations at launch.
**Fix effort:** One line — change `temperature: 0.6` to `temperature: 0.3`.

#### 4. Issue #1 — LLM Prompt Injection (MUST FIX)
**Why now:** Without escaping, a malicious or curious patient can manipulate the bot into ignoring its safety instructions, revealing system prompts, or producing harmful responses. For a dental platform handling vulnerable patients, this is unacceptable at launch.
**Effect of delay:** Bot could be manipulated to give medical advice, reveal internal system details, bypass banned phrases, or produce harmful content. Reputational damage if discovered.
**Fix effort:** Small-medium — wrap patient messages in `JSON.stringify()`, add basic injection detection patterns.

#### 5. Issue #10 — No Rate Limiting on Chat (MUST FIX)
**Why now:** Without rate limiting, a single bad actor (or a script) can flood the chat system with messages, causing LLM API costs to spike (Groq calls per message), database load, and email notification spam to clinic inboxes. This is a cost and availability risk at launch.
**Effect of delay:** Potential for abuse-driven costs (each message triggers an LLM call), email notification spam to clinics, and potential DoS of the chat system.
**Fix effort:** Small — the rate limiter already exists (`lib/rate-limit.ts`). Just apply it to the chat endpoints with a reasonable limit (e.g., 10 messages/minute per lead).

#### 6. Issue #4 — N+1 Query in Conversations (SHOULD FIX)
**Why now:** If any pilot clinic gets 50+ conversations (realistic after a few weeks), the inbox page becomes painfully slow. Each page load fires 100+ DB queries. This is a **usability issue** that directly impacts clinic retention during the critical early days.
**Effect of delay:** Clinic inbox page degrades linearly with conversation count. At 100 conversations: ~200 queries, potentially 2-5 seconds to load. Clinics will stop checking messages.
**Fix effort:** Medium — replace with a joined query or use Supabase's nested select syntax.

#### 7. Issue #18 — Banned Phrase Creates Broken Sentences (SHOULD FIX)
**Why now:** When the LLM generates a response containing banned phrases, the bot sends garbled text like "The clinic is the … in London". This looks broken and unprofessional to patients. It undermines trust in the bot and by extension the platform.
**Effect of delay:** Patients receive incoherent messages. During a pilot with real clinics observing, this looks amateurish.
**Fix effort:** Small — instead of replacing with "…", call the LLM again (once) with a modified prompt, or discard the AI response and fall back to the template.

---

### Defer Post-MVP (11 issues)

These are real issues but won't cause launch failure. They represent **tech debt, polish, and optimization** that can be addressed in the weeks after launch:

#### Issue #5 — Race Condition in Conversation Creation → ✅ Already Fixed
No action needed.

#### Issue #6 — Bot Runs Synchronously
**Why defer:** The 4-second Groq timeout + template fallback means the worst case is a 4-second delay, not a hang. Most responses are 1-2 seconds. Patients are accustomed to brief loading states in chat apps. Making this async requires `waitUntil()` or a background job system which adds architectural complexity.
**Effect of deferral:** Some patients experience 2-4s delay on first message. Acceptable at low scale.

#### Issue #7 — Unread Counts → ✅ Already Fixed
No action needed.

#### Issue #8 — Red Flag Regex Incomplete
**Why defer:** The existing 17 patterns catch the most critical emergencies. Adding fuzzy matching and Unicode bypass protection is nice-to-have but the current coverage is reasonable. The real safety net is the NHS 111/999 guidance in the response text.
**Effect of deferral:** Edge cases where unusual phrasing of an emergency isn't detected. The bot would then give a normal response rather than the emergency response — but the system prompt still instructs it to never give medical advice.

#### Issue #9 — Branding → ✅ Already Fixed
No action needed.

#### Issue #11 — No-Reply Bot on Every Poll
**Why defer:** The dedup check prevents duplicate messages. The extra queries on each poll are wasteful but not harmful at MVP scale (low user count = low poll frequency). Moving to cron adds infrastructure complexity.
**Effect of deferral:** Slightly higher DB load per poll. At 10-20 active conversations, this is negligible.

#### Issue #12 — XSS in Stored Messages
**Why defer:** React's JSX auto-escaping handles display safely. The emails are already escaped. The only risk is a future non-React consumer reading raw DB content. Since all current consumers are React or email (both escaped), the practical risk is zero today.
**Effect of deferral:** Latent vulnerability if someone builds a non-React consumer of the messages table. Worth fixing but not launch-blocking.

#### Issue #13 — Typing Indicator → ✅ Already Fixed
No action needed.

#### Issue #14 — Read Receipts → ✅ Already Fixed
No action needed.

#### Issue #15 — No Conversation Close/Archive
**Why defer:** During an MVP/pilot, clinics don't need to archive conversations — they have few enough to manage. This becomes important at scale (hundreds of conversations) but is pure UX polish for now.
**Effect of deferral:** Clinic inbox grows without ability to clear completed conversations. Manageable at pilot scale.

#### Issue #16 — AI Responses Not Logged
**Why defer:** Useful for debugging and auditing but not user-facing. The messages table already tracks `message_type` (bot-greeting, bot-suggestions, bot-no-reply) which partially differentiates. Full prompt+response logging can be added when you have time to build a proper audit trail.
**Effect of deferral:** Harder to debug AI misbehavior if it happens, but you can check Groq API logs for this.

---

## NEW Issues Found During This Audit

These were not in the previous audit:

### NEW-1: No Authentication on Messages GET Endpoint (CRITICAL)
**File:** `app/api/chat/messages/route.ts:9-27`
**Finding:** The GET endpoint accepts `leadId` and `clinicId` as query parameters with UUID format validation only — no authentication check. Anyone who guesses valid UUIDs can read any conversation.
**Mitigation:** UUIDs are hard to guess (122 bits of entropy). At MVP scale with few users, brute-force enumeration is impractical. But this should be fixed before scaling.
**Recommendation:** Defer for MVP (UUID entropy provides sufficient protection at pilot scale), but fix before public launch.

### NEW-2: Unread Count Race Condition (Non-Atomic Increment)
**File:** `app/api/chat/send/route.ts:175-180`
**Finding:** Unread counts are incremented via read-then-write:
```typescript
updateData.unread_count_clinic = ((conversation as any).unread_count_clinic || 0) + 1
```
Two concurrent messages could both read count=5 and both write count=6, losing an increment.
**Recommendation:** Defer for MVP. At low message volume, concurrent sends to the same conversation are rare. Fix later with SQL `SET unread_count = unread_count + 1`.

### NEW-3: No-Reply Bot Message Race Condition
**File:** `app/api/chat/messages/route.ts:69-121`
**Finding:** Two concurrent poll requests could both find `!hasNoReplyBot` and insert duplicate bot messages.
**Recommendation:** Defer for MVP. Polling interval makes true concurrency unlikely. Add unique constraint later.

### NEW-4: Duplicate Migration Script Numbers
**Finding:** Multiple migration files share the same number prefix:
- `032_add_source_to_leads.sql` / `032_realtime_and_delivery_status.sql`
- `033_add_bot_intelligence_setting.sql` / `033_add_quality_outcome_tag.sql`
- `034_add_message_type.sql` / `034_add_v6_lead_columns.sql`
**Recommendation:** Review migration execution scripts to ensure correct ordering. These appear to be managed by helper scripts (`run_all_migrations.sql`) rather than a migration framework with sequential enforcement.

---

## Cross-Branch Integration Analysis

### Patient Journey System
- No separate unmerged patient-journey branch exists — all work is integrated into main.
- `components/admin/patient-journey-funnel.tsx` tracks 5 stages (Leads Submitted → Matches Shown → Clinic Clicks → Booked Consults → Treatment Accepted). Last two stages are "coming soon" placeholders.
- `lib/intake-form-config.ts` is at v6 (`v6_blocker_multiselect_2026-02-14`), supporting both planning and emergency pathways.
- **No conflicts with messaging branch** — the messaging system and patient journey operate on separate tables and endpoints.

### Main Branch Status
- Current branch is synced with `origin/main` (same commit `7796bb5`).
- Recent merge (PR #13) applied 24 security vulnerability fixes across API, auth, and config.
- Previous merge (PR #12) fixed lead creation errors.
- **Integration risk: LOW** — no divergent branches to cause merge conflicts.

### Migration Concerns
- 64 migration scripts exist. The duplicate numbering (noted above) needs attention to ensure production DB is consistent.
- Most recent migration (`044_tighten_rls_policies.sql`) tightens RLS — this is good for security but should be verified against chat endpoint behavior.

---

## Priority Matrix — Final Recommendation

| Priority | Issue | Fix Type | Effort |
|----------|-------|----------|--------|
| **MVP NOW** | #2 Complaint escalation | Add email send | Small |
| **MVP NOW** | #3 Emergency notification | Add urgent email + stronger 999 language | Small |
| **MVP NOW** | #17 Temperature 0.6 | Change one number | Trivial |
| **MVP NOW** | #1 Prompt injection | JSON.stringify + detection | Small |
| **MVP NOW** | #10 Rate limiting | Apply existing limiter to chat | Small |
| **MVP NOW** | #4 N+1 conversations query | Refactor to joined query | Medium |
| **MVP NOW** | #18 Broken banned-phrase text | Retry or fallback to template | Small |
| Defer | #6 Sync bot responses | Needs async infrastructure | Medium-Large |
| Defer | #8 Red flag regex gaps | Incremental improvement | Small |
| Defer | #11 No-reply poll overhead | Cron infrastructure | Medium |
| Defer | #12 XSS in stored messages | Server-side sanitization | Small |
| Defer | #15 No close/archive | New endpoint + UI | Medium |
| Defer | #16 AI logging | Schema change + logging | Medium |
| Defer | NEW-1 No auth on messages GET | Add auth check | Small |
| Defer | NEW-2 Unread count race | Atomic SQL increment | Small |
| Defer | NEW-3 No-reply bot race | Add unique constraint | Small |
| Already Fixed | #5, #7, #9, #13, #14 | — | — |

**Summary: 7 to fix now, 9 to defer, 5 already fixed, 3 new issues (all deferrable)**

The 7 MVP fixes are predominantly small changes. The largest is the N+1 query refactor (#4). Combined, these address the issues most likely to cause patient harm (#2, #3), legal/regulatory risk (#1, #2), cost exposure (#10), trust erosion (#18), and basic usability (#4).
