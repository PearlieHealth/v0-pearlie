# Pearlie SEO Master Plan — Audit, Strategy & Sprint Breakdown

> **Purpose:** Comprehensive, sprint-ready SEO plan based on a full audit of pearlie.org, competitor analysis (Opencare, Toothfairy, Dental Departures), and UK dental keyword research. Designed so an AI or developer can pick up any sprint and execute independently.
>
> **Date:** 2026-02-26
> **Supersedes:** `docs/SEO_CONTENT_PLAN.md` (content-only plan)

---

## Table of Contents

- [Part A: Site Audit & Gap Analysis](#part-a-site-audit--gap-analysis)
- [Part B: Competitor Intelligence](#part-b-competitor-intelligence)
- [Part C: Technical SEO Fixes](#part-c-technical-seo-fixes)
- [Part D: Content System (Blog, Guides, Locations)](#part-d-content-system-blog-guides-locations)
- [Part E: Patient Content Strategy](#part-e-patient-content-strategy)
- [Part F: Clinic Content Strategy (B2B)](#part-f-clinic-content-strategy-b2b)
- [Part G: Landing Page Strategy](#part-g-landing-page-strategy)
- [Part H: Sprint Breakdown](#part-h-sprint-breakdown)

---

# Part A: Site Audit & Gap Analysis

## A1. Page-by-Page Metadata Audit

| Page | Title | Description | Canonical | OG Tags | JSON-LD | H1 | Verdict |
|------|-------|-------------|-----------|---------|---------|----|----|
| `/` (Homepage) | "Pearlie - Find the Right Dental Clinic for You" | 145 chars | Root layout | Complete | Org + WebSite + WebApp | In hero | **GOOD** |
| `/about` | "About Pearlie - Independent Dental Clinic Matching" | 82 chars | `/about` | Complete | BreadcrumbSchema | "Built to bring clarity..." | **GOOD** |
| `/faq` | "FAQ - Frequently Asked Questions" | 107 chars | `/faq` | Complete | FAQPage + Breadcrumb | "Frequently asked questions" | **GOOD** |
| `/for-clinics` | "For Dental Clinics - Join Pearlie's Network" | 76 chars | `/for-clinics` | Complete | BreadcrumbSchema | "Better-fit patients..." | **GOOD** |
| `/our-mission` | **NONE** | **NONE** | **NONE** | **NONE** | **NONE** | "Over 13 million adults..." | **CRITICAL** |
| `/intake` | **NONE** (client-side) | **NONE** | **NONE** | **NONE** | **NONE** | Form steps | **CRITICAL** |
| `/match/[matchId]` | **NONE** (client-side) | **NONE** | **NONE** | **NONE** | **NONE** | Dynamic | **CRITICAL** |
| `/clinic/[clinicId]` | Dynamic: "{name} - Dentist in {city}" | Dynamic | Dynamic slug | Full OG | Dentist + AggregateRating + Geo | Profile | **EXCELLENT** |
| `/privacy` | "Privacy Policy" | 80 chars | `/privacy` | Complete | BreadcrumbSchema | "Privacy Policy" | **GOOD** |
| `/terms` | "Terms of Service" | 67 chars | `/terms` | Complete | BreadcrumbSchema | "Terms of Use" | **GOOD** |
| `/cookies` | "Cookie Policy" | 98 chars | `/cookies` | Complete | BreadcrumbSchema | "Cookie Policy" | **GOOD** |

### Critical Issues (3 pages with zero SEO)

1. **`/our-mission`** — Entire page is `"use client"` with NO metadata export. This page is invisible to search engines for title/description. **File:** `app/our-mission/page.tsx`
2. **`/intake`** — Fully client-side form. Cannot rank for "find a dental clinic" or "dentist matching" queries. **File:** `app/intake/page.tsx`
3. **`/match/[matchId]`** — No `generateMetadata()`. Dynamic match pages are completely unindexable. **File:** `app/match/[matchId]/page.tsx`

## A2. Technical SEO Audit

### What's Working
- Sitemap includes all static routes + dynamic clinic profiles
- Robots.txt correctly blocks /admin/, /patient/, /api/, /auth/, /booking/
- LLM bot rules for GPTBot, ClaudeBot, PerplexityBot, Applebot
- Image optimization: AVIF/WebP via Next.js, `display: "swap"` fonts
- Security headers: HSTS (2yr), CSP, X-Frame-Options, Referrer-Policy
- 404 page exists with proper H1 and CTAs
- Clinic pages have rich structured data (Dentist schema, ratings, geo)

### What's Missing
| Gap | Impact | Priority |
|-----|--------|----------|
| No blog/content system | Cannot capture informational search traffic | **P0** |
| No location/area pages | Cannot rank for "dentist in [area]" queries | **P0** |
| No treatment landing pages | Cannot rank for "Invisalign London", "dental implants UK" etc. | **P0** |
| 3 pages missing metadata (see above) | Lost indexation for core pages | **P0** |
| No visible breadcrumb UI | Only JSON-LD breadcrumbs, no user-facing navigation | **P1** |
| Sparse image alt text (24 instances total) | Poor image SEO, accessibility issues | **P1** |
| No VideoObject schema for homepage hero video | Missing rich results for video content | **P2** |
| No HowTo schema for "How It Works" section | Missing rich results opportunity | **P2** |
| No internal linking strategy | Weak topical authority signals | **P1** |
| No `for-clinics` structured data (B2B) | No SaaS/Service schema for clinic-facing pages | **P2** |
| Homepage hero video not optimized (raw MP4) | Page speed impact | **P2** |

## A3. Structured Data Audit

### Implemented
- Organization (root layout) — founder, contact, service area
- WebSite (root layout) — SearchAction for `/intake`
- WebApplication (root layout) — HealthApplication category
- BreadcrumbList (about, faq, for-clinics, privacy, terms, cookies, clinic)
- FAQPage (faq page — 15 Q&A, about page — 5 Q&A)
- Dentist (clinic pages) — AggregateRating, GeoCoordinates, OpeningHours

### Missing (High-Value)
- **Article / BlogPosting** — Needed for blog posts and guides
- **LocalBusiness** — For location pages listing clinics in an area
- **MedicalWebPage** — For treatment/health content (YMYL signal)
- **Service** — For treatment descriptions and pricing
- **VideoObject** — For homepage hero video
- **HowTo** — For "How it works" process
- **AggregateOffer** — For treatment price ranges
- **ItemList** — For clinic listing pages

## A4. Content Gap Analysis

| Content Type | Pearlie Has? | Competitors Have? | Impact |
|---|---|---|---|
| Blog / Articles | **NO** | Opencare ("The Floss"), all competitors | Cannot capture informational traffic |
| Treatment landing pages | **NO** | Opencare, Dental Departures, all UK agencies | Cannot rank for treatment keywords |
| Location pages (city/area) | **NO** | Opencare (546K+ pages), Dental Departures | Cannot rank for "dentist in [area]" |
| Insurance/payment pages | **NO** | Opencare (insurance-filtered pages) | Cannot rank for "NHS dentist" / payment queries |
| Clinic comparison pages | **NO** | Opencare (20 best dentists in...) | Missing commercial intent traffic |
| For-clinics resource center | **NO** | Opencare (practice management blog) | No B2B content marketing |
| Patient education hub | **NO** | All competitors | No top-of-funnel awareness content |
| Treatment cost pages | **NO** | All competitors | Missing highest-converting CI queries |

---

# Part B: Competitor Intelligence

## B1. Opencare (opencare.com) — US Market Leader

### URL Structure (546,227 indexed pages)
```
/                                          → Homepage + search
/dentists/{city}-{state}/                  → City landing pages (e.g., /dentists/new-york-ny/)
/dentists/{city}-{state}/{insurance}/      → Insurance-filtered (e.g., /dentists/seattle-wa/cigna/)
/dentists/{city}-{state}/{neighborhood}/   → Neighborhood sub-pages
/blog/                                     → "The Floss" blog
/blog/category/for-dentists/               → B2B content for clinics
/blog/category/patient/                    → Patient-facing content
/blog/category/read/                       → Treatment guides & education
/blog/category/watch/                      → Video content
/blog/tag/faq-series/                      → FAQ content by location
/for-dentists/patient-acquisition/         → B2B landing page
/about/                                    → Company about
/claim-offer/                              → Patient incentive page
/affiliates/                               → Referral program
```

### Key Takeaways for Pearlie
1. **Massive location page inventory** — City + neighborhood + insurance variants = 546K pages
2. **Dual-audience blog** — "For Dentists" and "Patient" categories under one blog
3. **Insurance-filtered pages** — UK equivalent: NHS vs private filter pages
4. **"20 Best Dentists" pattern** — Comparison/listicle landing pages per city
5. **Claim offer incentive** — New patient offers to drive conversion
6. **B2B content** — Practice management, billing, marketing content for clinics

### What Pearlie Should Adopt
- Location pages: `/find/{area}/` (London neighborhoods + UK cities)
- Treatment pages: `/treatments/{treatment}/` (Invisalign, implants, etc.)
- NHS/Private filter pages: `/find/{area}/nhs/` and `/find/{area}/private/`
- Dual-audience blog with patient AND clinic content
- "Best dentists in" comparison pages per area

## B2. Toothfairy (UK)

- **toothfairydentist.co.uk** — On-demand dental care platform, focuses on affordability
- **toothfairyapp.co.uk** — Award-winning app pairing real dentists with smart tech
- **Key insight:** UK dental platforms focus heavily on "affordable" and "on-demand" — NHS access crisis is driving demand

## B3. UK Dental SEO Best Practices (from agencies)

- **Funnel-based keyword targeting:** Top-of-funnel (informational) → Mid-funnel (comparison) → Bottom-funnel (transactional)
- **Local SEO is critical:** Google Business Profile, NAP consistency, local citations
- **E-E-A-T signals essential for YMYL:** Author bios, About Us, testimonials, credentials
- **Content cadence matters:** Regular blog publishing signals freshness to Google
- **Review management:** Patient reviews directly impact local rankings
- **3-6 month timeline:** Expect gradual results; consistency is key

---

# Part C: Technical SEO Fixes

## Sprint C1: Fix Critical Metadata Gaps

### C1.1: Add metadata to `/our-mission`

**File:** `app/our-mission/page.tsx`

The page is currently `"use client"`. Options:
1. **Option A (preferred):** Extract metadata to a separate `layout.tsx` in the same directory
2. **Option B:** Convert to server component with client sub-components

```typescript
// app/our-mission/layout.tsx (new file)
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Our Mission - Making Dental Care Accessible for Everyone",
  description: "Pearlie's mission is to help every patient in the UK find the right dental clinic. Over 13 million adults have unmet dental needs — we're changing that.",
  alternates: { canonical: "https://pearlie.org/our-mission" },
  openGraph: {
    title: "Our Mission | Pearlie",
    description: "Over 13 million adults in England have unmet dental needs. Pearlie is building the bridge between patients and quality dental care.",
    url: "https://pearlie.org/our-mission",
    type: "website",
  },
}

export default function OurMissionLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

### C1.2: Add metadata to `/intake`

**File:** `app/intake/page.tsx`

Same approach — create `app/intake/layout.tsx`:

```typescript
export const metadata: Metadata = {
  title: "Find Your Dental Clinic - Free Matching Service",
  description: "Answer a few questions and get matched with GDC-registered dental clinics in London and across the UK. Free, independent, and tailored to your needs.",
  alternates: { canonical: "https://pearlie.org/intake" },
  keywords: ["find a dentist", "dental clinic matching", "dentist near me UK", "free dental matching"],
  openGraph: {
    title: "Find Your Dental Clinic Match | Pearlie",
    description: "Get matched with the right dental clinic for your needs. Free and independent.",
    url: "https://pearlie.org/intake",
    type: "website",
  },
}
```

### C1.3: Add `generateMetadata()` to `/match/[matchId]`

**File:** `app/match/[matchId]/page.tsx`

Convert to hybrid: server metadata + client rendering.

```typescript
// Option: Create app/match/[matchId]/layout.tsx with dynamic metadata
// or refactor page to server component with client child
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: "Your Dental Clinic Matches | Pearlie",
    description: "View your personalised dental clinic matches. Compare clinics, read reviews, and find the right dentist for you.",
    robots: { index: false, follow: true }, // Don't index individual match pages
  }
}
```

## Sprint C2: Add Visible Breadcrumbs

Create `components/ui/breadcrumb-nav.tsx` — visible breadcrumb UI that complements the existing JSON-LD BreadcrumbSchema:

```
Home > About
Home > FAQ
Home > For Clinics
Home > Blog > [Category] > [Post Title]
Home > Find a Dentist > [Area]
Home > Guides > [Guide Title]
Home > Treatments > [Treatment]
```

## Sprint C3: Image Alt Text Sweep

Audit all components for missing alt text. Priority files:
- `components/clinic-carousel.tsx`
- `components/homepage/*.tsx`
- `components/match/*.tsx`
- `app/page.tsx` (homepage hero)
- `app/for-clinics/page.tsx`
- `app/about/page.tsx`

Target: Every `<Image>` and `<img>` tag has a descriptive, keyword-relevant alt attribute.

## Sprint C4: Add Missing Schema Markup

1. **VideoObject** on homepage hero video
2. **HowTo** on homepage "How It Works" section
3. **Service** schema on treatment pages (when created)
4. **ItemList** schema on clinic listing/comparison pages

## Sprint C5: Page Speed Improvements

1. Optimize homepage hero video (compress MP4, add poster image, lazy load)
2. Audit bundle size with `next build --analyze`
3. Ensure all above-the-fold images use `priority` prop
4. Add `loading="lazy"` to below-fold images

---

# Part D: Content System (Blog, Guides, Locations)

## Architecture: MDX-Based Static Content

### Dependencies
```bash
npm install next-mdx-remote gray-matter reading-time @tailwindcss/typography
```

### Directory Structure
```
content/
├── blog/                          # Blog MDX files
│   ├── dental-implants-cost-uk.mdx
│   └── ...
├── guides/                        # Pillar guide MDX files
│   ├── dental-implants.mdx
│   └── ...
├── locations/                     # Location page MDX files
│   ├── london/harley-street.mdx
│   └── uk/manchester.mdx
└── treatments/                    # Treatment landing page MDX files
    ├── invisalign.mdx
    └── dental-implants.mdx

app/
├── blog/
│   ├── page.tsx                   # Blog index
│   └── [slug]/page.tsx            # Blog post
├── guides/
│   ├── page.tsx                   # Guides index
│   └── [slug]/page.tsx            # Guide page
├── find/
│   ├── page.tsx                   # Location index
│   └── [area]/page.tsx            # Location page
└── treatments/
    ├── page.tsx                   # Treatments index
    └── [slug]/page.tsx            # Treatment landing page

lib/content/
├── blog.ts                        # Blog loading utilities
├── guides.ts                      # Guide loading utilities
├── locations.ts                   # Location loading utilities
├── treatments.ts                  # Treatment loading utilities
└── mdx.ts                        # Shared MDX processing

components/
├── blog/
│   ├── blog-card.tsx
│   ├── blog-header.tsx
│   ├── blog-list.tsx
│   ├── mdx-components.tsx
│   ├── table-of-contents.tsx
│   └── related-posts.tsx
├── guides/
│   ├── guide-card.tsx
│   └── guide-sidebar.tsx
├── locations/
│   ├── location-card.tsx
│   └── clinic-list-section.tsx
└── treatments/
    ├── treatment-hero.tsx
    └── treatment-cta.tsx
```

### MDX Frontmatter (Blog)
```yaml
---
title: "How Much Do Dental Implants Cost in the UK?"
slug: "dental-implants-cost-uk"
description: "Complete 2026 breakdown of dental implant costs..."
category: "cost-finance"
tags: ["dental implants", "cost guide"]
author: "Pearlie Editorial"
publishedAt: "2026-03-01"
updatedAt: "2026-03-01"
heroImage: "/content/blog/dental-implants-cost.jpg"
heroImageAlt: "Dental implant model showing titanium post and crown"
featured: false
keywords: ["dental implants cost UK", "how much do dental implants cost"]
relatedSlugs: ["dental-implants-vs-dentures", "full-mouth-dental-implants-uk"]
---
```

### Navigation Changes

**Main nav** (`components/main-nav.tsx`): Add "Blog" link
**Footer** (`components/site-footer.tsx`): Add "Resources" column with Blog, Guides, Find by Area, Treatments

### Sitemap Updates

Add all blog posts, guides, locations, and treatment pages to `app/sitemap.ts`.

---

# Part E: Patient Content Strategy

## E1. Blog Categories

| Category | Slug | Description | Example Topics |
|----------|------|-------------|----------------|
| Treatment Guides | `treatment-guides` | In-depth procedure explanations | Root canal guide, crown types, wisdom tooth removal |
| Cost & Finance | `cost-finance` | Pricing, insurance, payment options | Implant costs, Invisalign pricing, NHS bands explained |
| Find a Dentist | `find-a-dentist` | Location-specific dental care guides | Best dentists in Canary Wharf, Manchester dentist guide |
| Dental Health Tips | `dental-health` | Preventive care & oral hygiene | How often to visit, toothache relief, gum disease signs |
| Nervous Patients | `nervous-patients` | Dental anxiety & sedation | Overcoming dental fear, sedation options, CBT for phobia |
| NHS & Private Care | `nhs-private` | Navigating the UK dental system | NHS vs private, finding NHS dentist, dental charges explained |
| Smile Transformations | `smile-transformations` | Patient journeys & results | Before/after stories, treatment journeys |
| News & Trends | `news-trends` | Industry updates, new treatments | NHS contract changes, new cosmetic treatments |

## E2. Top 30 Blog Posts (Priority Ordered)

| # | Slug | Title | Category | Primary Keyword | Search Intent |
|---|------|-------|----------|----------------|---------------|
| 1 | `dental-implants-cost-uk` | How Much Do Dental Implants Cost in the UK? (2026 Guide) | cost-finance | `dental implants cost UK` | Commercial Investigation |
| 2 | `invisalign-vs-braces` | Invisalign vs Braces: Which Is Right for You? | treatment-guides | `Invisalign vs braces` | CI |
| 3 | `invisalign-cost-uk` | How Much Does Invisalign Cost in the UK? | cost-finance | `Invisalign cost UK` | CI |
| 4 | `emergency-dentist-near-you` | How to Find an Emergency Dentist Near You | find-a-dentist | `emergency dentist near me` | Transactional |
| 5 | `composite-bonding-cost-uk` | Composite Bonding: Cost, Process & What to Expect | cost-finance | `composite bonding cost UK` | CI |
| 6 | `nhs-vs-private-dentist` | NHS vs Private Dentist: What Are the Differences? | nhs-private | `NHS vs private dentist` | CI |
| 7 | `veneers-cost-uk` | Porcelain Veneers Cost in the UK: Full Breakdown | cost-finance | `veneers cost UK` | CI |
| 8 | `teeth-whitening-options` | Teeth Whitening: Professional vs At-Home Options | treatment-guides | `teeth whitening UK` | CI |
| 9 | `dental-emergency-guide` | What to Do When You Have a Dental Emergency (UK Guide) | dental-health | `dental emergency what to do` | Informational |
| 10 | `nhs-dentist-accepting-patients` | How to Find an NHS Dentist Accepting New Patients | nhs-private | `NHS dentist accepting new patients` | Transactional |
| 11 | `root-canal-treatment-uk` | Root Canal Treatment: Cost, Pain & Recovery Guide | treatment-guides | `root canal treatment UK` | CI |
| 12 | `dental-crowns-guide` | Dental Crowns: Types, Cost & What to Expect | treatment-guides | `dental crown cost UK` | CI |
| 13 | `wisdom-tooth-removal` | Wisdom Tooth Removal: Everything You Need to Know | treatment-guides | `wisdom tooth removal UK` | CI |
| 14 | `dental-implants-vs-dentures` | Dental Implants vs Dentures: Which Should You Choose? | treatment-guides | `dental implants vs dentures` | CI |
| 15 | `same-day-dental-implants` | Same Day Dental Implants: Are They Worth It? | treatment-guides | `same day dental implants UK` | CI |
| 16 | `invisalign-for-adults` | Invisalign for Adults: Is It Too Late? | treatment-guides | `Invisalign adults UK` | CI |
| 17 | `dental-anxiety-overcome` | Dental Anxiety: How to Overcome Your Fear of the Dentist | nervous-patients | `dental anxiety help` | Informational |
| 18 | `sedation-dentistry-uk` | Sedation Dentistry UK: Options for Nervous Patients | nervous-patients | `sedation dentist near me` | CI |
| 19 | `private-dental-checkup-cost` | How Much Does a Private Dental Check-Up Cost? | cost-finance | `private dental check up cost` | CI |
| 20 | `dental-bridges-guide` | Dental Bridges: Types, Cost & Alternatives | treatment-guides | `dental bridge cost UK` | CI |
| 21 | `smile-makeover-guide` | Smile Makeover: Treatments, Cost & How to Plan Yours | treatment-guides | `smile makeover UK` | CI |
| 22 | `clear-aligners-comparison` | Clear Aligners in the UK: Comparing Your Options | treatment-guides | `clear aligners UK` | CI |
| 23 | `how-often-visit-dentist` | How Often Should You Visit the Dentist? | dental-health | `how often dentist visit` | Informational |
| 24 | `dental-payment-plans-uk` | Dental Payment Plans & Finance Options Explained | cost-finance | `dental payment plan UK` | CI |
| 25 | `dental-implant-recovery` | Dental Implant Recovery: Timeline & What to Expect | treatment-guides | `dental implant recovery time` | Informational |
| 26 | `childs-first-dental-visit` | Child's First Dental Visit: A Parent's Guide | dental-health | `children's dentist near me` | Informational |
| 27 | `toothache-relief-guide` | Tooth Pain Relief: What to Do Before You See a Dentist | dental-health | `toothache relief UK` | Informational |
| 28 | `gum-disease-guide` | Gum Disease: Signs, Treatment & Prevention | dental-health | `gum disease treatment UK` | Informational |
| 29 | `dental-insurance-uk` | Dental Insurance in the UK: Is It Worth It? | cost-finance | `dental insurance UK` | CI |
| 30 | `full-mouth-dental-implants-uk` | Full Mouth Dental Implants UK: Cost & What's Involved | cost-finance | `full mouth dental implants cost UK` | CI |

## E3. Pillar Guides (10 Pages)

These are 2,000-3,500 word comprehensive guides that serve as topic cluster hubs:

| # | Slug | Title | Cluster Blog Posts |
|---|------|-------|--------------------|
| 1 | `dental-implants` | The Complete Guide to Dental Implants in the UK | #1, #14, #15, #25, #30 |
| 2 | `invisalign-clear-aligners` | Everything About Invisalign & Clear Aligners | #2, #3, #16, #22 |
| 3 | `cosmetic-dentistry` | Complete Guide to Cosmetic Dentistry in the UK | #5, #7, #8, #21 |
| 4 | `find-the-right-dentist` | How to Find the Right Dentist: A Patient's Guide | #6, #17, #19, #23 |
| 5 | `dental-costs-uk` | Understanding Dental Costs in the UK | #24, #29, #19, #6 |
| 6 | `dental-emergencies` | The Complete Guide to Dental Emergencies | #4, #9, #27 |
| 7 | `childrens-dentistry` | A Parent's Guide to Children's Dentistry | #26 |
| 8 | `teeth-straightening` | Complete Guide to Teeth Straightening for Adults | #2, #16, #22 |
| 9 | `dental-anxiety` | Overcoming Dental Anxiety: A Comprehensive Guide | #17, #18 |
| 10 | `nhs-dental-care` | The NHS Dental Care Guide: Everything You Need to Know | #6, #10 |

---

# Part F: Clinic Content Strategy (B2B)

Inspired by Opencare's "For Dentists" blog category, Pearlie should create content targeting dental clinic owners and practice managers.

## F1. For-Clinics Blog Content

These posts live in the same blog system but under a `for-clinics` category:

| # | Slug | Title | Target Audience | Primary Keyword |
|---|------|-------|----------------|----------------|
| 1 | `patient-acquisition-guide` | How to Attract New Patients to Your Dental Practice (2026 Guide) | Practice managers | `dental patient acquisition` |
| 2 | `dental-practice-seo-guide` | SEO for Dental Practices: A Complete UK Guide | Clinic owners | `dental practice SEO UK` |
| 3 | `dental-marketing-strategies` | 15 Dental Marketing Strategies That Actually Work | Marketing managers | `dental marketing strategies` |
| 4 | `online-reviews-dental` | How to Get More Online Reviews for Your Dental Practice | Clinic owners | `dental practice reviews` |
| 5 | `dental-practice-website` | What Makes a Great Dental Practice Website? | Clinic owners | `dental practice website` |
| 6 | `converting-enquiries-patients` | How to Convert Patient Enquiries into Bookings | Receptionists, managers | `dental patient conversion` |
| 7 | `dental-pricing-transparency` | Why Transparent Pricing Attracts Better Patients | Clinic owners | `dental pricing strategy` |
| 8 | `nhs-to-private-transition` | Transitioning from NHS to Private Practice: A Practical Guide | NHS dentists | `NHS to private dentist` |
| 9 | `dental-practice-growth` | Growing Your Dental Practice: Lessons from Top UK Clinics | Clinic owners | `dental practice growth UK` |
| 10 | `joining-dental-platform` | Why Top Clinics Are Joining Dental Matching Platforms | Clinic owners | `dental matching platform` |

## F2. For-Clinics Resource Center

Expand `/for-clinics` into a mini resource hub:

```
/for-clinics                        → Main B2B landing page (existing)
/for-clinics/resources              → Resource index for clinic owners
/for-clinics/case-studies           → Success stories from Pearlie clinics
/for-clinics/pricing                → Platform pricing/plans page
```

## F3. Clinic-Facing Schema Markup

Add to `/for-clinics`:
- **SoftwareApplication** or **Service** schema for the Pearlie platform
- **AggregateRating** with platform ratings if available
- **Offer** schema for clinic pricing plans

---

# Part G: Landing Page Strategy

## G1. Treatment Landing Pages (`/treatments/[slug]`)

Inspired by Opencare's treatment pages and UK dental search volume:

| # | Slug | Title | Primary Keywords | Content |
|---|------|-------|-----------------|---------|
| 1 | `invisalign` | Invisalign in London & UK - Find a Provider | `Invisalign London`, `Invisalign near me` | Provider search, pricing, FAQ, schema |
| 2 | `dental-implants` | Dental Implants in London & UK - Find a Specialist | `dental implants London`, `dental implants near me` | Specialist search, pricing, FAQ |
| 3 | `teeth-whitening` | Teeth Whitening in London & UK - Compare Clinics | `teeth whitening London`, `teeth whitening near me` | Clinic comparison, pricing |
| 4 | `composite-bonding` | Composite Bonding in London & UK - Find a Dentist | `composite bonding London` | Provider list, pricing, before/after |
| 5 | `veneers` | Porcelain Veneers in London & UK - Compare Prices | `veneers London`, `veneers cost UK` | Price comparison, provider list |
| 6 | `emergency-dental` | Emergency Dentist in London & UK - Find Help Now | `emergency dentist London`, `emergency dentist near me` | Urgent CTA, available clinics |
| 7 | `dental-check-up` | Private Dental Check-Up - Find a Clinic Near You | `private dental check up near me` | Clinic finder, pricing |
| 8 | `orthodontics` | Orthodontics & Braces in London & UK | `orthodontist London`, `braces London` | Provider search, treatment options |

Each treatment page should:
- List clinics from Supabase that offer the treatment (dynamic)
- Include pricing ranges from clinic data
- Link to the relevant pillar guide
- Have FAQPage schema for treatment-specific questions
- Include a strong CTA to `/intake` with treatment pre-selected

## G2. Location Pages (`/find/[area]`)

### London Neighborhoods (10 pages)

| # | Slug | Title | Lat/Lng | Keywords |
|---|------|-------|---------|----------|
| 1 | `harley-street` | Best Dentists in Harley Street & Marylebone | 51.5188, -0.1483 | `dentist Harley Street` |
| 2 | `canary-wharf` | Find a Dentist in Canary Wharf | 51.5054, -0.0235 | `dentist Canary Wharf` |
| 3 | `kensington-chelsea` | Dentists in Kensington & Chelsea | 51.4990, -0.1914 | `dentist Kensington` |
| 4 | `shoreditch` | Find a Dentist in Shoreditch & East London | 51.5265, -0.0780 | `dentist Shoreditch` |
| 5 | `soho` | Best Dental Clinics in Soho & Central London | 51.5137, -0.1364 | `dentist Soho` |
| 6 | `mayfair` | Find a Dentist in Mayfair & Westminster | 51.5095, -0.1476 | `dentist Mayfair` |
| 7 | `camden` | Dentists in Camden & King's Cross | 51.5390, -0.1426 | `dentist Camden` |
| 8 | `notting-hill` | Find a Dentist in Notting Hill & West London | 51.5093, -0.1964 | `dentist Notting Hill` |
| 9 | `brixton` | Dental Clinics in Brixton & South London | 51.4613, -0.1156 | `dentist Brixton` |
| 10 | `stratford` | Find a Dentist in Stratford & Olympic Park | 51.5430, 0.0006 | `dentist Stratford London` |

### UK Cities (5 pages)

| # | Slug | Title | Keywords |
|---|------|-------|----------|
| 11 | `manchester` | Best Dentists in Manchester | `dentist Manchester`, `private dentist Manchester` |
| 12 | `birmingham` | Find a Dentist in Birmingham | `dentist Birmingham` |
| 13 | `leeds` | Best Dental Clinics in Leeds | `dentist Leeds` |
| 14 | `bristol` | Find a Dentist in Bristol | `dentist Bristol` |
| 15 | `edinburgh` | Dentists in Edinburgh | `dentist Edinburgh` |

Each location page should:
- Show live clinics from Supabase in that area (dynamic server query)
- Include 600-1,000 words of area-specific content (MDX)
- Have local FAQ section with FAQPage schema
- Cross-link to nearby areas
- Link to relevant treatment blog posts
- Include map component (Leaflet)

## G3. Comparison Pages (Future — Phase 3+)

Inspired by Opencare's "20 Best Dentists in [City]" pattern:

```
/find/best-invisalign-london
/find/best-cosmetic-dentist-london
/find/best-dentist-canary-wharf
/find/emergency-dentist-london
```

These are high-conversion pages that combine location + treatment intent.

## G4. NHS vs Private Filter Pages (Future — Phase 3+)

Inspired by Opencare's insurance-filtered pages:

```
/find/london/nhs
/find/london/private
/find/canary-wharf/private
```

UK equivalent of insurance filtering — critical given the NHS access crisis.

---

# Part H: Sprint Breakdown

## Sprint 0: Critical Technical Fixes (1-2 days)
**Goal:** Fix the 3 pages with zero SEO metadata.

| Task | File | Effort |
|------|------|--------|
| Add metadata layout for `/our-mission` | `app/our-mission/layout.tsx` (new) | 30 min |
| Add metadata layout for `/intake` | `app/intake/layout.tsx` (new) | 30 min |
| Add metadata for `/match/[matchId]` | `app/match/[matchId]/layout.tsx` (new) | 30 min |
| Add BreadcrumbSchema to `/our-mission` | `app/our-mission/page.tsx` | 15 min |
| Add VideoObject schema to homepage | `app/page.tsx` | 30 min |
| Add HowTo schema to homepage "How It Works" | `app/page.tsx` | 30 min |
| Image alt text sweep (homepage + key pages) | Multiple files | 1-2 hrs |

**Deliverable:** All public pages have proper title, description, canonical, OG, and schema markup.

## Sprint 1: Content Infrastructure (2-3 days)
**Goal:** Build the blog/content system so content can be published.

| Task | Files | Effort |
|------|-------|--------|
| Install dependencies (next-mdx-remote, gray-matter, reading-time, typography) | package.json | 15 min |
| Create `lib/content/mdx.ts` — shared MDX utilities | New file | 1 hr |
| Create `lib/content/blog.ts` — blog loading functions | New file | 1 hr |
| Create `components/blog/mdx-components.tsx` — custom MDX components | New file | 2 hrs |
| Create `components/blog/blog-card.tsx` — post preview card | New file | 1 hr |
| Create `components/blog/blog-header.tsx` — post header | New file | 1 hr |
| Create `components/blog/related-posts.tsx` — related posts section | New file | 1 hr |
| Create `app/blog/page.tsx` — blog index | New file | 2 hrs |
| Create `app/blog/[slug]/page.tsx` — blog post page | New file | 2 hrs |
| Create 1 sample blog post MDX to test | `content/blog/sample.mdx` | 30 min |
| Add "Blog" to main nav | `components/main-nav.tsx` | 15 min |
| Add "Resources" column to footer | `components/site-footer.tsx` | 30 min |
| Update sitemap with blog routes | `app/sitemap.ts` | 30 min |
| Add visible breadcrumb UI component | `components/ui/breadcrumb-nav.tsx` | 1 hr |

**Deliverable:** Working blog system at `/blog` with one sample post, navigation updated, sitemap includes blog routes.

## Sprint 2: First 5 Blog Posts — Patient Content (2-3 days)
**Goal:** Publish 5 high-value blog posts targeting highest search volume keywords.

| # | Slug | Word Count | Category |
|---|------|------------|----------|
| 1 | `dental-implants-cost-uk` | 1,200-1,500 | cost-finance |
| 2 | `invisalign-vs-braces` | 1,200-1,500 | treatment-guides |
| 3 | `nhs-vs-private-dentist` | 1,000-1,200 | nhs-private |
| 4 | `composite-bonding-cost-uk` | 1,000-1,200 | cost-finance |
| 5 | `emergency-dentist-near-you` | 800-1,000 | find-a-dentist |

Each post includes: hero image, cost table (where applicable), inline CTA, FAQ section with schema, related posts, breadcrumbs.

**Deliverable:** 5 live blog posts targeting top UK dental keywords.

## Sprint 3: Treatment Landing Pages (2-3 days)
**Goal:** Create treatment-specific landing pages with live clinic data.

| Task | Files | Effort |
|------|-------|--------|
| Create `lib/content/treatments.ts` | New file | 1 hr |
| Create `components/treatments/treatment-hero.tsx` | New file | 1 hr |
| Create `components/treatments/treatment-cta.tsx` | New file | 30 min |
| Create `app/treatments/page.tsx` — treatments index | New file | 1 hr |
| Create `app/treatments/[slug]/page.tsx` — treatment page | New file | 2 hrs |
| Create first 4 treatment pages: | | |
| — `content/treatments/invisalign.mdx` | New file | 2 hrs |
| — `content/treatments/dental-implants.mdx` | New file | 2 hrs |
| — `content/treatments/teeth-whitening.mdx` | New file | 1 hr |
| — `content/treatments/emergency-dental.mdx` | New file | 1 hr |
| Update sitemap with treatment routes | `app/sitemap.ts` | 15 min |

**Deliverable:** 4 treatment landing pages with live clinic listings, pricing, FAQ.

## Sprint 4: Location Pages (2-3 days)
**Goal:** Launch location pages for London neighborhoods.

| Task | Files | Effort |
|------|-------|--------|
| Create `lib/content/locations.ts` | New file | 1 hr |
| Create `components/locations/location-card.tsx` | New file | 1 hr |
| Create `components/locations/clinic-list-section.tsx` | New file | 2 hrs |
| Create `app/find/page.tsx` — location index | New file | 1 hr |
| Create `app/find/[area]/page.tsx` — location page | New file | 2 hrs |
| Create first 5 London location pages: | | |
| — `content/locations/london/harley-street.mdx` | New file | 1 hr |
| — `content/locations/london/canary-wharf.mdx` | New file | 1 hr |
| — `content/locations/london/kensington-chelsea.mdx` | New file | 1 hr |
| — `content/locations/london/shoreditch.mdx` | New file | 1 hr |
| — `content/locations/london/soho.mdx` | New file | 1 hr |
| Update sitemap & footer | Multiple | 30 min |

**Deliverable:** 5 London neighborhood pages with live clinic listings, area content, maps.

## Sprint 5: Pillar Guides (2-3 days)
**Goal:** Create comprehensive guide pages and establish topic clusters.

| Task | Files | Effort |
|------|-------|--------|
| Create `lib/content/guides.ts` | New file | 1 hr |
| Create `components/guides/guide-card.tsx` | New file | 1 hr |
| Create `components/guides/guide-sidebar.tsx` with TOC | New file | 2 hrs |
| Create `app/guides/page.tsx` — guides index | New file | 1 hr |
| Create `app/guides/[slug]/page.tsx` — guide page | New file | 2 hrs |
| Create first 3 pillar guides: | | |
| — `content/guides/dental-implants.mdx` (2,500+ words) | New file | 3 hrs |
| — `content/guides/invisalign-clear-aligners.mdx` (2,500+ words) | New file | 3 hrs |
| — `content/guides/dental-costs-uk.mdx` (2,500+ words) | New file | 3 hrs |
| Update internal linking in existing blog posts | Multiple | 1 hr |

**Deliverable:** 3 comprehensive guide pages linked to cluster blog posts.

## Sprint 6: B2B Clinic Content (2-3 days)
**Goal:** Create content targeting dental clinic owners.

| Task | Files | Effort |
|------|-------|--------|
| Add `for-clinics` category to blog system | `lib/content/blog.ts` | 15 min |
| Create 5 clinic-facing blog posts: | | |
| — `patient-acquisition-guide.mdx` | New file | 2 hrs |
| — `dental-practice-seo-guide.mdx` | New file | 2 hrs |
| — `dental-marketing-strategies.mdx` | New file | 2 hrs |
| — `online-reviews-dental.mdx` | New file | 1.5 hrs |
| — `converting-enquiries-patients.mdx` | New file | 1.5 hrs |
| Update `/for-clinics` page with blog links | `app/for-clinics/page.tsx` | 30 min |
| Add clinic blog section to blog index | `app/blog/page.tsx` | 30 min |

**Deliverable:** 5 B2B blog posts for clinic owners, integrated into the blog.

## Sprint 7: Scale & Polish (ongoing)
**Goal:** Fill out remaining content, add advanced features.

- Remaining 25 blog posts
- Remaining 10 location pages (5 London + 5 UK cities)
- Remaining 7 pillar guides
- Remaining 4 treatment landing pages
- Blog search functionality
- Blog category filtering (client-side)
- Newsletter signup integration
- RSS feed (`app/feed.xml/route.ts`)
- Social sharing buttons on blog posts
- Table of contents component for long posts
- "Last updated" dates on cost/pricing posts
- Comparison pages (best dentist in [area] for [treatment])
- NHS vs Private filter pages

---

## Quick Reference: Priority Matrix

| Priority | What | Why | Sprint |
|----------|------|-----|--------|
| **P0 CRITICAL** | Fix 3 pages with zero metadata | Core pages invisible to search engines | 0 |
| **P0 CRITICAL** | Build blog infrastructure | No content = no organic traffic | 1 |
| **P0 CRITICAL** | First 5 blog posts | Target highest-volume keywords | 2 |
| **P0 HIGH** | Treatment landing pages | Capture treatment-intent searches | 3 |
| **P0 HIGH** | Location pages | Capture "dentist in [area]" searches | 4 |
| **P1 IMPORTANT** | Pillar guides | Establish topical authority | 5 |
| **P1 IMPORTANT** | B2B clinic content | Attract clinic sign-ups | 6 |
| **P2 ENHANCE** | Image alt text sweep | Accessibility + image SEO | 0 |
| **P2 ENHANCE** | Breadcrumb UI | User experience + SEO | 1 |
| **P2 ENHANCE** | VideoObject schema | Rich results for video | 0 |
| **P3 FUTURE** | Comparison pages | High-conversion content | 7+ |
| **P3 FUTURE** | NHS/Private filter pages | Match competitor features | 7+ |
| **P3 FUTURE** | Blog search + categories | User experience | 7+ |

---

## Keyword Clusters Reference

### Cluster 1: Dental Implants
**Hub:** `/guides/dental-implants` | `/treatments/dental-implants`
Keywords: `dental implants cost UK`, `dental implants near me`, `same day dental implants`, `full mouth dental implants cost UK`, `dental implants vs dentures`, `All-on-4 dental implants UK`, `dental implant recovery time`

### Cluster 2: Invisalign & Clear Aligners
**Hub:** `/guides/invisalign-clear-aligners` | `/treatments/invisalign`
Keywords: `Invisalign cost UK`, `Invisalign vs braces`, `clear aligners UK`, `Invisalign for adults`, `invisible braces London`, `Invisalign treatment time`, `best Invisalign dentist [city]`

### Cluster 3: Cosmetic Dentistry
**Hub:** `/guides/cosmetic-dentistry`
Keywords: `cosmetic dentist near me`, `veneers cost UK`, `composite bonding cost`, `teeth whitening UK`, `smile makeover cost UK`, `composite bonding vs veneers`, `cosmetic dentist London`

### Cluster 4: Emergency Dental Care
**Hub:** `/guides/dental-emergencies` | `/treatments/emergency-dental`
Keywords: `emergency dentist near me`, `emergency dentist London`, `out of hours dentist`, `toothache relief`, `broken tooth what to do`, `dental abscess emergency`, `weekend dentist near me`

### Cluster 5: NHS Dental Care
**Hub:** `/guides/nhs-dental-care`
Keywords: `NHS dentist near me`, `NHS dentist accepting new patients`, `NHS dental charges`, `NHS vs private dentist`, `NHS dental crisis`, `NHS emergency dentist`

### Cluster 6: Dental Costs & Finance
**Hub:** `/guides/dental-costs-uk`
Keywords: `dental treatment cost UK`, `private dental check up cost`, `dental payment plan UK`, `dental insurance UK`, `dental finance 0%`, `Denplan cost`, `cheapest dentist near me`

### Cluster 7: Children's & Family Dentistry
**Hub:** `/guides/childrens-dentistry`
Keywords: `children's dentist near me`, `family dentist near me`, `child first dental visit`, `NHS dentist for children`, `orthodontist for children`, `dental anxiety children`

### Cluster 8: Dental Anxiety & Sedation
**Hub:** `/guides/dental-anxiety`
Keywords: `dentist for nervous patients`, `sedation dentist near me`, `dental anxiety help`, `dental phobia UK`, `IV sedation dentist`, `fear of dentist how to cope`

---

*Generated from full site audit of pearlie.org, competitor analysis of Opencare and UK dental platforms, and UK dental keyword research.*
