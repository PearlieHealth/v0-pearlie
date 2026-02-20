# TikTok Pixel with Manual Advanced Matching — Implementation Guide

> **Purpose:** Step-by-step instructions for adding TikTok Pixel tracking with Manual Advanced Matching to the Pearlie codebase.
>
> **Audit branch:** `claude/tiktok-advanced-matching-setup-ajDOB` contains the audit checklist to verify this work.

---

## Prerequisites

1. **TikTok Ads Manager account** — create a pixel at Business Center → Assets → Events → Web Events
2. When creating the pixel, choose **"Manually install pixel code"** (not partner integration)
3. **Turn OFF** Automatic Advanced Matching in TikTok Events Manager — we are doing manual matching to avoid accidentally sending health-related form data
4. Copy the Pixel ID (looks like `CXXXXXXXXXXXXXXXXX`)

---

## Step 1: Add Environment Variable

In Vercel dashboard (Settings → Environment Variables):

```
NEXT_PUBLIC_TIKTOK_PIXEL_ID=<your-pixel-id>
```

Add to **Production**, **Preview**, and **Development** environments.

> **Never commit** the actual pixel ID to the repo. It's read at build time via `process.env`.

---

## Step 2: Create TikTok Pixel Helper — `lib/tiktok-pixel.ts`

Create a new file `lib/tiktok-pixel.ts` with helper functions for identify + track:

```typescript
// lib/tiktok-pixel.ts
// TikTok Pixel Manual Advanced Matching helpers
// Docs: https://ads.tiktok.com/marketing_api/docs?id=1739584860883969

import { hasConsentForMarketing } from "@/lib/cookie-consent"

declare global {
  interface Window {
    ttq?: {
      load: (pixelId: string) => void
      page: () => void
      track: (event: string, params?: Record<string, unknown>) => void
      identify: (params: {
        email?: string
        phone_number?: string
        external_id?: string
      }) => void
    }
  }
}

/**
 * Hash value with SHA-256 for TikTok Advanced Matching.
 * TikTok requires lowercase, trimmed, SHA-256 hashed values.
 */
async function sha256(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value.trim().toLowerCase())
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Normalise UK phone to E.164 format for TikTok matching.
 * Examples: "07700 900000" → "+447700900000", "+447700900000" → "+447700900000"
 */
function normalisePhone(phone: string): string {
  // Strip all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, "")

  // UK mobile: convert leading 0 to +44
  if (cleaned.startsWith("0")) {
    cleaned = "+44" + cleaned.slice(1)
  }

  // Ensure it starts with +
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned
  }

  return cleaned
}

/**
 * Send hashed user identifiers to TikTok for cross-device matching.
 * Call this BEFORE firing conversion events, typically right after
 * the user submits their email/phone in the intake form.
 *
 * IMPORTANT: Only sends email and phone — never send health data,
 * treatment preferences, or other sensitive fields.
 */
export async function identifyForTikTok(params: {
  email?: string | null
  phone?: string | null
  externalId?: string | null
}): Promise<void> {
  if (typeof window === "undefined") return
  if (!window.ttq) return
  if (!hasConsentForMarketing()) return

  const identifyPayload: Record<string, string> = {}

  if (params.email) {
    identifyPayload.email = await sha256(params.email.trim().toLowerCase())
  }

  if (params.phone) {
    const normalised = normalisePhone(params.phone)
    identifyPayload.phone_number = await sha256(normalised)
  }

  if (params.externalId) {
    identifyPayload.external_id = await sha256(params.externalId)
  }

  if (Object.keys(identifyPayload).length > 0) {
    window.ttq.identify(identifyPayload)
  }
}

/**
 * Fire a TikTok standard event.
 * Only fires if marketing consent has been given and the pixel is loaded.
 */
export function trackTikTokEvent(
  event: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return
  if (!window.ttq) return
  if (!hasConsentForMarketing()) return

  if (params) {
    window.ttq.track(event, params)
  } else {
    window.ttq.track(event)
  }
}
```

### Key design decisions:
- **Hashing is done client-side** with `crypto.subtle.digest` — no plaintext PII leaves the browser except to TikTok in hashed form
- **Phone normalisation** handles UK formats (07xxx → +447xxx)
- **Consent gating** — every function checks `hasConsentForMarketing()` before firing
- **No health data** — the `identifyForTikTok` function signature only accepts `email`, `phone`, and `externalId`

---

## Step 3: Add TikTok Pixel Script to `components/analytics-scripts.tsx`

Add the TikTok pixel script block **after the existing Meta Pixel block**, gated on `marketingConsent`:

```tsx
{/* TikTok Pixel - only load if marketing consent given */}
{marketingConsent && process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID && (
  <Script id="tiktok-pixel" strategy="afterInteractive">
    {`
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
        ttq.methods=["page","track","identify","instances","debug",
        "on","off","once","ready","alias","group","enableCookie",
        "disableCookie","holdConsent","revokeConsent","grantConsent"],
        ttq.setAndDefer=function(t,e){t[e]=function(){
        t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
        for(var i=0;i<ttq.methods.length;i++)
        ttq.setAndDefer(ttq,ttq.methods[i]);
        ttq.instance=function(t){for(var e=ttq._i[t]||[],
        n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);
        return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",
        o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],
        ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,
        ttq._o=ttq._o||{},ttq._o[e]=n||{};
        var a=document.createElement("script");
        a.type="text/javascript",a.async=!0,a.src=r+"?sdkid="+e+"&lib="+t;
        var s=document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(a,s)};
        ttq.load('${process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID}');
        ttq.page();
      }(window, document, 'ttq');
    `}
  </Script>
)}
```

This follows the exact same pattern as the existing GA4 and Meta Pixel blocks.

---

## Step 4: Add `identify` + Conversion Events at Form Submission Points

There are **two places** where email/phone are submitted. Both need `identify` → `track` calls.

### 4a. Intake Form — `app/intake/page.tsx`

At the top of the file, add the import:

```typescript
import { identifyForTikTok, trackTikTokEvent } from "@/lib/tiktok-pixel"
```

Inside the `handleSubmit()` function (around line 464, right where `trackEvent("lead_submitted", ...)` is called), add **immediately before** the `trackEvent` call:

```typescript
// TikTok Advanced Matching: identify user then fire conversion
await identifyForTikTok({
  email: formData.email,
  phone: formData.phone,
  externalId: leadId,
})
trackTikTokEvent("CompleteRegistration", {
  content_name: "intake_form",
})
```

### 4b. Direct Enquiry Form — `components/clinic/direct-enquiry-form.tsx`

At the top of the file, add the import:

```typescript
import { identifyForTikTok, trackTikTokEvent } from "@/lib/tiktok-pixel"
```

Inside the `handleSubmit()` function (around line 75, right where `trackEvent("lead_submitted", ...)` is called), add **immediately before** the `trackEvent` call:

```typescript
// TikTok Advanced Matching: identify user then fire conversion
await identifyForTikTok({
  email: email.trim(),
  phone: phone.trim(),
  externalId: data.leadId,
})
trackTikTokEvent("CompleteRegistration", {
  content_name: "direct_enquiry",
})
```

### 4c. (Optional) Book Clicked — `components/clinic/profile/clinic-profile-content.tsx`

If you want to track booking intent as a TikTok event, add at the top:

```typescript
import { trackTikTokEvent } from "@/lib/tiktok-pixel"
```

And where `trackEvent("book_clicked", ...)` is called (around line 189):

```typescript
trackTikTokEvent("ClickButton", {
  content_name: "book_appointment",
})
```

> **Note:** No `identify` call needed here — the user was already identified during form submission earlier in the flow.

---

## Step 5: Event Mapping Reference

| Pearlie Event        | TikTok Standard Event   | When It Fires                            |
| -------------------- | ----------------------- | ---------------------------------------- |
| `lead_submitted`     | `CompleteRegistration`  | User completes intake or direct enquiry  |
| `book_clicked`       | `ClickButton`           | User clicks "Book" on a clinic           |
| `matches_shown`      | `ViewContent`           | (Optional) User sees their matched clinics |

Only `CompleteRegistration` needs the `identify` call since that's where we have email/phone.

---

## Step 6: Update Cookie/Privacy Policy

Update the cookie policy page to mention TikTok under marketing cookies:

- **Cookie name:** `_ttp` (TikTok first-party cookie)
- **Purpose:** Measures ad effectiveness and enables cross-device attribution
- **Duration:** 13 months
- **Category:** Marketing (requires consent)

---

## Step 7: Test the Integration

1. **TikTok Pixel Helper Chrome Extension** — install from Chrome Web Store, verify pixel fires
2. **Test with consent:** Accept marketing cookies → navigate → verify `ttq.page()` fires on each page
3. **Test without consent:** Decline marketing cookies → verify NO TikTok script loads
4. **Test identify:** Submit intake form → check Pixel Helper shows `identify` event with hashed params
5. **Test events:** Submit form → verify `CompleteRegistration` event appears in Pixel Helper
6. **TikTok Events Manager:** Check the "Test Events" tab — events should appear within a few minutes
7. **Verify no health data leaks:** In Pixel Helper, confirm the `identify` payload ONLY contains `email`, `phone_number`, and `external_id` (all SHA-256 hashed)

---

## Files Changed Summary

| File                                                          | Change Type |
| ------------------------------------------------------------- | ----------- |
| `lib/tiktok-pixel.ts`                                         | **New**     |
| `components/analytics-scripts.tsx`                             | Modified    |
| `app/intake/page.tsx`                                         | Modified    |
| `components/clinic/direct-enquiry-form.tsx`                    | Modified    |
| `components/clinic/profile/clinic-profile-content.tsx`         | Modified (optional) |

---

## What NOT To Do

- **Do NOT enable Automatic Advanced Matching** in TikTok Events Manager — it scrapes form fields and could capture health data (treatment preferences, dental concerns, etc.)
- **Do NOT send unhashed PII** — always use the `sha256()` helper
- **Do NOT fire events without checking consent** — the helper functions handle this, but don't bypass them
- **Do NOT add TikTok server-side Events API** without first confirming the pixel client-side integration works correctly
