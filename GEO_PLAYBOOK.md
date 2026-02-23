# Pearlie GEO Playbook — Path to 10/10

This playbook lists every remaining change needed to maximize Pearlie's visibility in AI-powered search (ChatGPT, Perplexity, Google AI Overviews). Each item is tagged:

- **[COPY]** — Needs copywriting (hand to ChatGPT or write manually)
- **[CODE]** — Code change in the codebase
- **[DR MUSTAJ]** — Needs real data or approval from Dr Mustaj

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

**1c.** Add source attributions in llms.txt after each statistic, e.g. "(Source: BDA, 2024)"
- File: public/llms.txt
- Type: [CODE]

---

## 2. STATISTICS (Current: 3/10)

Goal: Replace vague language with concrete, verifiable numbers.

### Already done
- Our Mission page has 5 statistics with sources

### Remaining

**2a.** Add real network size number. Choose whichever is accurate:
- "X+ verified clinics across London"
- "Covering X London boroughs"
- "X+ dental professionals in our network"
- Page: Homepage, "Quality & Trust" section
- Type: [DR MUSTAJ] to provide the number, then [CODE] to add it

**2b.** Add a "Pearlie in Numbers" mini-section with 3-4 real stats:
- Number of clinics in network
- Number of boroughs/areas covered
- Average clinic response time
- Number of treatments covered
- Page: About page (within or after "Our Commitment to You")
- Type: [DR MUSTAJ] to provide numbers, then [COPY] to write the section, then [CODE]

**2c.** Replace "expanding its clinic network" with a concrete number in FAQ item 11
- Current text: "Pearlie is expanding its clinic network and is currently focused on London"
- Better: "Pearlie's network includes X+ verified clinics across London, with plans to expand to other UK cities"
- Page: FAQ page, question 11
- Type: [DR MUSTAJ] to confirm number, then [CODE]

**2d.** Add a "Pearlie in Numbers" section to llms.txt with all real stats
- File: public/llms.txt
- Type: [DR MUSTAJ] to provide numbers, then [CODE]

---

## 3. EXPERT QUOTES (Current: 5/10)

Goal: Multiple authentic expert voices with credentials, not just one founder quote.

### Already done
- Founder quote on About page with "BDS" credential

### Remaining

**3a.** Dr Mustaj should review the existing About page quote and rewrite it in his own voice if it doesn't feel authentic. The current quote is:
> "I created Pearlie because I saw how difficult it was for people to find the right dental care. As a dentist myself, I wanted to build something that truly puts patients first."
- Page: About page blockquote
- Type: [DR MUSTAJ]

**3b.** Add a second quote from Dr Mustaj about the dental access crisis
- Page: Our Mission page (after the statistics section)
- Suggested topic: Why the NHS dental access gap matters personally to him
- Type: [DR MUSTAJ] to write or approve, then [CODE]

**3c.** Add a patient testimonial quote (with consent) OR a quote from a clinic partner
- Page: Homepage, "Patient Experiences" section
- Example format: "Finding a dentist who actually listened was life-changing" — Sarah, matched via Pearlie
- Type: [DR MUSTAJ] to source a real testimonial, then [CODE]

**3d.** Include the founder quote verbatim in llms.txt so AI can cite it directly
- File: public/llms.txt
- Type: [CODE]

---

## 4. FLUENCY (Current: 8/10)

Goal: Natural, non-repetitive language across all pages.

### Remaining

**4a.** Differentiate the About page hero text from the Homepage hero. Currently both pages open with variations of "find the right dental clinic."
- Suggestion: About page hero should focus on the WHY (mission/story), not the WHAT (finding clinics)
- Page: About page, hero subtitle
- Type: [COPY] then [CODE]

**4b.** Rewrite FAQ answer openers. Several start with bare "No." or "Yes." — rewrite to lead with the full answer.
- Current: "Yes. Pearlie is completely free for patients."
- Better: "Pearlie is completely free for patients — there are no fees..."
- Current: "No. Pearlie is not a dental practice."
- Better: "Pearlie is not a dental practice itself — it's a matching platform..."
- Page: FAQ page (both the rendered text AND the FAQ schema answers)
- Type: [COPY] then [CODE]

---

## 5. KEYWORD PLACEMENT (Current: 7/10)

Goal: Treatment-specific and location keywords appear in visible body text, not just schema.

### Remaining

**5a.** Add specific treatment keywords in visible body text on the homepage. Currently "Invisalign", "dental implants", "veneers", and "teeth whitening" only appear in hidden schema markup.
- Where: Homepage — in or near "How It Works" or "Quality & Trust" section
- Example: "Whether you need Invisalign, dental implants, veneers, or emergency care — we match you with the right specialist."
- Type: [COPY] then [CODE]

**5b.** Add "London" or "London and across the UK" in 1-2 more visible body text locations
- Where: Homepage subtitle or About page
- Currently most location mentions are schema-only
- Type: [COPY] then [CODE]

**5c.** Add 2-3 long-tail FAQ items that match real AI search queries. Suggested questions:
1. "How much does Invisalign cost in London?"
2. "How do I find a good dentist for dental implants?"
3. "What should I look for when choosing a cosmetic dentist?"
- Page: FAQ page (add new FAQ items with answers + update schema)
- Type: [COPY] then [CODE]

---

## 6. AUTHORITATIVE TONE (Current: 8/10)

Goal: Maximize perceived expertise through credentials and specificity.

### Remaining

**6a.** Add any additional credentials Dr Mustaj holds beyond BDS (e.g., MFDS, PGDip, MBA, specific postgraduate training)
- Page: About page founder section + llms.txt
- Type: [DR MUSTAJ] to confirm credentials, then [CODE]

**6b.** Strengthen the verification claim language:
- Current: "All clinics are verified"
- Better: "All clinics are independently verified by Pearlie and confirmed as registered with the General Dental Council (GDC)"
- Page: About page, "Our Commitment to You" section
- Type: [COPY] then [CODE]

**6c.** Add a geographic authority signal like "Founded in London" or "UK-founded and operated"
- Page: About page or footer
- Type: [COPY] then [CODE]

---

## 7. SIMPLIFICATION (Current: 8/10)

Goal: Remove redundancy, keep language crisp.

### Remaining

**7a.** On the Our Mission page, consolidate duplicate stat phrasing. Currently uses both "13 million adults haven't seen a dentist" AND "1 in 4 adults avoid the dentist." Pick the more impactful one, or combine them into a single sentence.
- Page: Our Mission page
- Type: [COPY] then [CODE]

Low priority — already near-perfect.

---

## 8. FAQ SECTIONS (Current: 9/10)

Goal: Comprehensive FAQ coverage including treatment-specific queries.

### Remaining

**8a.** Add the 2-3 treatment-specific FAQ items from item 5c above. These serve double duty: keyword placement AND FAQ coverage.
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
1. **Get real stats from Dr Mustaj** (2a, 2b, 2c, 2d) — biggest content gap
2. **Add treatment keywords to visible text** (5a) — unlocks treatment-query citations
3. **Add long-tail FAQ items** (5c / 8a) — captures AI search queries directly

### Tier 2 — High impact
4. **Strengthen citation links** (1a, 1b, 1c)
5. **Add second expert quote + testimonial** (3b, 3c)
6. **Strengthen authority language** (6b, 6c)
7. **Dr Mustaj reviews his quote** (3a) + adds credentials (6a)

### Tier 3 — Polish
8. **Fluency fixes** (4a, 4b)
9. **Simplification** (7a)
10. **llms.txt updates** (1c, 2d, 3d)
11. **Technical** (9a)

---

## What This Does NOT Touch

These changes are all on static marketing pages (homepage, about, FAQ, our mission, llms.txt). They do NOT affect:

- The patient matching form or quiz flow
- Clinic matching algorithm
- Lead creation or management
- Chat/messaging system
- Appointment booking
- Clinic dashboard
- Authentication or authorization
- Database schema
- API endpoints
- Any patient-facing interactive features
