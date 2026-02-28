# Competitor Audit: dentistscloseby.com

**Date:** 2026-02-28
**Audited by:** Claude Code
**Subject:** Changes observed on/around 2026-02-27

---

## Executive Summary

DentistsCloseby has undergone a **major site-wide upgrade** between Feb 27–28, 2026. The sitemap (730 URLs) was bulk-regenerated on Feb 28 at 05:44 UTC, confirming a significant deployment. Key changes include a massive programmatic SEO (pSEO) expansion, blog content refreshes, new interactive tools, and enhanced schema markup — all directly competing with Pearlie's London dental matching space.

---

## 1. Programmatic SEO Expansion (680 new service+location pages)

**This is the biggest change.** They now have **680 service × location combination pages** covering:

- **11 services:** Emergency Dentist, NHS Dentist, Private Dentist, Teeth Whitening, Dental Implants, Root Canal, Dental Check-up, Cosmetic Dentist, Invisalign, Dental Veneers, Tooth Extraction
- **32 London boroughs:** All boroughs from Westminster to Barking & Dagenham

This is a direct copy of Pearlie's pSEO strategy (our `/find/[area]` pages and treatment landing pages), but executed at much greater scale with **11 × 32 = 352 unique service/location combos** plus individual service and borough pages.

### What each page includes:
- Localized pricing (NHS vs private ranges specific to the borough)
- CQC-registered practice listings with addresses, phone numbers, hours
- Transport accessibility info (tube stations, bus routes, parking)
- Borough-specific FAQs
- Structured data (FAQPage schema)
- Booking CTAs throughout

### Pearlie comparison:
| Feature | DentistsCloseby | Pearlie |
|---------|----------------|---------|
| Service pages | 11 | 4 (Invisalign, Implants, Whitening, Emergency) |
| Location pages | 32 boroughs | ~12 London areas |
| Service × Location combos | 352 | 0 (not yet implemented) |
| Total pSEO URLs | 730 | ~20 |

**Risk level: HIGH** — This directly targets the same long-tail keywords we're pursuing.

---

## 2. Blog Content Refresh (7 articles updated Feb 27–28)

Articles modified on or around Feb 27–28:

| Article | Published | Modified |
|---------|-----------|----------|
| Electric vs Manual Toothbrush | Feb 10 | Feb 28 |
| Mouth Cancer Symptoms UK | Feb 20 | Feb 28 |
| Missing Tooth Replacement Options | Feb 11 | Feb 28 |
| Private Dentist Prices UK 2026 | Feb 16 | Feb 28 |
| Receding Gums Treatment | Feb 12 | Feb 27 |
| Mouth Ulcers Guide | Feb 9 | Feb 27 |
| Sensitive Teeth Guide | Feb 5 | Feb 27 |

### Blog content quality:
- Articles are comprehensive (2,000–4,000+ words estimated)
- Rich schema markup: `Article`, `FAQPage`, `HowTo`, `BreadcrumbList`
- Comparison tables, pricing breakdowns, NHS vs private analysis
- Newsletter signup CTAs embedded
- Table of contents navigation (mobile + desktop)
- Related articles cross-linking

### Notable:
- Some blog URLs are returning **404 errors** (e.g., `/blog/receding-gums-treatment-uk`, `/blog/private-dentist-prices-uk`), suggesting **URL restructuring** happened during the deployment — they may have changed slug patterns.
- The most recent article is "How to Pay for Dental Treatment in the UK" (Feb 24) — a high-intent YMYL keyword.

### Pearlie comparison:
| Feature | DentistsCloseby | Pearlie |
|---------|----------------|---------|
| Blog posts | 10+ | 5 |
| Schema types per article | 4 (Article, FAQ, HowTo, Breadcrumb) | 2 (Article, FAQ) |
| Interactive elements | Tables, ToC, newsletter signup | Basic content |
| Update frequency | Weekly | Ad hoc |

---

## 3. New Interactive Tools

Two new tools now live under `/tools/`:

### NHS Dental Finder (`/tools/nhs-dental-finder`)
- Postcode-based search for NHS dentists accepting new patients
- Borough quick-links grid with practice counts and ratings
- NHS Band pricing reference (Band 1: £26.80, Band 2: £73.50, Band 3: £319.10)
- FAQPage schema with 8 Q&A pairs
- Designed as a lead generation funnel (search → browse → book)

### Dental Cost Calculator (`/tools/dental-cost-calculator`)
- Side-by-side NHS vs private cost comparison for 10 treatment types
- Borough-level price comparison table (32 boroughs ranked by cost)
- Cost-saving tips section
- Pre-populated data (not real-time calculations)
- Data labeled "last updated February 2026"

### Pearlie comparison:
Pearlie has no equivalent standalone tools. Our postcode search is embedded in the intake flow but not positioned as a free, shareable tool. These tools are **SEO magnets** designed to attract top-of-funnel traffic on high-volume queries like "NHS dentist near me" and "dental costs UK."

**Risk level: HIGH** — Free tools attract backlinks and rank well for informational queries.

---

## 4. Borough Directory Pages (32 pages)

Each of the 32 borough pages (`/dentists-in-london/[borough]`) includes:

- **15+ CQC-registered practice listings** per borough with full contact details
- Specific neighbourhood callouts (e.g., "Covent Garden, Soho, Mayfair, Pimlico")
- Transport accessibility (tube stations, bus routes, parking guidance)
- NHS vs private pricing specific to that borough
- Localized FAQs (10 per page)
- Treatment category quick-links (8 popular services)
- "View Practice & Book" CTAs per clinic

### Data quality note:
Some practice counts look inflated (Barnet shows "3,512 NHS practices" which is unrealistic for a single borough). This suggests they may be pulling data from a broader radius or counting practices loosely.

---

## 5. For Dentists B2B Portal

A mature B2B offering at `/for-dentists`:

| Tier | Price | Features |
|------|-------|----------|
| Essential | £99/mo | Up to 100 appts, 1 practitioner |
| Professional | £199/mo | Unlimited appts, up to 5 practitioners |
| Enterprise | £499/mo | Multi-location, unlimited practitioners |

Plus **10% per completed appointment** (no charge for no-shows).

Key B2B features:
- GDPR compliance tools
- CQC registration verification
- Automated audit trails / GDC validation
- Team management with role-based access
- Analytics dashboards
- Review request automation
- Promotional: "First 20 practices get 6 months free"

### Pearlie comparison:
Pearlie's For Clinics page is more basic. DentistsCloseby has positioned themselves with a compliance-first SaaS approach that may appeal to practice managers.

---

## 6. Homepage & UX Changes

### Trust signals (upgraded):
- "4.8 rating" — prominent display
- "500+ Verified Practices" — matches Pearlie's messaging
- "98% Satisfaction Rate"
- Credential badges: NHS Approved, CQC Verified, ID Verified Dentists

### How It Works (3 steps):
1. Search & Discover (location-based filtering)
2. Compare & Choose (reviews, pricing, qualifications)
3. Book Instantly (confirmation via email)

### Value proposition cards (6):
- No phone calls (24/7 online)
- Upfront costs
- Verified reviews only
- Same-day appointments
- CQC-registered professionals
- No cancellation fees

### Free tools promoted on homepage:
- NHS Dental Finder
- Dental Cost Calculator

### Schema markup on homepage:
- Organization schema
- WebSite schema with SearchAction
- Service catalog with offers
- BreadcrumbList

---

## 7. Technical Observations

| Aspect | DentistsCloseby | Notes |
|--------|----------------|-------|
| Framework | Next.js | Same as Pearlie |
| Rendering | SSR + client hydration | Booking page loads dynamically |
| Sitemap | 730 URLs, auto-generated | Single bulk timestamp suggests CI/CD pipeline |
| Schema markup | 6+ types per page | Aggressive GEO/SEO optimization |
| Mobile UX | Sticky CTA, responsive grids | Good mobile experience |
| Font stack | Poppins + Source Sans | Clean, professional |
| Design system | Card-based, gradient backgrounds, frosted glass | Modern aesthetic |

---

## 8. Competitive Threat Assessment

### Immediate threats (address within 1–2 weeks):

1. **pSEO gap is now critical** — They have 352 service×location pages; Pearlie has 0. Every day we delay, they build ranking authority on long-tail keywords like "invisalign westminster" and "emergency dentist camden."

2. **Free tools as SEO magnets** — Their NHS Dental Finder and Cost Calculator will attract high-volume informational traffic and backlinks. We need equivalent or better tools.

3. **Blog velocity** — They're publishing and updating articles weekly with rich schema. Our blog hasn't had new content in weeks.

### Medium-term concerns (1–3 months):

4. **CQC data integration** — They're showing real practice listings with addresses, phone numbers, and CQC status. If this data is accurate, it's a significant trust advantage.

5. **B2B pricing pressure** — Their tiered pricing (£99–£499/mo + 10% commission) is transparent and competitive. Pearlie should clarify our pricing model publicly.

6. **Borough-level content** — 32 deeply localized pages with transport info, neighbourhood names, and practice listings. Our area pages are thinner.

### What they DON'T have (Pearlie advantages):

- **AI-powered matching** — No intelligent intake or chat-based matching flow
- **Real-time chat** — No clinic-patient messaging system
- **Email-reply sync** — Our recent email threading feature is unique
- **Personalization** — No returning user recognition or "Your matches" experience
- **Actual booking flow** — Their booking page loads empty; unclear if real-time booking actually works
- **Verified reviews from real patients** — Their reviews appear templated/generic

---

## 9. Recommended Actions for Pearlie

### Priority 1 — Close the pSEO gap
- [ ] Generate service × location combination pages (11 services × 32 boroughs = 352 pages)
- [ ] Add remaining 7 service pages (Root Canal, Veneers, Tooth Extraction, Cosmetic, NHS, Private, Check-up)
- [ ] Expand from ~12 area pages to all 32 London boroughs

### Priority 2 — Launch free tools
- [ ] Build standalone NHS Dentist Finder tool (postcode search, shareable URL)
- [ ] Build Dental Cost Calculator (NHS vs private comparison by treatment and area)
- [ ] Position tools for backlink acquisition and top-of-funnel traffic

### Priority 3 — Blog acceleration
- [ ] Increase publishing cadence to 2+ articles per week
- [ ] Add HowTo schema to relevant articles
- [ ] Add interactive elements (comparison tables, ToC navigation)
- [ ] Target their exact keyword gaps (mouth cancer, receding gums, dentures, fillings)

### Priority 4 — Strengthen existing advantages
- [ ] Promote AI matching as key differentiator on homepage
- [ ] Add more schema types to existing pages (Service, HowTo, Speakable)
- [ ] Make clinic profile pages more content-rich (CQC data, transport info)

---

## Appendix: Full Sitemap URL Structure

```
/ (homepage)
/booking
/dentists-in-london
/dentists-in-london/[32 boroughs]
/services (index)
/services/[11 services]
/services/[11 services]/[32 boroughs]  ← 352 pages
/tools/nhs-dental-finder
/tools/dental-cost-calculator
/blog (index)
/blog/[10+ articles]
/for-dentists
/faq ← returns 404 (may be removed/restructured)
```

Total: **730 URLs** (all with lastmod 2026-02-28T05:44:37.500Z)
