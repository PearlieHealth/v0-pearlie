# SEO Action Plan: pearlie.org

**Generated:** 2026-02-23
**Current Score:** 47/100
**Target Score:** 75+/100

---

## Priority Definitions

- **CRITICAL** — Blocks indexing, causes penalties, or severely impacts rankings. Fix immediately.
- **HIGH** — Significantly impacts rankings or user experience. Fix within 1 week.
- **MEDIUM** — Optimization opportunity with measurable impact. Fix within 1 month.
- **LOW** — Nice to have, backlog items.

---

## CRITICAL (Fix Immediately)

### 1. Add FAQPage JSON-LD Schema to `/faq`
**Impact:** Direct rich results eligibility (20-87% CTR increase)
**Effort:** 30 minutes
**File:** `app/faq/page.tsx`

The FAQ page has 12 well-structured Q&A pairs that are already server-rendered. Add a `<script type="application/ld+json">` block with `FAQPage` schema containing all 12 questions and answers. This is the single highest-ROI SEO change available.

### 2. Switch to `next/font/google`
**Impact:** Eliminates render-blocking CSS, reduces LCP by 300-800ms
**Effort:** 1 hour
**Files:** `app/layout.tsx`, `app/globals.css`

Replace the external `<link href="fonts.googleapis.com...">` with:
```tsx
import { DM_Sans, Inter_Tight } from 'next/font/google'
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-heading' })
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans' })
```

### 3. Add Unique Metadata to Homepage, Intake, and Our Mission
**Impact:** Fixes 3 pages with duplicate titles, enables proper SERP display
**Effort:** 1 hour
**Files:** Create `app/our-mission/layout.tsx`, `app/intake/layout.tsx`; add metadata file for homepage

Since these pages are `"use client"`, create wrapper `layout.tsx` files to export metadata:
- Homepage: Keep current title or enhance with geo-targeting
- Intake: `"Find Your Dental Clinic Match | Pearlie"`
- Our Mission: `"Our Mission - Improving Dental Access in the UK | Pearlie"`

### 4. Add Security Headers
**Impact:** Fixes clickjacking vulnerability, improves trust signals
**Effort:** 30 minutes
**File:** `next.config.mjs`

Add `headers()` function with:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Basic Content-Security-Policy

---

## HIGH (Fix Within 1 Week)

### 5. Restructure Root Layout Schema as `@graph`
**Impact:** Establishes brand entity in Knowledge Graph, enables rich results
**Effort:** 1 hour
**File:** `app/layout.tsx`

Replace single `WebApplication` with `@graph` containing:
- `Organization` (with name, url, logo, contactPoint, description)
- `WebSite` (with publisher reference)
- `WebApplication` (with creator reference and `@id`)

### 6. Remove/Defer Loading Animation
**Impact:** Eliminates 1.1 seconds of artificial LCP delay
**Effort:** 30 minutes
**Files:** `app/page.tsx`, `components/loading-animation.tsx`

The loading animation overlays content with `invisible` CSS for 800ms + 300ms exit. Either remove entirely or replace with a CSS-only skeleton that doesn't block LCP.

### 7. Fix FAQ Title Double-Branding Bug
**Impact:** Fixes "FAQ | Pearlie | Pearlie" rendering
**Effort:** 5 minutes
**File:** `app/faq/page.tsx`

Change `title: "FAQ | Pearlie"` to `title: "Frequently Asked Questions"` so the template produces "Frequently Asked Questions | Pearlie".

### 8. Add `<SiteFooter />` and `<MainNav />` to Terms and Cookies Pages
**Impact:** Eliminates dead-end pages, improves crawlability and internal linking
**Effort:** 30 minutes
**Files:** `app/terms/page.tsx`, `app/cookies/page.tsx`

### 9. Create `/public/llms.txt`
**Impact:** Enables AI search engine comprehension of site purpose
**Effort:** 30 minutes
**File:** `public/llms.txt`

Create structured file summarizing Pearlie's purpose, key pages, and entity relationships for AI models.

### 10. Fix Sitemap `lastmod` Dates
**Impact:** Restores trust in lastmod signal for search engines
**Effort:** 30 minutes
**File:** `app/sitemap.ts`

Replace `new Date()` with meaningful dates:
- Legal pages: hardcoded last-update date
- Marketing pages: build timestamp or last content edit date
- Homepage: deployment date

### 11. Add Canonical Tags to All Public Pages
**Impact:** Prevents duplicate content from UTM parameters
**Effort:** 30 minutes
**Files:** All page/metadata files

Add `alternates: { canonical: "https://pearlie.org/page-path" }` to metadata exports.

### 12. Display Founder Name and Credentials
**Impact:** Critical E-E-A-T signal for healthcare YMYL content
**Effort:** 15 minutes
**File:** `app/about/page.tsx`

Add text "Dr Grei Mustaj, Founder & CEO" alongside the signature image. Include dental qualifications if applicable.

---

## MEDIUM (Fix Within 1 Month)

### 13. Refactor Homepage to Server Component with Client Islands
**Impact:** Enables SSR for all static content, dramatically improves LCP and crawler visibility
**Effort:** 4-8 hours
**File:** `app/page.tsx`

Break into:
- Server-rendered: hero text, How It Works, comparison table, testimonials text, CTA sections
- Client islands: video player, carousel, loading animation, localStorage logic, framer-motion animations

### 14. Add BreadcrumbList Schema to All Pages
**Impact:** Google breadcrumb trails in search results
**Effort:** 1-2 hours
**Files:** All page files or a shared component

### 15. Add HowTo Schema to Homepage
**Impact:** Rich results for "How It Works" (3-step process)
**Effort:** 30 minutes
**File:** `app/page.tsx` or homepage metadata

### 16. Resolve `/book` vs `/intake` Duplication
**Impact:** Eliminates keyword cannibalization
**Effort:** 30 minutes
**Options:**
- Redirect `/book` → `/intake` via server-side redirect
- Add `noindex` to `/book` if it's legacy
- Or differentiate their SEO targeting

### 17. Convert `/clinics/[clinicId]` to Server-Side Redirect
**Impact:** Search engines will properly follow the redirect
**Effort:** 15 minutes
**File:** `next.config.mjs` — add to `redirects()`:
```js
{ source: '/clinics/:id', destination: '/clinic/:id', permanent: true }
```

### 18. Add Explicit AI Crawler Rules to robots.txt
**Impact:** Signals intentional AI crawler access
**Effort:** 15 minutes
**File:** `app/robots.ts`

Add explicit `Allow` rules for: GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended.

### 19. Add AVIF Image Format Support
**Impact:** 30-50% smaller images than WebP
**Effort:** 5 minutes
**File:** `next.config.mjs`

Add `formats: ['image/avif', 'image/webp']` to images config.

### 20. Remove Duplicate Motion Library
**Impact:** Reduces bundle size
**Effort:** 15 minutes
**File:** `package.json`

Both `framer-motion` (v12.24.5) and `motion` (v12.28.1) are installed. Keep only one.

### 21. Add Video Poster and WebM Format
**Impact:** Improves LCP, reduces CLS, saves bandwidth
**Effort:** 1 hour
**Files:** `app/page.tsx`, create WebM version and poster image

### 22. Unify Email Domains
**Impact:** Improves trust signals, eliminates confusion
**Effort:** 15 minutes
**Files:** Various pages and components

Standardize to either `@pearlie.co.uk` or `@pearlie.org` across entire site.

### 23. Add Cross-Links Between Related Content Pages
**Impact:** Improves link equity distribution and crawlability
**Effort:** 1 hour
**Files:** About, FAQ, Our Mission page files

Add contextual links: About → FAQ, FAQ → Privacy, Our Mission → About, etc.

### 24. Update Cookie Page Placeholder Text
**Impact:** Removes "(if implemented)" text that undermines trust
**Effort:** 5 minutes
**File:** `app/cookies/page.tsx`

---

## LOW (Backlog)

### 25. Differentiate About Page H1 from Homepage
**Impact:** Prevents keyword cannibalization
**File:** `app/about/page.tsx`

### 26. Add Company Registration Details to Footer
**Impact:** E-E-A-T trust signal
**File:** `components/site-footer.tsx`

### 27. Create Proper OG Image (1200x630)
**Impact:** Better social sharing appearance
**File:** Create `app/opengraph-image.tsx`

### 28. Audit Radix UI Packages for Unused Imports
**Impact:** Reduces dependency surface area
**File:** `package.json`

### 29. Plan Public Clinic Profile Pages for SEO
**Impact:** HIGHEST long-term SEO opportunity
**Effort:** Major feature (weeks)

Create a separate publicly indexable route (e.g., `/dentists/[slug]`) for SEO-friendly clinic profiles, distinct from the authenticated `/clinic/[clinicId]` portal. This would enable ranking for queries like "invisalign london" or "emergency dentist near me."

### 30. Add `SpeakableSpecification` Schema
**Impact:** AI voice search optimization
**Files:** Key content pages

---

## Implementation Order (Recommended Sprint Plan)

### Sprint 1 (This Week) — Quick Wins
- [ ] #1 FAQPage schema
- [ ] #2 next/font migration
- [ ] #3 Unique metadata for 3 pages
- [ ] #4 Security headers
- [ ] #7 Fix FAQ title bug
- [ ] #9 Create llms.txt
- [ ] #12 Display founder name

### Sprint 2 (Next Week) — Foundation
- [ ] #5 @graph schema architecture
- [ ] #6 Remove loading animation
- [ ] #8 Footer on Terms/Cookies
- [ ] #10 Fix sitemap lastmod
- [ ] #11 Canonical tags
- [ ] #16 Resolve /book vs /intake
- [ ] #17 Server-side redirect for /clinics

### Sprint 3 (Weeks 3-4) — Optimization
- [ ] #13 Refactor homepage to server component
- [ ] #14 BreadcrumbList schema
- [ ] #15 HowTo schema
- [ ] #18 AI crawler rules
- [ ] #19 AVIF support
- [ ] #20 Remove duplicate motion library
- [ ] #21 Video poster + WebM
- [ ] #22 Unify email domains
- [ ] #23 Cross-links

### Backlog
- [ ] #25-30 Long-term improvements
- [ ] #29 Public clinic profile pages (major feature)

---

## Expected Score Improvements

| After Sprint | Estimated Score | Key Gains |
|--------------|----------------|-----------|
| Sprint 1 | 62/100 (+15) | Schema, fonts, metadata, security |
| Sprint 2 | 72/100 (+10) | Architecture, crawlability, linking |
| Sprint 3 | 80/100 (+8) | Performance, advanced schema, optimization |
| With clinic profiles | 85+/100 | Long-term organic traffic growth |
