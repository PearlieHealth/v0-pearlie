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
  type BoroughArchetype,
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

// ── Deterministic Hash Utilities ────────────────────────────────────
// Used by the template variation engine. Same inputs always produce
// the same output, making this fully ISR/SSG compatible.

/** DJB2 hash — returns a stable non-negative integer. */
function stableHash(input: string): number {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) & 0x7fffffff
  }
  return hash
}

/** Pick one item from an array based on a deterministic hash of the key. */
function pick<T>(templates: T[], key: string): T {
  return templates[stableHash(key) % templates.length]
}

/** Pick N items from a pool using deterministic shuffling. */
function pickMultiple<T>(pool: T[], count: number, key: string): T[] {
  const indexed = pool.map((item, i) => ({
    item,
    sort: stableHash(`${key}:${i}`),
  }))
  indexed.sort((a, b) => a.sort - b.sort)
  return indexed.slice(0, Math.min(count, pool.length)).map((x) => x.item)
}

/** Get rotated landmarks so different treatment pages mention different areas. */
function rotatedLandmarks(borough: LondonBorough, key: string): [string, string] {
  const offset = stableHash(key) % Math.max(1, borough.landmarks.length - 1)
  return [
    borough.landmarks[offset],
    borough.landmarks[(offset + 1) % borough.landmarks.length],
  ]
}

/** Get rotated transport stations. */
function rotatedTransport(borough: LondonBorough, key: string): [string, string] {
  const offset = stableHash(`t:${key}`) % Math.max(1, borough.transport.length - 1)
  return [
    borough.transport[offset],
    borough.transport[(offset + 1) % borough.transport.length],
  ]
}

// ── Archetype Template Banks ───────────────────────────────────────
// Each bank has 3 template functions per archetype. Templates are
// selected via pick(bank[archetype], key) where key = "borough:treatment".

type Ctx = { borough: LondonBorough; treatment: TreatmentMeta; lm: [string, string]; tr: [string, string] }
type TemplateFn = (ctx: Ctx) => string

// ── 1. INTRO TEMPLATES (localInsight) ──

const INTRO_TEMPLATES: Record<BoroughArchetype, TemplateFn[]> = {
  affluent_cosmetic: [
    ({ borough, treatment, lm }) =>
      `${borough.name} is one of London's most sought-after locations for ${treatment.treatmentName.toLowerCase()}, with established clinics near ${lm[0]} and ${lm[1]} offering premium care. Patients here often seek experienced practitioners who use the latest techniques and materials, and the area's concentration of specialists means you can compare multiple providers within a short walk.`,
    ({ borough, treatment, tr }) =>
      `Clinics around ${tr[0]} and ${tr[1]} stations in ${borough.name} cater to patients who prioritise quality and expertise when choosing ${treatment.treatmentName.toLowerCase()}. The area's reputation for high-end dental care means providers compete on clinical outcomes and patient experience, giving patients access to some of London's most qualified practitioners.`,
    ({ borough, treatment, lm, tr }) =>
      `${borough.name} attracts patients looking for top-tier ${treatment.treatmentName.toLowerCase()} from across London and beyond. The concentration of specialist practitioners near ${tr[0]} station and the ${lm[0]} area makes it easy to access the borough's well-regarded clinics, many of which invest in advanced diagnostic and treatment technology.`,
  ],
  young_professional: [
    ({ borough, treatment, lm }) =>
      `${borough.name}'s ${treatment.treatmentName.toLowerCase()} market has grown rapidly, driven by the area's large population of 25–40 year olds seeking cosmetic dental improvements that fit their busy lifestyles. Clinics near ${lm[0]} and ${lm[1]} compete on convenience, transparent pricing, and flexible scheduling including evening appointments.`,
    ({ borough, treatment, tr }) =>
      `Patients in ${borough.name} looking for ${treatment.treatmentName.toLowerCase()} benefit from a competitive market where clinics near ${tr[0]} and ${tr[1]} stations actively compete for the area's young professional demographic. This means better service, clearer pricing, and more flexible appointment options than you might find elsewhere.`,
    ({ borough, treatment, lm }) =>
      `${treatment.treatmentName} is particularly popular in ${borough.name}, where the area's younger demographic drives strong demand for discreet cosmetic improvements. Clinics around ${lm[0]} and ${lm[1]} have responded with modern practices, digital consultations, and social-media-friendly treatment packages.`,
  ],
  family_residential: [
    ({ borough, treatment, lm }) =>
      `Families across ${borough.name} value finding a trusted clinic for ${treatment.treatmentName.toLowerCase()} close to home. With a population of ${borough.population.toLocaleString("en-GB")}, the borough has a healthy mix of providers near ${lm[0]} and ${lm[1]} offering both NHS and private options for long-term dental care.`,
    ({ borough, treatment, tr }) =>
      `Patients in ${borough.name} looking for ${treatment.treatmentName.toLowerCase()} benefit from a mix of established family practices and newer clinics near ${tr[0]} and ${tr[1]} stations. The borough's residential character means clinics focus on building long-term patient relationships with consistent, reliable care.`,
    ({ borough, treatment, lm }) =>
      `${treatment.treatmentName} providers in ${borough.name} serve the borough's diverse residential communities, with clinics near ${lm[0]} and ${lm[1]} offering treatment from general and specialist practitioners. Many practices here welcome patients of all ages and offer family appointment slots.`,
  ],
  central_business: [
    ({ borough, treatment, tr }) =>
      `${borough.name}'s dental clinics are geared towards the area's large daytime workforce, offering ${treatment.treatmentName.toLowerCase()} with flexible scheduling designed for busy professionals. Practices near ${tr[0]} and ${tr[1]} stations often accommodate lunchtime and early evening appointments so treatment doesn't disrupt your working day.`,
    ({ borough, treatment, lm }) =>
      `Professionals working near ${lm[0]} and ${lm[1]} in ${borough.name} can access ${treatment.treatmentName.toLowerCase()} from clinics that understand the demands of a busy schedule. Many offer streamlined booking, express consultations, and treatment plans designed to minimise time away from the office.`,
    ({ borough, treatment, tr, lm }) =>
      `${treatment.treatmentName} is readily available across ${borough.name}, where clinics near ${tr[0]} station and the ${lm[0]} area serve both the local residential community and the borough's substantial commuter population. Premium and mid-range options are available depending on your priorities.`,
  ],
  mixed_emerging: [
    ({ borough, treatment, lm }) =>
      `${borough.name} offers an expanding range of dental clinics providing ${treatment.treatmentName.toLowerCase()}, with options near ${lm[0]} and ${lm[1]}. Patients in the area benefit from increasing competition, which helps keep prices transparent and accessible while maintaining clinical standards.`,
    ({ borough, treatment, tr }) =>
      `Residents in ${borough.name} searching for ${treatment.treatmentName.toLowerCase()} can choose from growing number of providers near ${tr[0]} and ${tr[1]} stations. The area's developing dental market offers competitive pricing alongside established community practices.`,
    ({ borough, treatment, lm }) =>
      `${treatment.treatmentName} options in ${borough.name} are expanding as new clinics open near ${lm[0]} and ${lm[1]}. The borough offers some of London's most competitively priced dental care, with practices that prioritise transparent pricing and honest treatment planning.`,
  ],
}

// ── 2. PRICE TEMPLATES (priceContext) ──

const PRICE_TEMPLATES: Record<BoroughArchetype, TemplateFn[]> = {
  affluent_cosmetic: [
    ({ borough, treatment, lm }) =>
      `${treatment.treatmentName} in ${borough.name} sits at the premium end of the London range, typically within the ${treatment.priceRange} bracket. The higher price point reflects access to experienced specialists and premium materials, particularly at clinics near ${lm[0]}.`,
    ({ borough, treatment }) =>
      `Patients in ${borough.name} can expect to pay at the upper end of the ${treatment.priceRange} range for ${treatment.treatmentName.toLowerCase()}. Premium clinics in the area invest in advanced equipment and often include comprehensive aftercare in the price.`,
    ({ borough, treatment, lm }) =>
      `${treatment.treatmentName} pricing in ${borough.name} reflects the area's specialist reputation, with costs typically within the ${treatment.priceRange} bracket. Clinics near ${lm[0]} tend to charge more, though neighbouring areas can offer better value with comparable quality.`,
  ],
  young_professional: [
    ({ borough, treatment, lm }) =>
      `${treatment.treatmentName} prices in ${borough.name} are competitive, typically within the ${treatment.priceRange} bracket. Many clinics near ${lm[0]} offer 0% finance plans to make treatment more accessible for the area's younger demographic.`,
    ({ borough, treatment }) =>
      `Expect to pay within the ${treatment.priceRange} range for ${treatment.treatmentName.toLowerCase()} in ${borough.name}. The area's competitive market means practices often include extras like free consultations or follow-up appointments to attract patients.`,
    ({ borough, treatment, tr }) =>
      `With several clinics competing in ${borough.name}, ${treatment.treatmentName.toLowerCase()} pricing is around the London average at ${treatment.priceRange}. Practices near ${tr[0]} station frequently offer interest-free monthly payment plans.`,
  ],
  family_residential: [
    ({ borough, treatment, lm }) =>
      `${treatment.treatmentName} in ${borough.name} is priced around the London average, typically within the ${treatment.priceRange} bracket. Several family-oriented practices near ${lm[0]} offer transparent pricing with no hidden costs and staged payment options.`,
    ({ borough, treatment }) =>
      `Prices for ${treatment.treatmentName.toLowerCase()} in ${borough.name} typically fall within the ${treatment.priceRange} range. The borough's mix of NHS-accepting and private practices means patients can find options across a range of budgets.`,
    ({ borough, treatment, lm }) =>
      `${treatment.treatmentName} costs in ${borough.name} are competitive for London, generally within the ${treatment.priceRange} bracket. Clinics near ${lm[0]} and ${lm[1]} often offer family discounts and flexible payment plans for longer treatments.`,
  ],
  central_business: [
    ({ borough, treatment, tr }) =>
      `${treatment.treatmentName} pricing in ${borough.name} reflects the area's mix of corporate-facing clinics and community practices, typically within the ${treatment.priceRange} range. Clinics near ${tr[0]} station cater to professionals who value efficiency and premium service.`,
    ({ borough, treatment }) =>
      `Expect to pay within the ${treatment.priceRange} range for ${treatment.treatmentName.toLowerCase()} in ${borough.name}. The area's central location means pricing trends towards the higher end, though the quality of service and convenience often justifies the cost for local workers.`,
    ({ borough, treatment, lm }) =>
      `${treatment.treatmentName} in ${borough.name} is priced competitively at ${treatment.priceRange}, with clinics near ${lm[0]} offering different tiers to suit varying budgets. Many practices offer express consultation options for time-pressed professionals.`,
  ],
  mixed_emerging: [
    ({ borough, treatment }) =>
      `${treatment.treatmentName} in ${borough.name} offers some of the most transparent pricing in London, typically within the ${treatment.priceRange} bracket. The area's growing clinic market means patients can compare options and find good value without compromising on quality.`,
    ({ borough, treatment, lm }) =>
      `Prices for ${treatment.treatmentName.toLowerCase()} in ${borough.name} are among the most accessible in London, generally within the ${treatment.priceRange} range. Clinics near ${lm[0]} prioritise clear, upfront pricing with no surprises.`,
    ({ borough, treatment }) =>
      `With increasing competition in ${borough.name}, ${treatment.treatmentName.toLowerCase()} prices have become more accessible, typically within the ${treatment.priceRange} bracket. Many practices offer payment plans and transparent breakdowns of what's included.`,
  ],
}

// ── 3. DEMAND SIGNAL TEMPLATES ──

const DEMAND_TEMPLATES: Record<BoroughArchetype, TemplateFn[]> = {
  affluent_cosmetic: [
    ({ borough, treatment }) =>
      `${borough.name}'s reputation for specialist dental care draws patients from across London seeking ${treatment.treatmentName.toLowerCase()}. The area's high standards mean clinics invest in advanced technology and experienced practitioners to meet patient expectations.`,
    ({ borough, treatment, lm }) =>
      `Demand for ${treatment.treatmentName.toLowerCase()} near ${lm[0]} in ${borough.name} remains strong, driven by patients who prioritise clinical expertise and aesthetic outcomes. The area's competitive specialist market benefits patients through higher standards of care.`,
    ({ borough, treatment }) =>
      `${borough.name} consistently sees high demand for ${treatment.treatmentName.toLowerCase()}, with patients valuing the area's access to leading practitioners and premium dental laboratories. Many patients choose ${borough.name} specifically for the calibre of clinicians available.`,
  ],
  young_professional: [
    ({ borough, treatment, lm }) =>
      `${treatment.treatmentName} demand in ${borough.name} is driven by the area's large 25–40 year old population seeking cosmetic dental improvements. Clinics near ${lm[0]} report particularly strong interest from professionals wanting subtle, confidence-boosting treatments.`,
    ({ borough, treatment }) =>
      `Social media and word-of-mouth drive strong ${treatment.treatmentName.toLowerCase()} demand in ${borough.name}. The area's image-conscious younger demographic values before-and-after results, transparent pricing, and providers who offer digital treatment previews.`,
    ({ borough, treatment, lm }) =>
      `Residents in ${borough.name} are among the most active searchers for ${treatment.treatmentName.toLowerCase()} in London. The concentration of young professionals near ${lm[0]} and ${lm[1]} creates a competitive market where clinics constantly improve their offerings.`,
  ],
  family_residential: [
    ({ borough, treatment }) =>
      `Residents in ${borough.name} searching for ${treatment.treatmentName.toLowerCase()} value trusted, long-term dental relationships. The borough's family-oriented character means clinics that build strong reputations through consistent care see the highest demand.`,
    ({ borough, treatment, lm }) =>
      `Demand for ${treatment.treatmentName.toLowerCase()} in ${borough.name} is steady, with residents near ${lm[0]} and ${lm[1]} preferring established practices that offer comprehensive treatment planning and clear communication about options and costs.`,
    ({ borough, treatment }) =>
      `${borough.name} residents searching for ${treatment.treatmentName.toLowerCase()} can compare verified, GDC registered clinics on Pearlie. The borough's mix of demographics means providers cater to a range of needs, from routine treatments to more complex cases.`,
  ],
  central_business: [
    ({ borough, treatment, tr }) =>
      `${treatment.treatmentName} demand peaks during weekday working hours in ${borough.name}, driven by the area's large professional population near ${tr[0]} and ${tr[1]} stations. Clinics that offer early morning, lunchtime, and evening appointments see the strongest patient volumes.`,
    ({ borough, treatment }) =>
      `Convenience is the primary driver of ${treatment.treatmentName.toLowerCase()} demand in ${borough.name}. Workers in the area value minimal treatment time, efficient booking systems, and clinics that respect busy schedules.`,
    ({ borough, treatment, lm }) =>
      `Professionals near ${lm[0]} in ${borough.name} drive strong demand for ${treatment.treatmentName.toLowerCase()}, particularly for treatments that can be completed efficiently. The area's clinic density means patients can compare multiple providers within walking distance.`,
  ],
  mixed_emerging: [
    ({ borough, treatment }) =>
      `Residents in ${borough.name} searching for ${treatment.treatmentName.toLowerCase()} benefit from a growing market that's becoming more competitive. Pearlie helps you compare verified providers to find the right balance of quality and value.`,
    ({ borough, treatment, lm }) =>
      `Demand for ${treatment.treatmentName.toLowerCase()} near ${lm[0]} in ${borough.name} is growing as the area develops and new clinics open. Patients benefit from transparent pricing and the ability to compare providers before committing.`,
    ({ borough, treatment }) =>
      `${borough.name}'s developing dental market means more choice for patients seeking ${treatment.treatmentName.toLowerCase()}. Rising competition has improved both service quality and pricing transparency across the borough.`,
  ],
}

// ── 4. WHY CHOOSE TEMPLATES ──

const WHY_CHOOSE_TEMPLATES: Record<BoroughArchetype, TemplateFn[]> = {
  affluent_cosmetic: [
    ({ borough, treatment, lm, tr }) =>
      `Patients in ${borough.name} choose ${treatment.treatmentName.toLowerCase()} at clinics near ${lm[0]} and ${lm[1]} for the area's specialist expertise and premium care standards. The ${borough.postcodes.slice(0, 2).join(" and ")} postcode areas are home to some of London's most experienced practitioners, easily accessible via ${tr[0]} and ${tr[1]} stations.`,
    ({ borough, treatment, tr }) =>
      `${borough.name} is a natural choice for ${treatment.treatmentName.toLowerCase()} patients who value clinical excellence. With convenient transport links via ${tr[0]} and ${tr[1]}, the ${borough.postcodes[0]} area offers access to specialists who combine advanced techniques with a personalised approach to care.`,
    ({ borough, treatment, lm }) =>
      `Choosing ${treatment.treatmentName.toLowerCase()} in ${borough.name} means access to clinics near ${lm[0]} that invest in the latest technology and employ highly experienced dental professionals. The borough's ${borough.postcodes.slice(0, 3).join(", ")} postcodes contain one of London's densest concentrations of cosmetic dental expertise.`,
  ],
  young_professional: [
    ({ borough, treatment, lm, tr }) =>
      `Many patients in ${borough.name} choose ${treatment.treatmentName.toLowerCase()} at clinics near ${lm[0]} and ${lm[1]} for the competitive pricing and flexible scheduling that suits busy lifestyles. The ${borough.postcodes.slice(0, 2).join(" and ")} postcode areas are well served by ${tr[0]} and ${tr[1]} stations, making it easy to fit appointments around work.`,
    ({ borough, treatment, tr }) =>
      `${borough.name}'s competitive dental market benefits patients seeking ${treatment.treatmentName.toLowerCase()}. Clinics near ${tr[0]} and ${tr[1]} stations in the ${borough.postcodes[0]} area offer flexible evening and weekend appointments, transparent pricing, and modern practices that appeal to the area's younger demographic.`,
    ({ borough, treatment, lm }) =>
      `Choosing ${treatment.treatmentName.toLowerCase()} in ${borough.name} means access to clinics near ${lm[0]} that understand what young professionals want — clear pricing, minimal disruption, and excellent results. The ${borough.postcodes.slice(0, 2).join(" and ")} postcode areas have some of London's most competitively priced cosmetic dentistry.`,
  ],
  family_residential: [
    ({ borough, treatment, lm, tr }) =>
      `Families in ${borough.name} choose ${treatment.treatmentName.toLowerCase()} at trusted clinics near ${lm[0]} and ${lm[1]} for the area's balance of quality and value. The ${borough.postcodes.slice(0, 2).join(" and ")} postcode areas are well served by ${tr[0]} and ${tr[1]} stations, making regular appointments convenient for the whole family.`,
    ({ borough, treatment, tr }) =>
      `Patients in ${borough.name} value clinics near ${tr[0]} and ${tr[1]} that offer ${treatment.treatmentName.toLowerCase()} alongside comprehensive general dental care. The ${borough.postcodes[0]} area has established practices that build long-term relationships with local families.`,
    ({ borough, treatment, lm }) =>
      `${borough.name} offers a strong selection of ${treatment.treatmentName.toLowerCase()} providers near ${lm[0]} and ${lm[1]}, with practices that serve the borough's residential communities. The ${borough.postcodes.slice(0, 3).join(", ")} postcodes have both NHS-accepting and private clinics to suit different budgets.`,
  ],
  central_business: [
    ({ borough, treatment, tr, lm }) =>
      `Professionals in ${borough.name} choose ${treatment.treatmentName.toLowerCase()} at clinics near ${tr[0]} and ${tr[1]} stations for the convenience of treating near their workplace. The ${borough.postcodes.slice(0, 2).join(" and ")} postcode areas have clinics that specialise in efficient, high-quality treatment that minimises time away from the office.`,
    ({ borough, treatment, lm, tr }) =>
      `${borough.name} is ideal for ${treatment.treatmentName.toLowerCase()} if you work in the area. Clinics near ${lm[0]} and accessible via ${tr[0]} station offer lunchtime and after-work appointments in the ${borough.postcodes[0]} postcode, with many providing express consultation options.`,
    ({ borough, treatment, tr }) =>
      `Choosing ${treatment.treatmentName.toLowerCase()} in ${borough.name} means access to clinics geared towards the area's professional population. Practices near ${tr[0]} and ${tr[1]} in the ${borough.postcodes.slice(0, 2).join(" and ")} postcodes offer flexible scheduling and premium treatment options.`,
  ],
  mixed_emerging: [
    ({ borough, treatment, lm, tr }) =>
      `Patients in ${borough.name} choosing ${treatment.treatmentName.toLowerCase()} benefit from the area's growing dental market near ${lm[0]} and ${lm[1]}. The ${borough.postcodes.slice(0, 2).join(" and ")} postcode areas are accessible via ${tr[0]} and ${tr[1]} stations, with clinics offering competitive pricing and transparent treatment plans.`,
    ({ borough, treatment, tr }) =>
      `${borough.name} offers accessible ${treatment.treatmentName.toLowerCase()} options near ${tr[0]} and ${tr[1]} stations. The ${borough.postcodes[0]} area's developing dental market means patients can find affordable, quality care without travelling to central London.`,
    ({ borough, treatment, lm }) =>
      `Choosing ${treatment.treatmentName.toLowerCase()} in ${borough.name} means access to a growing number of verified providers near ${lm[0]} and ${lm[1]}. The borough's competitive pricing in the ${borough.postcodes.slice(0, 2).join(" and ")} postcodes makes it a smart choice for cost-conscious patients.`,
  ],
}

// ── 5. FAQ TEMPLATE POOLS ──
// 10 templates per archetype. generateDefault() picks 6–8.

interface FAQTemplate {
  question: TemplateFn
  answer: TemplateFn
}

const FAQ_POOL: Record<BoroughArchetype, FAQTemplate[]> = {
  affluent_cosmetic: [
    // 1. Cost (always included as core)
    {
      question: ({ borough, treatment }) =>
        `What does ${treatment.treatmentName.toLowerCase()} typically cost in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `${treatment.treatmentName} in ${borough.name} is typically priced at the premium end of the London range, within the ${treatment.priceRange} bracket. The higher cost reflects access to experienced specialists and premium materials. Pearlie lets you compare verified providers to see transparent pricing before booking.`,
    },
    // 2. Provider selection (core)
    {
      question: ({ borough, treatment, lm }) =>
        `How do I choose the best ${treatment.treatmentName.toLowerCase()} specialist near ${lm[0]}?`,
      answer: ({ borough, treatment, lm, tr }) =>
        `Look for a GDC registered provider near ${lm[0]} in ${borough.name} with specific experience in ${treatment.treatmentName.toLowerCase()}, strong patient reviews, and transparent pricing. Clinics accessible via ${tr[0]} station often list their specialist credentials. Pearlie verifies all listed providers and shows ratings to help you compare.`,
    },
    // 3. Finance (core)
    {
      question: ({ borough, treatment }) =>
        `Do ${borough.name} clinics offer finance for ${treatment.treatmentName.toLowerCase()}?`,
      answer: ({ borough, treatment }) =>
        `Many premium clinics in ${borough.name} offer interest-free finance plans for ${treatment.treatmentName.toLowerCase()}, typically over 12–24 months. Some practices offer staged payments aligned with the treatment timeline. Always confirm what's included in the quoted price.`,
    },
    // 4-10. Archetype-specific
    {
      question: ({ borough, treatment }) =>
        `Are there specialist ${treatment.treatmentName.toLowerCase()} practitioners in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `Yes. ${borough.name} has a high concentration of specialist dental practitioners. Look for providers with advanced qualifications, membership of relevant professional bodies, and a track record of ${treatment.treatmentName.toLowerCase()} cases. Many specialists in the area also hold teaching positions.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Is ${treatment.treatmentName.toLowerCase()} in ${borough.name} worth the premium price?`,
      answer: ({ borough, treatment }) =>
        `The premium pricing in ${borough.name} (${treatment.priceRange}) often reflects access to more experienced practitioners, better materials, and comprehensive aftercare. For patients who prioritise the best possible outcome, the investment can represent good value. Comparing providers on Pearlie helps you assess what's included in each clinic's price.`,
    },
    {
      question: ({ borough, treatment }) =>
        `What should my first ${treatment.treatmentName.toLowerCase()} consultation include in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `A thorough first consultation for ${treatment.treatmentName.toLowerCase()} should include a clinical examination, discussion of treatment options, a clear cost breakdown, and realistic expectations about outcomes and timeline. Many ${borough.name} clinics offer digital imaging or mock-ups so you can visualise results.`,
    },
    {
      question: ({ borough, treatment }) =>
        `How do I book a ${treatment.treatmentName.toLowerCase()} consultation in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `You can compare verified ${treatment.treatmentName.toLowerCase()} providers in ${borough.name} on Pearlie, then book directly with your preferred clinic. Many clinics offer free initial consultations or virtual assessments to discuss your needs before committing.`,
    },
    {
      question: ({ borough, treatment, lm }) =>
        `Which part of ${borough.name} has the most ${treatment.treatmentName.toLowerCase()} clinics?`,
      answer: ({ borough, treatment, lm }) =>
        `The highest concentration of ${treatment.treatmentName.toLowerCase()} providers in ${borough.name} is around ${lm[0]} and ${lm[1]}. This area has the most choice, making it easy to compare multiple clinics in a single visit.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Can I get a second opinion on ${treatment.treatmentName.toLowerCase()} in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `Absolutely. ${borough.name}'s concentration of dental specialists makes it easy to get second opinions. Several clinics offer low-cost or free consultation appointments specifically for patients seeking an alternative view on their treatment plan.`,
    },
    {
      question: ({ borough }) =>
        `Are dental clinics in ${borough.name} GDC registered?`,
      answer: ({ borough }) =>
        `All dental practitioners in the UK must be registered with the General Dental Council (GDC). Clinics listed on Pearlie in ${borough.name} are verified as GDC registered, giving you confidence in the regulatory standards of any provider you choose.`,
    },
  ],

  young_professional: [
    {
      question: ({ borough, treatment }) =>
        `What is the average ${treatment.treatmentName.toLowerCase()} price in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `${treatment.treatmentName} in ${borough.name} typically costs within the ${treatment.priceRange} range — competitive for London. The area's young professional market means clinics often include extras like free consultations to attract patients. Compare pricing on Pearlie before booking.`,
    },
    {
      question: ({ borough, treatment, lm }) =>
        `What should I look for in a ${treatment.treatmentName.toLowerCase()} provider near ${lm[0]}?`,
      answer: ({ borough, treatment, lm }) =>
        `When choosing a ${treatment.treatmentName.toLowerCase()} provider near ${lm[0]} in ${borough.name}, look for GDC registration, strong patient reviews, transparent pricing, and before-and-after examples of their work. Clinics that offer digital treatment previews can help you visualise expected results.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Are there 0% finance options for ${treatment.treatmentName.toLowerCase()} in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `Yes. Many ${borough.name} clinics offer 0% interest-free finance for ${treatment.treatmentName.toLowerCase()} over 12–24 months. This can make treatment accessible from around ${treatment.priceRange.split("–")[0].trim().replace("£", "£")}+ per month depending on the plan length. Pearlie shows which clinics offer flexible payment options.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Is ${treatment.treatmentName.toLowerCase()} popular among professionals in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `Very popular. ${borough.name}'s young professional demographic drives some of the highest demand for ${treatment.treatmentName.toLowerCase()} in London. Patients value discreet, confidence-boosting treatments that fit around busy work schedules.`,
    },
    {
      question: ({ borough, treatment, tr }) =>
        `Can I book ${treatment.treatmentName.toLowerCase()} appointments after work near ${tr[0]}?`,
      answer: ({ borough, treatment, tr }) =>
        `Yes. Several ${borough.name} clinics near ${tr[0]} and ${tr[1]} stations offer evening appointments (typically until 7–8pm) for ${treatment.treatmentName.toLowerCase()}. Some also offer Saturday morning appointments. Check individual clinic hours on their Pearlie profile.`,
    },
    {
      question: ({ borough, treatment }) =>
        `How long does ${treatment.treatmentName.toLowerCase()} take in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `${treatment.treatmentName} typically takes ${treatment.treatmentDuration}. Your dentist in ${borough.name} will give you a more precise timeline during your initial consultation, based on your specific case. Many clinics offer treatment plans designed to minimise the number of visits.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Do ${borough.name} clinics offer free ${treatment.treatmentName.toLowerCase()} consultations?`,
      answer: ({ borough, treatment }) =>
        `Many ${borough.name} clinics offer free or discounted initial consultations for ${treatment.treatmentName.toLowerCase()}. This lets you discuss your goals, see treatment options, and get a clear price before committing. Check which clinics offer this on Pearlie.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Is ${treatment.treatmentName.toLowerCase()} worth the investment in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `For many patients, ${treatment.treatmentName.toLowerCase()} in ${borough.name} (${treatment.priceRange}) represents excellent value given the area's competitive market and quality of care. The key is finding the right provider — compare verified clinics on Pearlie to make an informed choice.`,
    },
    {
      question: ({ borough, treatment, lm }) =>
        `How do ${treatment.treatmentName.toLowerCase()} prices near ${lm[0]} compare to central London?`,
      answer: ({ borough, treatment, lm }) =>
        `${treatment.treatmentName} prices near ${lm[0]} in ${borough.name} are generally competitive compared to central London zones like Westminster or Kensington. You'll typically pay within the ${treatment.priceRange} range, often with more flexible payment options.`,
    },
    {
      question: ({ borough }) =>
        `Are dental clinics in ${borough.name} GDC registered?`,
      answer: ({ borough }) =>
        `All dental practitioners in the UK must be registered with the General Dental Council (GDC). Every clinic listed on Pearlie in ${borough.name} has been verified as GDC registered, so you can compare providers with confidence.`,
    },
  ],

  family_residential: [
    {
      question: ({ borough, treatment }) =>
        `How much does ${treatment.treatmentName.toLowerCase()} cost in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `${treatment.treatmentName} prices in ${borough.name} are around the London average, typically within the ${treatment.priceRange} bracket. Prices vary between clinics, so comparing providers on Pearlie helps you find the best value near you.`,
    },
    {
      question: ({ borough, treatment, lm }) =>
        `What should I look for in a ${treatment.treatmentName.toLowerCase()} clinic near ${lm[0]}?`,
      answer: ({ borough, treatment, lm }) =>
        `When choosing a ${treatment.treatmentName.toLowerCase()} clinic near ${lm[0]} in ${borough.name}, look for GDC registration, a good track record with patient reviews, transparent pricing, and clear communication about treatment options. Established practices with long-serving dentists often provide the most consistent care.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Can I pay for ${treatment.treatmentName.toLowerCase()} in monthly instalments in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `Many ${borough.name} clinics offer finance options for ${treatment.treatmentName.toLowerCase()}, including 0% interest-free plans over 12–24 months. This makes treatment more manageable for family budgets. Ask individual clinics about their specific payment plans.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Is ${treatment.treatmentName.toLowerCase()} available on the NHS in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `${treatment.treatmentName} availability on the NHS varies. ${borough.nhsInfo} For cosmetic treatments, private care is usually needed. Pearlie shows both NHS-accepting and private clinics in ${borough.name} so you can compare options.`,
    },
    {
      question: ({ borough, treatment }) =>
        `How do I find a trusted ${treatment.treatmentName.toLowerCase()} dentist in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `Start by comparing verified, GDC registered ${treatment.treatmentName.toLowerCase()} providers in ${borough.name} on Pearlie. Check patient reviews, look for transparent pricing, and consider booking consultations at 2–3 clinics before deciding. Word-of-mouth recommendations from neighbours are also valuable.`,
    },
    {
      question: ({ borough, treatment }) =>
        `How long does ${treatment.treatmentName.toLowerCase()} treatment take?`,
      answer: ({ borough, treatment }) =>
        `${treatment.treatmentName} typically takes ${treatment.treatmentDuration}. Your dentist in ${borough.name} will provide a specific timeline based on your individual case during the consultation. Many clinics try to minimise the number of visits required.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Are there family-friendly dental clinics in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `Yes. Many dental clinics in ${borough.name} welcome patients of all ages and offer family appointment slots. When looking for ${treatment.treatmentName.toLowerCase()} alongside general family dental care, choose a practice that offers a full range of services.`,
    },
    {
      question: ({ borough, treatment, lm }) =>
        `Which area in ${borough.name} has the best ${treatment.treatmentName.toLowerCase()} clinics?`,
      answer: ({ borough, treatment, lm }) =>
        `${treatment.treatmentName} providers are distributed across ${borough.name}, with clusters near ${lm[0]} and ${lm[1]}. The "best" clinic depends on your specific needs, budget, and location. Pearlie helps you compare verified providers across the borough.`,
    },
    {
      question: ({ borough, treatment }) =>
        `What questions should I ask at my ${treatment.treatmentName.toLowerCase()} consultation?`,
      answer: ({ borough, treatment }) =>
        `Ask about the total cost (including any follow-up), the treatment timeline, what results to expect, and what aftercare is needed. Also ask about the dentist's experience with ${treatment.treatmentName.toLowerCase()} and whether they can show before-and-after examples of similar cases.`,
    },
    {
      question: ({ borough }) =>
        `How do I check if a ${borough.name} dentist is properly qualified?`,
      answer: ({ borough }) =>
        `All UK dentists must be registered with the General Dental Council (GDC). You can verify any dentist's registration on the GDC website. Clinics listed on Pearlie in ${borough.name} are verified as GDC registered for your peace of mind.`,
    },
  ],

  central_business: [
    {
      question: ({ borough, treatment }) =>
        `How much does ${treatment.treatmentName.toLowerCase()} cost in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `${treatment.treatmentName} in ${borough.name} typically costs within the ${treatment.priceRange} range, reflecting the area's central London location and professional-focused clinics. Compare providers on Pearlie to see transparent pricing.`,
    },
    {
      question: ({ borough, treatment, lm }) =>
        `Where can I find a good ${treatment.treatmentName.toLowerCase()} dentist near ${lm[0]}?`,
      answer: ({ borough, treatment, lm, tr }) =>
        `Several verified ${treatment.treatmentName.toLowerCase()} clinics operate near ${lm[0]} in ${borough.name}, easily accessible via ${tr[0]} station. Look for GDC registered providers with strong reviews and transparent pricing. Pearlie shows all verified options in the area.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Are payment plans available for ${treatment.treatmentName.toLowerCase()} in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `Yes. Many ${borough.name} clinics offer interest-free finance for ${treatment.treatmentName.toLowerCase()} over 12–24 months. Some also offer corporate dental plan partnerships. Ask individual clinics about their payment options.`,
    },
    {
      question: ({ borough, treatment, tr }) =>
        `Can I book a ${treatment.treatmentName.toLowerCase()} appointment during lunch near ${tr[0]}?`,
      answer: ({ borough, treatment, tr }) =>
        `Yes. Multiple ${borough.name} clinics near ${tr[0]} and ${tr[1]} stations offer 30–60 minute lunchtime appointment slots for ${treatment.treatmentName.toLowerCase()} consultations and follow-up visits. Some also offer early morning and evening appointments.`,
    },
    {
      question: ({ borough, treatment }) =>
        `How quickly can I start ${treatment.treatmentName.toLowerCase()} treatment in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `Most ${borough.name} clinics can book ${treatment.treatmentName.toLowerCase()} consultations within 1–2 weeks. Some offer same-week appointments. Treatment can often begin at the first appointment depending on the procedure. Check availability on Pearlie.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Do ${borough.name} dental clinics offer out-of-hours appointments?`,
      answer: ({ borough, treatment }) =>
        `Many ${borough.name} clinics cater to the working population with extended hours, including early morning (from 7:30am), lunchtime, and evening appointments (until 7–8pm). Some offer Saturday appointments for ${treatment.treatmentName.toLowerCase()}.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Is ${treatment.treatmentName.toLowerCase()} more expensive in ${borough.name} than outer London?`,
      answer: ({ borough, treatment }) =>
        `${treatment.treatmentName} in ${borough.name} can be 10–20% more expensive than outer London boroughs, reflecting central location overheads. However, the convenience of treating near your workplace and the quality of care available often make it worthwhile.`,
    },
    {
      question: ({ borough, treatment }) =>
        `How many visits does ${treatment.treatmentName.toLowerCase()} require?`,
      answer: ({ borough, treatment }) =>
        `${treatment.treatmentName} typically requires ${treatment.treatmentDuration}. Your dentist in ${borough.name} will plan a schedule that minimises disruption to your work. Many clinics offer consolidated appointments to reduce the total number of visits needed.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Do any ${borough.name} clinics offer corporate dental plans?`,
      answer: ({ borough, treatment }) =>
        `Some ${borough.name} dental practices offer corporate partnerships and group dental plans for local businesses. These can include discounted ${treatment.treatmentName.toLowerCase()} rates and priority booking for employees. Ask your preferred clinic about corporate arrangements.`,
    },
    {
      question: ({ borough }) =>
        `Are all ${borough.name} dental clinics on Pearlie GDC registered?`,
      answer: ({ borough }) =>
        `Yes. Every clinic listed on Pearlie in ${borough.name} is verified as GDC registered. This means all practitioners meet UK regulatory standards for dental care, giving you confidence in any provider you choose.`,
    },
  ],

  mixed_emerging: [
    {
      question: ({ borough, treatment }) =>
        `Are there affordable ${treatment.treatmentName.toLowerCase()} options in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `Yes. ${treatment.treatmentName} in ${borough.name} is priced competitively at ${treatment.priceRange}. The area's growing dental market means increasing competition, which benefits patients through more transparent and accessible pricing.`,
    },
    {
      question: ({ borough, treatment, lm }) =>
        `How do I find a reliable ${treatment.treatmentName.toLowerCase()} dentist near ${lm[0]}?`,
      answer: ({ borough, treatment, lm }) =>
        `Compare verified, GDC registered ${treatment.treatmentName.toLowerCase()} providers near ${lm[0]} in ${borough.name} on Pearlie. Check patient reviews, look for transparent pricing, and consider visiting 2–3 clinics for consultations before making your choice.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Can I get monthly payment plans for ${treatment.treatmentName.toLowerCase()} in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `Many ${borough.name} clinics offer finance options for ${treatment.treatmentName.toLowerCase()}, including interest-free plans over 12–24 months. This makes treatment accessible even on a tight budget. Check individual clinic payment options on Pearlie.`,
    },
    {
      question: ({ borough, treatment }) =>
        `How do ${treatment.treatmentName.toLowerCase()} prices in ${borough.name} compare to central London?`,
      answer: ({ borough, treatment }) =>
        `${treatment.treatmentName} in ${borough.name} (${treatment.priceRange}) is generally more affordable than central London boroughs like Westminster or Kensington. You can often find comparable quality of care at lower prices.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Is it safe to choose the cheapest ${treatment.treatmentName.toLowerCase()} provider?`,
      answer: ({ borough, treatment }) =>
        `Price alone shouldn't determine your choice. All UK dentists must be GDC registered, but quality can vary. Look for providers with strong patient reviews, clear treatment plans, and transparent pricing. Pearlie verifies all listed clinics in ${borough.name}.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Is ${treatment.treatmentName.toLowerCase()} available on the NHS in ${borough.name}?`,
      answer: ({ borough, treatment }) =>
        `NHS availability for ${treatment.treatmentName.toLowerCase()} varies. ${borough.nhsInfo} For cosmetic treatments, private care is typically required. Pearlie shows both NHS and private options in ${borough.name}.`,
    },
    {
      question: ({ borough, treatment }) =>
        `How long does ${treatment.treatmentName.toLowerCase()} take?`,
      answer: ({ borough, treatment }) =>
        `${treatment.treatmentName} typically takes ${treatment.treatmentDuration}. Your dentist in ${borough.name} will provide a specific timeline during your consultation. Treatment planning is usually straightforward and can begin promptly.`,
    },
    {
      question: ({ borough, treatment }) =>
        `What should I expect at my first ${treatment.treatmentName.toLowerCase()} appointment?`,
      answer: ({ borough, treatment }) =>
        `Your first ${treatment.treatmentName.toLowerCase()} appointment in ${borough.name} will typically include an examination, discussion of treatment options, and a clear cost breakdown. Some clinics offer free initial consultations. Bring any questions about pricing, timeline, and expected results.`,
    },
    {
      question: ({ borough, treatment }) =>
        `Can I compare ${treatment.treatmentName.toLowerCase()} clinics in ${borough.name} before booking?`,
      answer: ({ borough, treatment }) =>
        `Yes. Pearlie lets you compare verified ${treatment.treatmentName.toLowerCase()} providers in ${borough.name} side by side, including pricing, reviews, and available treatments. This helps you make an informed decision before committing to any clinic.`,
    },
    {
      question: ({ borough }) =>
        `How do I verify a dentist is qualified in ${borough.name}?`,
      answer: ({ borough }) =>
        `Check that your dentist is registered with the General Dental Council (GDC) — you can verify this on the GDC website. All clinics listed on Pearlie in ${borough.name} are confirmed as GDC registered.`,
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
 *
 * Uses the borough archetype system to vary tone, phrasing, and FAQ selection
 * across pages. A deterministic hash ensures the same borough+treatment
 * combination always produces identical output (ISR-safe).
 */
function generateDefault(
  borough: LondonBorough,
  treatment: TreatmentMeta
): AreaTreatmentData {
  const key = `${borough.slug}:${treatment.slug}`
  const lm = rotatedLandmarks(borough, key)
  const tr = rotatedTransport(borough, key)
  const ctx: Ctx = { borough, treatment, lm, tr }
  const archetype = borough.archetype

  const localInsight = pick(INTRO_TEMPLATES[archetype], key)(ctx)
  const priceContext = pick(PRICE_TEMPLATES[archetype], `p:${key}`)(ctx)
  const demandSignal = pick(DEMAND_TEMPLATES[archetype], `d:${key}`)(ctx)
  const whyChoose = pick(WHY_CHOOSE_TEMPLATES[archetype], `w:${key}`)(ctx)

  // Select 7 FAQs from the archetype pool (first 3 are always core: cost, provider, finance)
  const coreFaqs = FAQ_POOL[archetype].slice(0, 3)
  const bonusFaqs = pickMultiple(FAQ_POOL[archetype].slice(3), 4, key)
  const selectedFaqs = [...coreFaqs, ...bonusFaqs]

  const areaFaqs = selectedFaqs.map((tpl) => ({
    question: tpl.question(ctx),
    answer: tpl.answer(ctx),
  }))

  return {
    localInsight,
    priceContext,
    demandSignal,
    whyChoose,
    educationalSections: TREATMENT_EDUCATIONAL[treatment.slug] || [],
    publishedAt: borough.publishedAt,
    updatedAt: borough.updatedAt,
    areaFaqs,
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
