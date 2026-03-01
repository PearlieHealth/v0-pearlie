/**
 * Treatment page content for SEO-optimised landing pages.
 * Each treatment has: hero copy, price breakdown, comparison table, "what affects price" bullets,
 * cost-focused FAQs, and enriched content sections (who is this for, timeline, finance, risks, CTA copy).
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
    contextParagraph?: string
    nhsNote?: string
  }
  /** "What affects the price?" bullets */
  priceFactors: string[]
  /** "Compare options" section */
  comparison: {
    heading: string
    columnHeaders: string[]
    rows: ComparisonRow[]
    bullets: string[]
    introParagraph?: string
    outroParagraph?: string
    relatedLink?: {
      href: string
      label: string
      description: string
    }
  }
  /** Cost-intent FAQ section */
  costFaqs: CostFAQ[]
  /** "Who is this for?" section */
  whoIsThisFor?: {
    personas: string[]
    summary: string
  }
  /** Treatment timeline / process steps */
  timeline?: {
    heading: string
    steps: {
      label: string
      description: string
      duration?: string
    }[]
    totalDuration: string
  }
  /** Finance & payment options */
  finance?: {
    available: boolean
    heading: string
    options: {
      label: string
      detail: string
    }[]
    monthlyExample?: string
    depositNote?: string
  }
  /** Risks & considerations */
  risks?: {
    heading: string
    items: {
      risk: string
      detail: string
    }[]
    reassurance: string
  }
  /** CTA copy rotation (hero / mid-page / bottom) */
  ctaCopy?: {
    hero: string
    mid: string
    bottom: string
  }
  /** Key facts shown as pills below the hero */
  keyFacts?: string[]
}

export const treatmentCostContent: Record<string, TreatmentCostContent> = {
  invisalign: {
    costIntentH1: "Invisalign Cost in London — Compare Clinics & Prices",
    heroSubheading:
      "Invisalign in the UK typically costs £2,500 – £5,500, depending on complexity. Compare verified clinics, see transparent pricing, and get matched with a provider near you — free and independent.",
    ctaButtonText: "Compare Invisalign clinics near me",
    metaTitle: "Invisalign Cost in London — Compare Clinics & Prices | Pearlie",
    metaDescription:
      "How much does Invisalign cost in London? Prices range from £2,500 to £5,500. Compare verified Invisalign providers, see transparent pricing, and get matched free.",
    priceBreakdown: {
      heading: "Invisalign cost breakdown",
      rows: [
        { tier: "Invisalign Express (Go)", price: "£1,500 – £2,500", note: "Very mild cases, up to 7 aligners" },
        { tier: "Invisalign Lite", price: "£2,500 – £3,500", note: "Mild cases, up to 14 aligners" },
        { tier: "Invisalign Comprehensive", price: "£3,500 – £5,500", note: "Moderate to complex, unlimited aligners" },
        { tier: "Refinement aligners", price: "Usually included", note: "Included in Comprehensive plans" },
        { tier: "Retainers (after treatment)", price: "£100 – £400", note: "Fixed and/or removable" },
      ],
      footnote: "London clinics may charge 20–30% more due to higher operating costs. Prices include consultation, aligners, and check-ups unless stated otherwise.",
      contextParagraph: "Invisalign pricing depends on the complexity of your case and which treatment tier your provider recommends. Below is a breakdown of typical UK prices across all Invisalign tiers, from mild cases to full comprehensive treatment.",
      nhsNote: "Invisalign is not available on the NHS. It is classified as a private orthodontic treatment. However, most clinics offer finance plans to spread the cost.",
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
      introParagraph: "If you're weighing Invisalign against traditional braces, cost is often a deciding factor. Here's how the two compare across price, treatment time, and lifestyle impact.",
      outroParagraph: "For most adults seeking a discreet option, Invisalign offers comparable results to braces at a similar price point. Your orthodontist can advise which approach suits your case best.",
      relatedLink: {
        href: "/treatments/invisalign-vs-spark",
        label: "Invisalign vs Spark — full comparison",
        description: "Compare Invisalign and Spark on cost, material, attachments, and which suits your case.",
      },
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
    whoIsThisFor: {
      personas: [
        "Adults with mild to moderate crowding, gaps, or bite issues looking for a discreet solution",
        "Professionals who want straighter teeth without visible metal braces",
        "Patients who've had braces before but experienced relapse and want re-treatment",
        "Anyone comparing clear aligner providers and wanting transparent pricing before committing",
      ],
      summary: "Invisalign is the most widely used clear aligner system in the UK. It suits adults and older teenagers who want to straighten their teeth without the visibility and lifestyle restrictions of traditional braces.",
    },
    timeline: {
      heading: "Your Invisalign journey",
      steps: [
        { label: "Consultation & 3D scan", description: "Digital iTero scan maps your teeth and creates a personalised treatment plan with a projected result preview.", duration: "30–60 minutes" },
        { label: "Custom aligner fabrication", description: "Your aligners are manufactured from SmartTrack material, precisely calibrated for each stage of movement.", duration: "2–3 weeks" },
        { label: "Wearing your aligners", description: "Wear each set for 20–22 hours per day. Switch to a new set every 1–2 weeks as teeth gradually move.", duration: "Ongoing" },
        { label: "Progress check-ups", description: "Regular reviews every 6–8 weeks ensure teeth are tracking correctly. Attachments may be placed for complex movements.", duration: "15–30 minutes each" },
        { label: "Retention", description: "After treatment, fixed and/or removable retainers maintain your results long term.", duration: "Ongoing" },
      ],
      totalDuration: "6–18 months total treatment time",
    },
    finance: {
      available: true,
      heading: "Invisalign finance & payment options",
      options: [
        { label: "0% interest finance", detail: "Spread the cost over 12–24 months with no interest at most clinics" },
        { label: "Monthly payment plans", detail: "Typical payments from £100–£250 per month depending on your plan" },
        { label: "Pay in full discount", detail: "Some clinics offer 5–10% off for upfront payment" },
      ],
      monthlyExample: "From £100/month for Invisalign Lite",
      depositNote: "Most clinics require a deposit of £200–£500 to begin treatment",
    },
    risks: {
      heading: "Risks & considerations",
      items: [
        { risk: "Mild discomfort", detail: "Pressure or tightness when switching to new aligners is normal and usually subsides within 1–2 days." },
        { risk: "Compliance required", detail: "Aligners must be worn 20–22 hours per day. Poor compliance leads to slower results or treatment failure." },
        { risk: "Speech changes", detail: "A slight lisp may occur in the first few days with new aligners. This resolves quickly as you adjust." },
        { risk: "Attachments visibility", detail: "Small tooth-coloured bumps (attachments) may be placed on teeth to aid movement. These are removed after treatment." },
        { risk: "Refinements may be needed", detail: "Some cases require additional aligners (refinements) to achieve the final result. This is normal and usually included in Comprehensive plans." },
      ],
      reassurance: "Invisalign has been used to treat over 14 million patients worldwide. Side effects are generally mild and temporary. Your provider will monitor progress throughout treatment and address any concerns at your regular check-ups.",
    },
    ctaCopy: {
      hero: "Compare Invisalign clinics near me",
      mid: "Get a personalised Invisalign quote",
      bottom: "Find your perfect Invisalign provider",
    },
    keyFacts: [
      "6–18 months treatment time",
      "Nearly invisible aligners",
      "Removable for eating & brushing",
      "From £2,500",
    ],
  },

  "composite-bonding": {
    costIntentH1: "Composite Bonding Price in the UK — Compare Clinics",
    heroSubheading:
      "Composite bonding costs £250 – £450 per tooth in the UK. A full smile makeover (6–8 teeth) typically ranges from £1,500 to £3,600. Compare verified cosmetic dentists and see transparent pricing.",
    ctaButtonText: "Compare bonding clinics near me",
    metaTitle: "Composite Bonding Price in the UK — Compare Clinics | Pearlie",
    metaDescription:
      "How much does composite bonding cost in the UK? From £250 per tooth. Compare verified cosmetic dentists, see transparent pricing, and get matched free.",
    priceBreakdown: {
      heading: "Composite bonding cost breakdown",
      rows: [
        { tier: "Single tooth bonding", price: "£250 – £450", note: "Per tooth, chip repair or reshaping" },
        { tier: "Edge bonding (per tooth)", price: "£150 – £300", note: "Minor edge repairs" },
        { tier: "4 teeth (smile zone)", price: "£1,000 – £1,800", note: "Most popular option" },
        { tier: "6–8 teeth (full smile)", price: "£1,500 – £3,600", note: "Full smile enhancement" },
        { tier: "Smile design consultation", price: "£50 – £150", note: "Often deducted from treatment cost" },
      ],
      footnote: "Prices vary by dentist experience, case complexity, and location. London prices are typically at the higher end of these ranges.",
      contextParagraph: "Composite bonding is one of the most affordable cosmetic dental treatments available. Pricing is usually quoted per tooth, with discounts often available for treating multiple teeth in one session.",
      nhsNote: "Composite bonding for cosmetic purposes is not available on the NHS. However, chip or fracture repair may be partially covered under NHS Band 2 treatment (£77.50).",
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
      introParagraph: "Choosing between composite bonding and porcelain veneers? The right option depends on your goals, budget, and how long you want results to last.",
      outroParagraph: "Bonding is ideal if you want a quick, affordable improvement with minimal tooth preparation. Veneers are a better fit for patients seeking a long-term, comprehensive smile transformation.",
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
    whoIsThisFor: {
      personas: [
        "Patients with small chips, gaps, or uneven edges who want a quick, affordable fix",
        "Anyone considering a smile upgrade without the commitment or cost of porcelain veneers",
        "People wanting same-day cosmetic results with no drilling and minimal invasiveness",
        "Patients who want to 'test drive' a new smile before committing to permanent veneers",
      ],
      summary: "Composite bonding is the most conservative and affordable cosmetic dental treatment. It's ideal for subtle smile improvements and can often be completed in a single visit with no tooth preparation.",
    },
    timeline: {
      heading: "Your composite bonding journey",
      steps: [
        { label: "Consultation & smile design", description: "Your cosmetic dentist assesses your teeth, discusses goals, and plans the treatment. Photos and shade matching are done.", duration: "30–45 minutes" },
        { label: "Optional: teeth whitening", description: "If desired, whitening is completed first so the bonding composite can be matched to your lighter shade.", duration: "1–2 weeks before bonding" },
        { label: "Bonding appointment", description: "Composite resin is applied in layers, sculpted by hand, cured with a light, and polished to a natural finish.", duration: "1–2 hours" },
        { label: "Review & adjustments", description: "A short follow-up to check your bite and make any fine adjustments to shape or polish.", duration: "15–30 minutes" },
      ],
      totalDuration: "Usually completed in a single visit (1–2 hours)",
    },
    finance: {
      available: true,
      heading: "Composite bonding finance & payment options",
      options: [
        { label: "0% interest finance", detail: "Available at many clinics for treatments over £500, spread over 6–12 months" },
        { label: "Pay per tooth", detail: "Most clinics quote per tooth, making it easy to scale treatment to your budget" },
        { label: "Package pricing", detail: "Some clinics offer discounted rates for treating 4+ teeth in one session" },
      ],
      monthlyExample: "From £80/month for a 4-tooth smile enhancement",
      depositNote: "Many clinics require a consultation fee of £50–£150, often deducted from the treatment cost",
    },
    risks: {
      heading: "Risks & considerations",
      items: [
        { risk: "Staining over time", detail: "Composite resin is more prone to staining than porcelain. Avoid excessive coffee, tea, red wine, and smoking for best results." },
        { risk: "Chipping", detail: "Bonding can chip if you bite directly into hard foods or use your teeth as tools. A nightguard is recommended if you grind your teeth." },
        { risk: "Shorter lifespan than veneers", detail: "Composite bonding lasts 3–7 years versus 10–15+ years for porcelain veneers. Touch-ups or replacements may be needed." },
        { risk: "Technique-dependent results", detail: "The quality of bonding varies significantly between dentists. Choose a cosmetic dentist with a strong portfolio of bonding cases." },
      ],
      reassurance: "Composite bonding is one of the safest and most conservative cosmetic treatments available. It requires no drilling, preserves your natural tooth structure, and can be repaired or replaced without permanent changes to your teeth.",
    },
    ctaCopy: {
      hero: "Compare bonding clinics near me",
      mid: "Get a personalised bonding quote",
      bottom: "Find the right cosmetic dentist",
    },
    keyFacts: [
      "30–60 minutes per tooth",
      "No drilling required",
      "Same-day results",
      "From £250 per tooth",
    ],
  },

  veneers: {
    costIntentH1: "Porcelain Veneers Cost Per Tooth in London",
    heroSubheading:
      "Porcelain veneers cost £700 – £1,200 per tooth in the UK. A full smile makeover (6–10 veneers) ranges from £4,200 to £12,000. Compare verified cosmetic specialists and see transparent pricing.",
    ctaButtonText: "Compare veneer clinics near me",
    metaTitle: "Porcelain Veneers Cost Per Tooth in London | Pearlie",
    metaDescription:
      "How much do porcelain veneers cost in London? From £700 per tooth. Compare verified cosmetic specialists, see real pricing, and get matched free.",
    priceBreakdown: {
      heading: "Porcelain veneers cost breakdown",
      rows: [
        { tier: "Porcelain veneer (per tooth)", price: "£700 – £1,200", note: "Custom lab-crafted ceramic" },
        { tier: "Composite veneer (per tooth)", price: "£250 – £450", note: "Direct bonding alternative" },
        { tier: "4 veneers (front teeth)", price: "£2,800 – £4,800", note: "Upper front teeth only" },
        { tier: "6 veneers (smile zone)", price: "£4,200 – £7,200", note: "Most popular option" },
        { tier: "8–10 veneers (full smile)", price: "£5,600 – £12,000", note: "Complete smile transformation" },
        { tier: "Smile design consultation", price: "£50 – £200", note: "Digital planning and mock-ups" },
      ],
      footnote: "Prices depend on the number of veneers, the ceramist/lab used, case complexity, and clinic location. Finance options are widely available.",
      contextParagraph: "Veneer pricing is typically quoted per tooth, with the total cost depending on how many veneers are needed for your desired result. The quality of the ceramist and dental laboratory plays a significant role in both cost and outcome.",
      nhsNote: "Porcelain veneers are a private cosmetic treatment and are not available on the NHS. Most cosmetic clinics offer finance plans to make treatment more accessible.",
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
      introParagraph: "Veneers and crowns are both permanent restorations, but they serve different purposes. Understanding the distinction helps you make the right choice.",
      outroParagraph: "If your teeth are healthy but you want a cosmetic transformation, veneers are the appropriate choice. If teeth are damaged or weakened, crowns provide the structural support needed.",
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
    whoIsThisFor: {
      personas: [
        "Patients wanting a dramatic, long-lasting smile transformation with maximum aesthetic control",
        "Anyone with multiple cosmetic concerns (colour, shape, alignment) who wants a comprehensive solution",
        "Patients who've considered composite bonding but want greater durability and stain resistance",
        "People comparing veneer specialists and wanting to understand pricing, process, and quality differences",
      ],
      summary: "Porcelain veneers are the gold standard for cosmetic smile makeovers. They offer superior aesthetics, durability, and stain resistance, making them ideal for patients seeking a long-term, transformative result.",
    },
    timeline: {
      heading: "Your porcelain veneers journey",
      steps: [
        { label: "Consultation & smile design", description: "Assessment, digital smile design, and treatment planning. Some clinics offer wax mock-ups or temporary previews so you can see the shape before committing.", duration: "45–60 minutes" },
        { label: "Tooth preparation", description: "A thin layer of enamel (0.3–0.7mm) is removed. Impressions or digital scans are taken and sent to the laboratory.", duration: "1–2 hours" },
        { label: "Temporary veneers", description: "While your permanent veneers are crafted, temporary veneers protect your teeth and preview the final shape.", duration: "1–2 weeks wait" },
        { label: "Laboratory fabrication", description: "A specialist ceramist handcrafts each veneer from porcelain, matching shade, shape, and translucency to the agreed design.", duration: "1–2 weeks" },
        { label: "Fitting & bonding", description: "Permanent veneers are tried in, adjusted, and bonded with specialist dental cement. Final polishing completes the transformation.", duration: "1–2 hours" },
      ],
      totalDuration: "2–4 weeks from preparation to final fitting",
    },
    finance: {
      available: true,
      heading: "Veneer finance & payment options",
      options: [
        { label: "0% interest finance", detail: "Spread the cost over 12–24 months at most cosmetic clinics" },
        { label: "Extended finance", detail: "Longer plans over 3–5 years with interest, for full smile makeovers" },
        { label: "Staged payments", detail: "Pay a deposit at consultation and balance at fitting" },
      ],
      monthlyExample: "From £200/month for a 6-veneer smile makeover",
      depositNote: "Typical deposits range from 10–30% of the total treatment cost",
    },
    risks: {
      heading: "Risks & considerations",
      items: [
        { risk: "Permanent enamel removal", detail: "Veneers require removing 0.3–0.7mm of enamel. This is irreversible — your teeth will always need veneers or crowns going forward." },
        { risk: "Sensitivity after preparation", detail: "Temporary sensitivity to hot and cold is common after tooth preparation. This usually resolves within a few weeks." },
        { risk: "Chipping or fracture", detail: "While durable, porcelain veneers can chip if you bite into very hard objects or grind your teeth without a nightguard." },
        { risk: "Colour mismatch over time", detail: "Natural teeth may discolour with age while veneers retain their shade. Whitening natural teeth periodically can maintain consistency." },
        { risk: "Replacement needed eventually", detail: "Even with excellent care, veneers typically need replacing after 10–15+ years due to normal wear or gum line changes." },
      ],
      reassurance: "Porcelain veneers have a strong track record spanning decades. When placed by an experienced cosmetic dentist using a quality laboratory, they deliver predictable, long-lasting results. A thorough consultation and smile design process minimises risks and ensures you're confident before committing.",
    },
    ctaCopy: {
      hero: "Compare veneer clinics near me",
      mid: "Get a personalised veneer quote",
      bottom: "Find your ideal veneer specialist",
    },
    keyFacts: [
      "10–25 year lifespan",
      "2–3 visits to complete",
      "Natural-looking results",
      "From £700 per tooth",
    ],
  },

  "teeth-whitening": {
    costIntentH1: "Teeth Whitening Cost in London & UK",
    heroSubheading:
      "Professional teeth whitening in the UK costs £250 – £1,000 depending on the method. Compare in-chair, take-home, and premium whitening systems at verified clinics near you.",
    ctaButtonText: "Compare whitening clinics near me",
    metaTitle: "Teeth Whitening Cost in London & UK | Pearlie",
    metaDescription:
      "How much does teeth whitening cost? From £250 for home kits to £1,000 for Enlighten. Compare verified whitening clinics in London and the UK.",
    priceBreakdown: {
      heading: "Teeth whitening cost breakdown",
      rows: [
        { tier: "Home whitening (custom trays)", price: "£250 – £400", note: "1–3 weeks, 2–6 shades lighter" },
        { tier: "In-chair whitening (Zoom)", price: "£400 – £600", note: "1 visit, 4–8 shades lighter" },
        { tier: "Boutique Whitening", price: "£300 – £500", note: "Custom trays, low sensitivity" },
        { tier: "Enlighten Whitening", price: "£600 – £1,000", note: "Guaranteed B1 shade, gold standard" },
        { tier: "Combo (home + in-chair)", price: "£500 – £800", note: "Best of both approaches" },
        { tier: "Top-up gel refills", price: "£30 – £80", note: "Per syringe, for maintenance" },
      ],
      footnote: "Most clinic prices include consultation, custom trays, whitening gel, and follow-up. Always confirm what's included before booking.",
      contextParagraph: "Whitening costs depend primarily on the method chosen. Home kits with custom trays are the most affordable professional option, while premium systems like Enlighten deliver the most dramatic results with a shade guarantee.",
      nhsNote: "Teeth whitening is classified as a cosmetic procedure and is not available on the NHS. It must be performed by or under the supervision of a GDC-registered dental professional.",
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
      introParagraph: "The two main professional whitening approaches suit different needs and budgets. Here's how in-chair and take-home options compare.",
      outroParagraph: "Many patients achieve the best results by combining both methods — starting with home trays and finishing with an in-chair session. Your dentist can recommend the right approach for your goals.",
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
    whoIsThisFor: {
      personas: [
        "Anyone wanting a brighter, whiter smile through a safe, dentist-supervised treatment",
        "Patients with yellow or surface staining from coffee, tea, wine, or smoking",
        "People preparing for a special event (wedding, job interview) who want fast results",
        "Patients who've completed Invisalign or other dental work and want to finish with whitening",
      ],
      summary: "Professional teeth whitening is the most popular cosmetic dental treatment in the UK. It safely lightens your natural tooth colour using regulated peroxide gels, supervised by a GDC-registered dentist.",
    },
    timeline: {
      heading: "Your whitening journey",
      steps: [
        { label: "Consultation & shade assessment", description: "Your dentist checks suitability, assesses your current shade, and recommends the best whitening system for your goals.", duration: "20–30 minutes" },
        { label: "Custom tray fabrication", description: "If using home or combo whitening, digital scans or impressions are taken to create your custom-fitted whitening trays.", duration: "3–7 days" },
        { label: "Home whitening phase", description: "Wear your custom trays with whitening gel daily (or nightly) for 1–3 weeks. Gradual lightening with lower sensitivity.", duration: "1–3 weeks" },
        { label: "In-chair session (if applicable)", description: "A single in-chair session with high-concentration gel for maximum results. Used alone or as a final boost after home whitening.", duration: "60–90 minutes" },
        { label: "Maintenance top-ups", description: "Use your custom trays with top-up gel every 6–12 months to maintain brightness.", duration: "Ongoing" },
      ],
      totalDuration: "1–3 weeks for initial treatment, then periodic top-ups",
    },
    finance: {
      available: true,
      heading: "Whitening finance & payment options",
      options: [
        { label: "Pay in full", detail: "Most whitening treatments are affordable enough to pay upfront (£250–£1,000)" },
        { label: "0% interest finance", detail: "Available at some clinics for premium treatments like Enlighten" },
        { label: "Package deals", detail: "Some clinics offer whitening bundled with other cosmetic treatments at a reduced rate" },
      ],
      monthlyExample: "From £50/month for Enlighten whitening on finance",
    },
    risks: {
      heading: "Risks & considerations",
      items: [
        { risk: "Temporary tooth sensitivity", detail: "The most common side effect. Usually mild and resolves within 24–48 hours. Desensitising toothpaste before treatment can help." },
        { risk: "Gum irritation", detail: "Whitening gel can irritate gums if trays don't fit properly or gel overflows. Custom-fitted trays minimise this risk." },
        { risk: "Uneven results", detail: "Natural variations in enamel thickness can cause slightly uneven whitening. Existing fillings and crowns won't change colour." },
        { risk: "Results are not permanent", detail: "Whitening results fade over 6–24 months depending on diet and lifestyle. Regular top-ups maintain brightness." },
      ],
      reassurance: "Professional whitening supervised by a GDC-registered dentist is one of the safest cosmetic treatments available. Side effects are almost always mild and temporary. Your dentist will assess suitability and recommend sensitivity management if needed.",
    },
    ctaCopy: {
      hero: "Compare whitening clinics near me",
      mid: "Get a personalised whitening quote",
      bottom: "Find a safe, verified whitening clinic",
    },
    keyFacts: [
      "Up to 8 shades brighter",
      "60–90 minute treatment",
      "1–3 years results last",
      "From £250",
    ],
  },

  "dental-implants": {
    costIntentH1: "Dental Implant Cost in London — Price Guide & Clinics",
    heroSubheading:
      "A single dental implant in the UK costs £2,000 – £3,500 (post, abutment, and crown). Full arch All-on-4 ranges from £8,000 to £15,000 per arch. Compare verified implant specialists near you.",
    ctaButtonText: "Compare implant clinics near me",
    metaTitle: "Dental Implant Cost in London — Price Guide & Clinics | Pearlie",
    metaDescription:
      "How much do dental implants cost in London? Single implants from £2,000. Full arch from £8,000. Compare verified implant specialists and see transparent pricing.",
    priceBreakdown: {
      heading: "Dental implant cost breakdown",
      rows: [
        { tier: "Single implant (post + abutment + crown)", price: "£2,000 – £3,500", note: "Most common procedure" },
        { tier: "Implant-supported bridge (2 implants)", price: "£4,000 – £6,000", note: "Replaces 3–4 adjacent teeth" },
        { tier: "All-on-4 (full arch)", price: "£8,000 – £15,000", note: "Per arch, 4 implants + fixed bridge" },
        { tier: "All-on-6 (full arch)", price: "£10,000 – £18,000", note: "Per arch, 6 implants + fixed bridge" },
        { tier: "Bone graft (if required)", price: "£300 – £800", note: "Adds 3–6 months to timeline" },
        { tier: "CBCT scan", price: "£100 – £250", note: "3D planning scan, sometimes included" },
      ],
      footnote: "Prices are confirmed after clinical assessment. Central London clinics typically charge 20–40% more than regional practices. Finance options are widely available.",
      contextParagraph: "Implant costs vary significantly depending on whether you need a single tooth replacement or a full arch solution. The type of restoration, bone condition, and implant brand all influence the final price.",
      nhsNote: "Dental implants are almost always a private treatment. NHS provision is limited to exceptional clinical cases such as congenital defects or tooth loss from head and neck cancer treatment.",
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
      introParagraph: "When replacing missing teeth, you have three main options. Each varies in cost, longevity, and impact on surrounding teeth and bone.",
      outroParagraph: "For most patients, dental implants offer the best long-term value and quality of life. Your implant specialist can advise which option suits your clinical situation and budget.",
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
    whoIsThisFor: {
      personas: [
        "Patients with one or more missing teeth looking for a permanent, natural-feeling replacement",
        "Denture wearers frustrated with slipping, discomfort, or dietary restrictions",
        "Anyone who has lost a tooth due to decay, gum disease, or injury and wants to prevent bone loss",
        "Patients comparing implant specialists and wanting transparent pricing before consultation",
      ],
      summary: "Dental implants are the gold standard for replacing missing teeth. They look, feel, and function like natural teeth, prevent jawbone loss, and can last a lifetime with proper care.",
    },
    timeline: {
      heading: "Your dental implant journey",
      steps: [
        { label: "Consultation & 3D scan", description: "A CBCT scan evaluates bone density and maps precise implant placement. You receive a detailed treatment plan with full costs.", duration: "45–60 minutes" },
        { label: "Bone grafting (if needed)", description: "If jawbone density is insufficient, a bone graft builds up the area. The graft heals before implant placement.", duration: "3–6 months healing" },
        { label: "Implant placement", description: "The titanium post is surgically placed into the jawbone under local anaesthetic. A healing cap or temporary tooth is placed.", duration: "1–2 hours per implant" },
        { label: "Healing (osseointegration)", description: "The implant fuses with your jawbone over several months. You may wear a temporary crown during this period.", duration: "2–6 months" },
        { label: "Final crown placement", description: "Once the implant is fully integrated, the abutment and permanent custom crown are fitted and colour-matched to your natural teeth.", duration: "1–2 hours" },
      ],
      totalDuration: "3–9 months from consultation to final crown",
    },
    finance: {
      available: true,
      heading: "Implant finance & payment options",
      options: [
        { label: "0% interest finance", detail: "Spread the cost of a single implant over 12–24 months at most clinics" },
        { label: "Extended finance", detail: "Longer plans over 3–5 years with interest, suitable for full arch treatments" },
        { label: "Staged payments", detail: "Pay at each treatment milestone: consultation, placement, and crown fitting" },
      ],
      monthlyExample: "From £80/month for a single dental implant",
      depositNote: "Most clinics require a deposit at consultation, with the balance split across treatment stages",
    },
    risks: {
      heading: "Risks & considerations",
      items: [
        { risk: "Implant failure", detail: "Implant failure rates are low (2–5%) but can occur if the implant doesn't integrate with bone. Smoking, uncontrolled diabetes, and poor hygiene increase risk." },
        { risk: "Infection", detail: "Post-surgical infection is possible but uncommon with proper sterile technique and aftercare. Antibiotics may be prescribed preventatively." },
        { risk: "Nerve damage", detail: "Rare but possible, particularly in the lower jaw. Careful 3D planning with CBCT scans minimises this risk." },
        { risk: "Bone loss around implant", detail: "Peri-implantitis (gum disease around implants) can occur without proper oral hygiene. Regular dental check-ups are essential." },
        { risk: "Extended timeline", detail: "The full process takes 3–9 months. Patients needing bone grafts may wait 6–12 months from start to finish." },
      ],
      reassurance: "Dental implants have a success rate of 95–98% when placed by experienced clinicians. Modern 3D planning, sterile surgical protocols, and premium implant systems minimise risks. Your specialist will assess your suitability thoroughly and discuss any concerns at your consultation.",
    },
    ctaCopy: {
      hero: "Compare implant clinics near me",
      mid: "Get a personalised implant quote",
      bottom: "Find the right implant specialist",
    },
    keyFacts: [
      "25+ year lifespan",
      "Looks & feels like a real tooth",
      "98% success rate",
      "From £2,000",
    ],
  },
}
