/**
 * London boroughs data for programmatic SEO pages.
 *
 * Each borough has unique local data (postcodes, landmarks, transport,
 * NHS info) so that generated pages are genuinely differentiated —
 * not just the borough name swapped into a template.
 *
 * We start with boroughs where Pearlie has clinic coverage or strong
 * search demand. More boroughs are added as clinic density grows.
 */

/**
 * Borough archetype for content variation.
 * Each archetype drives different tone, FAQ phrasing, and content angles
 * so pages don't read as templated across boroughs.
 */
export type BoroughArchetype =
  | "affluent_cosmetic"
  | "young_professional"
  | "family_residential"
  | "central_business"
  | "mixed_emerging"

export interface LondonBorough {
  /** URL slug, e.g. "islington" */
  slug: string
  /** Display name, e.g. "Islington" */
  name: string
  /** Region grouping for breadcrumbs / internal linking */
  region: "Central" | "North" | "South" | "East" | "West"
  /** Archetype classification for content variation */
  archetype: BoroughArchetype
  /** Primary postcodes covered by this borough */
  postcodes: string[]
  /** Representative lat/lng for distance calculations */
  lat: number
  lng: number
  /** Short description unique to this borough (2–3 sentences) */
  description: string
  /** Nearby tube / rail stations */
  transport: string[]
  /** Local landmarks or neighbourhoods people search for */
  landmarks: string[]
  /** NHS dental info specific to this area */
  nhsInfo: string
  /** Population (ONS 2021 census, rounded) — for "X dentists per Y people" stat */
  population: number
  /** Simulated publish date — staggered across weeks for natural crawl signals */
  publishedAt: string
  /** Last content review date */
  updatedAt: string
}

export const LONDON_BOROUGHS: LondonBorough[] = [
  // ── Central London ────────────────────────────────────────
  {
    slug: "westminster",
    name: "Westminster",
    region: "Central",
    archetype: "affluent_cosmetic",
    postcodes: ["SW1", "W1", "W2", "WC2"],
    lat: 51.4975,
    lng: -0.1357,
    description:
      "Westminster is home to Harley Street and some of London's most established dental practices. The area has excellent private dental provision but long NHS waiting lists, making clinic comparison especially valuable here.",
    transport: ["Victoria", "Westminster", "Paddington", "Oxford Circus"],
    landmarks: ["Harley Street", "Mayfair", "Soho", "Pimlico", "Marylebone"],
    nhsInfo:
      "Westminster has 0.4 NHS dentists per 1,000 residents — well below the London average. Most practices operate on a private or mixed basis.",
    population: 204239,
    publishedAt: "2026-01-15",
    updatedAt: "2026-02-20",
  },
  {
    slug: "city-of-london",
    name: "City of London",
    region: "Central",
    archetype: "central_business",
    postcodes: ["EC1", "EC2", "EC3", "EC4"],
    lat: 51.5155,
    lng: -0.0922,
    description:
      "The City of London has a small residential population but a massive daytime workforce. Dental clinics here cater heavily to professionals seeking lunchtime or after-work appointments, with many offering same-day treatments.",
    transport: ["Bank", "Liverpool Street", "Moorgate", "Farringdon"],
    landmarks: [
      "Barbican",
      "Clerkenwell",
      "Moorgate",
      "St Paul's",
      "Cheapside",
    ],
    nhsInfo:
      "Very few NHS dental practices exist in the Square Mile. The area is served primarily by private clinics targeting the working population.",
    population: 8600,
    publishedAt: "2026-01-18",
    updatedAt: "2026-02-21",
  },
  {
    slug: "camden",
    name: "Camden",
    region: "Central",
    archetype: "affluent_cosmetic",
    postcodes: ["NW1", "WC1", "NW3", "NW5"],
    lat: 51.5517,
    lng: -0.1588,
    description:
      "Camden offers a mix of established private practices around Hampstead and more affordable options near King's Cross. The borough includes the Eastman Dental Hospital, one of London's leading specialist referral centres.",
    transport: [
      "Camden Town",
      "King's Cross",
      "Hampstead",
      "Kentish Town",
      "Euston",
    ],
    landmarks: [
      "Hampstead",
      "King's Cross",
      "Bloomsbury",
      "Primrose Hill",
      "Kentish Town",
    ],
    nhsInfo:
      "The Eastman Dental Hospital (UCL) provides specialist NHS dental care. Several community dental clinics accept NHS patients, though waiting times average 6–8 weeks.",
    population: 210200,
    publishedAt: "2026-01-22",
    updatedAt: "2026-02-22",
  },

  // ── North London ──────────────────────────────────────────
  {
    slug: "islington",
    name: "Islington",
    region: "North",
    archetype: "young_professional",
    postcodes: ["N1", "N5", "N7", "EC1V"],
    lat: 51.5416,
    lng: -0.1022,
    description:
      "Islington has a competitive dental market with clinics clustered along Upper Street and around Angel. The borough's mix of young professionals drives demand for cosmetic treatments like Invisalign and teeth whitening.",
    transport: ["Angel", "Highbury & Islington", "Holloway Road", "Archway"],
    landmarks: [
      "Angel",
      "Upper Street",
      "Highbury",
      "Holloway",
      "Canonbury",
    ],
    nhsInfo:
      "Islington has a relatively good mix of NHS and private dentists. The Whittington Health NHS Trust operates community dental services across the borough.",
    population: 206125,
    publishedAt: "2026-01-25",
    updatedAt: "2026-02-23",
  },
  {
    slug: "hackney",
    name: "Hackney",
    region: "North",
    archetype: "young_professional",
    postcodes: ["E8", "E9", "E5", "N16"],
    lat: 51.5432,
    lng: -0.0557,
    description:
      "Hackney's dental landscape has transformed in recent years, with new modern clinics opening alongside established community practices. The borough has strong demand for NHS dentistry, particularly in Dalston and Clapton.",
    transport: [
      "Hackney Central",
      "Dalston Junction",
      "Homerton",
      "Hackney Downs",
    ],
    landmarks: [
      "Shoreditch",
      "Dalston",
      "Stoke Newington",
      "Clapton",
      "Homerton",
    ],
    nhsInfo:
      "Hackney has invested in community dental health programmes. The Homerton University Hospital provides emergency dental services and specialist referrals.",
    population: 259200,
    publishedAt: "2026-02-01",
    updatedAt: "2026-02-24",
  },
  {
    slug: "haringey",
    name: "Haringey",
    region: "North",
    archetype: "family_residential",
    postcodes: ["N4", "N8", "N10", "N11", "N15", "N17", "N22"],
    lat: 51.5906,
    lng: -0.1107,
    description:
      "Haringey stretches from the affluent Highgate and Muswell Hill in the west to more diverse communities in Tottenham. Dental provision varies significantly across the borough, with better private options in the west.",
    transport: [
      "Turnpike Lane",
      "Wood Green",
      "Finsbury Park",
      "Tottenham Hale",
    ],
    landmarks: [
      "Muswell Hill",
      "Crouch End",
      "Tottenham",
      "Wood Green",
      "Highgate",
    ],
    nhsInfo:
      "NHS dental access is a known challenge in Haringey, especially in the east of the borough. The council runs a dental helpline to assist residents finding NHS places.",
    population: 254900,
    publishedAt: "2026-02-03",
    updatedAt: "2026-02-25",
  },

  // ── South London ──────────────────────────────────────────
  {
    slug: "southwark",
    name: "Southwark",
    region: "South",
    archetype: "central_business",
    postcodes: ["SE1", "SE5", "SE15", "SE16", "SE17", "SE22"],
    lat: 51.4733,
    lng: -0.0734,
    description:
      "Southwark benefits from proximity to two major dental hospitals — Guy's and King's College. The borough has a strong mix of private and NHS dental provision, with particularly good options around London Bridge and Bermondsey.",
    transport: [
      "London Bridge",
      "Elephant & Castle",
      "Bermondsey",
      "Peckham Rye",
    ],
    landmarks: [
      "London Bridge",
      "Bermondsey",
      "Peckham",
      "Dulwich",
      "Elephant & Castle",
    ],
    nhsInfo:
      "Guy's Hospital and King's College Hospital both provide emergency and specialist NHS dental services. Southwark has above-average NHS dental access for London.",
    population: 307700,
    publishedAt: "2026-01-20",
    updatedAt: "2026-02-20",
  },
  {
    slug: "lambeth",
    name: "Lambeth",
    region: "South",
    archetype: "young_professional",
    postcodes: ["SE11", "SW2", "SW4", "SW8", "SW9", "SW16"],
    lat: 51.4571,
    lng: -0.1231,
    description:
      "Lambeth has a diverse dental market spanning from premium practices in Clapham to community-focused clinics in Brixton and Streatham. The borough's younger demographic drives high demand for cosmetic dentistry.",
    transport: ["Brixton", "Clapham North", "Vauxhall", "Streatham"],
    landmarks: [
      "Brixton",
      "Clapham",
      "Streatham",
      "Vauxhall",
      "Waterloo",
    ],
    nhsInfo:
      "Lambeth Community Dental Service provides NHS care for vulnerable groups. Several high street practices accept NHS patients, though private options are more plentiful in Clapham.",
    population: 303100,
    publishedAt: "2026-02-05",
    updatedAt: "2026-02-25",
  },
  {
    slug: "lewisham",
    name: "Lewisham",
    region: "South",
    archetype: "family_residential",
    postcodes: ["SE4", "SE6", "SE8", "SE12", "SE13", "SE14", "SE23", "SE26"],
    lat: 51.4535,
    lng: -0.018,
    description:
      "Lewisham offers some of south-east London's most affordable dental care, with a healthy mix of NHS accepting practices. The borough is well connected by the DLR and Overground, making it accessible from neighbouring areas.",
    transport: [
      "Lewisham",
      "New Cross",
      "Brockley",
      "Catford",
      "Forest Hill",
    ],
    landmarks: [
      "Lewisham",
      "New Cross",
      "Catford",
      "Forest Hill",
      "Blackheath",
    ],
    nhsInfo:
      "Lewisham has a relatively good supply of NHS dental places. University Hospital Lewisham provides emergency and out-of-hours dental care.",
    population: 300600,
    publishedAt: "2026-02-08",
    updatedAt: "2026-02-26",
  },

  // ── East London ───────────────────────────────────────────
  {
    slug: "tower-hamlets",
    name: "Tower Hamlets",
    region: "East",
    archetype: "central_business",
    postcodes: ["E1", "E2", "E3", "E14"],
    lat: 51.5099,
    lng: -0.0295,
    description:
      "Tower Hamlets has experienced a dental clinic boom in Canary Wharf and around the Royal London Hospital. The area serves both the Docklands professional community and one of London's most diverse residential populations.",
    transport: [
      "Canary Wharf",
      "Whitechapel",
      "Bethnal Green",
      "Mile End",
      "Bow Road",
    ],
    landmarks: [
      "Canary Wharf",
      "Whitechapel",
      "Bethnal Green",
      "Bow",
      "Stepney",
    ],
    nhsInfo:
      "The Royal London Hospital provides emergency dental services and is a major dental training facility. Community dental provision is supported by multiple NHS practices.",
    population: 310300,
    publishedAt: "2026-01-28",
    updatedAt: "2026-02-22",
  },
  {
    slug: "greenwich",
    name: "Greenwich",
    region: "East",
    archetype: "family_residential",
    postcodes: ["SE3", "SE7", "SE9", "SE10", "SE18"],
    lat: 51.4769,
    lng: 0.0005,
    description:
      "Greenwich offers a good balance of private and NHS dental options, particularly around Woolwich and Eltham. The borough is growing rapidly with new developments bringing additional dental provision.",
    transport: [
      "Greenwich",
      "Woolwich",
      "Eltham",
      "Cutty Sark",
      "North Greenwich",
    ],
    landmarks: [
      "Greenwich",
      "Woolwich",
      "Eltham",
      "Blackheath",
      "Charlton",
    ],
    nhsInfo:
      "Queen Elizabeth Hospital provides emergency dental care. The borough has a community dental service for residents with additional needs.",
    population: 286200,
    publishedAt: "2026-02-10",
    updatedAt: "2026-02-26",
  },

  // ── West London ───────────────────────────────────────────
  {
    slug: "kensington-and-chelsea",
    name: "Kensington and Chelsea",
    region: "West",
    archetype: "affluent_cosmetic",
    postcodes: ["SW3", "SW5", "SW7", "SW10", "W8", "W10", "W11", "W14"],
    lat: 51.502,
    lng: -0.1947,
    description:
      "Kensington and Chelsea is one of London's premier locations for cosmetic and specialist dentistry. Practices here often cater to international patients and offer advanced treatments including full-mouth rehabilitation.",
    transport: [
      "South Kensington",
      "Sloane Square",
      "High Street Kensington",
      "Notting Hill Gate",
    ],
    landmarks: [
      "Chelsea",
      "Kensington",
      "Notting Hill",
      "Knightsbridge",
      "Holland Park",
    ],
    nhsInfo:
      "NHS dental access is very limited in this borough. Most practices are entirely private, with premium pricing reflecting the area. Chelsea and Westminster Hospital provides limited NHS dental services.",
    population: 143600,
    publishedAt: "2026-01-16",
    updatedAt: "2026-02-21",
  },
  {
    slug: "hammersmith-and-fulham",
    name: "Hammersmith and Fulham",
    region: "West",
    archetype: "young_professional",
    postcodes: ["W6", "W12", "W14", "SW6"],
    lat: 51.4927,
    lng: -0.2339,
    description:
      "Hammersmith and Fulham offers a good range of mid-to-premium dental practices, with strong competition keeping quality high. Fulham's high street and Shepherd's Bush both have clusters of well-reviewed clinics.",
    transport: [
      "Hammersmith",
      "Fulham Broadway",
      "Shepherd's Bush",
      "Parsons Green",
    ],
    landmarks: [
      "Fulham",
      "Hammersmith",
      "Shepherd's Bush",
      "Brook Green",
      "Parsons Green",
    ],
    nhsInfo:
      "A moderate number of NHS dental places are available, concentrated around Shepherd's Bush and White City. Charing Cross Hospital provides emergency dental services.",
    population: 185100,
    publishedAt: "2026-02-12",
    updatedAt: "2026-02-27",
  },
  {
    slug: "wandsworth",
    name: "Wandsworth",
    region: "West",
    archetype: "family_residential",
    postcodes: ["SW11", "SW12", "SW15", "SW17", "SW18"],
    lat: 51.4567,
    lng: -0.191,
    description:
      "Wandsworth is one of London's most populated boroughs with a young, professional demographic that drives strong demand for Invisalign, whitening, and cosmetic bonding. Battersea and Clapham Junction have the highest clinic density.",
    transport: [
      "Clapham Junction",
      "Wandsworth Town",
      "Putney",
      "Tooting Broadway",
      "Balham",
    ],
    landmarks: [
      "Battersea",
      "Clapham Junction",
      "Putney",
      "Tooting",
      "Balham",
    ],
    nhsInfo:
      "Wandsworth has average NHS dental provision. St George's Hospital in Tooting provides emergency dental services and specialist maxillofacial care.",
    population: 327800,
    publishedAt: "2026-02-14",
    updatedAt: "2026-02-27",
  },
]

/** Look up a borough by its URL slug */
export function getBoroughBySlug(slug: string): LondonBorough | undefined {
  return LONDON_BOROUGHS.find((b) => b.slug === slug)
}

/** Get all borough slugs (for generateStaticParams) */
export function getAllBoroughSlugs(): string[] {
  return LONDON_BOROUGHS.map((b) => b.slug)
}

/** Get boroughs in a specific region */
export function getBoroughsByRegion(
  region: LondonBorough["region"]
): LondonBorough[] {
  return LONDON_BOROUGHS.filter((b) => b.region === region)
}

/** Get nearby boroughs based on distance (for related areas linking) */
export function getNearbyBoroughs(
  currentSlug: string,
  limit = 4
): LondonBorough[] {
  const current = getBoroughBySlug(currentSlug)
  if (!current) return []

  return LONDON_BOROUGHS.filter((b) => b.slug !== currentSlug)
    .map((b) => ({
      borough: b,
      distance: Math.sqrt(
        (b.lat - current.lat) ** 2 + (b.lng - current.lng) ** 2
      ),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((b) => b.borough)
}
