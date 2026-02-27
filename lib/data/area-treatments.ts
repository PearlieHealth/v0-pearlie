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

export interface AreaTreatmentData {
  /** Unique intro paragraph for this borough + treatment combo */
  localInsight: string
  /** Area-specific price context (e.g. "slightly above London average") */
  priceContext: string
  /** Local demand signal (what makes this area special for this treatment) */
  demandSignal: string
  /** Staggered publish date for this specific page */
  publishedAt: string
  updatedAt: string
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
    publishedAt: "2026-01-16",
    updatedAt: "2026-02-20",
  },
  "westminster:teeth-whitening": {
    localInsight:
      "Teeth whitening in Westminster ranges from express in-chair sessions near Oxford Street to bespoke Boutique Whitening protocols on Harley Street. The density of cosmetic clinics means patients can often get same-week appointments.",
    priceContext:
      "Expect to pay £300–£800 for professional whitening in Westminster — at the higher end of the London range, but with access to premium Philips Zoom and Enlighten systems.",
    demandSignal:
      "Westminster sees peak whitening searches before wedding season (April–June) and Christmas party season. Clinics near Mayfair report 40% of whitening patients are first-time cosmetic dental patients.",
    publishedAt: "2026-01-18",
    updatedAt: "2026-02-21",
  },
  "westminster:dental-implants": {
    localInsight:
      "Westminster's Harley Street has the highest concentration of implantologists in the UK. Many offer guided surgery with 3D CBCT scanning, and several are teaching faculty at the Royal College of Surgeons.",
    priceContext:
      "Single implant prices in Westminster range from £2,500 to £6,000, reflecting the specialist expertise available. All-on-4 full arch solutions start from around £12,000.",
    demandSignal:
      "Patients travel from across London and the UK for implant treatment in Westminster due to the specialist reputation. Second-opinion consultations are a frequent search intent.",
    publishedAt: "2026-01-20",
    updatedAt: "2026-02-22",
  },

  // ── Islington ─────────────────────────────────────
  "islington:invisalign": {
    localInsight:
      "Islington's Angel and Upper Street area has become a hotspot for Invisalign providers competing on price and service. Several clinics offer free 3D scanning consultations, making it easy to compare treatment plans before committing.",
    priceContext:
      "Invisalign prices in Islington are competitive, typically £2,500–£4,500 — below the central London average. Several clinics offer 0% finance over 12–24 months.",
    demandSignal:
      "Islington's 25–40 age demographic drives some of the highest Invisalign search volumes in north London. 'Invisalign Angel' and 'clear aligners Upper Street' are frequent local search terms.",
    publishedAt: "2026-01-26",
    updatedAt: "2026-02-23",
  },
  "islington:composite-bonding": {
    localInsight:
      "Composite bonding has become one of the most requested cosmetic treatments in Islington, with several clinics specialising in same-day smile makeovers. The treatment's affordability compared to veneers makes it particularly popular here.",
    priceContext:
      "Composite bonding in Islington typically costs £150–£350 per tooth — mid-range for London. Multi-tooth packages (4–6 teeth) with discounted rates are commonly offered.",
    demandSignal:
      "Instagram-driven demand is high in Islington's younger demographic. 'Composite bonding before and after' and 'tooth bonding near Angel' are trending local search terms.",
    publishedAt: "2026-01-28",
    updatedAt: "2026-02-24",
  },

  // ── Southwark ─────────────────────────────────────
  "southwark:emergency-dental": {
    localInsight:
      "Southwark has some of the best emergency dental access in London thanks to Guy's Hospital on St Thomas Street, which operates a walk-in dental emergency department. Several private practices near London Bridge also offer same-day emergency slots.",
    priceContext:
      "Emergency dental assessments in Southwark range from £50 to £150 privately. Guy's Hospital provides NHS emergency care at Band 1 rates (£26.80).",
    demandSignal:
      "High search volume for emergency dentistry due to Guy's Hospital proximity. 'Emergency dentist London Bridge' and 'dental A&E near me' are top local queries.",
    publishedAt: "2026-01-21",
    updatedAt: "2026-02-20",
  },
  "southwark:dental-implants": {
    localInsight:
      "King's College Hospital and Guy's Hospital make Southwark a centre of excellence for dental implants in south London. Several former hospital consultants now run private implant practices in the London Bridge area.",
    priceContext:
      "Implant prices in Southwark are competitive at £2,000–£4,500 per single implant, benefiting from proximity to teaching hospitals that drive specialist availability.",
    demandSignal:
      "Patients from across south-east London travel to Southwark for implants due to the specialist concentration. 'Dental implants London Bridge' has high commercial search intent.",
    publishedAt: "2026-01-23",
    updatedAt: "2026-02-21",
  },

  // ── Kensington and Chelsea ────────────────────────
  "kensington-and-chelsea:veneers": {
    localInsight:
      "Kensington and Chelsea is London's premier destination for porcelain veneers, with multiple clinics offering bespoke smile design using digital workflows. Several practitioners here are recognised as UK leaders in minimally-invasive veneer techniques.",
    priceContext:
      "Porcelain veneers in Kensington and Chelsea typically cost £800–£1,200 per tooth — at the premium end for London. However, the quality of lab work and clinical expertise justifies the investment for many patients.",
    demandSignal:
      "International patients frequently seek veneers in this borough. 'Veneers Chelsea', 'smile makeover Kensington', and 'porcelain veneers London' are high-value local search terms.",
    publishedAt: "2026-01-17",
    updatedAt: "2026-02-21",
  },

  // ── Tower Hamlets ─────────────────────────────────
  "tower-hamlets:teeth-whitening": {
    localInsight:
      "Tower Hamlets offers teeth whitening at two ends of the market — premium clinics in Canary Wharf serving the financial district, and more affordable options around Whitechapel and Bethnal Green. The Royal London Hospital also trains dental hygienists who offer whitening at reduced rates.",
    priceContext:
      "Whitening prices range from £200 in east Tower Hamlets to £600+ in Canary Wharf. The variation is among the widest in any single London borough.",
    demandSignal:
      "Canary Wharf professionals drive lunchtime and after-work whitening demand. 'Teeth whitening Canary Wharf' and 'whitening Whitechapel' reflect the borough's dual market.",
    publishedAt: "2026-01-29",
    updatedAt: "2026-02-22",
  },

  // ── Wandsworth ────────────────────────────────────
  "wandsworth:invisalign": {
    localInsight:
      "Wandsworth has emerged as one of south-west London's strongest markets for Invisalign, with multiple providers clustered around Clapham Junction and Putney. The borough's young professional population means clinics here handle a high volume of cases.",
    priceContext:
      "Invisalign in Wandsworth typically costs £2,800–£4,800, sitting in the mid-range for London. Several clinics offer interest-free finance and free refinements.",
    demandSignal:
      "Wandsworth has the highest proportion of 25–34 year olds of any London borough, driving strong cosmetic dentistry demand. 'Invisalign Battersea', 'clear aligners Clapham' are frequent searches.",
    publishedAt: "2026-02-15",
    updatedAt: "2026-02-27",
  },

  // ── Lambeth ───────────────────────────────────────
  "lambeth:composite-bonding": {
    localInsight:
      "Brixton and Clapham have seen a surge in cosmetic bonding providers, with several clinics offering social-media-friendly before/after packages. The treatment's one-visit convenience suits the borough's busy young population.",
    priceContext:
      "Composite bonding in Lambeth ranges from £150 to £350 per tooth. Clapham practices tend to charge at the upper end, while Brixton and Streatham clinics are more affordable.",
    demandSignal:
      "TikTok and Instagram are driving bonding demand in Lambeth's younger demographic. 'Composite bonding Clapham' and 'tooth bonding Brixton' show strong month-on-month growth.",
    publishedAt: "2026-02-06",
    updatedAt: "2026-02-25",
  },

  // ── Hackney ───────────────────────────────────────
  "hackney:emergency-dental": {
    localInsight:
      "Hackney residents benefit from the Homerton University Hospital's dental emergency department for out-of-hours care. Several practices in Dalston and Stoke Newington also hold same-day emergency slots for registered and non-registered patients.",
    priceContext:
      "Emergency assessments in Hackney range from £50 to £120 privately. NHS emergency care is available through the Homerton at Band 1 rates.",
    demandSignal:
      "'Emergency dentist Hackney' and 'dental pain Dalston' are high-urgency search terms with strong local volume, particularly on weekends.",
    publishedAt: "2026-02-02",
    updatedAt: "2026-02-24",
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
    publishedAt: borough.publishedAt,
    updatedAt: borough.updatedAt,
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
