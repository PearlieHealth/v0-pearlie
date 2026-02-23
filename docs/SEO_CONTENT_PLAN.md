# Pearlie SEO & Content Marketing Implementation Plan

> **Purpose:** This document is a comprehensive, self-contained reference for any Claude session (or developer) to implement the blog/content system, location pages, and SEO content strategy for Pearlie. It covers database schema, file structure, component architecture, content specifications, navigation changes, metadata patterns, and phased rollout.
>
> **Date:** 2026-02-23

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [File & Route Structure](#3-file--route-structure)
4. [Component Architecture](#4-component-architecture)
5. [Blog System Implementation](#5-blog-system-implementation)
6. [Location Pages Implementation](#6-location-pages-implementation)
7. [Guide (Pillar) Pages Implementation](#7-guide-pillar-pages-implementation)
8. [Navigation & Footer Changes](#8-navigation--footer-changes)
9. [SEO & Metadata Patterns](#9-seo--metadata-patterns)
10. [Sitemap & Robots Updates](#10-sitemap--robots-updates)
11. [Content Specifications](#11-content-specifications)
12. [Phased Rollout](#12-phased-rollout)
13. [Content Data: Blog Topics](#13-content-data-blog-topics)
14. [Content Data: Location Pages](#14-content-data-location-pages)
15. [Content Data: Pillar Guides](#15-content-data-pillar-guides)
16. [Content Data: Keyword Clusters](#16-content-data-keyword-clusters)

---

## 1. Architecture Overview

### Approach: MDX-based static content (no CMS)

The blog and content pages will use **MDX files stored in the repo** rather than a database-backed CMS. Rationale:

- **Simplicity:** No new database tables, no admin UI for content management
- **Performance:** Static generation at build time (ISR optional later)
- **SEO:** Full control over metadata, schema markup, and URL structure
- **Version control:** All content changes tracked in git
- **Cost:** Zero additional infrastructure

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Content storage | MDX files in `content/` directory | Git-tracked, statically generated, no DB overhead |
| MDX processing | `next-mdx-remote` | Supports dynamic loading, frontmatter, custom components |
| Styling | Tailwind `@tailwindcss/typography` (`prose`) | Consistent with existing design system |
| URL structure | `/blog/[slug]`, `/find/[area]`, `/guides/[slug]` | SEO-friendly, matches keyword research |
| Images | `/public/content/` directory | Optimized via Next.js `<Image>` |

### Dependencies to Add

```bash
npm install next-mdx-remote gray-matter reading-time @tailwindcss/typography
```

- `next-mdx-remote` — Render MDX with custom components
- `gray-matter` — Parse YAML frontmatter from MDX files
- `reading-time` — Calculate "X min read" for blog posts
- `@tailwindcss/typography` — `prose` class for article styling

---

## 2. Database Schema

**No new database tables are required.** All content is file-based MDX.

However, if analytics tracking for content pages is desired in the future, the existing `analytics_events` table can be used with event types like `blog_view`, `guide_view`, `location_page_view`.

---

## 3. File & Route Structure

### New Directories

```
v0-pearlie/
├── content/
│   ├── blog/                          # Blog post MDX files
│   │   ├── dental-implants-cost-uk.mdx
│   │   ├── invisalign-vs-braces.mdx
│   │   └── ...
│   ├── guides/                        # Pillar/guide MDX files
│   │   ├── dental-implants.mdx
│   │   ├── invisalign-clear-aligners.mdx
│   │   └── ...
│   └── locations/                     # Location page MDX files
│       ├── london/
│       │   ├── harley-street.mdx
│       │   ├── canary-wharf.mdx
│       │   └── ...
│       └── uk/
│           ├── manchester.mdx
│           ├── birmingham.mdx
│           └── ...
├── app/
│   ├── blog/
│   │   ├── page.tsx                   # Blog index (listing page)
│   │   └── [slug]/
│   │       └── page.tsx               # Individual blog post
│   ├── guides/
│   │   ├── page.tsx                   # Guides index
│   │   └── [slug]/
│   │       └── page.tsx               # Individual guide
│   └── find/
│       ├── page.tsx                   # Location pages index
│       └── [area]/
│           └── page.tsx               # Individual location page
├── components/
│   ├── blog/
│   │   ├── blog-card.tsx              # Blog post preview card
│   │   ├── blog-list.tsx              # Blog listing grid
│   │   ├── blog-header.tsx            # Blog post header (title, meta, hero)
│   │   ├── mdx-components.tsx         # Custom MDX component mappings
│   │   ├── table-of-contents.tsx      # Auto-generated TOC
│   │   └── related-posts.tsx          # Related posts section
│   ├── guides/
│   │   ├── guide-card.tsx             # Guide preview card
│   │   └── guide-sidebar.tsx          # Guide navigation sidebar
│   └── locations/
│       ├── location-card.tsx          # Location page preview card
│       └── clinic-list-section.tsx    # Section showing matched clinics
├── lib/
│   └── content/
│       ├── blog.ts                    # Blog content loading utilities
│       ├── guides.ts                  # Guide content loading utilities
│       ├── locations.ts               # Location content loading utilities
│       └── mdx.ts                     # Shared MDX processing utilities
└── public/
    └── content/
        ├── blog/                      # Blog images
        └── guides/                    # Guide images
```

### Route Map

| Route | Purpose | Generation |
|-------|---------|------------|
| `/blog` | Blog listing page with categories & search | Static |
| `/blog/[slug]` | Individual blog post | Static (generateStaticParams) |
| `/guides` | Guides/pillar content listing | Static |
| `/guides/[slug]` | Individual guide page | Static (generateStaticParams) |
| `/find` | "Find a Dentist" location index | Static |
| `/find/[area]` | Location-specific page (e.g., `/find/canary-wharf`) | Static (generateStaticParams) |

---

## 4. Component Architecture

### 4.1 MDX Components (`components/blog/mdx-components.tsx`)

Custom component mappings for MDX rendering. These override default HTML elements with styled versions:

```tsx
// Maps MDX elements to custom React components
const mdxComponents = {
  h1: (props) => <h1 className="text-3xl font-heading font-bold mt-8 mb-4" {...props} />,
  h2: (props) => <h2 className="text-2xl font-heading font-bold mt-8 mb-3" {...props} />,
  h3: (props) => <h3 className="text-xl font-heading font-semibold mt-6 mb-2" {...props} />,
  p: (props) => <p className="text-base leading-relaxed mb-4 text-muted-foreground" {...props} />,
  a: (props) => <a className="text-[#0fbcb0] hover:underline" {...props} />,
  ul: (props) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
  ol: (props) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
  blockquote: (props) => <blockquote className="border-l-4 border-[#0fbcb0] pl-4 italic my-4" {...props} />,
  img: (props) => /* Next.js Image wrapper */,
  table: (props) => <div className="overflow-x-auto mb-4"><table className="w-full" {...props} /></div>,
  // Custom components available in MDX:
  CallToAction: CallToActionComponent,   // Embedded CTA (e.g., "Find your clinic")
  ClinicCarousel: ClinicCarouselComponent, // Reuse existing clinic carousel
  TreatmentCostTable: CostTableComponent,  // Treatment pricing table
  FAQ: FAQComponent,                       // Inline FAQ with schema markup
}
```

### 4.2 Blog Card (`components/blog/blog-card.tsx`)

Displays a blog post preview in the listing page:

```
┌─────────────────────────────────┐
│  [Hero Image]                   │
├─────────────────────────────────┤
│  Category Badge    5 min read   │
│  Blog Post Title Goes Here      │
│  Short excerpt text that gives  │
│  a preview of the content...    │
│  ──────────────────────────     │
│  Feb 23, 2026                   │
└─────────────────────────────────┘
```

### 4.3 Blog Header (`components/blog/blog-header.tsx`)

Full-width header for individual blog posts:

```
┌─────────────────────────────────────────┐
│  Breadcrumb: Home > Blog > Post Title   │
│                                         │
│  CATEGORY BADGE                         │
│  Blog Post Title Here                   │
│  Short description / excerpt            │
│                                         │
│  📅 Feb 23, 2026  ·  🕐 5 min read     │
│                                         │
│  [Full-width Hero Image]                │
└─────────────────────────────────────────┘
```

### 4.4 Table of Contents (`components/blog/table-of-contents.tsx`)

Sticky sidebar TOC for long-form content (guides/pillar pages):

- Auto-generated from H2/H3 headings in the MDX
- Highlights current section on scroll (Intersection Observer)
- Sticky positioning on desktop, collapsible on mobile

### 4.5 Related Posts (`components/blog/related-posts.tsx`)

Shows 3 related posts at the bottom of each blog post, matched by:
1. Same category (primary match)
2. Shared tags (secondary match)
3. Most recent (fallback)

### 4.6 Location Page: Clinic List Section (`components/locations/clinic-list-section.tsx`)

For location pages (`/find/[area]`), dynamically queries the `clinics` table for clinics matching the area and displays them using existing `clinic-card` components. This is the **only server-side dynamic section** — fetches live clinic data from Supabase.

---

## 5. Blog System Implementation

### 5.1 MDX Frontmatter Schema

Every blog post MDX file must include this frontmatter:

```yaml
---
title: "How Much Do Dental Implants Cost in the UK? (2026 Price Guide)"
slug: "dental-implants-cost-uk"
description: "Complete breakdown of dental implant costs in the UK for 2026. Compare NHS vs private pricing, single vs full mouth implants, and find the best value."
category: "cost-finance"           # One of the defined categories
tags: ["dental implants", "cost guide", "UK dentistry"]
author: "Pearlie Editorial"
publishedAt: "2026-03-01"
updatedAt: "2026-03-01"
heroImage: "/content/blog/dental-implants-cost.jpg"
heroImageAlt: "Dental implant model showing titanium post and crown"
featured: false                     # Show on blog index hero section
keywords:                           # SEO keyword targets
  - "dental implants cost UK"
  - "how much do dental implants cost"
  - "dental implant price UK 2026"
relatedSlugs:                       # Manual override for related posts
  - "dental-implants-vs-dentures"
  - "full-mouth-dental-implants-uk"
  - "same-day-dental-implants"
---
```

### 5.2 Blog Categories

```typescript
export const BLOG_CATEGORIES = {
  "treatment-guides": { label: "Treatment Guides", description: "In-depth procedure explanations" },
  "cost-finance": { label: "Cost & Finance", description: "Pricing, insurance & payment options" },
  "find-a-dentist": { label: "Find a Dentist", description: "Location-specific dental care guides" },
  "dental-health": { label: "Dental Health Tips", description: "Preventive care & oral hygiene" },
  "nervous-patients": { label: "Nervous Patients", description: "Dental anxiety & sedation" },
  "nhs-private": { label: "NHS & Private Care", description: "Navigating the UK dental system" },
  "smile-transformations": { label: "Smile Transformations", description: "Patient journeys & results" },
  "news-trends": { label: "News & Trends", description: "Industry updates & new treatments" },
} as const
```

### 5.3 Content Loading Utilities (`lib/content/blog.ts`)

```typescript
// Key functions to implement:

// Get all blog posts (sorted by date, with frontmatter)
export async function getAllBlogPosts(): Promise<BlogPost[]>

// Get a single blog post by slug (with compiled MDX)
export async function getBlogPost(slug: string): Promise<BlogPostWithContent | null>

// Get posts by category
export async function getBlogPostsByCategory(category: string): Promise<BlogPost[]>

// Get featured posts (for blog index hero)
export async function getFeaturedBlogPosts(): Promise<BlogPost[]>

// Get all slugs (for generateStaticParams)
export async function getAllBlogSlugs(): Promise<string[]>

// Get related posts for a given post
export async function getRelatedPosts(post: BlogPost, limit?: number): Promise<BlogPost[]>
```

### 5.4 Blog Index Page (`app/blog/page.tsx`)

**Layout:**
```
┌──────────────────────────────────────────────┐
│  MainNav                                      │
├──────────────────────────────────────────────┤
│  Breadcrumb: Home > Blog                      │
│                                               │
│  PEARLIE BLOG                                 │
│  Expert dental guides, cost breakdowns,       │
│  and tips to find the right clinic.           │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  [Featured Post — Large Card]           │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  [Category Filter Pills]                      │
│  All | Treatment Guides | Cost & Finance | ...│
│                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ BlogCard │ │ BlogCard │ │ BlogCard │      │
│  └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ BlogCard │ │ BlogCard │ │ BlogCard │      │
│  └──────────┘ └──────────┘ └──────────┘      │
│                                               │
│  [CTA: "Not sure which treatment? →"]         │
│                                               │
├──────────────────────────────────────────────┤
│  SiteFooter                                   │
└──────────────────────────────────────────────┘
```

**Metadata:**
```typescript
export const metadata: Metadata = {
  title: "Dental Blog - Expert Guides & Cost Breakdowns",
  description: "Expert dental guides, treatment cost breakdowns, and tips to help you find the right dental clinic in the UK. Updated for 2026.",
  alternates: { canonical: "https://pearlie.org/blog" },
}
```

### 5.5 Blog Post Page (`app/blog/[slug]/page.tsx`)

**Layout:**
```
┌──────────────────────────────────────────────────┐
│  MainNav                                          │
├──────────────────────────────────────────────────┤
│  Breadcrumb: Home > Blog > [Category] > [Title]  │
│                                                    │
│  CATEGORY     5 min read                          │
│  Blog Post Title Here                             │
│  Feb 23, 2026                                     │
│                                                    │
│  [Hero Image — full width]                        │
│                                                    │
│  ┌────────────────────┐ ┌──────────────────────┐  │
│  │                    │ │  Table of Contents   │  │
│  │   Article Body     │ │  ─ Section 1         │  │
│  │   (MDX rendered)   │ │  ─ Section 2         │  │
│  │                    │ │  ─ Section 3         │  │
│  │                    │ │                      │  │
│  │   [Inline CTA]     │ │  ┌────────────────┐ │  │
│  │                    │ │  │ Find My Clinic │ │  │
│  │                    │ │  └────────────────┘ │  │
│  └────────────────────┘ └──────────────────────┘  │
│                                                    │
│  ─────────────────────────────────────────────    │
│  Related Posts                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ BlogCard │ │ BlogCard │ │ BlogCard │          │
│  └──────────┘ └──────────┘ └──────────┘          │
│                                                    │
│  ─────────────────────────────────────────────    │
│  [CTA Banner: "Ready to find your clinic? →"]     │
│                                                    │
├──────────────────────────────────────────────────┤
│  SiteFooter                                        │
└──────────────────────────────────────────────────┘
```

**Dynamic metadata (generateMetadata):**
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getBlogPost(params.slug)
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `https://pearlie.org/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      images: [{ url: post.heroImage, alt: post.heroImageAlt }],
    },
  }
}
```

**Schema markup (Article + BreadcrumbList):**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "...",
  "description": "...",
  "image": "...",
  "datePublished": "2026-03-01",
  "dateModified": "2026-03-01",
  "author": { "@type": "Organization", "name": "Pearlie" },
  "publisher": { "@type": "Organization", "name": "Pearlie", "logo": "..." },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://pearlie.org/blog/..." }
}
```

---

## 6. Location Pages Implementation

### 6.1 Location MDX Frontmatter Schema

```yaml
---
title: "Find a Dentist in Canary Wharf"
slug: "canary-wharf"
region: "london"                    # "london" or "uk"
description: "Compare top-rated dental clinics in Canary Wharf. Find private dentists, cosmetic specialists, and emergency dental care near Canary Wharf, London."
heroImage: "/content/locations/canary-wharf.jpg"
heroImageAlt: "Dental clinic in Canary Wharf, London"
keywords:
  - "dentist Canary Wharf"
  - "dental clinic Canary Wharf"
  - "private dentist Canary Wharf"
  - "emergency dentist Canary Wharf"
areaCoordinates:                    # For map display & clinic filtering
  lat: 51.5054
  lng: -0.0235
  radiusKm: 3
popularTreatments:                  # Shown as quick links
  - "Invisalign"
  - "Dental Implants"
  - "Teeth Whitening"
  - "Composite Bonding"
relatedAreas:                       # Cross-link to nearby areas
  - "shoreditch"
  - "soho"
  - "stratford"
---
```

### 6.2 Location Page Layout (`app/find/[area]/page.tsx`)

```
┌──────────────────────────────────────────────────┐
│  MainNav                                          │
├──────────────────────────────────────────────────┤
│  Breadcrumb: Home > Find a Dentist > [Area]       │
│                                                    │
│  Find a Dentist in [Area Name]                    │
│  [Description paragraph]                          │
│                                                    │
│  Popular treatments: [Invisalign] [Implants] ...  │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Clinics in [Area]                           │ │
│  │  (Dynamic — fetched from Supabase by area)   │ │
│  │  ┌────────────┐ ┌────────────┐ ┌──────────┐ │ │
│  │  │ ClinicCard │ │ ClinicCard │ │ ClinicCard│ │ │
│  │  └────────────┘ └────────────┘ └──────────┘ │ │
│  │  [View all clinics in area →]                │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  [MDX Body Content — area-specific guide text]    │
│  Covers: area overview, what to look for,         │
│  NHS vs private in the area, transport tips, etc. │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Nearby Areas                                │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐     │ │
│  │  │ AreaCard │ │ AreaCard │ │ AreaCard │     │ │
│  │  └──────────┘ └──────────┘ └──────────┘     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  [FAQ Section — area-specific questions]           │
│  [CTA: "Not sure? Let Pearlie match you →"]       │
│                                                    │
├──────────────────────────────────────────────────┤
│  SiteFooter                                        │
└──────────────────────────────────────────────────┘
```

**Clinic fetching logic:**
```typescript
// In the page component (server component):
const supabase = createAdminClient()
const { data: clinics } = await supabase
  .from("clinics")
  .select("id, slug, name, headline, logo_url, rating, review_count, treatments, borough")
  .eq("is_live", true)
  .eq("is_archived", false)
  // Filter by borough/area or geo coordinates
```

### 6.3 Location Index Page (`app/find/page.tsx`)

```
┌──────────────────────────────────────────────────┐
│  MainNav                                          │
├──────────────────────────────────────────────────┤
│  Find a Dentist Near You                          │
│  Browse dental clinics by area across London      │
│  and the UK.                                      │
│                                                    │
│  LONDON                                           │
│  ┌──────────┐ ┌──────────────┐ ┌────────────┐    │
│  │ Harley   │ │ Canary Wharf │ │ Kensington │    │
│  │ Street   │ │              │ │ & Chelsea  │    │
│  └──────────┘ └──────────────┘ └────────────┘    │
│  ... more London areas                            │
│                                                    │
│  UK CITIES                                        │
│  ┌───────────┐ ┌────────────┐ ┌──────────┐       │
│  │Manchester │ │ Birmingham │ │  Leeds   │       │
│  └───────────┘ └────────────┘ └──────────┘       │
│  ... more UK cities                               │
│                                                    │
│  [CTA: "Can't find your area? →"]                 │
│                                                    │
├──────────────────────────────────────────────────┤
│  SiteFooter                                        │
└──────────────────────────────────────────────────┘
```

---

## 7. Guide (Pillar) Pages Implementation

### 7.1 Guide MDX Frontmatter Schema

```yaml
---
title: "The Complete Guide to Dental Implants in the UK"
slug: "dental-implants"
description: "Everything you need to know about dental implants in the UK. Costs, procedure, recovery, and how to find the right implant dentist."
heroImage: "/content/guides/dental-implants-guide.jpg"
heroImageAlt: "Dental implant procedure illustration"
keywords:
  - "dental implants UK"
  - "dental implant guide"
  - "dental implants cost"
publishedAt: "2026-03-15"
updatedAt: "2026-03-15"
relatedBlogSlugs:                   # Cluster posts that link to this guide
  - "dental-implants-cost-uk"
  - "same-day-dental-implants"
  - "dental-implants-vs-dentures"
  - "full-mouth-dental-implants-uk"
  - "dental-implant-recovery"
---
```

### 7.2 Guide Page Layout

Similar to blog posts but with:
- **Persistent sidebar** with Table of Contents + related blog posts
- **Longer content** (2,000+ words)
- **Structured sections** with clear H2/H3 hierarchy
- **Embedded CTAs** throughout (not just at bottom)
- **FAQ section** at bottom with FAQPage schema markup
- **Related blog cluster** section showing all cluster posts

---

## 8. Navigation & Footer Changes

### 8.1 Main Navigation Updates

Update `components/main-nav.tsx`:

```typescript
const navLinks = [
  { href: "/our-mission", label: "Our Mission" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },         // NEW
  { href: "/faq", label: "FAQ" },
]
```

Also update `components/mobile-nav-menu.tsx` with the same addition.

### 8.2 Footer Updates

Update `components/site-footer.tsx`:

```typescript
const platformLinks = [
  { label: "Home", href: "/" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "For Clinics", href: "/for-clinics" },
  { label: "Our Mission", href: "/our-mission" },
  { label: "FAQ", href: "/faq" },
]

// ADD new "Resources" column:
const resourceLinks = [
  { label: "Blog", href: "/blog" },
  { label: "Dental Guides", href: "/guides" },
  { label: "Find by Area", href: "/find" },
]
```

Add a "Resources" column to the footer grid (change from 4-col to 5-col on desktop, or merge into existing columns).

---

## 9. SEO & Metadata Patterns

### 9.1 Consistent Metadata Pattern

Every content page must include:

1. **`<title>`** — Unique, under 60 chars, includes primary keyword
2. **`<meta description>`** — Unique, 120-155 chars, includes primary keyword + CTA
3. **Canonical URL** — Self-referencing canonical
4. **Open Graph** — title, description, image, type, locale
5. **Twitter Card** — summary_large_image
6. **JSON-LD Schema** — Article/BlogPosting for blog, FAQPage for FAQ sections

### 9.2 Schema Markup by Page Type

| Page Type | Schema Types |
|-----------|-------------|
| Blog post | `Article` + `BreadcrumbList` |
| Guide page | `Article` + `BreadcrumbList` + `FAQPage` (for FAQ section) |
| Location page | `WebPage` + `BreadcrumbList` + `LocalBusiness` (for listed clinics) |
| Blog index | `CollectionPage` + `BreadcrumbList` |
| Guides index | `CollectionPage` + `BreadcrumbList` |

### 9.3 Internal Linking Strategy

- Every blog post links to its parent guide/pillar page
- Every guide page links to its cluster blog posts
- Location pages link to relevant treatment blog posts
- Blog posts include 2-3 internal links to other blog posts
- All content pages include a CTA linking to `/intake`

---

## 10. Sitemap & Robots Updates

### 10.1 Sitemap Updates (`app/sitemap.ts`)

Add blog, guide, and location page routes:

```typescript
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://pearlie.org"

  // Existing static routes...

  // Blog posts
  const blogPosts = await getAllBlogPosts()
  const blogRoutes = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  // Blog index
  const blogIndexRoute = {
    url: `${baseUrl}/blog`,
    lastModified: new Date().toISOString().split("T")[0],
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }

  // Guide pages
  const guides = await getAllGuides()
  const guideRoutes = guides.map((guide) => ({
    url: `${baseUrl}/guides/${guide.slug}`,
    lastModified: guide.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  // Location pages
  const locations = await getAllLocations()
  const locationRoutes = locations.map((loc) => ({
    url: `${baseUrl}/find/${loc.slug}`,
    lastModified: loc.updatedAt || new Date().toISOString().split("T")[0],
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  return [
    ...staticRoutes,
    blogIndexRoute,
    ...blogRoutes,
    ...guideRoutes,
    ...locationRoutes,
    ...clinicRoutes,
  ]
}
```

### 10.2 Robots Updates

No changes needed — the current `robots.ts` allows all public pages. Blog, guides, and location pages will be under `/blog/`, `/guides/`, and `/find/` which are all allowed by default.

---

## 11. Content Specifications

### 11.1 Blog Post Content Requirements

Each blog post should:
- Be **800-1,500 words** (treatment guides can be 1,500-2,000)
- Include **1 hero image** + 1-2 inline images
- Use H2 for main sections, H3 for subsections
- Include a **cost table** where relevant (using `TreatmentCostTable` component)
- End with a **FAQ section** (3-5 questions) using `FAQ` component for schema
- Include **1 mid-article CTA** and **1 end-of-article CTA** linking to `/intake`
- Link to the parent **guide page** and 2-3 **related blog posts**
- Include a clear **"Last updated: [date]"** for cost/price posts

### 11.2 Guide Page Content Requirements

Each guide page should:
- Be **2,000-3,500 words**
- Follow a clear **H2 → H3 hierarchy** for TOC generation
- Link to **all cluster blog posts** as inline references
- Include a **FAQ section** (5-8 questions)
- Include **3+ embedded CTAs** throughout the content
- Reference Pearlie's matching service naturally, not forced

### 11.3 Location Page Content Requirements

Each location page should:
- Be **600-1,000 words** of unique area-specific content
- Dynamically display **live clinics** from the Supabase database
- Include area-specific **FAQ section** (3-5 questions)
- Cross-link to **2-3 nearby areas**
- Include a **map component** (reuse existing Leaflet/Google Maps)
- Link to relevant **treatment blog posts**

---

## 12. Phased Rollout

### Phase 1: Infrastructure (Implement First)

**Goal:** Set up the blog/content system infrastructure.

1. Install dependencies (`next-mdx-remote`, `gray-matter`, `reading-time`, `@tailwindcss/typography`)
2. Create `lib/content/` utilities (blog.ts, guides.ts, locations.ts, mdx.ts)
3. Create `components/blog/` components (mdx-components, blog-card, blog-header, table-of-contents, related-posts)
4. Create `app/blog/page.tsx` (index) and `app/blog/[slug]/page.tsx` (post)
5. Create `content/blog/` directory with 1 sample MDX post
6. Update navigation (add "Blog" link)
7. Update sitemap to include blog routes
8. Verify build works, metadata renders, schema markup validates

### Phase 2: First 5 Blog Posts

**Goal:** Launch blog with high-value content targeting top keywords.

Priority posts (highest search volume + commercial intent):
1. `dental-implants-cost-uk.mdx` — "How Much Do Dental Implants Cost in the UK?"
2. `invisalign-vs-braces.mdx` — "Invisalign vs Braces: Which Is Right for You?"
3. `nhs-vs-private-dentist.mdx` — "NHS vs Private Dentist: What Are the Differences?"
4. `composite-bonding-cost-uk.mdx` — "Composite Bonding: Cost, Process & What to Expect"
5. `emergency-dentist-near-you.mdx` — "How to Find an Emergency Dentist Near You"

### Phase 3: Location Pages

**Goal:** Launch location pages for London neighborhoods.

1. Create `app/find/page.tsx` (index) and `app/find/[area]/page.tsx`
2. Create `components/locations/` components
3. Create first 5 London location pages:
   - `harley-street.mdx`
   - `canary-wharf.mdx`
   - `kensington-chelsea.mdx`
   - `shoreditch.mdx`
   - `soho.mdx`
4. Update footer with "Find by Area" link
5. Update sitemap with location routes

### Phase 4: Guides & Pillar Pages

**Goal:** Launch pillar content and establish topic clusters.

1. Create `app/guides/page.tsx` (index) and `app/guides/[slug]/page.tsx`
2. Create `components/guides/` components
3. Create first 3 guide pages:
   - `dental-implants.mdx` — Complete Guide to Dental Implants
   - `invisalign-clear-aligners.mdx` — Everything About Invisalign & Clear Aligners
   - `dental-costs-uk.mdx` — Understanding Dental Costs in the UK
4. Update internal linking between guides and cluster blog posts

### Phase 5: Scale Content

**Goal:** Expand to full content library.

1. Remaining 25 blog posts from the content plan
2. Remaining 10 location pages (5 London + 5 UK cities)
3. Remaining 7 guide pages
4. Add blog category filtering (client-side)
5. Add search functionality to blog index

---

## 13. Content Data: Blog Topics

### Top 30 Blog Posts (Ordered by Priority)

| # | Slug | Title | Category | Primary Keyword | Intent |
|---|------|-------|----------|----------------|--------|
| 1 | `dental-implants-cost-uk` | How Much Do Dental Implants Cost in the UK? (2026 Price Guide) | cost-finance | `dental implants cost UK` | CI |
| 2 | `invisalign-vs-braces` | Invisalign vs Braces: Which Is Right for You? | treatment-guides | `Invisalign vs braces` | CI |
| 3 | `invisalign-cost-uk` | How Much Does Invisalign Cost in the UK? | cost-finance | `Invisalign cost UK` | CI |
| 4 | `emergency-dentist-near-you` | How to Find an Emergency Dentist Near You | find-a-dentist | `emergency dentist near me` | T |
| 5 | `composite-bonding-cost-uk` | Composite Bonding: Cost, Process & What to Expect | cost-finance | `composite bonding cost UK` | CI |
| 6 | `nhs-vs-private-dentist` | NHS vs Private Dentist: What Are the Differences? | nhs-private | `NHS vs private dentist` | CI |
| 7 | `veneers-cost-uk` | Porcelain Veneers Cost in the UK: Full Breakdown | cost-finance | `veneers cost UK` | CI |
| 8 | `teeth-whitening-options` | Teeth Whitening: Professional vs At-Home Options | treatment-guides | `teeth whitening UK` | CI |
| 9 | `dental-emergency-guide` | What to Do When You Have a Dental Emergency (UK Guide) | dental-health | `dental emergency what to do` | I |
| 10 | `nhs-dentist-accepting-patients` | How to Find an NHS Dentist Accepting New Patients | nhs-private | `NHS dentist accepting new patients` | T |
| 11 | `root-canal-treatment-uk` | Root Canal Treatment: Cost, Pain & Recovery Guide | treatment-guides | `root canal treatment UK` | CI |
| 12 | `dental-crowns-guide` | Dental Crowns: Types, Cost & What to Expect | treatment-guides | `dental crown cost UK` | CI |
| 13 | `wisdom-tooth-removal` | Wisdom Tooth Removal: Everything You Need to Know | treatment-guides | `wisdom tooth removal UK` | CI |
| 14 | `dental-implants-vs-dentures` | Dental Implants vs Dentures: Which Should You Choose? | treatment-guides | `dental implants vs dentures` | CI |
| 15 | `same-day-dental-implants` | Same Day Dental Implants: Are They Worth It? | treatment-guides | `same day dental implants UK` | CI |
| 16 | `invisalign-for-adults` | Invisalign for Adults: Is It Too Late to Straighten Your Teeth? | treatment-guides | `Invisalign adults UK` | CI |
| 17 | `dental-anxiety-overcome` | Dental Anxiety: How to Overcome Your Fear of the Dentist | nervous-patients | `dental anxiety help` | I |
| 18 | `sedation-dentistry-uk` | Sedation Dentistry UK: Options for Nervous Patients | nervous-patients | `sedation dentist near me` | CI |
| 19 | `private-dental-checkup-cost` | How Much Does a Private Dental Check-Up Cost? | cost-finance | `private dental check up cost` | CI |
| 20 | `dental-bridges-guide` | Dental Bridges: Types, Cost & Alternatives | treatment-guides | `dental bridge cost UK` | CI |
| 21 | `smile-makeover-guide` | Smile Makeover: Treatments, Cost & How to Plan Yours | treatment-guides | `smile makeover UK` | CI |
| 22 | `clear-aligners-comparison` | Clear Aligners in the UK: Comparing Your Options | treatment-guides | `clear aligners UK` | CI |
| 23 | `how-often-visit-dentist` | How Often Should You Visit the Dentist? | dental-health | `how often dentist visit` | I |
| 24 | `dental-payment-plans-uk` | Dental Payment Plans & Finance Options Explained | cost-finance | `dental payment plan UK` | CI |
| 25 | `dental-implant-recovery` | Dental Implant Recovery: Timeline & What to Expect | treatment-guides | `dental implant recovery time` | I |
| 26 | `childs-first-dental-visit` | Child's First Dental Visit: A Parent's Guide | dental-health | `children's dentist near me` | I |
| 27 | `toothache-relief-guide` | Tooth Pain Relief: What to Do Before You See a Dentist | dental-health | `toothache relief UK` | I |
| 28 | `gum-disease-guide` | Gum Disease: Signs, Treatment & Prevention | dental-health | `gum disease treatment UK` | I |
| 29 | `dental-insurance-uk` | Dental Insurance in the UK: Is It Worth It? | cost-finance | `dental insurance UK` | CI |
| 30 | `full-mouth-dental-implants-uk` | Full Mouth Dental Implants UK: Cost & What's Involved | cost-finance | `full mouth dental implants cost UK` | CI |

---

## 14. Content Data: Location Pages

### London Neighborhoods (10 Pages)

| # | Slug | Title | Target Keywords |
|---|------|-------|----------------|
| 1 | `harley-street` | Best Dentists in Harley Street & Marylebone | `dentist Harley Street`, `Harley Street dental clinic` |
| 2 | `canary-wharf` | Find a Dentist in Canary Wharf | `dentist Canary Wharf`, `dental clinic Canary Wharf` |
| 3 | `kensington-chelsea` | Dentists in Kensington & Chelsea | `dentist Kensington`, `dentist Chelsea` |
| 4 | `shoreditch` | Find a Dentist in Shoreditch & East London | `dentist Shoreditch`, `dentist East London` |
| 5 | `soho` | Best Dental Clinics in Soho & Central London | `dentist Soho`, `dentist central London` |
| 6 | `mayfair` | Find a Dentist in Mayfair & Westminster | `dentist Mayfair`, `dentist Westminster` |
| 7 | `camden` | Dentists in Camden & King's Cross | `dentist Camden`, `dentist King's Cross` |
| 8 | `notting-hill` | Find a Dentist in Notting Hill & West London | `dentist Notting Hill`, `dentist West London` |
| 9 | `brixton` | Dental Clinics in Brixton & South London | `dentist Brixton`, `dentist South London` |
| 10 | `stratford` | Find a Dentist in Stratford & Olympic Park | `dentist Stratford London`, `dentist E20` |

### UK Cities (5 Pages)

| # | Slug | Title | Target Keywords |
|---|------|-------|----------------|
| 11 | `manchester` | Best Dentists in Manchester | `dentist Manchester`, `private dentist Manchester` |
| 12 | `birmingham` | Find a Dentist in Birmingham | `dentist Birmingham`, `cosmetic dentist Birmingham` |
| 13 | `leeds` | Best Dental Clinics in Leeds | `dentist Leeds`, `private dentist Leeds` |
| 14 | `bristol` | Find a Dentist in Bristol | `dentist Bristol`, `private dentist Bristol` |
| 15 | `edinburgh` | Dentists in Edinburgh | `dentist Edinburgh`, `private dentist Edinburgh` |

---

## 15. Content Data: Pillar Guides

### 10 Guide Pages

| # | Slug | Title | Cluster Blog Posts |
|---|------|-------|--------------------|
| 1 | `dental-implants` | The Complete Guide to Dental Implants in the UK | dental-implants-cost-uk, same-day-dental-implants, dental-implants-vs-dentures, full-mouth-dental-implants-uk, dental-implant-recovery |
| 2 | `invisalign-clear-aligners` | Everything You Need to Know About Invisalign & Clear Aligners | invisalign-cost-uk, invisalign-vs-braces, invisalign-for-adults, clear-aligners-comparison |
| 3 | `cosmetic-dentistry` | Complete Guide to Cosmetic Dentistry in the UK | veneers-cost-uk, composite-bonding-cost-uk, teeth-whitening-options, smile-makeover-guide |
| 4 | `find-the-right-dentist` | How to Find the Right Dentist: A Patient's Complete Guide | nhs-vs-private-dentist, private-dental-checkup-cost, dental-anxiety-overcome, how-often-visit-dentist |
| 5 | `dental-costs-uk` | Understanding Dental Costs in the UK: NHS, Private & Finance | dental-payment-plans-uk, dental-insurance-uk, private-dental-checkup-cost, nhs-vs-private-dentist |
| 6 | `dental-emergencies` | The Complete Guide to Dental Emergencies | emergency-dentist-near-you, dental-emergency-guide, toothache-relief-guide |
| 7 | `childrens-dentistry` | A Parent's Guide to Children's Dentistry | childs-first-dental-visit |
| 8 | `teeth-straightening` | Complete Guide to Teeth Straightening for Adults | invisalign-vs-braces, invisalign-for-adults, clear-aligners-comparison |
| 9 | `dental-anxiety` | Overcoming Dental Anxiety: A Comprehensive Guide | dental-anxiety-overcome, sedation-dentistry-uk |
| 10 | `nhs-dental-care` | The NHS Dental Care Guide: Everything You Need to Know | nhs-vs-private-dentist, nhs-dentist-accepting-patients |

---

## 16. Content Data: Keyword Clusters

### Cluster 1: Dental Implants
- **Primary page:** `/guides/dental-implants`
- **Keywords:** `dental implants cost UK`, `dental implants near me`, `same day dental implants`, `full mouth dental implants cost UK`, `dental implants vs dentures`, `All-on-4 dental implants UK`, `dental implant recovery time`, `dental implant consultation`

### Cluster 2: Invisalign & Clear Aligners
- **Primary page:** `/guides/invisalign-clear-aligners`
- **Keywords:** `Invisalign cost UK`, `Invisalign vs braces`, `Invisalign near me`, `clear aligners UK`, `Invisalign for adults`, `invisible braces London`, `Invisalign treatment time`, `best Invisalign dentist [city]`

### Cluster 3: Cosmetic Dentistry
- **Primary page:** `/guides/cosmetic-dentistry`
- **Keywords:** `cosmetic dentist near me`, `veneers cost UK`, `composite bonding cost`, `teeth whitening UK`, `smile makeover cost UK`, `composite bonding vs veneers`, `cosmetic dentist London`

### Cluster 4: Emergency Dental Care
- **Primary page:** `/guides/dental-emergencies`
- **Keywords:** `emergency dentist near me`, `emergency dentist London`, `out of hours dentist`, `emergency dentist open now`, `toothache relief`, `broken tooth what to do`, `dental abscess emergency`, `weekend dentist near me`

### Cluster 5: NHS Dental Care
- **Primary page:** `/guides/nhs-dental-care`
- **Keywords:** `NHS dentist near me`, `NHS dentist accepting new patients`, `NHS dental charges`, `NHS dental bands explained`, `NHS vs private dentist`, `NHS dental crisis`, `NHS emergency dentist`

### Cluster 6: Dental Costs & Finance
- **Primary page:** `/guides/dental-costs-uk`
- **Keywords:** `dental treatment cost UK`, `private dental check up cost`, `dental payment plan UK`, `dental insurance UK`, `dental finance 0%`, `Denplan cost`, `cheapest dentist near me`

### Cluster 7: Children's & Family Dentistry
- **Primary page:** `/guides/childrens-dentistry`
- **Keywords:** `children's dentist near me`, `family dentist near me`, `child first dental visit`, `NHS dentist for children`, `orthodontist for children`, `dental anxiety children`

### Cluster 8: Dental Anxiety & Sedation
- **Primary page:** `/guides/dental-anxiety`
- **Keywords:** `dentist for nervous patients`, `sedation dentist near me`, `dental anxiety help`, `dental phobia UK`, `IV sedation dentist`, `conscious sedation dentist`, `fear of dentist how to cope`

---

## Appendix: Design Tokens

All new content pages should use the existing Pearlie design system:

| Token | Value | Usage |
|-------|-------|-------|
| Primary brand color | `#0fbcb0` | Links, CTAs, accents |
| Dark teal | `#004443` | Footer, headings |
| Heading font | `font-heading` (Inter Tight) | All headings |
| Body font | `font-sans` (DM Sans) | Body text |
| Card radius | `rounded-xl` to `rounded-2xl` | Content cards |
| Spacing | Container with `px-4 sm:px-6 lg:px-8` | Page padding |

---

*This plan was generated from SEO keyword research specific to UK dental search behaviour and the Pearlie platform's unique positioning as a clinic matching service.*
