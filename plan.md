# Affiliate System — Full Pipeline Implementation Plan

## Overview
Wire up the complete affiliate tracking + payout pipeline so affiliates can track patients from click → form → booking → confirmed → paid.

---

## Phase 1: Referral Capture (Client-Side)

### 1a. Store referral code on intake page
**File:** `app/intake/page.tsx`
- On mount, read `?ref=` from URL search params (already reads UTM params)
- Store `ref` code in component state alongside UTM params
- Pass `ref` as part of the lead submission payload (in `rawAnswers` or as a top-level field)
- Call `POST /api/track-referral` to log the click immediately on page load

### 1b. Cookie/localStorage fallback
- Store `ref` code in localStorage with 30-day expiry so it persists if the patient doesn't complete the form immediately
- On intake page mount, check localStorage for stored ref if URL doesn't have one

---

## Phase 2: Lead → Affiliate Linking (Backend)

### 2a. Add `affiliate_id` column to leads table
**New migration:** `scripts/20260224_180000_add_affiliate_id_to_leads.sql`
```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL;
```

### 2b. Modify lead creation API
**File:** `app/api/leads/route.ts`
- After lead is inserted, check if `ref` code exists in the payload
- Look up affiliate by `referral_code` where `status = 'approved'`
- If found:
  - Update the lead record with `affiliate_id`
  - Insert into `referral_conversions`:
    - `affiliate_id`, `lead_id`, `status = 'pending_verification'`, `commission_amount = affiliate.commission_per_booking`
  - Try to link to an existing `referrals` click record (match by affiliate_id, recent timeframe)

---

## Phase 3: Booking Confirmation → Conversion Confirmed

### 3a. Update booking confirm API
**File:** `app/api/booking/confirm/route.ts`
- After setting `booking_confirmed_at`, check if this lead has a `referral_conversions` record
- If found with `status = 'pending_verification'`:
  - Update to `status = 'confirmed'`, set `confirmed_at = NOW()`
  - Set `booking_id` to the new booking record ID
  - Increment `affiliates.total_earned` by `commission_amount`

### 3b. Handle booking decline
**File:** `app/api/booking/decline/route.ts` (or wherever decline happens)
- If lead has a referral_conversion, update status to `'rejected'`

---

## Phase 4: Wire Up the Affiliate Dashboard (Real Data)

### 4a. Dashboard overview — replace demo data
**File:** `app/affiliate/dashboard/page.tsx`
- Replace `DEMO_STATS` with real API calls to `/api/affiliates/me` and `/api/affiliates/stats`
- Show real referral code, real click/conversion counts, real earnings

### 4b. Referrals page — load real data
**File:** `app/affiliate/referrals/page.tsx`
- Call `GET /api/affiliates/referrals` on mount
- Populate the table with real click data
- Add conversion status indicator (did this click lead to a booking?)

### 4c. Payouts page — load real data
**File:** `app/affiliate/payouts/page.tsx`
- Call `GET /api/affiliates/payouts` on mount
- Show payout history with status badges

### 4d. Settings page — wire up save
**File:** `app/affiliate/settings/page.tsx`
- Load profile from `GET /api/affiliates/me`
- Save changes via `PATCH /api/affiliates/me`

---

## Phase 5: Admin Payout Processing

### 5a. Admin payout endpoint
**New file:** `app/api/admin/affiliate-payouts/route.ts`
- `POST`: Create a payout batch for a date range
  - Find all `referral_conversions` with `status = 'confirmed'` in the period
  - Group by affiliate
  - Create `affiliate_payouts` records with `status = 'pending'`
  - Update conversions to `status = 'paid'`, set `paid_at`
  - Update `affiliates.total_paid`

### 5b. Admin payout UI
**File:** `app/admin/affiliates/page.tsx` (or new sub-page)
- Add "Process Payouts" section
- Show pending payouts grouped by affiliate
- Mark as completed when payment is sent manually (bank transfer, PayPal, etc.)
- For now: manual payment outside the system, just track the record

### 5c. Payout status update endpoint
**New file:** `app/api/admin/affiliate-payouts/[id]/route.ts`
- `PATCH`: Update payout status (pending → processing → completed/failed)
- Add payment_reference and payment_method fields

---

## Phase 6: Email Notifications (Affiliate)

### 6a. Conversion notification
- When a referral_conversion moves to `confirmed`, send email to affiliate:
  "You earned £25! A patient you referred has confirmed their booking."

### 6b. Payout notification
- When a payout is created, send email to affiliate:
  "Your payout of £X has been processed for the period [start] - [end]."

---

## What We're NOT Building Yet (Future / business.pearlie.org)
- Stripe/PayPal automated payouts (manual for now)
- Separate subdomain (business.pearlie.org) — can migrate later
- Affiliate tiers / variable commission rates
- Fraud detection / duplicate IP filtering
- Real-time analytics charts
- Public affiliate leaderboard

---

## Migration Summary

| Migration | Purpose |
|-----------|---------|
| `20260224_180000_add_affiliate_id_to_leads.sql` | Add affiliate_id FK to leads table |

## Files to Create
- `app/api/admin/affiliate-payouts/route.ts`
- `app/api/admin/affiliate-payouts/[id]/route.ts`

## Files to Modify
- `app/intake/page.tsx` — capture & persist ref code, call track-referral
- `app/api/leads/route.ts` — link lead to affiliate, create conversion
- `app/api/booking/confirm/route.ts` — mark conversion confirmed
- `app/affiliate/dashboard/page.tsx` — real data
- `app/affiliate/referrals/page.tsx` — real data
- `app/affiliate/payouts/page.tsx` — real data
- `app/affiliate/settings/page.tsx` — wire up save
- `app/admin/affiliates/page.tsx` — add payout processing UI
