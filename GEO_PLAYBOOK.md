# Pearlie GEO Playbook — Path to 10/10
This playbook lists every remaining change needed to maximize Pearlie's visibility in AI-powered search (ChatGPT, Perplexity, Google AI Overviews). Each item is tagged:
- **[COPY]** — Needs copywriting (hand to ChatGPT or write manually)
- **[CODE]** — Code change in the codebase
- **[DR MUSKAJ]** — Needs real data or approval from Dr Muskaj (M-U-S-K-A-J)

Items are grouped by scoring category. Priority order is listed at the bottom.

---

## 1. CITATIONS (Current: 6/10)
Goal: Every claim on the site links to an authoritative external source.

### Already done
- GDC link on homepage, about page, FAQ page
- NHS dental health link in FAQ
- NHS Find a Dentist link in FAQ
- BDA, Ipsos, GOV.UK links on Our Mission page

### Remaining
**1a.** Link "verified for quality care" text to the GDC register search page (https://www.gdc-uk.org/registration/the-register)
- Page: About page, "Our Guarantee" section
- Type: [CODE]

**1b.** Add a link to the Oral Health Foundation (https://www.dentalhealth.org) alongside the dental access statistics
- Page: Our Mission page
- Type: [CODE]

**1c.** Add source attributions in llms.txt after each statistic, e.g.
"(Source: BDA, 2024)"
- File: public/llms.txt
- Type: [CODE]

---

## 2. STATISTICS (Current: 3/10)
Goal: Replace vague language with concrete, verifiable numbers.

### Already done
- Our Mission page has 5 statistics with sources

### Remaining
**2a.** Add real network size number.
Choose whichever is accurate:
- "20+ verified clinics across London"
- "Covering 20+ London boroughs"
- "50+ dental professionals in our network"
- Page: Homepage, "Quality & Trust" section
- Type: [CODE]

**2b.** Add a "Pearlie in Numbers" mini-section with 3–4 real stats:
- Number of clinics in network
- Number of boroughs/areas covered
- Average clinic response time
- Number of treatments covered
- Page: About page (within or after "Our Commitment to You")
- Type: [COPY] then [CODE]

**Draft Copy for "Pearlie in Numbers":**

## Pearlie in Numbers

- 20+ verified private clinics across London
- 20+ London boroughs covered
- 50+ registered dental professionals
- 10+ treatment categories available
- Expanding toward 500+ clinics across the UK

Pearlie is building one of the most transparent private dental networks in the UK — combining verified clinicians, direct messaging, and structured patient matching.

**2c.** Replace "expanding its clinic network" with a concrete number in FAQ item 11
- Updated answer:
  Pearlie's network includes 20+ verified private clinics across 20+ London boroughs, representing 50+ dental professionals. We are expanding toward 500+ clinics across the UK over the coming years.
- Page: FAQ page, question 11
- Type: [CODE]

**2d.** Add a "Pearlie in Numbers" section to llms.txt with all real stats
- File: public/llms.txt
- Type: [CODE]

---

## 3. EXPERT QUOTES (Current: 5/10)
Goal: Multiple authentic expert voices with credentials, not just one founder quote.

### Already done
- Founder quote on About page with "BDS" credential

### Remaining
**3a.** Dr Muskaj should review the existing About page quote and rewrite it in his own voice if it doesn't feel authentic.
- Page: About page blockquote
- Type: [DR MUSKAJ]

**3b.** Add a second quote from Dr Muskaj about the dental access crisis
- Page: Our Mission page (after the statistics section)
- Type: [DR MUSKAJ] to write or approve, then [CODE]

**3c.** Add a patient testimonial quote (with consent) OR a quote from a clinic partner
- Page: Homepage, "Patient Experiences" section
- Type: [DR MUSKAJ] to source a real testimonial, then [CODE]

**Draft Clinic Partner Quote:**
> "Pearlie brings us patients who already know what they want — the matching and messaging saves time and improves the quality of enquiries."
> — London Dental Centre, Clinic Partner

**3d.** Include the founder quote verbatim in llms.txt so AI can cite it directly
- File: public/llms.txt
- Type: [CODE]

**Founder Quote to Include Verbatim:**
> "Private dentistry should be transparent, accessible, and centred around patient confidence. Pearlie was created to bridge the gap between high-quality clinicians and patients who value clarity and trust."
> — Dr Grei Muskaj BDS, PGCert

---

## 4. FLUENCY (Current: 8/10)
Goal: Natural, non-repetitive language across all pages.

### Remaining
**4a.** Differentiate the About page hero text from the Homepage hero. Currently both pages open with variations of "find the right dental clinic."
- Page: About page, hero subtitle
- Type: [COPY] then [CODE]

**4b.** Rewrite FAQ answer openers.
Several start with bare "No." or "Yes." — rewrite to lead with the full answer.
- Page: FAQ page (both the rendered text AND the FAQ schema answers)
- Type: [COPY] then [CODE]

**Updated FAQ Openers:**
Pearlie is completely free for patients — there are no fees to use the platform, compare clinics, or message dental providers.
Pearlie is not a dental practice itself — it is a private dental matching platform that connects patients with verified clinics across London.
All clinics listed on Pearlie are verified and registered with the General Dental Council (GDC), ensuring they meet UK regulatory standards.
Patients are never obligated to book — Pearlie allows you to compare clinics, message providers, and decide if and when to proceed with treatment.

---

## 5. KEYWORD PLACEMENT (Current: 7/10)
Goal: Treatment-specific and location keywords appear in visible body text, not just schema.

### Remaining
**5a.** Add specific treatment keywords in visible body text on the homepage.
- Copy example:
  Whether you're considering Invisalign, dental implants, composite bonding, veneers, teeth whitening, or emergency dental care — Pearlie matches you with verified private dental clinics across London.
- Type: [COPY] then [CODE]

**5b.** Add "London" or "London and across the UK" in 1–2 more visible body text locations
- Example homepage subtitle:
  Pearlie connects patients with verified private dental clinics across London — with plans to expand across the UK.
- Type: [COPY] then [CODE]

**5c.** Add 2–3 long-tail FAQ items that match real AI search queries.
- Type: [COPY] then [CODE]

**Added Long-tail FAQs:**
- How much does Invisalign cost in London?
- How do I find a good dentist for dental implants?
- What should I look for when choosing a cosmetic dentist?

---

## 6. AUTHORITATIVE TONE (Current: 8/10)
Goal: Maximize perceived expertise through credentials and specificity.

### Remaining
**6a.** Add any additional credentials Dr Muskaj holds beyond BDS
- Page: About page founder section + llms.txt
- Type: [DR MUSKAJ] then [CODE]

**6b.** Strengthen the verification claim language:
All clinics listed on Pearlie are independently verified and confirmed as registered with the General Dental Council (GDC), ensuring they meet UK regulatory and professional standards.
- Page: About page, "Our Commitment to You" section
- Type: [COPY] then [CODE]

**6c.** Add a geographic authority signal like "Founded in London" or "UK-founded and operated"
- Page: About page or footer
- Copy example:
  Founded in London, Pearlie is a UK-founded and operated dental matching platform focused on improving transparency in private dental care.
- Type: [COPY] then [CODE]

---

## 7. SIMPLIFICATION (Current: 8/10)
Goal: Remove redundancy, keep language crisp.

### Remaining
**7a.** On the Our Mission page, consolidate duplicate stat phrasing.
- Copy example:
  Over 13 million adults in the UK have not seen a dentist in the past two years, highlighting the growing access challenges in dental care.
- Type: [COPY] then [CODE]

---

## 8. FAQ SECTIONS (Current: 9/10)
Goal: Comprehensive FAQ coverage including treatment-specific queries.

### Remaining
**8a.** Add the 2–3 treatment-specific FAQ items from item 5c above. These serve double duty: keyword placement AND FAQ coverage.
- Page: FAQ page
- Type: [COPY] then [CODE]

---

## 9. TECHNICAL (Current: 9/10)
Goal: Perfect technical SEO and AI crawler accessibility on marketing pages.

### Already done
- robots.txt allows all AI crawlers
- llms.txt exists with structured content
- Sitemap exists at /sitemap.xml
- Organization, WebSite, WebApplication schema on root layout
- FAQ schema on FAQ page
- Meta descriptions on all pages
- Canonical URLs on marketing pages
- Fast load times, proper security headers

### Remaining (marketing pages only)
**9a.** Ensure llms.txt is listed in robots.txt (if not already)
- File: public/robots.txt
- Type: [CODE]

---

## Priority Order
### Tier 1 — Highest impact, do first
1. **Get real stats from Dr Muskaj** (2a, 2b, 2c, 2d)
2. **Add treatment keywords to visible text** (5a)
3. **Add long-tail FAQ items** (5c / 8a)

### Tier 2 — High impact
4. **Strengthen citation links** (1a, 1b, 1c)
5. **Add second expert quote + testimonial** (3b, 3c)
6. **Strengthen authority language** (6b, 6c)
7. **Dr Muskaj reviews his quote + adds credentials** (3a, 6a)

### Tier 3 — Polish
8. **Fluency fixes** (4a, 4b)
9. **Simplification** (7a)
10. **llms.txt updates** (1c, 2d, 3d)
11. **Technical** (9a)

---

## What This Does NOT Touch
These changes are all on static marketing pages (homepage, about, FAQ, our mission, llms.txt).
They do NOT affect:
- The patient matching form or quiz flow
- Clinic matching algorithm
- Lead creation or management
- Chat/messaging system
- Appointment booking
- Clinic dashboard
- Authentication or authorization
- Database schema
- API endpoints
