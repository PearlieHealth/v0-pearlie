# AUDIT 1 — Full System Map

> **Generated:** 2026-02-16
> **Scope:** Complete inventory of routes, APIs, database schema, auth flows, integrations, and data flows for the Pearlie dental clinic matching platform.

---

## Table of Contents

1. [Routes & Pages](#1-routes--pages)
2. [API Endpoints](#2-api-endpoints)
3. [Database Schema](#3-database-schema)
4. [Auth Flows](#4-auth-flows)
5. [Email System](#5-email-system)
6. [Middleware](#6-middleware)
7. [Storage & File Uploads](#7-storage--file-uploads)
8. [External Integrations](#8-external-integrations)
9. [Realtime & Background Processes](#9-realtime--background-processes)
10. [Data Flow Diagram](#10-data-flow-diagram)

---

## 1. Routes & Pages

### Public Pages (no auth required)

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Homepage |
| `/intake` | `app/intake/page.tsx` | Patient intake form |
| `/intake/google-complete` | `app/intake/google-complete/page.tsx` | Google auth completion for intake |
| `/match/[matchId]` | `app/match/[matchId]/page.tsx` | Match results display |
| `/clinics/[clinicId]` | `app/clinics/[clinicId]/page.tsx` | Public clinic profile |
| `/clinic/[clinicId]` | `app/clinic/[clinicId]/page.tsx` | Public clinic profile (alt path) |
| `/book` | `app/book/page.tsx` | Booking page |
| `/booking/confirm` | `app/booking/confirm/page.tsx` | Booking confirmation |
| `/booking/clinic-response` | `app/booking/clinic-response/page.tsx` | Clinic response to booking |
| `/faq` | `app/faq/page.tsx` | FAQ |
| `/about` | `app/about/page.tsx` | About page |
| `/for-clinics` | `app/for-clinics/page.tsx` | Clinic landing page |
| `/our-mission` | `app/our-mission/page.tsx` | Mission page |
| `/privacy` | `app/privacy/page.tsx` | Privacy policy |
| `/terms` | `app/terms/page.tsx` | Terms of service |
| `/cookies` | `app/cookies/page.tsx` | Cookie policy |
| `/unsubscribe` | `app/unsubscribe/page.tsx` | Email unsubscribe |

### Auth Pages (public, handle auth flows)

| Route | File | Purpose |
|-------|------|---------|
| `/auth/confirm` | `app/auth/confirm/page.tsx` | Supabase auth callback — extracts tokens from URL hash |
| `/clinic/login` | `app/clinic/login/page.tsx` | Clinic login (redirects authenticated users to `/clinic`) |
| `/clinic/forgot-password` | `app/clinic/forgot-password/page.tsx` | Clinic forgot password |
| `/clinic/reset-password` | `app/clinic/reset-password/page.tsx` | Clinic password reset |
| `/clinic/set-password` | `app/clinic/set-password/page.tsx` | Set password (admin-created accounts) |
| `/clinic/accept-invite` | `app/clinic/accept-invite/page.tsx` | Clinic invite acceptance |
| `/patient/login` | `app/patient/login/page.tsx` | Patient login |
| `/admin/login` | `app/admin/login/page.tsx` | Admin login |

### Clinic Portal (requires Supabase auth + `clinic_users` membership)

Protected by `ClinicShell` wrapper in `app/clinic/layout.tsx`. Middleware protects: `profile`, `leads`, `inbox`, `appointments`, `bookings`, `insights`, `settings`, `team`, `providers`.

| Route | File | Purpose |
|-------|------|---------|
| `/clinic` | `app/clinic/page.tsx` | Clinic dashboard |
| `/clinic/profile` | `app/clinic/profile/page.tsx` | Clinic profile editor |
| `/clinic/bookings` | `app/clinic/bookings/page.tsx` | Bookings list |
| `/clinic/appointments` | `app/clinic/appointments/page.tsx` | Appointments |
| `/clinic/appointments/[leadId]` | `app/clinic/appointments/[leadId]/page.tsx` | Appointment detail |
| `/clinic/leads` | `app/clinic/leads/page.tsx` | Leads list |
| `/clinic/leads/[leadId]` | `app/clinic/leads/[leadId]/page.tsx` | Lead detail |
| `/clinic/inbox` | `app/clinic/inbox/page.tsx` | Chat inbox |
| `/clinic/team` | `app/clinic/team/page.tsx` | Team management |
| `/clinic/providers` | `app/clinic/providers/page.tsx` | Dentist/provider profiles |
| `/clinic/insights` | `app/clinic/insights/page.tsx` | Analytics |
| `/clinic/settings` | `app/clinic/settings/page.tsx` | Settings |

### Clinic Demo (public, no auth)

| Route | File | Purpose |
|-------|------|---------|
| `/clinic/demo` | `app/clinic/demo/page.tsx` | Demo dashboard |
| `/clinic/demo/leads` | `app/clinic/demo/leads/page.tsx` | Demo leads |
| `/clinic/demo/profile` | `app/clinic/demo/profile/page.tsx` | Demo profile |
| `/clinic/demo/insights` | `app/clinic/demo/insights/page.tsx` | Demo insights |
| `/clinic/demo/settings` | `app/clinic/demo/settings/page.tsx` | Demo settings |
| `/clinic/demo/team` | `app/clinic/demo/team/page.tsx` | Demo team |

### Patient Portal (requires Supabase auth)

| Route | File | Purpose |
|-------|------|---------|
| `/patient/dashboard` | `app/patient/dashboard/page.tsx` | Patient dashboard (redirects to `/patient/login` if unauthenticated) |

### Admin Portal (requires admin session cookie)

Protected by `AdminAuthProvider` wrapper in `app/admin/layout.tsx`. Middleware checks HMAC-signed session cookie.

| Route | File | Purpose |
|-------|------|---------|
| `/admin` | `app/admin/page.tsx` | Redirects to `/admin/analytics` |
| `/admin/analytics` | `app/admin/analytics/page.tsx` | Analytics dashboard |
| `/admin/clinics` | `app/admin/clinics/page.tsx` | Clinic management |
| `/admin/clinic-users` | `app/admin/clinic-users/page.tsx` | Clinic users |
| `/admin/clinic-waitlist` | `app/admin/clinic-waitlist/page.tsx` | Waitlist management |
| `/admin/diagnostics` | `app/admin/diagnostics/page.tsx` | System diagnostics |
| `/admin/tag-hygiene` | `app/admin/tag-hygiene/page.tsx` | Tag hygiene checks |
| `/admin/tag-hygiene/matching-algorithm` | `app/admin/tag-hygiene/matching-algorithm/page.tsx` | Matching algorithm debug |
| `/admin/test-match` | `app/admin/test-match/page.tsx` | Test matching algorithm |
| `/admin/pilot-checklist` | `app/admin/pilot-checklist/page.tsx` | Pilot checklist |
| `/admin/email-logs` | `app/admin/email-logs/page.tsx` | Email audit logs |
| `/admin/settings` | `app/admin/settings/page.tsx` | Admin settings |

### Layout Files

| File | Scope |
|------|-------|
| `app/layout.tsx` | Root layout (wraps entire app) |
| `app/clinic/layout.tsx` | Clinic portal (ClinicShell + auth) |
| `app/admin/layout.tsx` | Admin portal (AdminAuthProvider) |
| `app/book/layout.tsx` | Booking section |

---

## 2. API Endpoints

### Public / Unauthenticated

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/send-login-link` | Send magic link email |
| GET/POST | `/auth/callback` | Supabase auth callback |
| POST | `/api/leads` | Create lead from intake form |
| POST | `/api/leads/direct` | Direct lead creation |
| GET/PUT/DELETE | `/api/leads/[leadId]` | Lead CRUD |
| POST | `/api/leads/[leadId]/status` | Update lead status |
| POST | `/api/leads/[leadId]/verify-google` | Verify Google info |
| POST | `/api/match` | Run matching for lead |
| GET | `/api/matches` | List matches |
| GET | `/api/matches/[matchId]` | Match detail |
| GET | `/api/matches/[matchId]/explain` | AI match explanation (Groq) |
| GET | `/api/clinics` | List clinics |
| GET | `/api/clinics/[clinicId]` | Clinic detail |
| GET | `/api/clinics/carousel` | Featured clinics carousel |
| POST | `/api/clinics/upload` | Upload clinic images |
| GET/POST | `/api/offers` | Offers CRUD |
| POST | `/api/lead-actions` | Track lead interactions |
| POST | `/api/otp/send` | Send OTP code |
| POST | `/api/otp/verify` | Verify OTP code |
| POST | `/api/track` | Analytics tracking |
| POST | `/api/analytics/track` | Analytics tracking (alt) |
| GET/POST | `/api/unsubscribe` | Email unsubscribe |
| GET | `/api/places/autocomplete` | Google Places autocomplete |
| GET | `/api/places/details` | Google Places details |
| GET | `/api/google/clinics/search` | Google clinic search |
| POST | `/api/email-test` | Test email sending |

### Booking & Chat (patient-clinic interactions)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/booking/request` | Patient requests booking |
| POST | `/api/booking/confirm` | Confirm booking |
| POST | `/api/booking/clinic-response` | Clinic responds to booking |
| POST | `/api/chat/send` | Send chat message (triggers AI bot if enabled) |
| GET/POST | `/api/chat/messages` | List/create messages |
| POST | `/api/chat/mark-delivered` | Mark message delivered |
| POST | `/api/chat/typing` | Broadcast typing indicator |
| POST | `/api/chat/clinic-reply` | Clinic reply in chat |
| GET | `/api/events` | Timeline events |
| GET/POST | `/api/clinic-waitlist` | Clinic waitlist |

### Clinic Portal (requires clinic auth)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/clinic/me` | Current clinic info |
| GET/POST/PUT | `/api/clinic/profile` | Clinic profile CRUD |
| GET | `/api/clinic/providers` | Clinic providers/dentists |
| GET | `/api/clinic/conversations` | Clinic conversations |
| GET | `/api/clinic/conversations/[id]/messages` | Conversation messages |
| POST | `/api/clinic/leads/bulk-status` | Bulk update lead statuses |
| POST | `/api/clinic/leads/[leadId]/notes` | Add notes to lead |
| POST | `/api/clinic/accept-invite` | Accept clinic invite |
| POST | `/api/clinic/verify-invite` | Verify invite token |
| GET | `/api/clinic/events` | Clinic events |
| POST | `/api/clinic/webhook-test` | Test outbound webhook |

### Patient Portal (requires Supabase auth)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/patient/matches` | Patient matches and conversations |

### Admin Portal (requires admin session)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/admin/auth` | Admin login |
| POST | `/api/admin/logout` | Admin logout |
| GET/POST | `/api/admin/clinics` | List/create clinics |
| GET/PUT/DELETE | `/api/admin/clinics/[id]` | Clinic CRUD |
| POST | `/api/admin/clinics/[id]/extract-signals` | Extract clinic signals |
| POST | `/api/admin/clinics/[id]/opening-hours` | Set opening hours |
| POST | `/api/admin/clinics/[id]/archive` | Archive clinic |
| GET/POST | `/api/admin/clinic-users` | Clinic user management |
| GET | `/api/admin/clinic-waitlist` | Waitlist management |
| GET | `/api/admin/clinic-filters` | Clinic filter options |
| GET/POST | `/api/admin/clinic-filter-selections` | Filter selections CRUD |
| GET/PUT/DELETE | `/api/admin/clinic-filter-selections/[id]` | Single filter selection |
| POST | `/api/admin/clinic-filter-selections/update` | Bulk update filters |
| POST | `/api/admin/clinic-filter-selections/delete` | Bulk delete filters |
| GET/PUT | `/api/admin/leads/[id]` | Lead CRUD |
| GET/POST | `/api/admin/offers` | Offers CRUD |
| GET/PUT/DELETE | `/api/admin/offers/[id]` | Single offer |
| GET/POST | `/api/admin/tags` | Tags CRUD |
| POST | `/api/admin/test-match` | Test matching algorithm |
| GET/POST | `/api/admin/matching-config` | Matching config |
| GET/POST | `/api/admin/tag-hygiene` | Tag hygiene checks |
| POST | `/api/admin/provision-clinic` | Provision clinic (temp credentials) |
| POST | `/api/admin/clinic/provision` | Provision clinic (invite-based) |
| POST | `/api/admin/reset-data` | Reset data |
| POST | `/api/admin/self-test` | Self test |
| POST | `/api/admin/live-flow-test` | Live flow test |
| POST | `/api/admin/analytics-self-check` | Analytics check |
| GET | `/api/admin/pilot-checklist` | Pilot checklist |
| POST | `/api/admin/test-email` | Test email |
| POST | `/api/admin/upload-clinic-photo` | Upload clinic photo |
| GET | `/api/admin/export` | Export data |

---

## 3. Database Schema

### Core Tables

#### `clinics`
Dental clinic profiles and metadata.
- **PK:** `id` (UUID)
- **Key columns:** `name`, `address`, `postcode`, `latitude`, `longitude`, `phone`, `email`, `website`, `rating`, `review_count`, `treatments` (TEXT[]), `price_range`, `description`, `facilities` (TEXT[]), `opening_hours` (JSONB), `images` (TEXT[]), `featured`, `verified`, `accepts_nhs`, `parking_available`, `wheelchair_accessible`, `offers_free_consultation`, `before_after_images` (JSONB[]), `show_treatment_prices`, `treatment_prices` (JSONB), `booking_webhook_url`, `booking_webhook_secret`, `manual_confirmation_allowed`, `email_forwarding_address`, `slug` (UNIQUE), `clinic_highlights` (JSONB), `featured_review` (JSONB), `notification_preferences` (JSONB)
- **Indexes:** postcode, treatments (GIN), lat/long
- **RLS:** Public SELECT

#### `leads`
Patient inquiries from intake form.
- **PK:** `id` (UUID)
- **FK:** `user_id` → `auth.users`
- **Key columns:** `treatment_interest`, `postcode`, `latitude`, `longitude`, `budget_range`, `contact_method`, `contact_value`, `additional_info`, `preferred_timing`, `pain_score` (0-10), `has_swelling`, `has_bleeding`, `cosmetic_concern`, `cosmetic_timeframe`, `outcome_treatment`, `outcome_priority`, `outcome_priority_key`, `decision_values` (TEXT[]), `conversion_blocker`
- **V6 form columns:** `form_version`, `raw_answers` (JSONB), `schema_version`, `conversion_blocker_codes` (TEXT[]), `blocker_labels` (TEXT[]), `cost_approach`, `monthly_payment_range`, `strict_budget_mode`, `strict_budget_amount`, `timing_preference`
- **RLS:** Public INSERT, authenticated users view/update own

#### `match_results`
Per-clinic match scoring and reasoning.
- **PK:** `id` (UUID)
- **FK:** `lead_id` → `leads`, `clinic_id` → `clinics`
- **Key columns:** `reasons` (TEXT[]), `match_reasons_composed` (TEXT[]), `match_reasons_long` (TEXT[]), `match_reasons_meta` (JSONB), `score` (INTEGER), `distance_miles`, `explanation_version`, `tier`
- **Constraint:** UNIQUE(lead_id, clinic_id)

#### `matches` (legacy)
Patient-to-clinic matching results (being replaced by `match_results`).
- **PK:** `id` (UUID)
- **FK:** `lead_id` → `leads`
- **Key columns:** `clinic_ids` (UUID[]), `status`

#### `conversations`
Chat conversations between patients and clinics.
- **PK:** `id` (UUID)
- **FK:** `clinic_id` → `clinics`, `lead_id` → `leads`
- **Key columns:** `status` ('active'|'closed'|'archived'), `last_message_at`, `unread_by_clinic`, `unread_by_patient`
- **Constraint:** UNIQUE(clinic_id, lead_id)

#### `messages`
Individual messages within conversations.
- **PK:** `id` (UUID)
- **FK:** `conversation_id` → `conversations`
- **Key columns:** `sender_type` ('patient'|'clinic'), `content`, `sent_via` ('chat'|'email'), `read_at`, `message_type`

#### `bookings`
Appointment records.
- **PK:** `id` (UUID)
- **FK:** `lead_id` → `leads`, `clinic_id` → `clinics`
- **Key columns:** `appointment_datetime`, `booking_method`, `expected_value_gbp`, `booking_reference`, `status` ('pending'|'confirmed'|'cancelled'|'completed')

#### `clinic_users`
Team members with clinic portal access.
- **PK:** `id` (UUID)
- **FK:** `user_id` → `auth.users`, `clinic_id` → `clinics`
- **Key columns:** `role` ('clinic_manager'|'clinic_admin'), `email`, `full_name`, `is_active`, `last_login`
- **Constraints:** UNIQUE(user_id, clinic_id), UNIQUE(email, clinic_id)

#### `clinic_invites`
Invite tokens for clinic onboarding.
- **PK:** `id` (UUID)
- **FK:** `clinic_id` → `clinics`
- **Key columns:** `email`, `token` (UNIQUE), `role`, `expires_at`, `accepted_at`, `corporate_id`

#### `clinic_portal_users`
Portal-level multi-clinic user access.
- **PK:** `id` (UUID)
- **Key columns:** `email` (UNIQUE), `role` ('CLINIC_USER'|'CLINIC_ADMIN'|'CORPORATE_ADMIN'), `clinic_ids` (UUID[]), `onboarding_completed`, `last_login_at`

#### `clinic_providers`
Dentist/provider profiles.
- **PK:** `id` (UUID)
- **FK:** `clinic_id` → `clinics`
- **Key columns:** `name`, `photo_url`, `bio`, `education` (JSONB[]), `certifications` (JSONB[]), `sort_order`, `is_active`

### Matching System Tables

#### `clinic_filters`
Master list of 15 clinic operational filters for matching.
- **PK:** `key` (TEXT, e.g. 'F01_CLEAR_EXPLANATIONS')
- **Key columns:** `label`, `category`, `sort_order`, `active`
- **15 filters:** F01 through F15 covering clear explanations, longer consults, anxiety-friendly, no-pressure style, price clarity, conservative first, results focus, realistic limits, staged plans, strong aftercare, timeline planning, between-visit support, complex case comfort, decision time, transparent plans

#### `clinic_filter_selections`
Which clinics have which filters.
- **PK:** (clinic_id, filter_key) composite
- **Key columns:** `source` ('manual'|'ai_website'), `evidence`

#### `match_weight_rules`
Patient answers → filter weight mapping.
- **PK:** `id` (BIGSERIAL)
- **Key columns:** `source_question`, `source_value`, `filter_key`, `weight`
- **Constraint:** UNIQUE(source_question, source_value, filter_key)

#### `match_reason_templates`
Human-readable bullet text for each filter.
- **PK:** `filter_key` → `clinic_filters`
- **Key columns:** `bullet`

### Lead Tracking Tables

#### `lead_clinic_status`
Per-clinic tracking of each lead.
- **PK:** (lead_id, clinic_id) composite
- **Key columns:** `status`, `note`, `staff_notes` (JSONB[])

#### `lead_matches`
Per-clinic match working table.
- **PK:** `id` (UUID)
- **Constraint:** UNIQUE(lead_id, clinic_id)
- **Key columns:** `score`, `reasons` (TEXT[])

#### `lead_actions`
Patient interaction tracking (clicks, calls, etc.).
- **PK:** `id` (UUID)
- **Constraint:** UNIQUE(lead_id, clinic_id, action_type)
- **Key columns:** `action_type`, `metadata` (JSONB)

#### `match_sessions`
Matching workflow tracking per lead.
- **PK:** `id` (UUID)
- **Key columns:** `lead_id`, `status` ('running'|'complete'|'error'), `matched_count`, `error_step`, `error_message`, `error_details` (JSONB)

### Analytics Tables

#### `analytics_events`
Modern patient funnel analytics.
- **PK:** `id` (UUID)
- **Key columns:** `session_id`, `lead_id`, `match_id`, `clinic_id`, `event_name` ('lead_submitted'|'match_results_viewed'|'clinic_opened'|'book_clicked'|'call_clicked'), `page`, `metadata` (JSONB)

#### `events` (legacy)
Early analytics events.
- **PK:** `id` (UUID)
- **Key columns:** `match_id`, `clinic_id`, `event_type`, `metadata` (JSONB)

### Offers & Promotions

#### `offers`
Limited-time clinic deals.
- **PK:** `id` (UUID)
- **FK:** `clinic_id` → `clinics`
- **Key columns:** `title`, `subtitle`, `indicative_price`, `saving_text`, `valid_until`, `active`, `priority`

### Email & Audit Tables

#### `email_logs`
Audit trail of all emails sent.
- **PK:** `id` (UUID)
- **Key columns:** `clinic_id`, `lead_id`, `to_email`, `subject`, `status` ('sent'|'failed'), `error`, `provider_message_id`

#### `email_preferences`
Unsubscribe tracking.
- **PK:** `id` (UUID)
- **Constraint:** UNIQUE(email, category)
- **Key columns:** `email`, `category`, `unsubscribed_at`

#### `clinic_audit_log`
Automated action audit trail.
- **PK:** `id` (UUID)
- **Key columns:** `action`, `entity_type`, `entity_id`, `details` (JSONB)

#### `provisioning_logs`
Clinic provisioning audit trail.
- **PK:** `id` (UUID)
- **Key columns:** `clinic_id`, `clinic_name`, `corporate_name`, `corporate_id`, `primary_contact_email`, `status` ('SUCCESS'|'FAILED'), `error_message`, `invite_token`

### Waitlist Tables

#### `clinic_waitlist`
Clinic registration waitlist.
- **PK:** `id` (UUID)
- **Key columns:** `email`, `clinic_name`, `owner_name`, `phone`, `postcodes` (TEXT[]), `treatments_offered` (TEXT[]), `address`, `city`, `latitude`, `longitude`, `google_place_id`, `google_rating`, `google_reviews_count`, `website`, `status` ('pending'|'approved'|'rejected'), `admin_notes`, `clinic_id`

#### `waitlist_email_log`
Email tracking for waitlist communications.
- **PK:** `id` (UUID)
- **FK:** `waitlist_id` → `clinic_waitlist`
- **Key columns:** `email_type`, `to_email`, `status`, `provider_message_id`, `error`

### Tags & Configuration

#### `clinic_tags`
Tag definitions for clinic categorization.
- **PK:** `key` (TEXT)
- **Key columns:** `label`, `category` ('care'|'pricing'|'capability'|'convenience'), `description`, `active`

#### `schema_migrations`
Migration tracking.
- **PK:** `id` (TEXT — timestamp-based)
- **Key columns:** `applied_at`

### Database Function

#### `create_lead_with_outcome()`
Creates a new lead with complete outcome data. Accepts treatment interest, postcode, budget range, contact details, decision values, blocker info, outcome priority. Returns UUID of created lead.

### Key Relationships

```
clinics (1) ──→ (N) match_results ←── (N) leads
clinics (1) ──→ (N) clinic_users
clinics (1) ──→ (N) conversations ←── (N) leads
clinics (1) ──→ (N) lead_clinic_status ←── (N) leads
clinics (1) ──→ (N) bookings ←── (N) leads
clinics (1) ──→ (N) clinic_filter_selections ←── (N) clinic_filters
clinics (1) ──→ (N) clinic_providers
clinics (1) ──→ (N) clinic_invites
clinics (1) ──→ (N) offers
conversations (1) ──→ (N) messages
clinic_filters (1) ──→ (N) match_weight_rules
clinic_filters (1) ──→ (1) match_reason_templates
clinic_users (N) ──→ (1) auth.users
leads (N) ──→ (1) auth.users
```

---

## 4. Auth Flows

### Overview

Pearlie uses a **hybrid authentication approach** with three separate auth systems:

| User Type | Auth Method | Session Management |
|-----------|-------------|-------------------|
| Patients | Supabase magic links + OTP + Google OAuth | Supabase cookies (auto-refreshed by middleware) |
| Clinics | Supabase email/password + invite-based onboarding | Supabase cookies + `clinic_users` table |
| Admins | Custom HMAC-signed session cookie | `__Host-admin_session` cookie (24h TTL) |

### Patient Auth

**Magic Links:**
1. Patient enters email at `/patient/login`
2. POST `/api/auth/send-login-link` → `supabase.auth.admin.generateLink({ type: "magiclink" })`
3. Email sent via Resend with branded template
4. Patient clicks link → redirected to `/auth/confirm`
5. Tokens extracted from URL hash → `supabase.auth.setSession()`
6. Redirected to `/patient/dashboard`
- Rate limits: 10 requests/IP/15min, 3/email/15min

**OTP Verification (direct leads):**
1. Lead requests OTP → POST `/api/otp/send`
2. 6-digit OTP generated, hashed with HMAC-SHA256, stored in `leads` table
3. Email sent via Resend (10-minute expiry)
4. Lead verifies → POST `/api/otp/verify` (timing-safe comparison)
5. On success: auto-creates Supabase auth user if needed, marks lead as verified
6. Triggers clinic notification if `source === "direct_profile"`
- Rate limits: Max 5 attempts, 1-minute cooldown

**Google OAuth:**
- Component: `components/google-sign-in-button`
- Uses Supabase OAuth flow via Google provider
- Auto-verifies lead if Google email matches lead email

### Clinic Auth

**Password Login:**
1. Clinic user visits `/clinic/login`
2. `supabase.auth.signInWithPassword({ email, password })`
3. Verifies user is linked to clinic via `clinic_users` table
4. If `must_change_password` metadata set → redirects to `/clinic/set-password`
5. Redirects to `/clinic`

**Invite-Based Signup:**
1. Admin creates clinic invite → POST `/api/admin/clinic/provision`
2. Token stored in `clinic_invites` table, email sent with accept link
3. Clinic visits `/clinic/accept-invite?token=...`
4. Enters password → POST `/api/clinic/accept-invite`
5. Creates Supabase auth user, links to clinic via `clinic_users`, marks invite accepted

### Admin Auth

**Login:**
1. POST `/api/admin/auth` with username/password
2. Compared against `ADMIN_USERNAME` + `ADMIN_PASSWORD` env vars (timing-safe)
3. Session token: `HMAC-SHA256(ADMIN_SESSION_SECRET, "pearlie_admin_session_v{EPOCH}")`
4. Stored in `__Host-admin_session` cookie (production) or `admin_session` (dev)
5. 24-hour max age, HttpOnly, Secure, SameSite=Lax
- Rate limits: 5 failed attempts/15min/IP

**Logout:**
- Patients/Clinics: `supabase.auth.signOut()` clears cookies
- Admin: DELETE `/api/admin/auth` clears session cookie

---

## 5. Email System

### Provider

**Service:** Resend (`resend@6.7.0`)
**Core function:** `sendEmailWithRetry()` in `lib/email-send.ts`
- Automatic retry with exponential backoff (up to 3 attempts: 0.5s, 1s, 2s delays)
- Skips retry on validation errors (4xx)
- Returns `{ success, messageId?, error? }`

### From Addresses

| Alias | Address | Used For |
|-------|---------|----------|
| NOREPLY | `Pearlie <noreply@pearlie.org>` | Auth, OTP, magic links |
| NOTIFICATIONS | `Pearlie <notifications@pearlie.org>` | Chat, leads, bookings |
| CLINICS | `Pearlie <clinics@pearlie.org>` | Clinic communications |

### Email Triggers

| Trigger | Route | Email Type | To |
|---------|-------|-----------|-----|
| Patient requests login | `/api/auth/send-login-link` | Magic link | patient.email |
| Patient requests OTP | `/api/otp/send` | OTP code | verification_email |
| Patient verifies OTP (direct) | `/api/otp/verify` | Clinic notification | clinic.email |
| Patient sends chat message | `/api/chat/send` | Message alert | clinic.email |
| Clinic replies to patient | `/api/chat/clinic-reply` | Reply notification | patient.email |
| Admin provisions clinic (v1) | `/api/admin/provision-clinic` | Temp credentials | contact_email |
| Admin provisions clinic (v2) | `/api/admin/clinic/provision` | Invite link | contact_email |
| Clinic joins waitlist | `/api/clinic-waitlist` | Confirmation | owner.email |
| Admin updates waitlist | `/api/admin/clinic-waitlist` | Waitlist update | clinic.email |
| Admin sends test email | `/api/admin/test-email` | Test notification | admin-specified |

### Unsubscribe Management

- `lib/unsubscribe.ts` — checks `email_preferences` table and `notification_preferences` JSONB in `clinics`
- RFC 2369 `List-Unsubscribe` headers included in notification emails
- Unsubscribe route: `/api/unsubscribe`

---

## 6. Middleware

### Root Middleware (`middleware.ts`)

Runs on all requests except static assets. Matcher:
```
/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)
```

**Processing order:**
1. **Admin route check:** For `/admin/*` (except `/admin/login`):
   - Extract session cookie → compute expected HMAC token → timing-safe compare
   - Redirect to `/admin/login` if invalid
2. **Supabase session refresh:** Delegates to `updateSession()` in `lib/supabase/middleware.ts`

### Supabase Middleware (`lib/supabase/middleware.ts`)

**Route protection rules:**

| Path Pattern | Behavior |
|-------------|----------|
| `/clinic/{profile,leads,inbox,appointments,bookings,insights,settings,team,providers}` | Requires Supabase auth — redirect to `/clinic/login` |
| `/clinic/login` | Redirect authenticated users to `/clinic` (or `/clinic/set-password`) |
| `/clinic/[id]`, `/clinics/*` | Allow unauthenticated (public profiles) |
| `/clinic/{accept-invite,demo,forgot-password,reset-password,set-password}` | Allow unauthenticated |
| `/patient/dashboard` | Requires Supabase auth — redirect to `/patient/login` |
| `/patient/login` | Redirect authenticated patients to `/patient/dashboard` |

**Session refresh:** Calls `supabase.auth.getUser()` on every request, updates cookies if tokens refreshed.

### Admin Auth Middleware (`lib/admin-auth.ts`)

- **`verifyAdminAuth()`** — For API routes. Returns 403 on CSRF violation, 401 on auth failure.
- **`isAdminAuthenticated()`** — For server components. Boolean check.
- **CSRF protection:** Verifies `Origin === Host` for mutating requests (POST/PUT/PATCH/DELETE).

### Rate Limiting

- Admin login: 5 failed attempts/15min/IP (in-memory map in `/api/admin/auth/route.ts`)
- Login link & OTP: Per-IP and per-email limits via `lib/rate-limit.ts`

---

## 7. Storage & File Uploads

### Supabase Storage

**Bucket:** `clinic-assets`

| Endpoint | Purpose | Size Limit |
|----------|---------|------------|
| `/api/admin/upload-clinic-photo` | Admin clinic photo uploads (main & gallery) | 5-10 MB |
| `/api/clinics/upload` | Clinic user uploads (main, gallery, provider photos) | 5-10 MB |

**Operations:**
- `storage.from("clinic-assets").upload()` — Upload with size validation
- `storage.from("clinic-assets").getPublicUrl()` — Fetch public URLs
- `storage.from("clinic-assets").remove()` — Delete with clinic-scoped auth

---

## 8. External Integrations

### AI / LLM — Groq

- **Model:** `llama-3.3-70b-versatile`
- **Endpoint:** `https://api.groq.com/openai/v1/chat/completions`
- **Env var:** `GROQ_API_KEY`
- **Used in:**
  - `lib/chat-bot-ai.ts` — AI chat bot responses (red flag detection, complaint detection, guardrails with banned phrases, 4s timeout with template fallback)
  - `/api/matches/[matchId]/explain` — Match explanation generation
  - `lib/clinic-ingest/website-reader.ts` — Website content analysis
- **Config:** Temperature 0.6, Max tokens 300

### Email — Resend

See [Section 5](#5-email-system).

### Google APIs

| API | Env Var | Files | Purpose |
|-----|---------|-------|---------|
| Places API (New) | `GOOGLE_PLACES_API_KEY` | `/api/places/autocomplete`, `/api/places/details`, `/api/google/clinics/search` | Location autocomplete, clinic discovery, place details. Regional bias to UK. |
| Google Analytics (GA4) | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `components/analytics-scripts.tsx` | Page view tracking (consent-gated) |
| Google Maps Embed | `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` | Clinic profile pages | Embedded maps |

### Meta Pixel (Facebook Ads)

- **Env var:** `NEXT_PUBLIC_META_PIXEL_ID`
- **File:** `components/analytics-scripts.tsx`
- **Consent-gated:** Only loads if user grants marketing consent

### Vercel Analytics

- **Package:** `@vercel/analytics@1.3.1`
- **File:** `app/layout.tsx`
- **Purpose:** Core web vitals and performance monitoring

---

## 9. Realtime & Background Processes

### Supabase Realtime

**File:** `hooks/use-chat-channel.ts`

| Channel | Events | Purpose |
|---------|--------|---------|
| `chat:{conversationId}` | INSERT on `messages`, UPDATE on `messages` | Real-time message delivery & read receipts |
| `clinic-convs:{clinicId}` | UPDATE on `conversations` | Inbox unread count updates |
| Broadcast: `typing` | Ephemeral (no DB) | Typing indicators (3s timeout) |

### Cron Jobs / Scheduled Tasks

**None configured.** No `vercel.json` crons, no scheduled functions, no background job queues.

### Outbound Webhooks

**Clinic Booking Webhooks** (`/api/clinic/webhook-test`):
- Sends booking notifications to external clinic systems
- Configured per-clinic via `clinics.booking_webhook_url` and `clinics.booking_webhook_secret`
- Security: HMAC-SHA256 signature in `X-Pearlie-Signature` header
- Timeout: 10 seconds

### Inline Side Effects (within API routes)

| Trigger | Side Effect |
|---------|-------------|
| Patient requests booking | Sends clinic notification email |
| Patient sends chat message | AI bot auto-response (if enabled), clinic email notification |
| OTP verification (direct profile) | Clinic notification email |
| Lead interaction (book click, call) | Email to clinic via `/api/lead-actions` |

---

## 10. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PATIENT JOURNEY                            │
│                                                                     │
│  Browser ──→ Intake Form ──→ POST /api/leads ──→ [leads] table     │
│                │                                                    │
│                ▼                                                    │
│         POST /api/match ──→ Matching Engine                        │
│                │             (clinic_filters + match_weight_rules   │
│                │              + clinic_filter_selections)           │
│                ▼                                                    │
│         [match_results] table ──→ Match Page (/match/[id])         │
│                │                                                    │
│                ├──→ Book Click ──→ /api/booking/request ──→        │
│                │                  [bookings] + Email (Resend)       │
│                │                                                    │
│                ├──→ Chat ──→ /api/chat/send ──→ [messages]         │
│                │            ◄──► Supabase Realtime                  │
│                │            ──→ AI Bot (Groq) if enabled           │
│                │            ──→ Email notification (Resend)         │
│                │                                                    │
│                └──→ Analytics ──→ /api/analytics/track              │
│                                  ──→ [analytics_events]            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        CLINIC PORTAL                                │
│                                                                     │
│  Clinic Login ──→ Supabase Auth ──→ [clinic_users] check           │
│       │                                                             │
│       ▼                                                             │
│  Dashboard ──→ /api/clinic/conversations ──→ Inbox                 │
│            ──→ /api/clinic/leads/bulk-status ──→ Lead management   │
│            ──→ /api/clinic/profile ──→ Profile editor              │
│            ──→ /api/chat/clinic-reply ──→ Patient email            │
│            ──→ Webhook (/api/clinic/webhook-test) ──→ External     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         ADMIN PORTAL                                │
│                                                                     │
│  Admin Login ──→ HMAC Session Cookie ──→ Admin Dashboard           │
│       │                                                             │
│       ▼                                                             │
│  /api/admin/clinics ──→ Clinic CRUD                                │
│  /api/admin/clinic/provision ──→ Invite email (Resend)             │
│  /api/admin/clinic-filter-selections ──→ Matching config           │
│  /api/admin/tag-hygiene ──→ Tag quality checks                     │
│  /api/admin/test-match ──→ Algorithm testing                       │
│  /api/admin/analytics-self-check ──→ System health                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                              │
│                                                                     │
│  Supabase ────── Database (Postgres), Auth, Realtime, Storage      │
│  Resend ──────── Transactional email (magic links, OTP, notifs)    │
│  Groq ────────── AI chat bot, match explanations, website analysis │
│  Google ──────── Places API, Maps embed, Analytics (GA4), OAuth    │
│  Meta ────────── Facebook Pixel (marketing, consent-gated)         │
│  Vercel ──────── Hosting, Edge middleware, Analytics                │
└─────────────────────────────────────────────────────────────────────┘
```

### Environment Variables Summary

**Public (client-side):**
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`
- `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`

**Private (server-side):**
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
- `GROQ_API_KEY`
- `RESEND_API_KEY`
- `GOOGLE_PLACES_API_KEY`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `ADMIN_SESSION_EPOCH`

---

## 11. Audit Findings & Fix Recommendations

### Priority 1 — Critical Security

#### 11.1 Overly Permissive RLS Policies

**Finding:** Multiple tables allow unrestricted public INSERT (`WITH CHECK (true)`), including `messages`, `conversations`, `match_results`, `lead_actions`, and `match_sessions`. Anyone can write fake messages impersonating patients/clinics, create fake conversations, or spoof match scores.

**Files:** `scripts/026_create_chat_tables.sql`, `scripts/019_update_clinic_filters_refined.sql`, `scripts/037_create_missing_tables.sql`

**Fix:** Create a migration to tighten RLS policies — restrict INSERT on `messages` and `conversations` to authenticated users who belong to the conversation (clinic staff via `clinic_users`, or the lead's authenticated user). Restrict `match_results` INSERT to service-role only. The partial fix in `scripts/044_tighten_rls_policies.sql` only covers `clinic_invites` and `matches` UPDATE.

#### 11.2 Unauthenticated Data-Modifying Endpoints

**Finding:** Several POST endpoints that create or modify data have no auth checks:

| Endpoint | Risk |
|----------|------|
| `POST /api/track` | Arbitrary analytics event spoofing |
| `POST /api/analytics/track` | Same (duplicate endpoint) |
| `POST /api/matches` (POST) | Create match records for any lead |
| `POST /api/leads/direct` | Create leads for any clinic without verifying requester |
| `POST /api/booking/request` | Spam booking emails to clinics |
| `POST /api/booking/confirm` | Confirm bookings for any lead |

**Fix:** Add Supabase auth checks (`supabase.auth.getUser()`) or at minimum token-based verification to all data-modifying endpoints. For analytics endpoints, consider signed tokens or session validation to prevent spoofing.

### Priority 2 — High Security & Reliability

#### 11.3 Missing Rate Limiting on Email-Sending Routes

**Finding:** Routes that trigger email notifications lack rate limiting:
- `POST /api/booking/request` — unlimited booking notification emails
- `POST /api/booking/confirm` — unlimited confirmation emails
- `POST /api/lead-actions` — unlimited clinic notification emails
- `POST /api/chat/send` — unlimited chat messages (also triggers AI bot)

**Fix:** Apply the existing `createRateLimiter()` from `lib/rate-limit.ts` to these endpoints. Suggested limits: 10 bookings/IP/hour, 20 messages/conversation/hour.

#### 11.4 N+1 Query in Clinic Conversations

**Finding:** `app/api/clinic/conversations/route.ts` (lines 48-72) runs **two queries per conversation** inside a `Promise.all(map(...))` — one for the lead details and one for the latest message. With 20 conversations, this is 40+ queries.

**Fix:** Replace with a single Supabase query using relation syntax:
```typescript
.from("conversations")
.select(`*, leads(first_name, last_name, email, treatment_interest), messages(content, sender_type)`)
.eq("clinic_id", clinicId)
.order("last_message_at", { ascending: false })
```

#### 11.5 Missing Database Constraints

**Finding:** Critical columns lack NOT NULL, DEFAULT, or CHECK constraints:
- `leads.latitude`/`longitude` — nullable but required for matching
- `messages.status` — no DEFAULT or NOT NULL
- `match_results.score` — no CHECK constraint (should be 0-100)
- `lead_clinic_status.status` — no DEFAULT value

**Fix:** Create a migration adding constraints:
```sql
ALTER TABLE match_results ADD CHECK (score >= 0 AND score <= 100);
ALTER TABLE lead_clinic_status ALTER COLUMN status SET DEFAULT 'new';
```

#### 11.6 Missing Database Indexes

**Finding:** Frequently queried columns lack indexes:

| Table | Column(s) | Used In |
|-------|-----------|---------|
| `leads` | `user_id` | `/api/patient/matches` |
| `messages` | `sender_type` | `/api/chat/messages` |
| `conversations` | `status`, `created_at` | Multiple queries |
| `match_results` | `lead_id, clinic_id` (composite) | `/api/matches/[matchId]` |

**Fix:** Create a migration adding indexes.

### Priority 3 — Medium Issues

#### 11.7 In-Memory Rate Limiter Never Prunes

**Finding:** Both `lib/rate-limit.ts` and `app/api/admin/auth/route.ts` use in-memory `Map`s for rate limiting. Expired entries are only deleted on next lookup (lazy deletion). Under botnet attack, the map grows without bound. Also resets on server restart in Vercel's serverless model.

**Fix:** Add a periodic pruning function (e.g., every 100 requests, scan and delete expired entries). Cap map size at 10,000 entries. For production robustness, consider migrating to Upstash Redis.

#### 11.8 Error Responses Leak Internal Details

**Finding:**
- `app/api/email-test/route.ts` returns full `error.stack` in response
- `app/api/clinics/upload/route.ts` returns `error.message` for storage errors (leaks internal paths)
- `app/api/track/route.ts` returns raw `error.message`

**Fix:** Return generic error messages to clients. Log full details server-side. Remove `stack` from all API responses.

#### 11.9 Stale Match Cache Not Invalidated

**Finding:** Match reasons are cached in `match_results` columns and served directly from cache in `/api/matches/[matchId]/route.ts`. If clinic data changes (tags, specialties, availability), the cache continues serving stale results.

**Fix:** Add a `cached_at` timestamp column. Force re-score if cache is >7 days old. Optionally, add a trigger/webhook that clears `match_results` cache when `clinics` row is updated.

#### 11.10 Unbounded Export Query

**Finding:** `app/api/admin/export/route.ts` hard-codes `LIMIT 10000` with no pagination or streaming. Could exhaust serverless memory.

**Fix:** Implement cursor-based pagination (fetch in 1000-row batches) or use streaming response.

#### 11.11 Inconsistent API Response Formats

**Finding:** API routes use different response shapes — some return `{ error }`, others `{ success, error }`, others `{ data }`. Frontend must handle multiple formats.

**Fix:** Standardize to a common envelope:
```typescript
{ success: boolean, data?: T, error?: { code: string, message: string } }
```

### Priority 4 — Low / Cleanup

#### 11.12 Duplicate Analytics Endpoints

**Finding:** Three overlapping event tracking endpoints exist:
- `POST /api/track` → writes to `analytics_events`
- `POST /api/analytics/track` → writes to `analytics_events`
- `POST /api/events` → writes to `events` (legacy)

**Fix:** Consolidate to a single canonical endpoint. Deprecate the others.

#### 11.13 Debug Console.logs in Production

**Finding:** `app/api/booking/request/route.ts` has excessive `console.log` statements (lines 65-67, 79, 83, 86) that log IDs and URLs.

**Fix:** Remove or replace with structured logging.

#### 11.14 File Upload MIME Type Validation

**Finding:** Upload endpoints (`/api/clinics/upload`, `/api/admin/upload-clinic-photo`) validate Content-Type header but don't verify file magic bytes. Attackers could upload non-image files with spoofed MIME types.

**Fix:** Add magic byte validation (check first bytes for JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `52 49 46 46`).

#### 11.15 Admin Upload Path Not Scoped to Clinic

**Finding:** `app/api/admin/upload-clinic-photo/route.ts` uses `clinic-photos/${folder}/${filename}` where `folder` comes from the request body. An admin could overwrite another clinic's photos.

**Fix:** Scope the upload path to include the clinic ID explicitly.

---

## Summary of Findings

| # | Finding | Severity | Category |
|---|---------|----------|----------|
| 11.1 | Overly permissive RLS (public INSERT on messages, conversations, match_results) | **Critical** | Security |
| 11.2 | Unauthenticated data-modifying endpoints (track, matches, booking) | **Critical** | Security |
| 11.3 | Missing rate limiting on email-sending routes | **High** | Security |
| 11.4 | N+1 query in clinic conversations (40+ queries for 20 conversations) | **High** | Performance |
| 11.5 | Missing NOT NULL / CHECK constraints on critical columns | **High** | Data Integrity |
| 11.6 | Missing database indexes on frequently queried columns | **High** | Performance |
| 11.7 | In-memory rate limiter grows without bound | **Medium** | Reliability |
| 11.8 | Error responses leak stack traces and internal details | **Medium** | Security |
| 11.9 | Stale match cache not invalidated on data changes | **Medium** | Data Integrity |
| 11.10 | Unbounded export query (10k rows, no pagination) | **Medium** | Performance |
| 11.11 | Inconsistent API response formats | **Medium** | Maintainability |
| 11.12 | Duplicate analytics endpoints | **Low** | Cleanup |
| 11.13 | Debug console.logs in production routes | **Low** | Cleanup |
| 11.14 | File upload MIME type not verified via magic bytes | **Low** | Security |
| 11.15 | Admin upload path not scoped to clinic ID | **Low** | Security |
