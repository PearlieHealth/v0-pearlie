# SEO Audit Report: pearlie.org

**Audit Date:** 2026-02-23
**Site:** https://pearlie.org
**Business Type:** Healthcare / Dental Clinic Matching Platform (UK)
**Framework:** Next.js 16.0.10 (App Router) + Supabase, deployed on Vercel
**Pages Crawled:** 9 public pages
**Tool:** claude-seo (6 parallel subagents)

---

## Executive Summary

### Overall SEO Health Score: 47/100

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Technical SEO | 25% | 65/100 | 16.3 |
| Content Quality (E-E-A-T) | 25% | 61/100 | 15.3 |
| On-Page SEO | 20% | 59/100 | 11.8 |
| Schema / Structured Data | 10% | 20/100 | 2.0 |
| Performance (CWV) | 10% | 49/100 | 4.9 |
| Images | 5% | 55/100 | 2.8 |
| AI Search Readiness | 5% | 34/100 | 1.7 |
| **TOTAL** | **100%** | | **54.8/100** |

### Top 5 Critical Issues

1. **Homepage is entirely `"use client"`** — the most important page renders zero content in initial HTML, invisible to crawlers that don't execute JS
2. **No FAQPage schema** on the FAQ page — 12 well-structured Q&As with zero structured data markup, missing the easiest rich results win
3. **Google Fonts loaded as render-blocking `<link>`** — adds 300-800ms to LCP; should use `next/font`
4. **3 pages share identical title tags** — Homepage, Intake, and Our Mission all render as "Pearlie - Find the Right Dental Clinic for You"
5. **No security headers** — missing CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy

### Top 5 Quick Wins

1. Add `FAQPage` JSON-LD to `/faq` (30 min, high impact)
2. Switch to `next/font/google` for DM Sans + Inter Tight (1 hour, eliminates render-blocking)
3. Add unique metadata to `/our-mission` and `/intake` (30 min)
4. Fix FAQ title double-branding bug ("FAQ | Pearlie | Pearlie") (5 min)
5. Create `/public/llms.txt` for AI search visibility (30 min)

---

## 1. Technical SEO — 65/100

### 1.1 Crawlability (72/100)

**What's working:**
- robots.txt correctly generated via Next.js `MetadataRoute.Robots`
- Properly blocks private routes: `/admin/`, `/clinic/`, `/patient/`, `/api/`, `/auth/`, `/booking/`
- Sitemap correctly references 9 public URLs

**Issues found:**
- **Sitemap `lastmod` dates are meaningless** — all use `new Date()` (current timestamp on every build). Google will eventually ignore these entirely. Grade: F
- **`/cookies` page is an orphan** — not linked from nav or footer, only accessible via cookie banner
- **`/book` page exists but is unlisted** — not in sitemap, not in nav, creates keyword cannibalization with `/intake`
- **`/clinics/[clinicId]` redirect is client-side** — invisible to search engines, should be server-side 301/308

### 1.2 Indexability (78/100)

**What's working:**
- Root layout sets solid default metadata with title template `"%s | Pearlie"`
- 6 of 9 public pages have unique titles and descriptions
- noindex correctly applied to admin, clinic portal, match, and unsubscribe pages

**Issues found:**
- **3 client component pages have NO metadata exports:** Homepage (`/`), Our Mission (`/our-mission`), Intake (`/intake`) — all fall back to the same generic title
- **No canonical tags** set explicitly on any page — no protection against `?utm_source` duplicates
- **FAQ title renders as "FAQ | Pearlie | Pearlie"** — double brand name from template interaction

### 1.3 Security (55/100)

**What's working:**
- HTTPS with HSTS (`max-age=63072000`)
- Admin routes protected via HMAC session cookies with `__Host-` prefix

**Issues found:**
- **Missing security headers:** No CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **HTTP redirect goes to wrong destination:** `http://pearlie.org` → `https://vercel.com/` instead of `https://pearlie.org`
- **Overly permissive CORS:** `access-control-allow-origin: *`

### 1.4 URL Structure (88/100)

**What's working:**
- Clean, descriptive URLs (no file extensions, no query params)
- Consistent lowercase, no trailing slashes

**Minor issues:**
- Hero video filename has spaces: `Short Clip Smile Pearlie.mp4`
- `/clinics/[id]` → `/clinic/[id]` redirect is client-side only

### 1.5 Mobile (85/100)

**What's working:**
- Proper viewport configuration with `device-width` and theme color
- Responsive Tailwind CSS used throughout
- Mobile hamburger menu, compact CTAs
- Loading animation skipped on mobile

**Issues:**
- `maximumScale: 1` disables pinch-to-zoom (accessibility concern)
- Hero video autoplays on mobile (~1.3MB data cost)

### 1.6 JavaScript Rendering (45/100) — CRITICAL

**What's working:**
- 6 of 9 public pages are server-rendered (About, FAQ, For Clinics, Privacy, Terms, Cookies)

**Issues found:**
- **3 of 9 public pages are fully `"use client"`:** Homepage, Our Mission, Intake
- **Homepage delivers empty HTML shell** — all hero text, How It Works, testimonials, CTAs require JS execution
- **152 total client component files** across the codebase
- Both `framer-motion` (v12.24.5) AND `motion` (v12.28.1) installed — likely duplicate bundles

---

## 2. Content Quality & E-E-A-T — 61/100

### 2.1 E-E-A-T Assessment (42/100) — CRITICAL for Healthcare

**Experience:**
- 6 patient testimonials on homepage (first name + last initial format)
- No verifiable review details (no treatment type, date, location, or photos)
- No case studies or before/after content

**Expertise:**
- **No founder name displayed as text** — only exists in image filename (`dr-grei-mustaj-signature.png`)
- No dental qualifications, GDC number, or professional bio shown
- No clinical advisory board or editorial review attribution

**Authoritativeness:**
- Our Mission page cites BDA, Ipsos, GOV.UK — good
- GDC registration mentioned 6 times on About page
- No company registration number, no external awards or press mentions

**Trustworthiness:**
- Clear disclaimers about not providing medical advice (Terms, FAQ, footer)
- Privacy policy with ICO reference
- Pearlie Guarantee with detailed terms
- **No physical address or phone number anywhere on the site** — email-only contact
- **Mixed email domains:** `hello@pearlie.co.uk` vs `support@pearlie.org` / `privacy@pearlie.org`

### 2.2 Content Uniqueness (62/100)

| Page | Has Unique Title? | Has Unique Description? |
|------|:---:|:---:|
| Homepage | Default only | Default only |
| About | Yes | Yes |
| FAQ | Yes (but double "Pearlie") | Yes (too short: 66 chars) |
| Intake | No (= Homepage) | No (= Homepage) |
| For Clinics | Yes | Yes |
| Our Mission | No (= Homepage) | No (= Homepage) |
| Privacy | Yes | Yes |
| Terms | Yes | Yes |
| Cookies | Yes | Yes (too short: 43 chars) |

### 2.3 Internal Linking (55/100)

**Issues found:**
- **Terms and Cookies pages are dead-ends** — no `<SiteFooter />`, no `<MainNav />`
- **No cross-linking between related content pages** (About ↔ FAQ ↔ Our Mission)
- **Intake page is completely isolated** — no nav, no footer (intentional for conversion but bad for crawlability)
- FAQ answers don't link to relevant pages (e.g., "Privacy Policy" text doesn't link to `/privacy`)

### 2.4 Heading Structure (68/100)

- About page H1 overlaps with Homepage title
- FAQ questions are in accordion triggers, not heading tags
- Intake page headings change dynamically per step
- No geo-targeting keywords in any headings

### 2.5 Readability (78/100)

- Clear, conversational writing style appropriate for consumer healthcare
- Good visual hierarchy with cards, icons, whitespace
- Some marketing claims lack substantiation ("Trusted UK Clinics" — by whom?)

---

## 3. Schema / Structured Data — 20/100

### Current State

One single JSON-LD block in root layout, applied to ALL pages:

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Pearlie",
  "url": "https://pearlie.org",
  "description": "Dental clinic matching platform...",
  "applicationCategory": "HealthApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "GBP" }
}
```

### What's Missing

| Schema Type | Page | Google Rich Result? | Priority |
|-------------|------|:---:|----------|
| **FAQPage** | `/faq` (12 Q&As) | **YES — FAQ snippets** | **CRITICAL** |
| **Organization** | Root layout | YES — Knowledge Panel | HIGH |
| **WebSite** | Root layout | YES — Sitelinks | HIGH |
| **BreadcrumbList** | All pages | YES — Breadcrumb trails | MEDIUM |
| **HowTo** | Homepage (3 steps) | YES — How-to results | MEDIUM |
| **FAQPage** | `/about` (5 guarantee Q&As) | YES — FAQ snippets | MEDIUM |
| **AboutPage** | `/about` | No | LOW |
| **WebPage** | `/privacy`, `/terms` | No | LOW |

### Architecture Issues
- No `@graph` structure for entity relationships
- No `@id` references between schemas
- Same `WebApplication` schema on every page (semantically incorrect)
- Missing `Organization` entity — no brand identity in Knowledge Graph
- OG image is 180x180 (should be 1200x630)

---

## 4. Performance (Core Web Vitals) — 49/100

| Metric | Score | Key Issue |
|--------|-------|-----------|
| **LCP** | 35/100 | Homepage fully client-rendered + loading animation adds 1.1s artificial delay + render-blocking fonts |
| **INP** | 50/100 | 152 client components, heavy framer-motion usage, multiple useEffect hooks on mount |
| **CLS** | 55/100 | Hero video has no width/height/poster, font swap causes FOUT |
| **Resource Optimization** | 40/100 | Monolithic homepage bundle, duplicate motion libraries, no AVIF format |
| **Third-Party Scripts** | 80/100 | Consent-gated, afterInteractive strategy — well implemented |
| **Image Optimization** | 55/100 | Raw `<img>` tags in several components, no AVIF, video lacks poster/WebM |
| **Font Loading** | 30/100 | External Google Fonts `<link>` is render-blocking, not using `next/font`, 11 font variants loaded |

### Critical Performance Issues

1. **Loading animation blocks LCP by 1.1s** — `LoadingAnimation` component overlays fixed z-50 element, content set to `invisible` for 800ms + 300ms exit
2. **Google Fonts as render-blocking `<link>`** — requires 2 DNS lookups + 2 TCP connections, adds 300-800ms
3. **Homepage is monolithic `"use client"`** — entire component tree (hero, How It Works, testimonials, comparison table, carousel, footer) ships as single JS bundle
4. **Duplicate motion libraries** — both `framer-motion` (v12.24.5) and `motion` (v12.28.1) in package.json

---

## 5. Sitemap & URL Analysis — 69/100

| Audit Area | Score |
|------------|-------|
| Sitemap Completeness | 72/100 |
| Sitemap vs Robots.txt Consistency | 95/100 |
| lastmod Accuracy | 20/100 |
| Priority Values | 80/100 |
| changefreq Accuracy | 65/100 |
| Dynamic Pages Strategy | 60/100 |

### Key Issues

1. **All `lastmod` dates use `new Date()`** — semantically useless, Google will disregard
2. **`/book` vs `/intake` duplication** — two public, indexable intake forms causing keyword cannibalization
3. **No public clinic profile pages** — the biggest long-term SEO opportunity is blocked (`/clinic/*` is noindex + robots disallow)
4. **`/our-mission` has no metadata.ts** — falls back to generic root layout title

---

## 6. AI Search Readiness — 34/100

| Category | Score |
|----------|-------|
| AI Crawler Accessibility | 40/100 |
| llms.txt Compliance | 0/100 |
| Content Citability | 35/100 |
| Brand Authority Signals | 25/100 |
| Passage-Level Optimization | 45/100 |
| Structured Data for AI | 15/100 |
| FAQ Optimization for AI | 30/100 |
| Healthcare YMYL Signals | 40/100 |

### Critical AI Search Issues

1. **Homepage is invisible to non-JS AI crawlers** — `"use client"` means GPTBot, ClaudeBot, PerplexityBot may see an empty shell
2. **No `/llms.txt` file** — 0/100; AI search engines look for this file to understand site purpose and structure
3. **No explicit AI crawler rules** in robots.txt — no entries for GPTBot, ClaudeBot, PerplexityBot, Google-Extended
4. **No FAQPage schema** — AI search engines heavily favor structured Q&A for citations
5. **No founder credentials displayed** — critical for healthcare YMYL content in AI search

---

## Files Referenced

### Core SEO Files
- `app/layout.tsx` — Root layout with metadata, JSON-LD, font loading
- `app/robots.ts` — Robots.txt generation
- `app/sitemap.ts` — Sitemap generation
- `app/manifest.ts` — Web app manifest
- `next.config.mjs` — Next.js configuration

### Pages Missing Metadata
- `app/page.tsx` — Homepage (`"use client"`, no metadata export)
- `app/our-mission/page.tsx` — Our Mission (`"use client"`, no metadata)
- `app/intake/page.tsx` — Intake form (`"use client"`, no metadata)

### Pages With Issues
- `app/faq/page.tsx` — Double "Pearlie" in title, no FAQPage schema
- `app/about/page.tsx` — H1 overlaps with homepage, no founder name as text
- `app/clinics/[clinicId]/page.tsx` — Client-side redirect (should be server-side)
- `app/terms/page.tsx` — No footer, dead-end page
- `app/cookies/page.tsx` — No footer, orphan page, placeholder text

### Performance Bottlenecks
- `components/loading-animation.tsx` — 1.1s artificial LCP delay
- `components/analytics-scripts.tsx` — TikTok utilities always bundled
- `components/clinic-network-carousel.tsx` — Client-side data fetch
