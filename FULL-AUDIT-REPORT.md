# SEO Audit Report: pearlie.org — Final Merged Report

**Audit Date:** 2026-02-23
**Site:** https://pearlie.org
**Business Type:** Healthcare / Dental Clinic Matching Platform (UK, London focus)
**Framework:** Next.js 16.0.10 (App Router) + Supabase, deployed on Vercel
**Pages Crawled:** 9 public pages + 1 unlisted (`/book`)
**Tools Used:** claude-seo (6 subagents) + claude-code-seo (4 subagents) — 10 parallel audits total

---

## Executive Summary

### Overall SEO Health Score: 41/100

This score combines findings from both audit tools using a unified 10-category weighting.

| Category | Weight | Score | Weighted | Source |
|----------|--------|-------|----------|--------|
| Technical SEO | 15% | 65/100 | 9.8 | claude-seo |
| Content Quality | 10% | 61/100 | 6.1 | claude-seo |
| E-E-A-T (27-point) | 15% | 30/100 (8/27) | 4.4 | claude-code-seo |
| Metadata (20-point) | 10% | 38/100 (7.5/20) | 3.8 | claude-code-seo |
| Schema / Structured Data | 10% | 20/100 | 2.0 | claude-seo |
| Performance (CWV) | 10% | 49/100 | 4.9 | claude-seo |
| Content Strategy | 5% | 20/100 (2/10) | 1.0 | claude-code-seo |
| Local SEO | 10% | 17/100 | 1.7 | claude-code-seo |
| AI Search Readiness | 5% | 34/100 | 1.7 | claude-seo |
| Sitemap & URLs | 10% | 69/100 | 6.9 | claude-seo |
| **TOTAL** | **100%** | | **42.3/100** |

### Top 7 Critical Issues (Cross-Tool Consensus)

Both tools independently flagged these as the most impactful problems:

1. **Homepage is entirely `"use client"`** — the most important page renders zero content in initial HTML, invisible to crawlers and AI bots
2. **No FAQPage schema** — 12 Q&As with zero structured data, missing the easiest rich results win
3. **E-E-A-T critically weak for healthcare (8/27)** — anonymous founder, no credentials, no phone/address, no case studies
4. **Google Fonts loaded as render-blocking `<link>`** — adds 300-800ms to LCP; should use `next/font`
5. **Double branding bug on 3 page titles** — About, FAQ, and Intake all render with "Pearlie" appearing twice (e.g., "FAQ | Pearlie - ... | Pearlie") — 73-77 chars, truncated in SERPs
6. **Local SEO nearly absent (17/100)** — no address, no phone, zero geo terms in any title/meta, no LocalBusiness schema
7. **No content strategy (2/10)** — flat page architecture, no blog, no treatment pages, no pillar content, zero freshness signals

### Top 5 Quick Wins (< 1 hour each)

1. Add `FAQPage` JSON-LD to `/faq` (30 min) — immediate rich results eligibility
2. Switch to `next/font/google` (1 hour) — eliminates render-blocking CSS
3. Fix double branding + add unique metadata to Our Mission (30 min)
4. Display founder name and credentials on About page (15 min)
5. Create `/public/llms.txt` (30 min) — AI search visibility

---

## Detailed Findings by Category

---

## 1. Technical SEO — 65/100

### 1.1 Crawlability (72/100)

**Working well:**
- robots.txt correctly blocks: `/admin/`, `/clinic/`, `/patient/`, `/api/`, `/auth/`, `/booking/`
- Sitemap correctly references 9 public URLs
- No conflicts between sitemap and robots.txt

**Issues:**
- Sitemap `lastmod` all use `new Date()` — semantically useless (Grade: F)
- `/cookies` page is orphaned — only accessible via cookie banner
- `/book` page exists unlisted — keyword cannibalization with `/intake`
- `/clinics/[clinicId]` redirect is client-side — invisible to search engines

### 1.2 Indexability (78/100)

**Issues:**
- 3 `"use client"` pages have NO metadata exports (Homepage, Our Mission, Intake)
- No canonical tags on any page — no UTM parameter protection
- FAQ title renders as "FAQ | Pearlie | Pearlie"

### 1.3 Security (55/100)

**Issues:**
- Missing: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- HTTP redirect goes to `https://vercel.com/` instead of `https://pearlie.org`
- Overly permissive CORS: `access-control-allow-origin: *`

### 1.4 URL Structure (88/100) — Good

Clean URLs, consistent lowercase, no trailing slashes. Minor: video filename has spaces.

### 1.5 Mobile (85/100) — Good

Proper viewport, responsive Tailwind, mobile nav. Minor: `maximumScale: 1` disables zoom.

### 1.6 JavaScript Rendering (45/100) — CRITICAL

- 3 of 9 public pages are fully client-rendered (Homepage, Our Mission, Intake)
- Homepage delivers empty HTML shell — all content requires JS execution
- 152 total `"use client"` files; dual motion libraries installed

---

## 2. E-E-A-T Assessment — 8/27 (30/100)

*Scored using the claude-code-seo 27-point checklist*

| Dimension | Criterion | Max | Score |
|-----------|-----------|-----|-------|
| **Experience** | Case studies with data | 3 | **0** |
| | Personal experience sharing | 2 | **0** |
| | Content depth | 2 | **1** |
| **Expertise** | Technical accuracy | 2 | **1** |
| | Author expertise/credentials | 2 | **0** |
| | Professional certifications | 1 | **0** |
| | Domain knowledge | 2 | **1** |
| **Authoritativeness** | External citations | 3 | **2** |
| | Content uniqueness | 2 | **1** |
| | Pillar page completeness | 2 | **0** |
| **Trustworthiness** | Update frequency | 2 | **0** |
| | Data transparency | 2 | **1** |
| | Contact info & transparency | 2 | **1** |
| **TOTAL** | | **27** | **8** |

**Critical E-E-A-T gaps for a healthcare YMYL site:**
- Founder name ("Dr. Grei Mustaj") exists ONLY in image filename — never displayed as text
- No case studies, no patient journey content, no before/after data
- No phone number or physical address anywhere
- Legal pages show `new Date().toLocaleDateString()` — displays today's date daily (misleading)
- Mixed email domains: `@pearlie.co.uk` vs `@pearlie.org`
- No company registration number (Companies House)
- No blog, no educational content, no pillar pages

---

## 3. Metadata — 7.5/20 (38/100)

*Scored using the claude-code-seo 20-point system*

| Category | Score | Max | Key Issue |
|----------|-------|-----|-----------|
| Title Tags | 3.5 | 8 | 0/9 pages in ideal 50-60 char range; 3 pages have double branding |
| Meta Descriptions | 2.5 | 8 | 0/9 pages in ideal 150-160 char range; Our Mission duplicates homepage |
| OG & Twitter Cards | 1.5 | 4 | OG image is square icon (1024x1024 declared as 180x180); Twitter uses "summary" not "summary_large_image" |

**New finding from claude-code-seo audit:**
- **`metadata.ts` files override `page.tsx` inline metadata** — About, FAQ, and Intake have BOTH, creating conflicting sources of truth
- The `metadata.ts` titles already include "Pearlie", and the root template appends "| Pearlie" again, producing:
  - About: `"About Us | Pearlie - Connecting Patients with Trusted Dental Clinics | Pearlie"` (77 chars)
  - FAQ: `"FAQ | Pearlie - Common Questions About Our Dental Matching Service | Pearlie"` (76 chars)
  - Intake: `"Patient Intake Form | Pearlie - Find Your Perfect Dental Clinic | Pearlie"` (73 chars)

---

## 4. Schema / Structured Data — 20/100

One single `WebApplication` JSON-LD in root layout applied to ALL pages. No `@graph`, no `@id` references.

**Missing schemas (by rich results potential):**

| Schema | Page | Rich Result? | Priority |
|--------|------|:---:|----------|
| **FAQPage** | `/faq` (12 Q&As) | **YES** | CRITICAL |
| **Organization** | Root layout | YES — Knowledge Panel | HIGH |
| **WebSite** | Root layout | YES — Sitelinks | HIGH |
| **BreadcrumbList** | All pages | YES — Breadcrumbs | MEDIUM |
| **HowTo** | Homepage (3 steps) | YES | MEDIUM |
| **FAQPage** | `/about` (5 guarantee Q&As) | YES | MEDIUM |
| **LocalBusiness/areaServed** | Root layout | YES — Local pack | HIGH |

---

## 5. Performance / Core Web Vitals — 49/100

| Metric | Score | Critical Issue |
|--------|-------|----------------|
| LCP | 35/100 | Client-rendered homepage + 1.1s loading animation + render-blocking fonts |
| INP | 50/100 | Heavy framer-motion, 152 client components |
| CLS | 55/100 | Hero video no dimensions/poster, font swap FOUT |
| Resources | 40/100 | Monolithic homepage bundle, duplicate motion libs |
| Third-Party | 80/100 | Well-implemented consent gating (good!) |
| Images | 55/100 | Raw `<img>` tags, no AVIF, video lacks poster |
| Fonts | 30/100 | External Google Fonts `<link>`, 11 variants loaded |

---

## 6. Content Strategy — 2/10 (20/100)

*New dimension from claude-code-seo*

| Category | Score | Max | Key Issue |
|----------|-------|-----|-----------|
| Topic Cluster Structure | 1 | 4 | Flat architecture, no pillar pages, no treatment/location pages |
| Content Calendar / Freshness | 0 | 3 | No blog, no dated content, fake `lastModified` dates |
| Keyword Cannibalization | 1 | 3 | `/intake` vs `/book` duplication; overlapping titles/H1s |

**Biggest missed opportunity:** The intake form references 7 treatment types (Invisalign, implants, veneers, composite bonding, whitening, general, emergency) but there are ZERO indexable pages for these keywords. Each could be a pillar page ranking for high-intent searches.

---

## 7. Local SEO — 17/100

*New dimension from claude-code-seo*

| Category | Score | Max | Key Issue |
|----------|-------|-----|-----------|
| NAP Consistency | 4 | 25 | No address, no phone, mixed email domains |
| Local Keywords | 8 | 25 | Zero geo terms in any title/meta; "London" only in body copy |
| GBP Signals | 2 | 25 | Maps only on authenticated pages; no public GBP presence |
| Local Structured Data | 2 | 15 | No LocalBusiness, no areaServed, no geo coordinates |
| Review Strategy | 1 | 10 | Testimonials without schema; no third-party review links |

---

## 8. AI Search Readiness — 34/100

- Homepage invisible to non-JS AI crawlers
- No `/llms.txt` file (0/100)
- No explicit AI crawler rules in robots.txt
- No FAQPage schema for AI citation
- No founder credentials for YMYL trust

---

## 9. Sitemap & URLs — 69/100

- lastmod accuracy: 20/100 (all use `new Date()`)
- Sitemap completeness: 72/100 (`/book` missing or should redirect)
- Priority values: 80/100 (well-structured hierarchy)
- No dynamic clinic profile pages for SEO

---

## Tool Comparison: Where They Agree & Differ

### Both tools agreed on:
- FAQPage schema is the #1 quick win
- Homepage client-rendering is the #1 architectural problem
- Metadata gaps on Our Mission and Intake are critical
- Font loading needs to switch to `next/font`
- E-E-A-T is dangerously weak for a healthcare platform
- `/book` vs `/intake` duplication must be resolved

### claude-code-seo added (not found by claude-seo):
- **Double branding bug is worse than initially reported** — affects 3 pages (About, FAQ, Intake) not just FAQ
- **`metadata.ts` vs `page.tsx` conflicts** — dual metadata sources creating confusion
- **OG image dimensions mismatch** — declared as 180x180 but actual file is 1024x1024
- **Dynamic legal page dates are misleading** — `new Date().toLocaleDateString()` shows today's date as "last updated"
- **Content Strategy is essentially zero** — no cluster architecture, no blog, no freshness
- **Local SEO is critically underserved** — for a London-focused platform, zero geo optimization
- **27-point E-E-A-T breakdown** revealed specific gaps (0/3 case studies, 0/2 author expertise, 0/2 certifications)

### claude-seo covered more deeply:
- Performance/CWV with specific LCP/INP/CLS analysis and code-level bottlenecks
- AI Search Readiness with llms.txt, AI crawler rules, citability scoring
- Sitemap architecture with lastmod, priority, changefreq analysis
- Security headers enumeration
- Image optimization patterns across all components

---

## Files Referenced

### Core SEO Files
| File | Role | Issues |
|------|------|--------|
| `app/layout.tsx` | Root metadata, JSON-LD, fonts, OG/Twitter | Render-blocking font link; single flat schema; OG image wrong size |
| `app/robots.ts` | Robots.txt generation | No AI crawler rules |
| `app/sitemap.ts` | Sitemap generation | All lastmod use `new Date()` |
| `next.config.mjs` | Next.js config | No security headers, no AVIF, no redirects |

### Pages With Critical Issues
| File | Issue |
|------|-------|
| `app/page.tsx` | `"use client"`, no metadata, monolithic bundle |
| `app/our-mission/page.tsx` | `"use client"`, no metadata.ts, no metadata at all |
| `app/about/page.tsx` | Dual metadata (page.tsx + metadata.ts), H1 overlap, founder name hidden |
| `app/faq/page.tsx` | Dual metadata, double branding, no FAQPage schema |
| `app/intake/page.tsx` | `"use client"`, metadata.ts has double branding |
| `app/book/page.tsx` | Legacy v0 prototype, duplicates /intake, unlisted |
| `app/clinics/[clinicId]/page.tsx` | Client-side redirect only |
| `app/terms/page.tsx` | No footer, dead-end, fake date |
| `app/cookies/page.tsx` | No footer, orphan, placeholder "(if implemented)" text, fake date |
| `app/privacy/page.tsx` | Fake dynamic date |

### Performance Bottlenecks
| File | Issue |
|------|-------|
| `components/loading-animation.tsx` | 1.1s artificial LCP delay |
| `components/analytics-scripts.tsx` | TikTok utilities always bundled |
| `package.json` | Dual motion libraries (framer-motion + motion) |
