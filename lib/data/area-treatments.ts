/**
 * Area × Treatment data for programmatic SEO.
 *
 * This module maps each London borough to treatment-specific insights
 * so pages like /london/islington/invisalign have genuinely unique
 * content — not just "Invisalign" + "Islington" templated in.
 *
 * Only boroughs where we have real differentiation get entries.
 * Others fall back to a sensible default derived from the borough
 * and treatment data.
 */

import { getAllTreatments, type TreatmentMeta } from "@/lib/content/treatments"
import {
  LONDON_BOROUGHS,
  type LondonBorough,
} from "@/lib/data/london-boroughs"

export interface AreaFAQ {
  question: string
  answer: string
}

export interface EducationalSection {
  heading: string
  body: string
}

export interface AreaTreatmentData {
  /** Unique intro paragraph for this borough + treatment combo */
  localInsight: string
  /** Area-specific price context (e.g. "slightly above London average") */
  priceContext: string
  /** Local demand signal (what makes this area special for this treatment) */
  demandSignal: string
  /** "Why choose [treatment] in [borough]" paragraph with local SEO signals */
  whyChoose: string
  /** Short educational sections (3-4) about the treatment, adapted for local context */
  educationalSections: EducationalSection[]
  /** Staggered publish date for this specific page */
  publishedAt: string
  updatedAt: string
  /** Area-specific FAQs prepended before the treatment's generic FAQs */
  areaFaqs?: AreaFAQ[]
}

/**
 * Treatment-specific educational sections used by the default generator.
 * These provide concise, non-duplicate content for borough+treatment pages.
 */
const TREATMENT_EDUCATIONAL: Record<string, EducationalSection[]> = {
  invisalign: [
    {
      heading: "How Invisalign works",
      body: "Invisalign uses a series of custom-made, virtually invisible aligners to gradually straighten your teeth. Each set of aligners is worn for 1–2 weeks before moving to the next, gently shifting teeth into the planned position. Treatment is monitored with regular check-ups every 6–8 weeks.",
    },
    {
      heading: "Who is suitable for Invisalign",
      body: "Invisalign can treat mild to complex orthodontic cases including crowding, spacing, overbites, underbites, and crossbites. A dentist will assess your suitability during a consultation, often using a 3D iTero scan to show your projected results before treatment begins.",
    },
    {
      heading: "Treatment duration",
      body: "Most Invisalign treatments take 6–18 months, depending on the complexity of your case. Simple cases like minor crowding may be completed in as little as 3–6 months with Invisalign Lite. You'll need to wear your aligners for 20–22 hours per day for optimal results.",
    },
    {
      heading: "Finance options",
      body: "Many clinics offer 0% interest-free finance over 12–24 months, making Invisalign accessible from around £100–£200 per month. Some practices also offer pay-as-you-go aligner plans. Always confirm what's included in the quoted price — retainers, refinements, and follow-up appointments can vary.",
    },
  ],
  "dental-implants": [
    {
      heading: "How dental implants work",
      body: "A dental implant is a small titanium post surgically placed into the jawbone, where it fuses with the bone over 3–6 months (osseointegration). Once healed, a custom crown is attached to the implant, creating a permanent replacement that looks and functions like a natural tooth.",
    },
    {
      heading: "Who is suitable for implants",
      body: "Most adults with good general health are suitable for dental implants. You'll need adequate jawbone density — if bone has been lost, a bone graft may be needed first. Smokers and patients with uncontrolled diabetes may face higher risks, which your implantologist will discuss during assessment.",
    },
    {
      heading: "Treatment timeline",
      body: "From consultation to final crown, dental implant treatment typically takes 4–9 months. Same-day implants (immediate loading) are available for some patients, but most cases require a healing period between implant placement and crown fitting.",
    },
    {
      heading: "Finance and payment plans",
      body: "Due to the higher cost of implants, many clinics offer staged payment plans aligned with the treatment timeline. Interest-free finance over 12–24 months is widely available. Some clinics offer all-inclusive packages covering consultation, surgery, and final restoration.",
    },
  ],
  "teeth-whitening": [
    {
      heading: "How professional whitening works",
      body: "Professional teeth whitening uses higher-concentration hydrogen peroxide or carbamide peroxide gels than over-the-counter products. In-chair treatments like Philips Zoom use light activation for results in about an hour, while take-home kits use custom trays worn overnight for 1–2 weeks.",
    },
    {
      heading: "Who is suitable for whitening",
      body: "Most adults with healthy teeth and gums are suitable for professional whitening. It works best on yellowed teeth from aging, food, or drink stains. Crowns, veneers, and fillings won't change colour with whitening. Your dentist will assess suitability and recommend the best system.",
    },
    {
      heading: "How long results last",
      body: "Professional whitening results typically last 1–3 years, depending on diet and habits. Coffee, red wine, and smoking can reduce longevity. Many patients use top-up kits every 6–12 months to maintain their shade. Custom home trays make ongoing maintenance straightforward.",
    },
    {
      heading: "Safety and sensitivity",
      body: "Professional whitening is safe when performed by a GDC-registered dentist. Temporary sensitivity during or after treatment is common but usually resolves within a few days. Desensitising toothpaste used before treatment can help minimise discomfort.",
    },
  ],
  "composite-bonding": [
    {
      heading: "How composite bonding works",
      body: "Composite bonding involves applying tooth-coloured resin directly to your teeth, shaping it to improve appearance, then hardening it with a UV light. The entire process is usually completed in a single visit with no drilling or anaesthetic required for most cases.",
    },
    {
      heading: "Who is suitable for bonding",
      body: "Composite bonding is ideal for repairing chips, closing small gaps, reshaping uneven teeth, and improving tooth colour. It's best suited to patients with generally healthy teeth who want cosmetic improvement without the commitment of porcelain veneers.",
    },
    {
      heading: "Longevity and maintenance",
      body: "Well-maintained composite bonding typically lasts 5–7 years. Avoid biting nails, opening packaging with teeth, or chewing hard foods directly on bonded teeth. Regular dental hygiene appointments with polishing help maintain the finish and extend lifespan.",
    },
    {
      heading: "Bonding vs veneers",
      body: "Composite bonding costs £150–£400 per tooth and is reversible, while porcelain veneers cost £400–£1,200 per tooth and require enamel removal. Bonding is an excellent first step for patients exploring cosmetic options — you can always upgrade to veneers later.",
    },
  ],
  veneers: [
    {
      heading: "How veneers work",
      body: "Porcelain veneers are thin shells custom-made to cover the front surface of teeth. The process involves removing a thin layer of enamel (0.3–0.5mm), taking impressions, and fitting temporary veneers while the permanent ones are crafted in a dental laboratory. Final fitting typically takes 2–3 appointments.",
    },
    {
      heading: "Who is suitable for veneers",
      body: "Veneers are suitable for patients with discoloured, chipped, misaligned, or worn teeth who want a significant cosmetic improvement. You need healthy underlying teeth and gums. Patients who grind their teeth may need a night guard to protect veneers.",
    },
    {
      heading: "Types of veneers",
      body: "Porcelain veneers offer the most natural look and last 10–15 years. Composite veneers are more affordable and can be done in one visit but typically last 5–7 years. Minimal-prep veneers (like Lumineers) require less enamel removal but aren't suitable for all cases.",
    },
    {
      heading: "Aftercare and longevity",
      body: "Porcelain veneers with proper care last 10–15 years or longer. Maintain them with regular brushing, flossing, and dental check-ups. Avoid using teeth as tools and consider a night guard if you grind. Most clinics include a warranty period with their veneer treatments.",
    },
  ],
  "emergency-dental": [
    {
      heading: "What counts as a dental emergency",
      body: "Dental emergencies include severe toothache, knocked-out or broken teeth, abscesses (facial swelling), uncontrolled bleeding after extraction, and damage to dental work. If swelling affects your breathing or you have a high fever, go to A&E immediately.",
    },
    {
      heading: "What to do before your appointment",
      body: "For a knocked-out tooth, keep it moist in milk and see a dentist within 30 minutes. For severe pain, take over-the-counter painkillers (ibuprofen is usually most effective). For swelling, apply a cold compress to the outside of your cheek. Avoid aspirin directly on gums.",
    },
    {
      heading: "NHS vs private emergency care",
      body: "NHS emergency dental care costs £26.80 (Band 1). Access is through NHS 111 or walk-in dental emergency departments. Private emergency appointments typically cost £50–£150 for assessment, with treatment costs additional. Private practices often offer same-day availability.",
    },
    {
      heading: "Preventing dental emergencies",
      body: "Regular dental check-ups help identify problems before they become emergencies. Wear a mouthguard for contact sports. Address tooth sensitivity or minor pain early — most emergencies develop from untreated issues. Keep your dentist's emergency contact details saved in your phone.",
    },
  ],
}

/**
 * Hand-written overrides for high-value borough+treatment combos.
 * Key format: "borough-slug:treatment-slug"
 */
const OVERRIDES: Record<string, AreaTreatmentData> = {
  // ── Westminster ───────────────────────────────────
  "westminster:invisalign": {
    localInsight:
      "Westminster's Harley Street corridor is home to some of the UK's highest-rated Invisalign Diamond and Platinum providers. Patients here benefit from access to practitioners who handle 200+ cases per year, often with in-house iTero scanning and same-day attachment bonding.",
    priceContext:
      "Invisalign prices in Westminster tend to sit at the premium end (£3,500–£5,500) due to Harley Street overheads, though clinics on nearby Marylebone High Street can be 10–15% lower.",
    demandSignal:
      "High demand from Westminster's professional population seeking discreet orthodontics. Lunchtime check-ups at Harley Street clinics are a common search pattern.",
    whyChoose:
      "Many patients in Westminster choose Invisalign for discreet orthodontic treatment that fits around busy professional schedules. Clinics near Harley Street, Oxford Circus and Victoria station in the W1 and SW1 postcode areas offer flexible lunchtime and after-work appointments, while Marylebone High Street provides slightly more affordable options just minutes away.",
    educationalSections: TREATMENT_EDUCATIONAL["invisalign"],
    publishedAt: "2026-01-16",
    updatedAt: "2026-02-20",
    areaFaqs: [
      {
        question: "Are Harley Street Invisalign providers more expensive?",
        answer:
          "Harley Street Invisalign providers typically charge £3,500 to £5,500 — about 15–25% above the London average. However, many are Diamond or Platinum providers handling 200+ cases per year, which often means more accurate treatment planning and fewer refinement rounds. Clinics on nearby Marylebone High Street can be 10–15% lower while still offering high-tier providers.",
      },
      {
        question: "Can I get Invisalign check-ups during a lunch break in Westminster?",
        answer:
          "Yes. Multiple Westminster clinics near Oxford Circus and Victoria offer 30-minute Invisalign check-up appointments designed for working professionals. Initial consultations typically take 45–60 minutes, but routine aligner check-ups are shorter and can fit into a lunch break.",
      },
    ],
  },
  "westminster:teeth-whitening": {
    localInsight:
      "Teeth whitening in Westminster ranges from express in-chair sessions near Oxford Street to bespoke Boutique Whitening protocols on Harley Street. The density of cosmetic clinics means patients can often get same-week appointments.",
    priceContext:
      "Expect to pay £300–£800 for professional whitening in Westminster — at the higher end of the London range, but with access to premium Philips Zoom and Enlighten systems.",
    demandSignal:
      "Westminster sees peak whitening searches before wedding season (April–June) and Christmas party season. Clinics near Mayfair report 40% of whitening patients are first-time cosmetic dental patients.",
    whyChoose:
      "Westminster offers the widest choice of professional whitening systems in London. Whether you prefer a quick in-chair Zoom session near Oxford Street during a lunch break, or a premium Enlighten protocol on Harley Street in the W1 area, clinics across the SW1 and WC2 postcodes provide convenient access via Victoria, Paddington and Oxford Circus stations.",
    educationalSections: TREATMENT_EDUCATIONAL["teeth-whitening"],
    publishedAt: "2026-01-18",
    updatedAt: "2026-02-21",
    areaFaqs: [
      {
        question: "Which teeth whitening systems are available in Westminster?",
        answer:
          "Westminster clinics commonly offer Philips Zoom (in-chair, 1 hour), Enlighten Evolution (combination home + in-chair), and Boutique Whitening (home kit). Harley Street practices tend to stock all three systems, letting your dentist recommend the best option for your tooth shade and sensitivity level.",
      },
      {
        question: "How quickly can I get teeth whitening in Westminster?",
        answer:
          "Many Westminster clinics offer same-week or even same-day in-chair whitening appointments due to the high density of cosmetic practices. Express Zoom sessions take about 1 hour. Home whitening kits require a mould appointment first, with the kit ready within a few days.",
      },
    ],
  },
  "westminster:dental-implants": {
    localInsight:
      "Westminster's Harley Street has the highest concentration of implantologists in the UK. Many offer guided surgery with 3D CBCT scanning, and several are teaching faculty at the Royal College of Surgeons.",
    priceContext:
      "Single implant prices in Westminster range from £2,500 to £6,000, reflecting the specialist expertise available. All-on-4 full arch solutions start from around £12,000.",
    demandSignal:
      "Patients travel from across London and the UK for implant treatment in Westminster due to the specialist reputation. Second-opinion consultations are a frequent search intent.",
    whyChoose:
      "Westminster's Harley Street and Marylebone area in the W1 postcode is the UK's foremost destination for dental implants. With access to specialist implantologists near Oxford Circus and Great Portland Street stations, patients benefit from guided surgery with 3D CBCT scanning and practitioners who are often teaching faculty at the Royal College of Surgeons.",
    educationalSections: TREATMENT_EDUCATIONAL["dental-implants"],
    publishedAt: "2026-01-20",
    updatedAt: "2026-02-22",
    areaFaqs: [
      {
        question: "Why do patients travel to Westminster for dental implants?",
        answer:
          "Westminster's Harley Street has the UK's highest concentration of specialist implantologists, many of whom are teaching faculty at the Royal College of Surgeons. Patients travel for access to guided surgery with 3D CBCT scanning, experienced surgeons handling complex cases, and the ability to get second opinions from multiple specialists in one area.",
      },
      {
        question: "What is the cost of All-on-4 dental implants in Westminster?",
        answer:
          "All-on-4 full arch implant solutions in Westminster typically start from around £12,000 per arch. This reflects the specialist expertise and premium lab work available in the Harley Street area. Some clinics offer staged payment plans over the treatment period.",
      },
    ],
  },

  // ── Islington ─────────────────────────────────────
  "islington:invisalign": {
    localInsight:
      "Islington's Angel and Upper Street area has become a hotspot for Invisalign providers competing on price and service. Several clinics offer free 3D scanning consultations, making it easy to compare treatment plans before committing.",
    priceContext:
      "Invisalign prices in Islington are competitive, typically £2,500–£4,500 — below the central London average. Several clinics offer 0% finance over 12–24 months.",
    demandSignal:
      "Islington's 25–40 age demographic drives some of the highest Invisalign search volumes in north London. 'Invisalign Angel' and 'clear aligners Upper Street' are frequent local search terms.",
    whyChoose:
      "Many patients in Islington choose Invisalign for discreet orthodontic treatment that fits their lifestyle. Clinics near Angel tube station and along Upper Street in the N1 postcode area offer competitive pricing and free iTero 3D scan consultations. With Highbury & Islington and Holloway Road stations nearby, multiple providers are easily accessible for regular aligner check-ups.",
    educationalSections: TREATMENT_EDUCATIONAL["invisalign"],
    publishedAt: "2026-01-26",
    updatedAt: "2026-02-23",
    areaFaqs: [
      {
        question: "Which area in Islington has the most Invisalign providers?",
        answer:
          "The highest concentration of Invisalign providers in Islington is along Upper Street and around Angel tube station. Several clinics here offer free iTero 3D scan consultations, letting you compare treatment plans from multiple providers before committing — often within walking distance of each other.",
      },
      {
        question: "Can I get 0% finance on Invisalign in Islington?",
        answer:
          "Yes. Several Islington clinics offer 0% interest-free finance on Invisalign over 12–24 months. With prices starting from around £2,500, monthly payments can be as low as £105–£190 depending on the plan length and treatment complexity.",
      },
    ],
  },
  "islington:composite-bonding": {
    localInsight:
      "Composite bonding has become one of the most requested cosmetic treatments in Islington, with several clinics specialising in same-day smile makeovers. The treatment's affordability compared to veneers makes it particularly popular here.",
    priceContext:
      "Composite bonding in Islington typically costs £150–£350 per tooth — mid-range for London. Multi-tooth packages (4–6 teeth) with discounted rates are commonly offered.",
    demandSignal:
      "Instagram-driven demand is high in Islington's younger demographic. 'Composite bonding before and after' and 'tooth bonding near Angel' are trending local search terms.",
    whyChoose:
      "Islington's Angel and Upper Street area in the N1 postcode has become a hub for cosmetic bonding, with multiple clinics offering same-day smile makeovers. The area's younger professional demographic near Highbury & Islington and Canonbury makes it a competitive market, keeping prices affordable and service standards high.",
    educationalSections: TREATMENT_EDUCATIONAL["composite-bonding"],
    publishedAt: "2026-01-28",
    updatedAt: "2026-02-24",
    areaFaqs: [
      {
        question: "Is composite bonding cheaper than veneers in Islington?",
        answer:
          "Yes, significantly. Composite bonding in Islington costs £150–£350 per tooth compared to £400–£1,200 per tooth for porcelain veneers. Bonding is also reversible and done in a single visit, making it a popular first step for patients exploring cosmetic improvements.",
      },
      {
        question: "Can I get a same-day smile makeover with bonding in Islington?",
        answer:
          "Yes. Several Islington clinics near Angel specialise in same-day composite bonding smile makeovers covering 4–8 teeth in a single appointment. These typically take 2–4 hours and results are immediate. Multi-tooth package discounts are commonly offered.",
      },
    ],
  },

  // ── Southwark ─────────────────────────────────────
  "southwark:emergency-dental": {
    localInsight:
      "Southwark has some of the best emergency dental access in London thanks to Guy's Hospital on St Thomas Street, which operates a walk-in dental emergency department. Several private practices near London Bridge also offer same-day emergency slots.",
    priceContext:
      "Emergency dental assessments in Southwark range from £50 to £150 privately. Guy's Hospital provides NHS emergency care at Band 1 rates (£26.80).",
    demandSignal:
      "High search volume for emergency dentistry due to Guy's Hospital proximity. 'Emergency dentist London Bridge' and 'dental A&E near me' are top local queries.",
    whyChoose:
      "Southwark offers some of London's best emergency dental access. Guy's Hospital on St Thomas Street near London Bridge station in the SE1 postcode area operates a walk-in dental emergency department. Private practices around Bermondsey and Elephant & Castle also hold same-day emergency slots for patients who need urgent dental care in south London.",
    educationalSections: TREATMENT_EDUCATIONAL["emergency-dental"],
    publishedAt: "2026-01-21",
    updatedAt: "2026-02-20",
    areaFaqs: [
      {
        question: "Can I walk into Guy's Hospital for a dental emergency?",
        answer:
          "Yes. Guy's Hospital on St Thomas Street operates a walk-in dental emergency department. NHS patients are seen at Band 1 rates (£26.80). Wait times vary but are typically 1–3 hours. For non-NHS patients, several private practices near London Bridge also hold same-day emergency slots.",
      },
      {
        question: "What should I do about a dental emergency at night in Southwark?",
        answer:
          "For out-of-hours dental emergencies in Southwark, call NHS 111 first. They can direct you to the nearest out-of-hours dental service. Guy's Hospital A&E can handle severe cases such as uncontrolled bleeding or facial swelling affecting breathing. For next-day urgent appointments, several Bermondsey and London Bridge practices hold morning emergency slots.",
      },
    ],
  },
  "southwark:dental-implants": {
    localInsight:
      "King's College Hospital and Guy's Hospital make Southwark a centre of excellence for dental implants in south London. Several former hospital consultants now run private implant practices in the London Bridge area.",
    priceContext:
      "Implant prices in Southwark are competitive at £2,000–£4,500 per single implant, benefiting from proximity to teaching hospitals that drive specialist availability.",
    demandSignal:
      "Patients from across south-east London travel to Southwark for implants due to the specialist concentration. 'Dental implants London Bridge' has high commercial search intent.",
    whyChoose:
      "Southwark's London Bridge and Bermondsey area in the SE1 postcode benefits from proximity to Guy's Hospital and King's College Hospital, two of the UK's leading dental teaching institutions. Former hospital consultants run private implant practices near London Bridge and Elephant & Castle stations, offering specialist expertise at competitive south London prices.",
    educationalSections: TREATMENT_EDUCATIONAL["dental-implants"],
    publishedAt: "2026-01-23",
    updatedAt: "2026-02-21",
    areaFaqs: [
      {
        question: "Why are dental implants more affordable in Southwark than central London?",
        answer:
          "Southwark benefits from proximity to Guy's Hospital and King's College Hospital, both major dental teaching institutions. This creates a pipeline of experienced implantologists who set up private practices nearby, increasing competition and keeping prices competitive at £2,000–£4,500 per single implant versus £2,500–£6,000 in Westminster.",
      },
      {
        question: "Can I get a second opinion on dental implants near London Bridge?",
        answer:
          "Yes. The concentration of implant specialists around London Bridge makes it easy to get second opinions. Several practices offer free or low-cost implant consultations with 3D CBCT scanning, and the area has specialists experienced in complex cases including bone grafting and sinus lifts.",
      },
    ],
  },

  // ── Kensington and Chelsea ────────────────────────
  "kensington-and-chelsea:veneers": {
    localInsight:
      "Kensington and Chelsea is London's premier destination for porcelain veneers, with multiple clinics offering bespoke smile design using digital workflows. Several practitioners here are recognised as UK leaders in minimally-invasive veneer techniques.",
    priceContext:
      "Porcelain veneers in Kensington and Chelsea typically cost £800–£1,200 per tooth — at the premium end for London. However, the quality of lab work and clinical expertise justifies the investment for many patients.",
    demandSignal:
      "International patients frequently seek veneers in this borough. 'Veneers Chelsea', 'smile makeover Kensington', and 'porcelain veneers London' are high-value local search terms.",
    whyChoose:
      "Kensington and Chelsea is London's premier destination for porcelain veneers. Clinics near Sloane Square, South Kensington and High Street Kensington stations in the SW3, SW7 and W8 postcodes offer bespoke smile design with digital workflows. The area attracts both local residents and international patients seeking the UK's leading minimally-invasive veneer specialists.",
    educationalSections: TREATMENT_EDUCATIONAL["veneers"],
    publishedAt: "2026-01-17",
    updatedAt: "2026-02-21",
    areaFaqs: [
      {
        question: "Why are veneers more expensive in Kensington and Chelsea?",
        answer:
          "Porcelain veneers in Kensington and Chelsea typically cost £800–£1,200 per tooth, reflecting higher practice overheads and access to premium dental laboratories. Many clinics here use bespoke smile design workflows with digital mock-ups and work with London's top ceramists. For patients prioritising craftsmanship and minimally-invasive techniques, the premium can represent good value.",
      },
      {
        question: "Do Kensington clinics offer composite veneers as a cheaper alternative?",
        answer:
          "Some Kensington and Chelsea clinics offer composite veneers at £400–£600 per tooth as an alternative to porcelain. However, the area specialises in porcelain work. If budget is a primary concern, neighbouring boroughs like Hammersmith and Fulham offer competitive porcelain veneer pricing.",
      },
    ],
  },

  // ── Tower Hamlets ─────────────────────────────────
  "tower-hamlets:teeth-whitening": {
    localInsight:
      "Tower Hamlets offers teeth whitening at two ends of the market — premium clinics in Canary Wharf serving the financial district, and more affordable options around Whitechapel and Bethnal Green. The Royal London Hospital also trains dental hygienists who offer whitening at reduced rates.",
    priceContext:
      "Whitening prices range from £200 in east Tower Hamlets to £600+ in Canary Wharf. The variation is among the widest in any single London borough.",
    demandSignal:
      "Canary Wharf professionals drive lunchtime and after-work whitening demand. 'Teeth whitening Canary Wharf' and 'whitening Whitechapel' reflect the borough's dual market.",
    whyChoose:
      "Tower Hamlets offers teeth whitening across a wide price range, from affordable clinics near Whitechapel and Bethnal Green stations in the E1 and E2 postcodes, to premium practices in Canary Wharf (E14). The borough's dual market means patients can find express Zoom sessions near their workplace in the financial district or budget-friendly options closer to home in Mile End and Bow.",
    educationalSections: TREATMENT_EDUCATIONAL["teeth-whitening"],
    publishedAt: "2026-01-29",
    updatedAt: "2026-02-22",
    areaFaqs: [
      {
        question: "Why is teeth whitening cheaper in Whitechapel than Canary Wharf?",
        answer:
          "Teeth whitening in Whitechapel typically costs £200–£350, while Canary Wharf clinics charge £400–£600+ for the same systems. The difference is primarily overheads — Canary Wharf clinic rents are among the highest in east London. Both areas offer the same professional systems (Zoom, Enlighten), so the clinical outcome is comparable.",
      },
      {
        question: "Can I get teeth whitening during my lunch break in Canary Wharf?",
        answer:
          "Yes. Several Canary Wharf dental clinics offer express in-chair whitening sessions designed for the local working population. A Philips Zoom express session takes about 45 minutes. Some clinics also offer early morning and evening appointments to suit office hours.",
      },
    ],
  },

  // ── Wandsworth ────────────────────────────────────
  "wandsworth:invisalign": {
    localInsight:
      "Wandsworth has emerged as one of south-west London's strongest markets for Invisalign, with multiple providers clustered around Clapham Junction and Putney. The borough's young professional population means clinics here handle a high volume of cases.",
    priceContext:
      "Invisalign in Wandsworth typically costs £2,800–£4,800, sitting in the mid-range for London. Several clinics offer interest-free finance and free refinements.",
    demandSignal:
      "Wandsworth has the highest proportion of 25–34 year olds of any London borough, driving strong cosmetic dentistry demand. 'Invisalign Battersea', 'clear aligners Clapham' are frequent searches.",
    whyChoose:
      "Many patients in Wandsworth choose Invisalign providers near Clapham Junction and Putney High Street in the SW11 and SW15 postcode areas. With Battersea, Tooting Broadway and Balham stations all offering easy access, the borough's competitive market means clinics actively compete on price and service, offering free refinements and interest-free finance to attract the area's large young professional population.",
    educationalSections: TREATMENT_EDUCATIONAL["invisalign"],
    publishedAt: "2026-02-15",
    updatedAt: "2026-02-27",
    areaFaqs: [
      {
        question: "Where are the best Invisalign clinics in Wandsworth?",
        answer:
          "The highest concentration of Invisalign providers in Wandsworth is around Clapham Junction and Putney High Street. Both areas have multiple clinics competing on service and price, which benefits patients. Battersea also has several newer practices offering competitive Invisalign packages.",
      },
      {
        question: "Do Wandsworth clinics include refinements in the Invisalign price?",
        answer:
          "Many Wandsworth clinics include free refinement aligners in their Invisalign Comprehensive package price (£3,500–£4,800). This means if your teeth need small adjustments after the initial set of aligners, additional trays are provided at no extra cost. Always confirm this before starting treatment.",
      },
    ],
  },

  // ── Lambeth ───────────────────────────────────────
  "lambeth:composite-bonding": {
    localInsight:
      "Brixton and Clapham have seen a surge in cosmetic bonding providers, with several clinics offering social-media-friendly before/after packages. The treatment's one-visit convenience suits the borough's busy young population.",
    priceContext:
      "Composite bonding in Lambeth ranges from £150 to £350 per tooth. Clapham practices tend to charge at the upper end, while Brixton and Streatham clinics are more affordable.",
    demandSignal:
      "TikTok and Instagram are driving bonding demand in Lambeth's younger demographic. 'Composite bonding Clapham' and 'tooth bonding Brixton' show strong month-on-month growth.",
    whyChoose:
      "Lambeth's Brixton and Clapham areas in the SW2, SW4 and SW9 postcodes have become south London hotspots for composite bonding. Clinics near Brixton station, Clapham North and Vauxhall offer one-visit smile makeovers that suit the borough's young professional and creative population. Streatham provides more affordable options, all easily accessible on the Northern and Victoria lines.",
    educationalSections: TREATMENT_EDUCATIONAL["composite-bonding"],
    publishedAt: "2026-02-06",
    updatedAt: "2026-02-25",
    areaFaqs: [
      {
        question: "Is composite bonding in Brixton cheaper than Clapham?",
        answer:
          "Generally yes. Composite bonding in Brixton and Streatham typically costs £150–£250 per tooth, while Clapham practices charge £250–£350. The clinical quality can be comparable — the price difference largely reflects practice overheads and location positioning rather than the bonding material or technique used.",
      },
      {
        question: "How long does composite bonding last from Lambeth clinics?",
        answer:
          "Composite bonding typically lasts 5–7 years with good care, regardless of which Lambeth clinic performs it. Longevity depends more on your bite, oral hygiene, and habits (avoiding nail biting, hard foods) than on location. Ask your dentist about maintenance polishing to extend the lifespan.",
      },
    ],
  },

  // ── Hackney ───────────────────────────────────────
  "hackney:emergency-dental": {
    localInsight:
      "Hackney residents benefit from the Homerton University Hospital's dental emergency department for out-of-hours care. Several practices in Dalston and Stoke Newington also hold same-day emergency slots for registered and non-registered patients.",
    priceContext:
      "Emergency assessments in Hackney range from £50 to £120 privately. NHS emergency care is available through the Homerton at Band 1 rates.",
    demandSignal:
      "'Emergency dentist Hackney' and 'dental pain Dalston' are high-urgency search terms with strong local volume, particularly on weekends.",
    whyChoose:
      "Hackney residents in the E8, E9 and N16 postcodes benefit from the Homerton University Hospital's dental emergency department for out-of-hours and weekend care. Private practices near Dalston Junction, Hackney Central and Stoke Newington stations hold same-day emergency slots for both registered and walk-in patients, providing fast access when dental pain strikes.",
    educationalSections: TREATMENT_EDUCATIONAL["emergency-dental"],
    publishedAt: "2026-02-02",
    updatedAt: "2026-02-24",
    areaFaqs: [
      {
        question: "Does Homerton Hospital have a dental emergency department?",
        answer:
          "Yes. Homerton University Hospital provides dental emergency services for Hackney residents. NHS emergency care is available at Band 1 rates. For out-of-hours emergencies, call NHS 111 who can direct you to the Homerton's on-call dental service or the nearest available emergency provider.",
      },
      {
        question: "Can I see an emergency dentist in Hackney without being registered?",
        answer:
          "Yes. Several practices in Dalston and Stoke Newington hold same-day emergency slots for both registered and non-registered patients. Private emergency assessments typically cost £50–£120. You can also access NHS emergency care through the Homerton without being a registered patient.",
      },
    ],
  },
}

/**
 * Generate default area×treatment data when no hand-written override exists.
 * Uses borough and treatment metadata to produce something meaningful.
 */
function generateDefault(
  borough: LondonBorough,
  treatment: TreatmentMeta
): AreaTreatmentData {
  const regionPriceMap: Record<LondonBorough["region"], string> = {
    Central: "at the higher end of the London range",
    West: "above average for London",
    North: "around the London average",
    South: "competitive for London",
    East: "among the more affordable in London",
  }

  return {
    localInsight: `${borough.name} has a range of dental clinics offering ${treatment.treatmentName.toLowerCase()}, with options near ${borough.landmarks.slice(0, 2).join(" and ")}. The area is well served by ${borough.transport.slice(0, 2).join(" and ")} stations, making clinics easily accessible.`,
    priceContext: `${treatment.treatmentName} prices in ${borough.name} are ${regionPriceMap[borough.region]}, typically within the ${treatment.priceRange} bracket.`,
    demandSignal: `Residents in ${borough.name} searching for ${treatment.treatmentName.toLowerCase()} can compare verified, GDC registered clinics on Pearlie to find the right provider near ${borough.landmarks[0]}.`,
    whyChoose: `Many patients in ${borough.name} choose ${treatment.treatmentName.toLowerCase()} at clinics near ${borough.landmarks[0]} and ${borough.landmarks[1]}. The ${borough.postcodes.slice(0, 2).join(" and ")} postcode areas are well served by ${borough.transport[0]} and ${borough.transport[1]} stations, making it easy to attend regular appointments. ${borough.region} London clinics offer ${treatment.treatmentName.toLowerCase()} ${regionPriceMap[borough.region]}.`,
    educationalSections: TREATMENT_EDUCATIONAL[treatment.slug] || [],
    publishedAt: borough.publishedAt,
    updatedAt: borough.updatedAt,
    areaFaqs: [
      {
        question: `How much does ${treatment.treatmentName.toLowerCase()} cost in ${borough.name}?`,
        answer: `${treatment.treatmentName} prices in ${borough.name} are ${regionPriceMap[borough.region]}, typically within the ${treatment.priceRange} bracket. Prices can vary between clinics near ${borough.landmarks[0]} and ${borough.landmarks[1]}. Pearlie helps you compare verified providers in ${borough.name} so you can see indicative pricing before booking.`,
      },
      {
        question: `How do I find a good ${treatment.treatmentName.toLowerCase()} dentist near ${borough.landmarks[0]}?`,
        answer: `Clinics near ${borough.landmarks[0]} in ${borough.name} are accessible via ${borough.transport[0]} and ${borough.transport[1]}. Look for a GDC registered provider with experience in ${treatment.treatmentName.toLowerCase()}, transparent pricing, and strong patient reviews. Pearlie matches you with verified ${treatment.treatmentName.toLowerCase()} providers in ${borough.name} based on your needs and budget.`,
      },
      {
        question: `Can I get monthly payment plans for ${treatment.treatmentName.toLowerCase()} in ${borough.name}?`,
        answer: `Many ${borough.name} clinics offer finance options for ${treatment.treatmentName.toLowerCase()}, including 0% interest-free plans over 12–24 months. Check with individual providers near ${borough.landmarks[0]} for their specific finance terms. Pearlie shows which clinics offer flexible payment options.`,
      },
    ],
  }
}

/**
 * Get area×treatment data for a specific borough + treatment combination.
 */
export function getAreaTreatmentData(
  boroughSlug: string,
  treatmentSlug: string
): AreaTreatmentData | null {
  const borough = LONDON_BOROUGHS.find((b) => b.slug === boroughSlug)
  if (!borough) return null

  const treatments = getAllTreatments()
  const treatment = treatments.find((t) => t.slug === treatmentSlug)
  if (!treatment) return null

  const key = `${boroughSlug}:${treatmentSlug}`
  return OVERRIDES[key] ?? generateDefault(borough, treatment)
}

/**
 * Get all valid borough×treatment combinations (for generateStaticParams).
 */
export function getAllAreaTreatmentParams(): {
  borough: string
  treatment: string
}[] {
  const treatments = getAllTreatments()
  const params: { borough: string; treatment: string }[] = []

  for (const borough of LONDON_BOROUGHS) {
    for (const treatment of treatments) {
      params.push({ borough: borough.slug, treatment: treatment.slug })
    }
  }

  return params
}
