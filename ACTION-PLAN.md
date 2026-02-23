# SEO Action Plan: pearlie.org — Final Merged Plan

**Generated:** 2026-02-23
**Audit Tools:** claude-seo (6 subagents) + claude-code-seo (4 subagents)
**Current Score:** 41/100
**Target Score:** 78+/100

---

## Priority Definitions

- **CRITICAL** — Blocks indexing, causes penalties, or severely impacts rankings. Fix immediately.
- **HIGH** — Significantly impacts rankings or user experience. Fix within 1 week.
- **MEDIUM** — Optimization opportunity with measurable impact. Fix within 1 month.
- **LOW** — Nice to have, backlog items.

---

## CRITICAL (Fix Immediately) — 8 Items

### 1. Add FAQPage JSON-LD Schema to `/faq`
**Impact:** Direct rich results eligibility (20-87% CTR increase)
**Effort:** 30 minutes
**File:** `app/faq/page.tsx`
**Source:** Both tools (consensus #1 quick win)

The FAQ page has 12 well-structured Q&A pairs that are already server-rendered. Add a `<script type="application/ld+json">` block with `FAQPage` schema containing all 12 questions and answers. This is the single highest-ROI SEO change available.

### 2. Switch to `next/font/google`
**Impact:** Eliminates render-blocking CSS, reduces LCP by 300-800ms
**Effort:** 1 hour
**Files:** `app/layout.tsx`, `app/globals.css`
**Source:** Both tools (consensus)

Replace the external `<link href="fonts.googleapis.com...">` with:
```tsx
import { DM_Sans, Inter_Tight } from 'next/font/google'
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-heading' })
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans' })
```

### 3. Fix Double Branding on 3 Page Titles (About, FAQ, Intake)
**Impact:** Fixes truncated SERP titles on 3 pages (73-77 chars → under 60 chars)
**Effort:** 30 minutes
**Files:** `app/about/metadata.ts`, `app/faq/metadata.ts`, `app/intake/metadata.ts`
**Source:** claude-code-seo (found it affects 3 pages, not just FAQ)

The `metadata.ts` files set titles that already include "Pearlie", then the root template appends "| Pearlie" again:
- About: `"About Us | Pearlie - Connecting..." | Pearlie` → 77 chars (truncated)
- FAQ: `"FAQ | Pearlie - Common Questions..." | Pearlie` → 76 chars (truncated)
- Intake: `"Patient Intake Form | Pearlie - Find..." | Pearlie` → 73 chars (truncated)

**Fix:** Remove "Pearlie" from metadata.ts titles and let the root template handle it:
- About: `"About Us - Trusted Dental Clinic Matching"` → renders as `"About Us - Trusted Dental Clinic Matching | Pearlie"` (52 chars)
- FAQ: `"Frequently Asked Questions"` → renders as `"Frequently Asked Questions | Pearlie"` (36 chars)
- Intake: `"Find Your Dental Clinic Match"` → renders as `"Find Your Dental Clinic Match | Pearlie"` (39 chars)

### 4. Add Unique Metadata to Homepage, Our Mission
**Impact:** Fixes 2 pages with zero/duplicate metadata
**Effort:** 1 hour
**Files:** Create `app/our-mission/layout.tsx`; add homepage metadata via layout
**Source:** Both tools (consensus)

Since these pages use `"use client"`, they cannot export metadata directly. Create wrapper `layout.tsx` files:
- Homepage: `"London Dental Clinic Matching - Find Your Perfect Dentist | Pearlie"`
- Our Mission: `"Improving NHS Dental Access Across the UK"`

### 5. Add Security Headers
**Impact:** Fixes clickjacking vulnerability, improves trust signals
**Effort:** 30 minutes
**File:** `next.config.mjs`
**Source:** claude-seo

Add `headers()` function with:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Basic Content-Security-Policy

### 6. Display Founder Name, Credentials, and Contact Info
**Impact:** Critical E-E-A-T signal for healthcare YMYL content (currently 8/27)
**Effort:** 30 minutes
**Files:** `app/about/page.tsx`, `components/site-footer.tsx`
**Source:** Both tools (consensus — E-E-A-T critically weak)

- Add text "Dr Grei Mustaj, Founder & CEO" alongside the signature image (name currently only in image filename)
- Add dental qualifications/credentials if applicable
- Add a physical address or registered office address
- Add a phone number (at minimum on About page and footer)
- Add Companies House registration number to footer

### 7. Fix Misleading Dynamic Dates on Legal Pages
**Impact:** Eliminates deceptive "last updated" dates, improves trustworthiness
**Effort:** 15 minutes
**Files:** `app/terms/page.tsx`, `app/cookies/page.tsx`, `app/privacy/page.tsx`
**Source:** claude-code-seo

All three legal pages use `new Date().toLocaleDateString()` which displays today's date as "last updated" — this is misleading and undermines trust. Replace with hardcoded actual last-update dates.

### 8. Resolve `metadata.ts` vs `page.tsx` Dual Metadata Sources
**Impact:** Eliminates conflicting metadata definitions
**Effort:** 15 minutes
**Files:** `app/about/metadata.ts`, `app/about/page.tsx`, `app/faq/metadata.ts`, `app/faq/page.tsx`
**Source:** claude-code-seo

About, FAQ, and Intake pages have BOTH a `metadata.ts` file AND inline metadata in `page.tsx`. The `metadata.ts` takes precedence in Next.js, making the inline exports dead code. Remove the inline metadata from `page.tsx` to have a single source of truth.

---

## HIGH (Fix Within 1 Week) — 10 Items

### 9. Restructure Root Layout Schema as `@graph`
**Impact:** Establishes brand entity in Knowledge Graph, enables rich results
**Effort:** 1 hour
**File:** `app/layout.tsx`
**Source:** claude-seo

Replace single `WebApplication` with `@graph` containing:
- `Organization` (with name, url, logo, contactPoint, sameAs, areaServed)
- `WebSite` (with publisher reference, potentialAction for SearchAction)
- `WebApplication` (with creator reference and `@id`)

### 10. Add LocalBusiness / areaServed Schema
**Impact:** Local pack eligibility for "dentist London" queries
**Effort:** 30 minutes
**File:** `app/layout.tsx` (within `@graph`)
**Source:** claude-code-seo (Local SEO 17/100)

Add `LocalBusiness` or `MedicalBusiness` schema with:
- `areaServed`: London, Greater London, UK
- `geo`: London coordinates
- `address`: registered office
- `telephone`: contact number
- `openingHours`: if applicable

### 11. Remove/Defer Loading Animation
**Impact:** Eliminates 1.1 seconds of artificial LCP delay
**Effort:** 30 minutes
**Files:** `app/page.tsx`, `components/loading-animation.tsx`
**Source:** claude-seo

The loading animation overlays content with `invisible` CSS for 800ms + 300ms exit. Either remove entirely or replace with a CSS-only skeleton that doesn't block LCP.

### 12. Add `<SiteFooter />` and `<MainNav />` to Terms and Cookies Pages
**Impact:** Eliminates dead-end pages, improves crawlability and internal linking
**Effort:** 30 minutes
**Files:** `app/terms/page.tsx`, `app/cookies/page.tsx`
**Source:** claude-seo

### 13. Create `/public/llms.txt`
**Impact:** Enables AI search engine comprehension of site purpose
**Effort:** 30 minutes
**File:** `public/llms.txt`
**Source:** claude-seo (AI Search Readiness 34/100)

Create structured file summarizing Pearlie's purpose, key pages, services, target areas (London), and entity relationships for AI models.

### 14. Fix Sitemap `lastmod` Dates
**Impact:** Restores trust in lastmod signal for search engines
**Effort:** 30 minutes
**File:** `app/sitemap.ts`
**Source:** Both tools (consensus)

Replace `new Date()` with meaningful dates:
- Legal pages: hardcoded last-update date
- Marketing pages: build timestamp or last content edit date
- Homepage: deployment date

### 15. Add Canonical Tags to All Public Pages
**Impact:** Prevents duplicate content from UTM parameters
**Effort:** 30 minutes
**Files:** All page/metadata files
**Source:** claude-seo

Add `alternates: { canonical: "https://pearlie.org/page-path" }` to metadata exports.

### 16. Add Local Keywords to Titles and Meta Descriptions
**Impact:** Enables ranking for geo-targeted searches (currently zero geo terms in metadata)
**Effort:** 1 hour
**Files:** All metadata files
**Source:** claude-code-seo (Local SEO — Local Keywords 8/25)

Currently zero titles or meta descriptions contain "London", "UK", "NHS", or any geographic term. Add:
- Homepage title: include "London"
- About: include "UK"
- FAQ: include "London dentist" where natural
- Intake: include "London dental clinics"

### 17. Fix OG Image Dimensions and Twitter Card Type
**Impact:** Better social sharing appearance, correct preview images
**Effort:** 30 minutes
**Files:** `app/layout.tsx`, create `public/og-image.jpg` (1200x630)
**Source:** claude-code-seo

Current OG image uses `/apple-icon.jpg` (1024x1024 square) declared as 180x180. Create a proper 1200x630 OG image and switch Twitter card to `summary_large_image`.

### 18. Unify Email Domains
**Impact:** Improves trust signals, eliminates NAP inconsistency
**Effort:** 15 minutes
**Files:** Various pages and components
**Source:** claude-code-seo (NAP Consistency 4/25)

Footer uses `hello@pearlie.co.uk`, other references use `@pearlie.org`. Standardize to one domain across entire site.

---

## MEDIUM (Fix Within 1 Month) — 14 Items

### 19. Refactor Homepage to Server Component with Client Islands
**Impact:** Enables SSR for all static content, dramatically improves LCP and crawler visibility
**Effort:** 4-8 hours
**File:** `app/page.tsx`
**Source:** Both tools (consensus — #1 architectural problem)

Break into:
- Server-rendered: hero text, How It Works, comparison table, testimonials text, CTA sections
- Client islands: video player, carousel, loading animation, localStorage logic, framer-motion animations

### 20. Create Treatment-Specific Landing Pages
**Impact:** HIGHEST content strategy win — target high-intent keywords with zero current coverage
**Effort:** 2-4 hours per page
**Source:** claude-code-seo (Content Strategy 2/10)

The intake form references 7 treatment types but there are ZERO indexable pages for these keywords. Create pillar pages for:
- `/treatments/invisalign-london`
- `/treatments/dental-implants-london`
- `/treatments/veneers-london`
- `/treatments/teeth-whitening-london`
- `/treatments/composite-bonding-london`
- `/treatments/emergency-dentist-london`
- `/treatments/general-dentistry-london`

### 21. Add BreadcrumbList Schema to All Pages
**Impact:** Google breadcrumb trails in search results
**Effort:** 1-2 hours
**Files:** All page files or a shared component
**Source:** claude-seo

### 22. Add HowTo Schema to Homepage
**Impact:** Rich results for "How It Works" (3-step process)
**Effort:** 30 minutes
**File:** Homepage layout or schema component
**Source:** claude-seo

### 23. Resolve `/book` vs `/intake` Duplication
**Impact:** Eliminates keyword cannibalization
**Effort:** 30 minutes
**Source:** Both tools (consensus)

Add server-side redirect in `next.config.mjs`: `/book` → `/intake` (permanent 301).

### 24. Convert `/clinics/[clinicId]` to Server-Side Redirect
**Impact:** Search engines will properly follow the redirect
**Effort:** 15 minutes
**File:** `next.config.mjs`
**Source:** claude-seo

### 25. Add Explicit AI Crawler Rules to robots.txt
**Impact:** Signals intentional AI crawler access
**Effort:** 15 minutes
**File:** `app/robots.ts`
**Source:** claude-seo

Add explicit `Allow` rules for: GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended.

### 26. Add AVIF Image Format Support
**Impact:** 30-50% smaller images than WebP
**Effort:** 5 minutes
**File:** `next.config.mjs`
**Source:** claude-seo

### 27. Remove Duplicate Motion Library
**Impact:** Reduces bundle size
**Effort:** 15 minutes
**File:** `package.json`
**Source:** claude-seo

Both `framer-motion` (v12.24.5) and `motion` (v12.28.1) are installed. Keep only one.

### 28. Add Video Poster and WebM Format
**Impact:** Improves LCP, reduces CLS, saves bandwidth
**Effort:** 1 hour
**Files:** `app/page.tsx`, create WebM version and poster image
**Source:** claude-seo

### 29. Add Cross-Links Between Related Content Pages
**Impact:** Improves link equity distribution and crawlability
**Effort:** 1 hour
**Files:** About, FAQ, Our Mission, treatment pages
**Source:** claude-seo

### 30. Update Cookie Page Placeholder Text
**Impact:** Removes "(if implemented)" text that undermines trust
**Effort:** 5 minutes
**File:** `app/cookies/page.tsx`
**Source:** claude-seo

### 31. Add FAQPage Schema to About Page Guarantees Section
**Impact:** Additional rich results for 5 guarantee Q&As
**Effort:** 30 minutes
**File:** `app/about/page.tsx`
**Source:** claude-seo

### 32. Add Company Registration Number to Footer
**Impact:** E-E-A-T trust signal, legal requirement in UK
**Effort:** 5 minutes
**File:** `components/site-footer.tsx`
**Source:** claude-code-seo

---

## LOW (Backlog) — 6 Items

### 33. Differentiate About Page H1 from Homepage
**Impact:** Prevents keyword cannibalization
**File:** `app/about/page.tsx`

### 34. Create Proper Blog/Educational Content Hub
**Impact:** Massive long-term organic traffic, freshness signals, E-E-A-T
**Source:** claude-code-seo (Content Strategy — Content Calendar 0/3)

Create `/blog` or `/resources` with dental health educational content, treatment guides, patient stories, and NHS dental news.

### 35. Create Public Clinic Profile Pages for SEO
**Impact:** HIGHEST long-term SEO opportunity
**Effort:** Major feature (weeks)
**Source:** Both tools

Create publicly indexable route (e.g., `/dentists/[slug]`) for SEO-friendly clinic profiles with `LocalBusiness` schema per clinic.

### 36. Add `SpeakableSpecification` Schema
**Impact:** AI voice search optimization
**Files:** Key content pages

### 37. Plan Review Strategy with Structured Data
**Impact:** Star ratings in SERPs, social proof
**Source:** claude-code-seo (Review Strategy 1/10)

Add `AggregateRating` schema to testimonials, link to third-party review platforms (Google Reviews, Trustpilot).

### 38. Set Up Google Business Profile
**Impact:** Local pack visibility, map presence
**Source:** claude-code-seo (GBP Signals 2/25)

---

## Sprint Implementation Plan

### Sprint 1: Quick Wins (Week 1) — Est. +18 points

**Goal:** Fix all metadata issues, add critical schema, eliminate render-blocking resources, establish E-E-A-T foundations.

| # | Task | Effort | Score Impact |
|---|------|--------|-------------|
| 1 | Add FAQPage JSON-LD to `/faq` | 30 min | Schema +15 |
| 2 | Switch to `next/font/google` | 1 hr | CWV +10 |
| 3 | Fix double branding on 3 titles | 30 min | Metadata +5 |
| 4 | Add metadata to Homepage, Our Mission | 1 hr | Metadata +5 |
| 5 | Add security headers | 30 min | Technical +3 |
| 6 | Display founder name + credentials + contact | 30 min | E-E-A-T +5 |
| 7 | Fix misleading legal page dates | 15 min | Trust +2 |
| 8 | Resolve metadata.ts vs page.tsx conflicts | 15 min | Technical +1 |
| 13 | Create llms.txt | 30 min | AI Search +5 |

**Sprint 1 Total Effort:** ~5 hours
**Expected Score After Sprint 1:** ~59/100 (+18)

---

### Sprint 2: Foundation (Week 2) — Est. +12 points

**Goal:** Build proper schema architecture, fix crawlability gaps, establish local SEO presence, fix all remaining quick technical issues.

| # | Task | Effort | Score Impact |
|---|------|--------|-------------|
| 9 | Restructure schema as @graph (Org + WebSite) | 1 hr | Schema +8 |
| 10 | Add LocalBusiness / areaServed schema | 30 min | Local +5 |
| 11 | Remove/defer loading animation | 30 min | CWV +5 |
| 12 | Add footer/nav to Terms + Cookies | 30 min | Technical +2 |
| 14 | Fix sitemap lastmod dates | 30 min | Sitemap +3 |
| 15 | Add canonical tags to all pages | 30 min | Technical +2 |
| 16 | Add local keywords to titles/metas | 1 hr | Local +5 |
| 17 | Fix OG image + Twitter card | 30 min | Metadata +2 |
| 18 | Unify email domains | 15 min | Trust +1 |
| 23 | Redirect /book → /intake | 15 min | Content +2 |
| 24 | Server-side redirect for /clinics | 15 min | Technical +1 |
| 25 | AI crawler rules in robots.txt | 15 min | AI Search +2 |

**Sprint 2 Total Effort:** ~6 hours
**Expected Score After Sprint 2:** ~71/100 (+12)

---

### Sprint 3: Optimization + Content (Weeks 3-4) — Est. +10 points

**Goal:** Refactor homepage SSR, build treatment pillar pages, add remaining schemas, optimize assets.

| # | Task | Effort | Score Impact |
|---|------|--------|-------------|
| 19 | Refactor homepage to server component | 4-8 hrs | Technical +5, CWV +5 |
| 20 | Create 3-4 treatment landing pages | 8-16 hrs | Content Strategy +8 |
| 21 | Add BreadcrumbList schema | 1-2 hrs | Schema +2 |
| 22 | Add HowTo schema to homepage | 30 min | Schema +1 |
| 26 | Add AVIF support | 5 min | CWV +1 |
| 27 | Remove duplicate motion library | 15 min | CWV +1 |
| 28 | Video poster + WebM format | 1 hr | CWV +2 |
| 29 | Cross-links between pages | 1 hr | Content +1 |
| 30 | Fix cookie page placeholder text | 5 min | Trust +0.5 |
| 31 | FAQPage schema on About page | 30 min | Schema +1 |
| 32 | Company registration in footer | 5 min | E-E-A-T +0.5 |

**Sprint 3 Total Effort:** ~16-30 hours
**Expected Score After Sprint 3:** ~81/100 (+10)

---

### Backlog (Month 2+)

| # | Task | Effort | Score Impact |
|---|------|--------|-------------|
| 33 | Differentiate About H1 | 15 min | Low |
| 34 | Launch blog/content hub | 40+ hrs | Content Strategy +15 |
| 35 | Public clinic profile pages | 60+ hrs | Local + Content +20 |
| 36 | SpeakableSpecification schema | 1 hr | AI Search +1 |
| 37 | Review strategy + schema | 4 hrs | Local +3 |
| 38 | Google Business Profile setup | 2 hrs | Local +5 |

---

## Expected Score Trajectory

| Milestone | Score | Key Gains |
|-----------|-------|-----------|
| **Current** | **41/100** | — |
| After Sprint 1 | ~59/100 (+18) | Schema, fonts, metadata, security, E-E-A-T basics |
| After Sprint 2 | ~71/100 (+12) | @graph architecture, Local SEO, crawlability, sitemap |
| After Sprint 3 | ~81/100 (+10) | SSR homepage, treatment pages, advanced schema, CWV |
| With blog + clinic pages | 90+/100 | Long-term organic traffic, content authority, full Local SEO |

---

## Category-Level Impact Map

| Category | Current | After Sprint 1 | After Sprint 2 | After Sprint 3 |
|----------|---------|----------------|----------------|----------------|
| Technical SEO | 65 | 70 | 78 | 88 |
| Content Quality | 61 | 66 | 68 | 72 |
| E-E-A-T | 30 | 42 | 45 | 50 |
| Metadata | 38 | 60 | 72 | 75 |
| Schema | 20 | 45 | 65 | 75 |
| Performance (CWV) | 49 | 60 | 68 | 80 |
| Content Strategy | 20 | 20 | 25 | 45 |
| Local SEO | 17 | 20 | 42 | 48 |
| AI Search | 34 | 50 | 60 | 65 |
| Sitemap & URLs | 69 | 70 | 82 | 85 |

---

## Audit Sources

This plan was generated from 10 parallel subagent audits:

**claude-seo (6 subagents):**
1. Technical SEO → 65/100
2. Content Quality & E-E-A-T → 61/100
3. Schema / Structured Data → 20/100
4. Performance / CWV → 49/100
5. Sitemap Analysis → 69/100
6. AI Search Readiness → 34/100

**claude-code-seo (4 subagents):**
7. Content Strategy → 2/10 (20/100)
8. Local SEO → 17/100
9. E-E-A-T 27-Point Checklist → 8/27 (30/100)
10. Metadata 20-Point Scoring → 7.5/20 (38/100)
