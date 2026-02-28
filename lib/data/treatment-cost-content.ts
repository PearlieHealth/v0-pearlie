/**
 * Treatment cost-intent content for SEO-optimised landing pages.
 * Each treatment has: hero copy, price breakdown, comparison table, "what affects price" bullets, and cost-focused FAQs.
 */

export interface PriceRow {
  tier: string
  price: string
  note?: string
}

export interface ComparisonRow {
  factor: string
  values: string[] // one per column header
}

export interface CostFAQ {
  question: string
  answer: string
}

export interface TreatmentCostContent {
  costIntentH1: string
  heroSubheading: string
  ctaButtonText: string
  metaTitle: string
  metaDescription: string
  /** Price breakdown section */
  priceBreakdown: {
    heading: string
    rows: PriceRow[]
    footnote?: string
  }
  /** "What affects the price?" bullets */
  priceFactors: string[]
  /** "Compare options" section */
  comparison: {
    heading: string
    columnHeaders: string[]
    rows: ComparisonRow[]
    bullets: string[]
  }
  /** Cost-intent FAQ section */
  costFaqs: CostFAQ[]
}

export const treatmentCostContent: Record<string, TreatmentCostContent> = {
  invisalign: {
    costIntentH1: "Invisalign Cost in London (2026) — Compare Clinics & Prices",
    heroSubheading:
      "Invisalign in the UK typically costs £2,500 – £5,500, depending on complexity. Compare verified clinics, see transparent pricing, and get matched with a provider near you — free and independent.",
    ctaButtonText: "Compare Invisalign clinics near me",
    metaTitle: "Invisalign Cost in London (2026) — Compare Clinics & Prices | Pearlie",
    metaDescription:
      "How much does Invisalign cost in London in 2026? Prices range from £2,500 to £5,500. Compare verified Invisalign providers, see transparent pricing, and get matched free.",
    priceBreakdown: {
      heading: "Invisalign cost breakdown (2026)",
      rows: [
        { tier: "Invisalign Express (Go)", price: "£1,500 – £2,500", note: "Very mild cases, up to 7 aligners" },
        { tier: "Invisalign Lite", price: "£2,500 – £3,500", note: "Mild cases, up to 14 aligners" },
        { tier: "Invisalign Comprehensive", price: "£3,500 – £5,500", note: "Moderate to complex, unlimited aligners" },
        { tier: "Refinement aligners", price: "Usually included", note: "Included in Comprehensive plans" },
        { tier: "Retainers (after treatment)", price: "£100 – £400", note: "Fixed and/or removable" },
      ],
      footnote: "London clinics may charge 20–30% more due to higher operating costs. Prices include consultation, aligners, and check-ups unless stated otherwise.",
    },
    priceFactors: [
      "Case complexity — mild crowding costs less than severe bite correction",
      "Treatment tier — Express, Lite, or Comprehensive determines aligner count and cost",
      "Clinic location — central London clinics typically charge 20–30% more",
      "Provider experience — Gold and Platinum providers may charge a premium",
      "Included extras — check whether retainers, refinements, and whitening are included",
      "Finance options — 0% interest plans spread cost over 12–24 months",
    ],
    comparison: {
      heading: "Invisalign vs braces: which costs less?",
      columnHeaders: ["Invisalign", "Traditional braces"],
      rows: [
        { factor: "Typical UK cost", values: ["£2,500 – £5,500", "£1,500 – £6,000"] },
        { factor: "Treatment time", values: ["6–18 months", "12–24 months"] },
        { factor: "Visibility", values: ["Nearly invisible", "Visible brackets and wires"] },
        { factor: "Removable", values: ["Yes", "No"] },
        { factor: "Food restrictions", values: ["None", "Hard/sticky foods restricted"] },
        { factor: "Check-up frequency", values: ["Every 6–8 weeks", "Every 4–6 weeks"] },
      ],
      bullets: [
        "Invisalign is generally comparable in price to braces for mild-to-moderate cases.",
        "Complex orthodontic cases may still benefit from traditional braces, which can be more effective for severe bite issues.",
        "Invisalign offers convenience and aesthetics; braces may be recommended for the most complex corrections.",
      ],
    },
    costFaqs: [
      {
        question: "Why does Invisalign cost vary so much?",
        answer: "The price depends on your case complexity (how many aligners you need), your clinic's location, and the provider's experience tier. A simple case with 7 aligners costs far less than a complex case requiring unlimited aligners and refinements.",
      },
      {
        question: "Does Invisalign include retainers?",
        answer: "It depends on the clinic. Some include retainers in the overall price, while others charge £100–£400 separately. Always confirm what's included before committing.",
      },
      {
        question: "Can I pay monthly for Invisalign?",
        answer: "Yes. Most Invisalign providers offer 0% finance over 12–24 months, with monthly payments typically starting from £100–£250 per month depending on the plan.",
      },
      {
        question: "How long does Invisalign take?",
        answer: "Most treatments take 6–18 months. Mild cases with Invisalign Lite can be completed in 6 months, while complex cases with Invisalign Comprehensive may take 12–18 months.",
      },
      {
        question: "Is Spark cheaper than Invisalign?",
        answer: "Spark aligners are typically priced similarly to Invisalign, ranging from £2,500 to £5,000. Some clinics may offer Spark at a slightly lower price as it's a newer system. The best approach is to compare quotes from clinics offering both.",
      },
      {
        question: "What's the difference between Express and Comprehensive?",
        answer: "Invisalign Express treats very mild cases with up to 7 aligners (from £1,500). Comprehensive is for moderate-to-complex cases with unlimited aligners and refinements (from £3,500). Your provider will recommend the right tier after assessment.",
      },
      {
        question: "Are there hidden costs with Invisalign?",
        answer: "Watch for extra charges for retainers, refinement aligners, attachments, or follow-up visits. A good clinic will give you an all-inclusive quote upfront. Pearlie helps you compare transparent pricing.",
      },
      {
        question: "Is Invisalign worth the cost?",
        answer: "For most patients with mild to moderate alignment issues, Invisalign delivers excellent results with the convenience of removable, nearly invisible aligners. The investment is comparable to braces but with greater comfort and aesthetics.",
      },
    ],
  },

  "composite-bonding": {
    costIntentH1: "Composite Bonding Price in the UK (2026) — Compare Clinics",
    heroSubheading:
      "Composite bonding costs £250 – £450 per tooth in the UK. A full smile makeover (6–8 teeth) typically ranges from £1,500 to £3,600. Compare verified cosmetic dentists and see transparent pricing.",
    ctaButtonText: "Compare bonding clinics near me",
    metaTitle: "Composite Bonding Price in the UK (2026) — Compare Clinics | Pearlie",
    metaDescription:
      "How much does composite bonding cost in the UK in 2026? From £250 per tooth. Compare verified cosmetic dentists, see transparent pricing, and get matched free.",
    priceBreakdown: {
      heading: "Composite bonding cost breakdown (2026)",
      rows: [
        { tier: "Single tooth bonding", price: "£250 – £450", note: "Per tooth, chip repair or reshaping" },
        { tier: "Edge bonding (per tooth)", price: "£150 – £300", note: "Minor edge repairs" },
        { tier: "4 teeth (smile zone)", price: "£1,000 – £1,800", note: "Most popular option" },
        { tier: "6–8 teeth (full smile)", price: "£1,500 – £3,600", note: "Full smile enhancement" },
        { tier: "Smile design consultation", price: "£50 – £150", note: "Often deducted from treatment cost" },
      ],
      footnote: "Prices vary by dentist experience, case complexity, and location. London prices are typically at the higher end of these ranges.",
    },
    priceFactors: [
      "Number of teeth treated — more teeth means higher total cost",
      "Complexity of reshaping — simple chips cost less than full smile redesign",
      "Dentist experience — highly skilled cosmetic dentists may charge more for superior results",
      "Location — central London clinics tend to charge 20–30% more",
      "Preparation required — if whitening is done first, this is an additional cost",
      "Material quality — premium composite resins offer better aesthetics and longevity",
    ],
    comparison: {
      heading: "Composite bonding vs porcelain veneers",
      columnHeaders: ["Composite bonding", "Porcelain veneers"],
      rows: [
        { factor: "Cost per tooth", values: ["£250 – £450", "£700 – £1,200"] },
        { factor: "Longevity", values: ["3–7 years", "10–15+ years"] },
        { factor: "Reversibility", values: ["Usually reversible", "Permanent (irreversible)"] },
        { factor: "Appointments", values: ["Same day (1 visit)", "2+ visits over 2–4 weeks"] },
        { factor: "Tooth preparation", values: ["Minimal to none", "Enamel removal required"] },
        { factor: "Stain resistance", values: ["Moderate", "High"] },
      ],
      bullets: [
        "Composite bonding is the most affordable and conservative cosmetic option — ideal for subtle improvements.",
        "Porcelain veneers last significantly longer and offer superior aesthetics for full smile transformations.",
        "Many patients start with bonding and upgrade to veneers later if desired.",
      ],
    },
    costFaqs: [
      {
        question: "How long does composite bonding last?",
        answer: "Composite bonding typically lasts 3–7 years depending on oral hygiene, diet, and whether you grind your teeth. Regular polishing and maintenance appointments help extend its lifespan.",
      },
      {
        question: "Is bonding cheaper than veneers?",
        answer: "Yes, significantly. Composite bonding costs £250–£450 per tooth compared to £700–£1,200 for porcelain veneers. However, veneers last 2–3 times longer, so the long-term cost per year may be similar.",
      },
      {
        question: "Can composite bonding stain?",
        answer: "Yes, composite resin can stain over time from coffee, tea, red wine, and smoking. Regular professional polishing helps maintain the appearance. Porcelain veneers are more stain-resistant.",
      },
      {
        question: "What's the cost per tooth for bonding?",
        answer: "In the UK, composite bonding costs £250–£450 per tooth. Edge bonding (minor repairs) may be less at £150–£300 per tooth. Prices vary by dentist experience and location.",
      },
      {
        question: "Does bonding require drilling?",
        answer: "In most cases, no. Composite bonding is minimally invasive — the resin is applied directly to the tooth surface without removing enamel. This makes it one of the most conservative cosmetic treatments.",
      },
      {
        question: "Can I get bonding on the NHS?",
        answer: "Composite bonding for cosmetic purposes is not available on the NHS. However, if you have a chipped or broken tooth, some repair work may be covered under NHS Band 2 treatment (£77.50).",
      },
      {
        question: "Is it worth getting composite bonding?",
        answer: "For subtle improvements like closing gaps, fixing chips, or reshaping teeth, bonding offers excellent value. It's affordable, done in one visit, and usually reversible. For more dramatic transformations, veneers may be more appropriate.",
      },
      {
        question: "How many teeth should I get bonded?",
        answer: "Most patients treat 4–8 teeth in the 'smile zone' (the teeth visible when you smile). Your cosmetic dentist will recommend the ideal number based on your smile width and goals.",
      },
    ],
  },

  veneers: {
    costIntentH1: "Porcelain Veneers Cost Per Tooth in London (2026)",
    heroSubheading:
      "Porcelain veneers cost £700 – £1,200 per tooth in the UK. A full smile makeover (6–10 veneers) ranges from £4,200 to £12,000. Compare verified cosmetic specialists and see transparent pricing.",
    ctaButtonText: "Compare veneer clinics near me",
    metaTitle: "Porcelain Veneers Cost Per Tooth in London (2026) | Pearlie",
    metaDescription:
      "How much do porcelain veneers cost in London in 2026? From £700 per tooth. Compare verified cosmetic specialists, see real pricing, and get matched free.",
    priceBreakdown: {
      heading: "Porcelain veneers cost breakdown (2026)",
      rows: [
        { tier: "Porcelain veneer (per tooth)", price: "£700 – £1,200", note: "Custom lab-crafted ceramic" },
        { tier: "Composite veneer (per tooth)", price: "£250 – £450", note: "Direct bonding alternative" },
        { tier: "4 veneers (front teeth)", price: "£2,800 – £4,800", note: "Upper front teeth only" },
        { tier: "6 veneers (smile zone)", price: "£4,200 – £7,200", note: "Most popular option" },
        { tier: "8–10 veneers (full smile)", price: "£5,600 – £12,000", note: "Complete smile transformation" },
        { tier: "Smile design consultation", price: "£50 – £200", note: "Digital planning and mock-ups" },
      ],
      footnote: "Prices depend on the number of veneers, the ceramist/lab used, case complexity, and clinic location. Finance options are widely available.",
    },
    priceFactors: [
      "Number of veneers — full smile (8–10) costs more than front teeth only (4)",
      "Porcelain vs composite — porcelain veneers cost roughly 2–3x more but last much longer",
      "Lab and ceramist quality — premium dental labs produce more lifelike results",
      "Dentist experience — leading cosmetic dentists charge a premium for expertise",
      "Smile design complexity — digital design, wax-ups, and trial smiles add value",
      "Location — central London clinics tend to be at the higher end of the range",
      "Finance plans — 0% interest available at many clinics over 12–24 months",
    ],
    comparison: {
      heading: "Porcelain veneers vs crowns",
      columnHeaders: ["Porcelain veneers", "Dental crowns"],
      rows: [
        { factor: "Cost per tooth", values: ["£700 – £1,200", "£500 – £1,000"] },
        { factor: "Tooth coverage", values: ["Front surface only", "Full tooth (360°)"] },
        { factor: "Tooth preparation", values: ["0.3–0.7mm enamel removed", "More extensive preparation"] },
        { factor: "Best for", values: ["Cosmetic improvement", "Structural repair"] },
        { factor: "Longevity", values: ["10–15+ years", "10–15 years"] },
        { factor: "Reversibility", values: ["No (permanent)", "No (permanent)"] },
      ],
      bullets: [
        "Veneers are primarily cosmetic — they transform the appearance of healthy teeth.",
        "Crowns are restorative — they protect and strengthen damaged or weakened teeth.",
        "Your dentist will recommend veneers for cosmetic goals and crowns for structural needs.",
      ],
    },
    costFaqs: [
      {
        question: "How much do veneers cost per tooth in London?",
        answer: "Porcelain veneers in London typically cost £800–£1,200 per tooth. Outside London, prices range from £700–£1,000 per tooth. Composite veneers are a more affordable alternative at £250–£450 per tooth.",
      },
      {
        question: "What's the difference between composite and porcelain veneers cost?",
        answer: "Composite veneers cost £250–£450 per tooth and are done in one visit. Porcelain veneers cost £700–£1,200 per tooth but last 10–15+ years vs 3–7 years for composite. Porcelain offers superior aesthetics and stain resistance.",
      },
      {
        question: "How many veneers do I need?",
        answer: "Most patients get 6–10 veneers to cover the visible 'smile zone'. Some choose just 2–4 for the front teeth. Your cosmetic dentist will recommend the ideal number based on your smile width and goals.",
      },
      {
        question: "Do veneers damage your teeth?",
        answer: "Veneer placement requires removing a thin layer of enamel (0.3–0.7mm). This is permanent — once done, the tooth will always need a veneer or crown. A conservative cosmetic dentist removes the minimum necessary.",
      },
      {
        question: "How long do porcelain veneers last?",
        answer: "With proper care, porcelain veneers last 10–15 years or longer. They're highly durable and stain-resistant. Avoid biting hard objects and wear a nightguard if you grind your teeth.",
      },
      {
        question: "Can I finance veneers?",
        answer: "Yes. Most cosmetic clinics offer 0% interest finance over 12–24 months, extended finance over 3–5 years, or staged payment plans with deposits and balance at fitting.",
      },
      {
        question: "Are cheap veneers worth it?",
        answer: "Be cautious of unusually low veneer prices. Quality depends on the ceramist, materials, and dentist skill. Poor veneers can look unnatural, fail early, or damage your teeth. Focus on finding a skilled cosmetic dentist with a strong portfolio.",
      },
      {
        question: "Is it cheaper to get veneers abroad?",
        answer: "Veneers abroad (e.g., Turkey) can cost 50–70% less, but there are risks: limited aftercare, difficulty with follow-ups, variable quality standards, and no recourse if things go wrong. Many UK dentists see patients needing corrective work after overseas treatment.",
      },
    ],
  },

  "teeth-whitening": {
    costIntentH1: "Teeth Whitening Cost in London & UK (2026)",
    heroSubheading:
      "Professional teeth whitening in the UK costs £250 – £1,000 depending on the method. Compare in-chair, take-home, and premium whitening systems at verified clinics near you.",
    ctaButtonText: "Compare whitening clinics near me",
    metaTitle: "Teeth Whitening Cost in London & UK (2026) | Pearlie",
    metaDescription:
      "How much does teeth whitening cost in 2026? From £250 for home kits to £1,000 for Enlighten. Compare verified whitening clinics in London and the UK.",
    priceBreakdown: {
      heading: "Teeth whitening cost breakdown (2026)",
      rows: [
        { tier: "Home whitening (custom trays)", price: "£250 – £400", note: "1–3 weeks, 2–6 shades lighter" },
        { tier: "In-chair whitening (Zoom)", price: "£400 – £600", note: "1 visit, 4–8 shades lighter" },
        { tier: "Boutique Whitening", price: "£300 – £500", note: "Custom trays, low sensitivity" },
        { tier: "Enlighten Whitening", price: "£600 – £1,000", note: "Guaranteed B1 shade, gold standard" },
        { tier: "Combo (home + in-chair)", price: "£500 – £800", note: "Best of both approaches" },
        { tier: "Top-up gel refills", price: "£30 – £80", note: "Per syringe, for maintenance" },
      ],
      footnote: "Most clinic prices include consultation, custom trays, whitening gel, and follow-up. Always confirm what's included before booking.",
    },
    priceFactors: [
      "Treatment method — in-chair costs more than home kits but is faster",
      "Whitening system — premium brands like Enlighten cost more but guarantee results",
      "Number of sessions — some patients need multiple applications for best results",
      "Clinic location — London clinics tend to charge more than regional practices",
      "What's included — check whether trays, gel, and follow-up are in the price",
      "Top-up costs — maintaining results requires periodic gel refills (£30–£80 per syringe)",
    ],
    comparison: {
      heading: "In-chair vs take-home whitening",
      columnHeaders: ["In-chair whitening", "Take-home whitening"],
      rows: [
        { factor: "Typical cost", values: ["£400 – £800", "£250 – £400"] },
        { factor: "Treatment time", values: ["1 visit (60–90 min)", "1–3 weeks daily wear"] },
        { factor: "Results", values: ["4–8 shades lighter", "2–6 shades lighter"] },
        { factor: "Convenience", values: ["Done at clinic", "At home, on your schedule"] },
        { factor: "Sensitivity", values: ["Moderate (temporary)", "Lower (gradual process)"] },
        { factor: "Longevity", values: ["6–12 months", "6–24 months with top-ups"] },
      ],
      bullets: [
        "In-chair whitening delivers the fastest results in a single visit — ideal for events or quick results.",
        "Take-home whitening is more affordable and causes less sensitivity, with results building over 1–3 weeks.",
        "The best clinics recommend a combo approach (home + in-chair) for the most dramatic and lasting results.",
      ],
    },
    costFaqs: [
      {
        question: "Is in-chair whitening better than home whitening?",
        answer: "In-chair whitening delivers faster, more dramatic results in a single visit (4–8 shades). Home whitening is more gradual (2–6 shades over 1–3 weeks) but more affordable and often causes less sensitivity. Many dentists recommend combining both for optimal results.",
      },
      {
        question: "How long does teeth whitening last?",
        answer: "Professional whitening typically lasts 6 months to 2 years depending on your diet and lifestyle. Coffee, tea, red wine, and smoking cause faster staining. Top-up treatments every 6–12 months maintain results.",
      },
      {
        question: "Is teeth whitening safe?",
        answer: "Yes, when performed by a GDC-registered dental professional using regulated products (up to 6% hydrogen peroxide in the UK). Beauty salon whitening is illegal and potentially unsafe. Always choose a registered dentist.",
      },
      {
        question: "Why do whitening prices vary so much?",
        answer: "Prices vary based on the system used (home vs in-chair vs premium), the clinic's location, and what's included in the price. Enlighten (£600–£1,000) guarantees a B1 shade, while basic home kits (£250–£400) offer more modest results.",
      },
      {
        question: "What does 'combo whitening' mean?",
        answer: "Combo whitening combines take-home trays (worn for 1–2 weeks) with a final in-chair session for maximum results. This approach — used by systems like Enlighten — delivers the most dramatic and lasting whitening.",
      },
      {
        question: "Can I whiten my teeth if I have crowns or veneers?",
        answer: "Whitening only works on natural tooth enamel. Crowns, veneers, and fillings won't change colour. If you have visible restorations, your dentist may recommend whitening natural teeth first, then replacing restorations to match.",
      },
      {
        question: "Is whitening available on the NHS?",
        answer: "No. Teeth whitening is classified as a cosmetic procedure and is not available on the NHS. It must be done privately by a GDC-registered dental professional.",
      },
      {
        question: "How much does whitening top-up cost?",
        answer: "Top-up gel refills typically cost £30–£80 per syringe using your existing custom trays. Most patients top up every 6–12 months to maintain results.",
      },
    ],
  },

  "dental-implants": {
    costIntentH1: "Dental Implant Cost in London (2026) — Price Guide & Clinics",
    heroSubheading:
      "A single dental implant in the UK costs £2,000 – £3,500 (post, abutment, and crown). Full arch All-on-4 ranges from £8,000 to £15,000 per arch. Compare verified implant specialists near you.",
    ctaButtonText: "Compare implant clinics near me",
    metaTitle: "Dental Implant Cost in London (2026) — Price Guide & Clinics | Pearlie",
    metaDescription:
      "How much do dental implants cost in London in 2026? Single implants from £2,000. Full arch from £8,000. Compare verified implant specialists and see transparent pricing.",
    priceBreakdown: {
      heading: "Dental implant cost breakdown (2026)",
      rows: [
        { tier: "Single implant (post + abutment + crown)", price: "£2,000 – £3,500", note: "Most common procedure" },
        { tier: "Implant-supported bridge (2 implants)", price: "£4,000 – £6,000", note: "Replaces 3–4 adjacent teeth" },
        { tier: "All-on-4 (full arch)", price: "£8,000 – £15,000", note: "Per arch, 4 implants + fixed bridge" },
        { tier: "All-on-6 (full arch)", price: "£10,000 – £18,000", note: "Per arch, 6 implants + fixed bridge" },
        { tier: "Bone graft (if required)", price: "£300 – £800", note: "Adds 3–6 months to timeline" },
        { tier: "CBCT scan", price: "£100 – £250", note: "3D planning scan, sometimes included" },
      ],
      footnote: "Prices are confirmed after clinical assessment. Central London clinics typically charge 20–40% more than regional practices. Finance options are widely available.",
    },
    priceFactors: [
      "Number of implants — single implants cost less than full arch solutions",
      "Bone condition — insufficient bone may require grafting (£300–£800 extra)",
      "Implant brand — premium brands (Nobel Biocare, Straumann) may cost more",
      "Type of crown — porcelain fused to metal vs full zirconia affects cost",
      "Specialist vs generalist — implant specialists may charge more but have greater experience",
      "Clinic location — central London clinics charge 20–40% more than regional practices",
      "Sedation — IV sedation adds £300–£600 if required",
    ],
    comparison: {
      heading: "Implants vs bridges vs dentures",
      columnHeaders: ["Dental implants", "Bridges", "Dentures"],
      rows: [
        { factor: "Cost", values: ["£2,000 – £3,500/tooth", "£750 – £1,500/unit", "£300 – £2,000"] },
        { factor: "Lifespan", values: ["20+ years (lifetime for post)", "10–15 years", "5–10 years"] },
        { factor: "Looks natural", values: ["Yes", "Mostly", "Less so"] },
        { factor: "Affects other teeth", values: ["No", "Yes (filed down)", "No"] },
        { factor: "Prevents bone loss", values: ["Yes", "No", "No"] },
        { factor: "Maintenance", values: ["Brush & floss normally", "Extra cleaning needed", "Remove to clean"] },
      ],
      bullets: [
        "Implants are the gold standard: they look, feel, and function like natural teeth and prevent bone loss.",
        "Bridges are a mid-range option but require filing down healthy adjacent teeth.",
        "Dentures are the most affordable but are removable, less stable, and don't prevent bone loss.",
      ],
    },
    costFaqs: [
      {
        question: "Why are dental implants so expensive?",
        answer: "Implant treatment involves surgical placement of a titanium post, a healing period of 2–6 months, specialist components (abutment), and a custom-made crown. The materials, clinical time, specialist training, and number of appointments all contribute to the cost.",
      },
      {
        question: "What's included in the implant price?",
        answer: "A comprehensive quote should include the titanium implant post, abutment, custom crown, CBCT scan, surgical placement, and all follow-up appointments. Always confirm what's included and ask about potential extras like bone grafting or sedation.",
      },
      {
        question: "Do I need a bone graft?",
        answer: "You may need a bone graft if you've had missing teeth for a long time and your jawbone has thinned. This adds £300–£800 and extends the timeline by 3–6 months. Your dentist will assess this with a CBCT scan at your consultation.",
      },
      {
        question: "How long does the implant process take?",
        answer: "The full process typically takes 3–9 months from consultation to final crown. This includes a healing period of 2–6 months for the implant to fuse with your jawbone (osseointegration). Same-day implant options are available at some clinics.",
      },
      {
        question: "Are dental implants painful?",
        answer: "The procedure is performed under local anaesthetic, so you shouldn't feel pain during placement. Most patients report mild discomfort for a few days afterwards, manageable with over-the-counter painkillers. Sedation is available for anxious patients.",
      },
      {
        question: "What's the difference between a specialist and general implant provider?",
        answer: "Implant specialists (prosthodontists or oral surgeons) have postgraduate training specifically in implant placement. General dentists with implant training can also provide excellent results. For complex cases (bone grafting, full arch), a specialist is generally recommended.",
      },
      {
        question: "Can I finance dental implants?",
        answer: "Yes. Most implant clinics offer 0% interest finance over 12–24 months, extended finance over 3–5 years, or staged payments across treatment milestones. Monthly payments for a single implant typically start from £80–£150.",
      },
      {
        question: "Are implants available on the NHS?",
        answer: "Dental implants are almost always private treatment. NHS provision is limited to exceptional cases such as congenital defects or tooth loss from head/neck cancer treatment. Your dentist can advise if you may qualify.",
      },
    ],
  },
}
