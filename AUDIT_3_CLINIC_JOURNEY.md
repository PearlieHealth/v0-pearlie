# Audit 3 — Clinic Journey End-to-End

**Date:** 2026-02-16
**Scope:** Clinic login/auth → profile management → dashboard → messaging → email notifications
**Cross-cutting:** Tenant isolation / cross-clinic data leakage

---

## Executive Summary

The clinic journey is functional end-to-end: invite-based signup, Supabase auth, profile editing with allowlist validation, a dashboard with paginated leads and charts, a messaging inbox with real-time typing indicators, and Resend-powered email notifications with retry and unsubscribe compliance.

**Critical findings:**
- `/api/chat/messages` (patient-facing) has **zero authentication** — anyone with a valid `leadId` + `clinicId` pair can read an entire conversation and trigger bot messages (HIGH)
- `/api/lead-actions` has **no auth** — any caller with a `leadId` + `clinicId` can trigger a clinic notification email (HIGH)
- RLS policies are permissive; all real isolation relies on manual `clinic_id` checks in each API route using `createAdminClient()`. One missed check = data leak (MEDIUM)
- Conversations API has an N+1 query — N conversations fire 2N individual queries (MEDIUM)
- Bot promises (complaint escalation, emergency clinic notification) are never fulfilled (MEDIUM)
- No rate limiting on invite verification, login, or any API endpoint (LOW–MEDIUM)

**Strengths:** Invite-only access, allowlist profile edits, HMAC-signed unsubscribe tokens, HTML-escaped email content, email logging, duplicate action prevention, notification preference checks.

---

## Journey Table

### Stage 1 — Clinic Login & Authentication

| Aspect | Detail |
|---|---|
| **Expected behavior** | Clinic staff receive an invite link from admin. They click it, set a password, and can then log in with email/password. Middleware redirects unauthenticated users to `/clinic/login`. Admin-created accounts are forced to `/clinic/set-password` before accessing the dashboard. Forgot-password sends a Supabase magic link. |
| **Files & functions** | |
| Login page | `app/clinic/login/page.tsx` — `handleLogin()` calls `supabase.auth.signInWithPassword()`, verifies `clinic_users` link, checks `must_change_password` |
| Accept invite page | `app/clinic/accept-invite/page.tsx` — Verifies token, enforces password rules (8+ chars, upper, lower, number), POSTs to accept-invite API |
| Verify invite API | `app/api/clinic/verify-invite/route.ts` — Uses `createAdminClient()`, checks token exists, not accepted, not expired |
| Accept invite API | `app/api/clinic/accept-invite/route.ts` — Creates auth user via `admin.createUser()`, inserts `clinic_users` row, marks invite accepted, rolls back on failure |
| Forgot password | `app/clinic/forgot-password/page.tsx` — Calls `supabase.auth.resetPasswordForEmail()` |
| Middleware | `middleware.ts:44-68` — Admin route protection via HMAC session cookie |
| Session refresh | `lib/supabase/middleware.ts` — `updateSession()` protects `/clinic/*` dashboard segments, allows public profile pages through |
| Auth helper | `lib/supabase/get-clinic-user.ts` — `getAuthUser()` tries cookie auth, falls back to Bearer token |
| Supabase clients | `lib/supabase/client.ts` (browser, anon key), `lib/supabase/server.ts` (SSR, anon key + cookies), `lib/supabase/admin.ts` (service role, bypasses RLS) |
| **Failure modes** | |
| F1.1 | No rate limiting on `/api/clinic/verify-invite` or `/api/clinic/accept-invite` — invite tokens (`crypto.randomUUID()`) have good entropy but endpoints could be brute-forced or abused for DoS |
| F1.2 | No rate limiting on login — Supabase has built-in rate limits but they are generous (default ~30 attempts/hour); custom rate limiting is absent |
| F1.3 | Login page checks `clinic_users` via browser client (anon key) after auth — if RLS on `clinic_users` is misconfigured, other users' clinic links could be queried |
| F1.4 | `getAuthUser()` Bearer fallback creates a Supabase client with `getAll: () => []` (empty cookies) — correct for token-only auth, but the stub `setAll: () => {}` silently drops any cookie updates |
| F1.5 | Invite token prompt uses `window.prompt()` — no validation before navigating to `/clinic/accept-invite?token=...` (cosmetic, but could confuse users with invalid tokens) |
| **Fix recommendations** | |
| R1.1 | **Add rate limiting** to invite verify/accept endpoints (e.g., 5 attempts per IP per minute) using Vercel Edge middleware or an in-memory store |
| R1.2 | **Add login rate limiting** on top of Supabase defaults — consider IP-based or email-based throttling |
| R1.3 | **Audit `clinic_users` RLS** — ensure browser-client queries can only return rows for `auth.uid()` |
| R1.4 | Low priority: Replace `window.prompt()` with an inline input field for invite token entry |

---

### Stage 2 — Profile Management

| Aspect | Detail |
|---|---|
| **Expected behavior** | Clinic admins/owners/managers can edit their clinic profile (name, address, hours, services, emergency toggle, "Why Choose Us", photos, treatments, pricing, highlight badges, etc.). An allowlist limits which fields can be written. Settings page manages webhook URLs, notification preferences, and booking confirmation methods. |
| **Files & functions** | |
| Profile page | `app/clinic/profile/page.tsx` — Large client component with tabs for basic info, hours, photos, before/after, treatments, pricing, badges, emergency toggle, "Why Choose Us" (`key_selling_points`), featured review |
| Settings page | `app/clinic/settings/page.tsx` — Integrations (webhook URL/secret, email forwarding), Notifications (new leads, booking confirmations, daily summary, weekly report, inactive reminders toggles), Booking confirmation settings |
| Profile API GET | `app/api/clinic/profile/route.ts:123-157` — Authenticates via `getAuthUser()`, gets `clinic_id` from `clinic_users`, returns full `clinics` row |
| Profile API PUT | `app/api/clinic/profile/route.ts:160-259` — Role check (`clinic_admin`, `clinic_owner`, `clinic_manager`), allowlist of 22+ fields via `EDITABLE_FIELDS` Set, validates emails, text lengths (max 5000), array sizes, treatment prices (0–99999), before/after images |
| Image upload | `app/api/clinics/upload/route.ts` — Auth check, stores files at `clinic-assets/clinic-photos/{clinicId}/{folder}/{filename}`, DELETE verifies `clinic_id` is in path |
| Me API | `app/api/clinic/me/route.ts` — Returns authenticated user's ID, email, role, clinic_id, clinic_name |
| **Failure modes** | |
| F2.1 | `EDITABLE_FIELDS` includes `bot_intelligence` and `notification_preferences` — clinics can disable bot intelligence or all notifications, which could break the patient experience silently |
| F2.2 | No server-side validation that `opening_hours` values are valid time strings or that closing time > opening time |
| F2.3 | `gallery_images` accepts up to 50 URLs but no URL validation (could store arbitrary strings or XSS-crafted URLs) |
| F2.4 | Profile GET returns `SELECT *` from `clinics` — all columns including `booking_webhook_secret`, `email_forwarding_address`, and internal fields are sent to the frontend. While only the authenticated clinic user can call this, a leaked JWT would expose secrets. |
| F2.5 | No audit trail for profile changes — no `updated_by` or `updated_at` tracking on the clinics table for who changed what |
| **Fix recommendations** | |
| R2.1 | **Exclude sensitive fields** from profile GET response — filter out `booking_webhook_secret`, `email_forwarding_address`, and any internal-only columns |
| R2.2 | **Validate `opening_hours`** server-side — ensure valid HH:MM format and closing > opening |
| R2.3 | **Validate URL fields** (gallery_images, logo_url, cover_image_url) — check they start with `https://` and belong to expected domains (Supabase storage) |
| R2.4 | **Add an audit log** for profile changes — record who changed which fields and when |
| R2.5 | Consider whether clinics should be allowed to toggle `bot_intelligence` off — if not, remove it from `EDITABLE_FIELDS` |

---

### Stage 3 — Dashboard (Viewing Leads & Notifications)

| Aspect | Detail |
|---|---|
| **Expected behavior** | Clinic dashboard shows KPI cards (total leads, new leads, booked, conversion rate), a 14-day lead activity bar chart, quick action links (View Leads, Inbox, Edit Profile), a "This Week" summary, and a paginated recent leads table. Auto-refreshes every 60 seconds. |
| **Files & functions** | |
| Dashboard page | `app/clinic/page.tsx` — `ClinicDashboardPage` component, `fetchData()` callback |
| Data flow | Calls `/api/clinic/profile` for clinic ID and info, then queries `match_results`, `conversations`, `leads`, `lead_clinic_status` via browser Supabase client scoped by `clinic_id` |
| Stats computation | Lines 246-312: Parallel aggregation queries for this-week, last-week, new, booked counts |
| Chart data | Lines 316-358: Fetches last 14 days of `match_results` + `lead_clinic_status` (BOOKED_CONFIRMED) |
| Pagination | `PAGE_SIZE = 20`, offset-based via `.range()` |
| Error handling | `SectionErrorBoundary` React class component renders amber fallback cards on error |
| Leads detail | `app/clinic/leads/[leadId]/page.tsx` — Individual lead view with status management |
| Leads list | `app/clinic/leads/page.tsx` — Full leads table with bulk actions |
| Bulk status | `app/api/clinic/leads/bulk-status/route.ts` — Validates clinic ownership via `clinic_users` (primary) or `clinic_portal_users` (legacy fallback), updates `lead_clinic_status` |
| Lead notes | `app/api/clinic/leads/[leadId]/notes/route.ts` — CRUD for lead notes, scoped by `clinic_id` |
| **Failure modes** | |
| F3.1 | Dashboard queries `match_results`, `conversations`, `leads`, and `lead_clinic_status` via **browser client (anon key)** — relies on RLS to prevent cross-clinic leakage. Current RLS policies allow **public SELECT** on `leads` and `matches`, so **any authenticated user could read any clinic's leads if they craft the right query from the browser console** |
| F3.2 | Line 267 uses string interpolation in a Supabase filter: `.not("lead_id", "in", \`(select lead_id from lead_clinic_status where clinic_id = '${clinicId}'...)\`)` — while `clinicId` comes from an authenticated profile fetch, this is a SQL injection risk pattern if the value is ever manipulated |
| F3.3 | `fetchData` fires ~10 sequential Supabase queries per load; page is slow with many leads |
| F3.4 | Bulk status API uses `getSession()` instead of `getUser()` — Supabase docs warn that `getSession()` reads from local storage and can be spoofed. Should use `getUser()` for server-side auth. |
| F3.5 | Bulk status API has a legacy fallback to `clinic_portal_users` table — dual auth tables create inconsistency and a wider attack surface |
| **Fix recommendations** | |
| R3.1 | **CRITICAL: Tighten RLS on `leads`, `match_results`, `lead_clinic_status`** — browser-client queries must only return rows for the authenticated user's clinic. Add policies: `SELECT WHERE clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())` |
| R3.2 | **Replace string interpolation** in Supabase filter with a parameterized approach or a database function |
| R3.3 | **Replace `getSession()` with `getUser()`** in `bulk-status/route.ts` for server-side auth |
| R3.4 | **Consolidate auth tables** — deprecate `clinic_portal_users` and migrate all users to `clinic_users` |
| R3.5 | Consider server-side data fetching (RSC) for dashboard to reduce client-side query count and eliminate browser-client RLS risk |

---

### Stage 4 — Messaging / Responding to Patients

| Aspect | Detail |
|---|---|
| **Expected behavior** | Clinics see conversations in the inbox, click to open a thread, and reply. Clinic replies send an email notification to the patient. A bot greets patients on match, shows "no reply yet" after 30 min, and confirms when the clinic first responds. Real-time updates via Supabase Realtime (broadcast channel for typing, postgres_changes for messages). |
| **Files & functions** | |
| Inbox page | `app/clinic/inbox/page.tsx` — Conversation list with search, unread badges, click-to-reply |
| Conversations API | `app/api/clinic/conversations/route.ts` — Auth via `getAuthUser()`, scoped by `clinic_id`, returns conversations with lead details and latest message |
| Conversation messages | `app/api/clinic/conversations/[conversationId]/messages/route.ts` — GET messages + POST clinic reply for a specific conversation |
| Clinic reply API | `app/api/chat/clinic-reply/route.ts` — Auth + clinic ownership check (`conversation.clinic_id !== clinicUser.clinic_id` → 403), inserts message, updates conversation counters, inserts bot "clinic replied" message, sends patient email notification |
| Patient chat messages | `app/api/chat/messages/route.ts` — **NO AUTH CHECK** — takes `leadId` + `clinicId` as query params, returns all messages, triggers bot "no reply" message after 30 min |
| Patient chat send | `app/api/chat/send/route.ts` — Patient sends messages; creates conversation if needed |
| Bot logic | `lib/chat-bot.ts` — Template-based bot messages (greeting, no-reply, clinic-replied) |
| AI bot | `lib/chat-bot-ai.ts` — LLM-powered bot responses via Groq, with emergency/complaint detection |
| Realtime hooks | `hooks/use-chat-channel.ts` — Subscribes to Supabase Realtime for typing indicators and new messages |
| Typing indicator | `app/api/clinic/typing/route.ts` — Sets `clinic_typing_at` timestamp on conversation |
| **Failure modes** | |
| F4.1 | **HIGH: `/api/chat/messages` has no authentication.** Anyone who knows (or guesses) a valid `leadId` + `clinicId` pair can read the full conversation history. UUIDs provide some obscurity but are not a security boundary — they appear in URLs, emails, and logs. This endpoint also **writes** to the database (inserts bot "no reply" messages, marks messages as read). |
| F4.2 | Conversations API has N+1 query: for N conversations, fires N lead queries + N latest-message queries = 2N+1 total (`route.ts:48-72`). At 50 conversations = 101 DB queries per page load. |
| F4.3 | LLM prompt injection: Patient messages are interpolated directly into the LLM prompt without escaping (`chat-bot-ai.ts`). System prompt guardrails and `max_tokens=300` limit blast radius but don't prevent injection. |
| F4.4 | Bot promises are hollow — complaint detection says "I'll share this with the clinic manager" but sends no email/notification. Emergency detection says "I can notify the clinic now" but doesn't. |
| F4.5 | `clinic-reply/route.ts` sends patient email notification inline — if Resend is slow, the clinic user waits. Email failure is caught but not surfaced to the clinic user. |
| F4.6 | No message content validation or length limits on clinic replies — a clinic could send an extremely long message that breaks email formatting |
| **Fix recommendations** | |
| R4.1 | **CRITICAL: Add authentication to `/api/chat/messages`** — require either a valid lead session token (for patients) or clinic auth (for clinic users). At minimum, require a signed token derived from the `leadId` to prevent enumeration. |
| R4.2 | **Fix N+1 query** in conversations API — use a Supabase join (`.select("*, leads(*), messages(*)")`) or a database view/function to fetch conversations with lead details and latest message in a single query |
| R4.3 | **Wrap patient messages** in `JSON.stringify()` or XML-escaped delimiters before LLM prompt injection to reduce prompt injection risk |
| R4.4 | **Implement complaint/emergency escalation** — when detected, insert a record into `clinic_notifications` or send an actual email to the clinic |
| R4.5 | **Add message length validation** — limit clinic reply content to a reasonable max (e.g., 5000 chars) |
| R4.6 | **Move email notification to background** — use a queue or fire-and-forget pattern so clinic reply response time isn't blocked by email delivery |

---

### Stage 5 — Email Notifications

| Aspect | Detail |
|---|---|
| **Expected behavior** | Clinics receive email when a patient clicks "Book Consultation" or "Call Clinic" (new lead). Patients receive email when a clinic replies. Emails include rich HTML with lead details, conversion tips, and confirm/decline buttons. Unsubscribe is supported via HMAC-signed tokens. All email sends are logged to `email_logs`. |
| **Files & functions** | |
| Email send utility | `lib/email-send.ts` — `sendEmailWithRetry()`: Resend API with 3 attempts, exponential backoff (500ms, 1s, 2s), skips retry on validation errors |
| Email config | `lib/email-config.ts` — `EMAIL_FROM` constants for notification sender addresses |
| Unsubscribe | `lib/unsubscribe.ts` — HMAC-SHA256 signed tokens via `SUPABASE_JWT_SECRET`, `timingSafeEqual` for verification, RFC 8058 `List-Unsubscribe-Post` headers, checks `email_preferences` table |
| Lead action email | `app/api/lead-actions/route.ts` — Sends clinic notification on patient action, checks `notification_preferences.new_leads`, falls back to `notification_email` or `email`, logs to `email_logs`, HTML-escapes all user content via `escapeHtml()` |
| Clinic reply email | `app/api/chat/clinic-reply/route.ts:127-190` — Sends patient notification on clinic reply, checks unsubscribe status, includes unsubscribe headers/footer, HTML-escapes content, truncates to 500 chars in preview |
| Booking confirm email | `app/api/booking/confirm/route.ts` — Sends confirmation emails, respects notification preferences |
| Email templates | `lib/email-templates.tsx` — Shared email template components |
| HTML escaping | `lib/escape-html.ts` — `escapeHtml()` function used across all email generation |
| **Failure modes** | |
| F5.1 | **HIGH: `/api/lead-actions` has no authentication.** Any caller who knows a `leadId` + `clinicId` can trigger a clinic notification email. The duplicate prevention (`23505` unique constraint) limits to one email per action type, but the first call is unprotected. |
| F5.2 | `lead-actions` email generation uses inline HTML with string concatenation (`generateEmailHTML`). While user content is escaped via `escapeHtml()`, the email is 470 lines of template string — easy to miss an escape in future edits |
| F5.3 | Unsubscribe uses `SUPABASE_JWT_SECRET` as HMAC key — if this secret rotates, all existing unsubscribe links break |
| F5.4 | No email templating system — emails are raw HTML strings in API route files, making maintenance difficult and inconsistent styling likely |
| F5.5 | `lead-actions` awaits email before returning (`await emailPromise` at line 135) — clinic-facing API response time includes email delivery latency |
| F5.6 | Email error logging writes to `email_logs` via admin client — if the Supabase write fails, the error is silently swallowed (only console.error) |
| **Fix recommendations** | |
| R5.1 | **CRITICAL: Add authentication to `/api/lead-actions`** — require a valid patient session (from the match page flow) or a signed token to prevent unauthorized email triggering |
| R5.2 | **Move to a template engine** — use React Email or MJML for email templates to centralize styles and reduce inline HTML risk |
| R5.3 | **Use a dedicated HMAC secret** for unsubscribe tokens instead of reusing `SUPABASE_JWT_SECRET` |
| R5.4 | **Make email sending non-blocking** in `lead-actions` — return the API response immediately and process email in background (with serverless caveat: use `waitUntil()` if available on Vercel) |
| R5.5 | Add a **dead-letter mechanism** for failed email log writes — retry or alert on double failure |

---

### Stage 6 — Tenant Isolation (Cross-Clinic Data Leakage)

| Aspect | Detail |
|---|---|
| **Expected behavior** | Each clinic should only see and modify its own data: leads, conversations, messages, profile, team, settings. No clinic should be able to access another clinic's data through any path. |
| **Files & functions** | |
| RLS policies | `scripts/003_fix_rls_policies.sql` — Initial policies: public SELECT on `clinics`, `leads`, `matches`, `events`; public INSERT on `leads`, `matches`, `events`; public UPDATE on `matches` (dropped in 044) |
| Tightened RLS | `scripts/044_tighten_rls_policies.sql` — Drops public UPDATE on `matches`, tightens `clinic_invites` to clinic-member-only SELECT/INSERT/DELETE |
| Chat RLS | `scripts/036_fix_chat_rls_policies.sql` — Chat-specific RLS adjustments |
| API pattern | All `/api/clinic/*` routes use `createAdminClient()` (bypasses RLS) with manual `clinic_id` scoping via `clinic_users` lookup |
| Profile API | Scoped: `getAuthUser()` → `clinic_users.clinic_id` → `clinics.eq("id", clinic_id)` |
| Conversations API | Scoped: `getAuthUser()` → `clinic_users.clinic_id` → `conversations.eq("clinic_id", ...)` |
| Clinic reply | Double-checked: gets `clinic_id` from auth, then verifies `conversation.clinic_id === clinicUser.clinic_id` |
| Image upload | Path-scoped: files stored at `clinic-assets/clinic-photos/{clinicId}/...`, DELETE checks `path.includes(clinicUser.clinic_id)` |
| Public clinic API | `app/api/clinics/[clinicId]/route.ts` — Returns only safe fields for live clinics; preview mode requires authenticated clinic ownership |
| Webhook test | `app/api/clinic/webhook-test/route.ts` — Auth + clinic_id scoping, fetches only authenticated clinic's webhook URL |
| **Failure modes** | |
| F6.1 | **RLS is permissive for browser-client queries.** The dashboard (`app/clinic/page.tsx`) queries `match_results`, `leads`, `conversations`, and `lead_clinic_status` via the **browser Supabase client** (anon key). Current RLS allows public SELECT on `leads` and `matches`. A malicious clinic user could open the browser console and query `supabase.from("leads").select("*")` to see **all** leads across all clinics. |
| F6.2 | **`/api/chat/messages` has no auth and no clinic scoping** — given any `leadId` + `clinicId`, it returns all messages. This is the most direct cross-clinic (and cross-patient) leakage vector. |
| F6.3 | **`/api/lead-actions` has no auth** — given any `leadId` + `clinicId`, it records an action and sends the clinic a notification email containing the patient's full contact details and treatment info |
| F6.4 | All API routes rely on `createAdminClient()` (service role, bypasses RLS) with manual clinic_id checks. If any current or future API route forgets to check `clinic_id`, data leaks silently. This is a **structural weakness** — defense should be in-depth with RLS as a safety net. |
| F6.5 | Image upload DELETE uses `path.includes(clinicUser.clinic_id)` — this is a substring check, not a prefix check. A specially crafted path containing another clinic's ID as a substring could theoretically bypass this (very unlikely with UUIDs, but the pattern is fragile). |
| F6.6 | `bulk-status` API falls back to `clinic_portal_users.clinic_ids` (an array column) — if a legacy user has multiple clinic IDs, they could update leads for clinics they shouldn't access anymore |

| **Fix recommendations** | |
|---|---|
| R6.1 | **HIGH PRIORITY: Implement proper RLS policies** for `leads`, `match_results`, `conversations`, `messages`, and `lead_clinic_status`. Policies should check `auth.uid()` against `clinic_users.user_id` and scope all SELECT/UPDATE/DELETE to the user's clinic. This creates defense-in-depth regardless of admin client usage in APIs. |
| R6.2 | **Add authentication to `/api/chat/messages` and `/api/lead-actions`** — these are the two most exploitable unauthenticated endpoints |
| R6.3 | **Replace `path.includes()` with a proper path prefix check** in image upload DELETE — e.g., `path.startsWith(\`clinic-assets/clinic-photos/${clinicUser.clinic_id}/\`)` |
| R6.4 | **Deprecate `clinic_portal_users`** — consolidate all auth into `clinic_users` to eliminate the dual-table attack surface |
| R6.5 | **Add integration tests** for tenant isolation — for each API endpoint, write a test that authenticates as Clinic A and attempts to read/write Clinic B's data |

---

## Severity Summary

| # | Issue | Severity | Stage | Fix Effort |
|---|---|---|---|---|
| F4.1 / F6.2 | `/api/chat/messages` — no auth, full conversation readable | **HIGH** | 4, 6 | Small — add auth check |
| F5.1 / F6.3 | `/api/lead-actions` — no auth, triggers emails with patient PII | **HIGH** | 5, 6 | Small — add auth check |
| F6.1 / F3.1 | Browser-client queries + permissive RLS = cross-clinic reads | **HIGH** | 3, 6 | Medium — write RLS policies |
| F3.2 | String interpolation in Supabase `.not()` filter (potential SQL injection pattern) | **MEDIUM** | 3 | Small — use parameterized query |
| F3.4 | `getSession()` instead of `getUser()` in bulk-status (spoofable) | **MEDIUM** | 3 | Small — swap function call |
| F4.2 | Conversations N+1 query (2N+1 DB calls) | **MEDIUM** | 4 | Medium — use join/view |
| F4.3 | LLM prompt injection — patient messages unescaped in prompt | **MEDIUM** | 4 | Small — wrap in JSON.stringify |
| F4.4 | Bot promises (complaint, emergency) never fulfilled | **MEDIUM** | 4 | Medium — implement notification |
| F2.4 | Profile GET returns `SELECT *` including webhook secrets | **MEDIUM** | 2 | Small — add field filter |
| F6.4 | Admin client everywhere — structural weakness (no defense-in-depth) | **MEDIUM** | 6 | Large — RLS overhaul |
| F1.1 | No rate limiting on invite endpoints | **LOW** | 1 | Small — add middleware |
| F1.2 | No rate limiting on login | **LOW** | 1 | Small — add middleware |
| F2.1 | Clinics can disable bot_intelligence via profile edit | **LOW** | 2 | Small — remove from allowlist |
| F2.2 | No opening_hours time format validation | **LOW** | 2 | Small — add regex |
| F2.3 | No URL validation on gallery_images | **LOW** | 2 | Small — add URL check |
| F2.5 | No audit trail for profile changes | **LOW** | 2 | Medium — add logging |
| F5.3 | Unsubscribe HMAC reuses SUPABASE_JWT_SECRET | **LOW** | 5 | Small — add dedicated env var |
| F6.5 | Image delete uses substring check for clinic_id | **LOW** | 6 | Small — use prefix check |
| F6.6 | Legacy `clinic_portal_users` dual-table risk | **LOW** | 6 | Medium — migration |

---

## Recommended Fix Priority

### Fix Now (Pre-Launch / MVP-Critical)

1. **Add auth to `/api/chat/messages`** (F4.1) — require signed patient token or clinic auth
2. **Add auth to `/api/lead-actions`** (F5.1) — require patient session from match flow
3. **Tighten RLS policies** on `leads`, `match_results`, `conversations`, `messages`, `lead_clinic_status` (F6.1) — scope all browser-client queries to authenticated user's clinic
4. **Replace `getSession()` with `getUser()`** in bulk-status API (F3.4) — one-line fix
5. **Filter sensitive fields** from profile GET response (F2.4) — exclude webhook secret etc.
6. **Replace string interpolation** in dashboard Supabase filter (F3.2) — use parameterized approach

### Fix Soon (Post-Launch Sprint)

7. Fix N+1 conversation query (F4.2) — use joins
8. Add message length validation to clinic replies (F4.6)
9. Implement complaint/emergency escalation (F4.4)
10. Add rate limiting to auth endpoints (F1.1, F1.2)
11. Validate opening_hours and gallery_image URLs (F2.2, F2.3)
12. Use prefix check for image delete path validation (F6.5)

### Fix Later (Tech Debt)

13. Consolidate `clinic_portal_users` into `clinic_users` (F6.6)
14. Move to RLS-first architecture — use server client with RLS instead of admin client everywhere (F6.4)
15. Add audit trail for profile changes (F2.5)
16. Move to React Email template system (F5.4)
17. Dedicated unsubscribe HMAC secret (F5.3)
18. Add prompt injection mitigation for LLM (F4.3)
19. Add tenant isolation integration tests (R6.5)
