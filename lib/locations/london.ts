export interface AreaFaqItem {
  question: string
  answer: string
}

export interface LondonArea {
  slug: string
  name: string
  /** Short name for badges/chips */
  shortName: string
  center: { lat: number; lng: number }
  /** Search radius in miles */
  radiusMiles: number
  /** Leaflet map zoom level */
  mapZoom: number
  metaTitle: string
  metaDescription: string
  /** 1-2 sentence intro shown in the hero */
  intro: string
  /** Longer description shown below hero */
  description: string
  faq: AreaFaqItem[]
  /** Slugs of nearby areas for cross-linking */
  nearbyAreas: string[]
}

export const LONDON_AREAS: LondonArea[] = [
  {
    slug: "harley-street",
    name: "Harley Street",
    shortName: "Harley St",
    center: { lat: 51.5188, lng: -0.1483 },
    radiusMiles: 1.0,
    mapZoom: 15,
    metaTitle: "Find a Dentist on Harley Street, London",
    metaDescription:
      "Compare trusted, GDC-registered dentists on Harley Street. See ratings, treatments, and pricing — then book directly through Pearlie.",
    intro:
      "Harley Street is London's most renowned medical district, home to some of the UK's leading dental specialists and cosmetic dentists.",
    description:
      "Whether you're looking for cosmetic dentistry, dental implants, Invisalign, or a routine check-up, Harley Street offers a concentration of highly qualified practitioners. Pearlie helps you cut through the noise — compare verified clinics, see real ratings, and book with confidence.",
    faq: [
      {
        question: "How much does a dentist on Harley Street cost?",
        answer:
          "Consultations on Harley Street typically range from £100–£250. Treatment costs vary by procedure — Invisalign starts from around £2,500, veneers from £500 per tooth, and implants from £2,000. Pearlie shows indicative pricing for each clinic so you can compare before booking.",
      },
      {
        question: "Are Harley Street dentists better than other London dentists?",
        answer:
          "Harley Street has a high concentration of specialist and experienced dentists, but quality care exists across London. What matters most is finding a GDC-registered dentist with experience in your specific treatment. Pearlie helps you compare based on fit, not just location.",
      },
      {
        question: "Can I get emergency dental care on Harley Street?",
        answer:
          "Several Harley Street clinics offer same-day or next-day emergency appointments. Use Pearlie to check availability and message clinics directly to arrange urgent care.",
      },
    ],
    nearbyAreas: ["soho", "mayfair", "camden"],
  },
  {
    slug: "canary-wharf",
    name: "Canary Wharf",
    shortName: "Canary Wharf",
    center: { lat: 51.5054, lng: -0.0235 },
    radiusMiles: 1.5,
    mapZoom: 14,
    metaTitle: "Find a Dentist in Canary Wharf, London",
    metaDescription:
      "Compare GDC-registered dentists near Canary Wharf. See ratings, availability, and pricing — book through Pearlie, free.",
    intro:
      "Canary Wharf is one of London's major business hubs, with a growing number of modern dental practices serving professionals in the area.",
    description:
      "Whether you need a lunchtime check-up, teeth whitening, or a specialist consultation, clinics near Canary Wharf cater to busy professionals with flexible hours and convenient locations. Pearlie helps you find the right fit without the endless searching.",
    faq: [
      {
        question: "Are there dentists open after work in Canary Wharf?",
        answer:
          "Yes — several clinics near Canary Wharf offer early morning and evening appointments to suit working schedules. Check availability on Pearlie and message clinics directly.",
      },
      {
        question: "How much does a dental check-up cost near Canary Wharf?",
        answer:
          "A private dental check-up near Canary Wharf typically costs £60–£150. Pearlie shows indicative pricing for each clinic so you can compare before committing.",
      },
      {
        question: "Can I find NHS dentists near Canary Wharf on Pearlie?",
        answer:
          "Pearlie focuses on private dental clinics. For NHS dental services, visit the NHS Find a Dentist tool. However, some Pearlie-listed clinics may accept NHS patients for certain treatments.",
      },
    ],
    nearbyAreas: ["shoreditch", "stratford"],
  },
  {
    slug: "kensington-chelsea",
    name: "Kensington & Chelsea",
    shortName: "Kensington",
    center: { lat: 51.4873, lng: -0.1687 },
    radiusMiles: 1.5,
    mapZoom: 14,
    metaTitle: "Find a Dentist in Kensington & Chelsea, London",
    metaDescription:
      "Compare verified dentists in Kensington and Chelsea. See ratings, treatments, and prices — book free through Pearlie.",
    intro:
      "Kensington and Chelsea is home to some of London's most established private dental practices, offering a wide range of treatments in a premium setting.",
    description:
      "From routine dental care to high-end cosmetic treatments, clinics in Kensington and Chelsea combine clinical excellence with patient-centred service. Pearlie helps you compare verified options and find a dentist that matches your needs and budget.",
    faq: [
      {
        question: "What dental treatments are popular in Kensington?",
        answer:
          "Cosmetic dentistry is particularly popular in Kensington — including veneers, composite bonding, teeth whitening, and Invisalign. Many clinics also offer general dentistry, implants, and specialist referrals.",
      },
      {
        question: "How do I choose between dentists in Kensington and Chelsea?",
        answer:
          "Look for GDC registration, patient reviews, and experience with your specific treatment. Pearlie lets you compare all of this side-by-side, plus message clinics directly with questions before booking.",
      },
    ],
    nearbyAreas: ["harley-street", "notting-hill", "mayfair"],
  },
  {
    slug: "shoreditch",
    name: "Shoreditch",
    shortName: "Shoreditch",
    center: { lat: 51.5245, lng: -0.0755 },
    radiusMiles: 1.5,
    mapZoom: 14,
    metaTitle: "Find a Dentist in Shoreditch, London",
    metaDescription:
      "Compare trusted dentists near Shoreditch and East London. GDC-registered, transparent pricing — book free through Pearlie.",
    intro:
      "Shoreditch and the surrounding East London area has a vibrant mix of modern dental practices offering everything from routine care to cosmetic treatments.",
    description:
      "Whether you live or work in Shoreditch, finding the right dentist shouldn't mean scrolling through endless listings. Pearlie matches you with verified, GDC-registered clinics nearby — so you can compare ratings, pricing, and availability in one place.",
    faq: [
      {
        question: "Are there affordable dentists near Shoreditch?",
        answer:
          "Yes — dental practices in East London span a range of price points. Pearlie shows indicative pricing for each clinic, so you can find options that match your budget without compromising on quality.",
      },
      {
        question: "What areas does Shoreditch dental search cover?",
        answer:
          "Our Shoreditch search includes clinics in Shoreditch, Hoxton, Hackney, Bethnal Green, and the surrounding East London area — all within easy reach.",
      },
    ],
    nearbyAreas: ["canary-wharf", "camden", "stratford"],
  },
  {
    slug: "soho",
    name: "Soho",
    shortName: "Soho",
    center: { lat: 51.5137, lng: -0.1337 },
    radiusMiles: 1.0,
    mapZoom: 15,
    metaTitle: "Find a Dentist in Soho, London",
    metaDescription:
      "Compare GDC-registered dentists in Soho and the West End. See ratings, treatments, pricing — book free through Pearlie.",
    intro:
      "Soho sits at the heart of London's West End, with excellent access to a range of private dental practices for both residents and workers in the area.",
    description:
      "Centrally located and well-connected, Soho is an ideal base for finding a dentist that fits your schedule. Whether you need a quick consultation between meetings or a full cosmetic treatment plan, Pearlie helps you compare verified clinics in the area.",
    faq: [
      {
        question: "Can I find a dentist near Oxford Street or Covent Garden?",
        answer:
          "Yes — our Soho search covers the wider West End area including Oxford Street, Covent Garden, Leicester Square, and Fitzrovia. All listed clinics are GDC-registered and verified by Pearlie.",
      },
      {
        question: "Do Soho dentists offer lunchtime appointments?",
        answer:
          "Many dental clinics in central London offer flexible scheduling including lunchtime slots. Check availability on Pearlie and book directly.",
      },
    ],
    nearbyAreas: ["harley-street", "mayfair", "camden"],
  },
  {
    slug: "mayfair",
    name: "Mayfair",
    shortName: "Mayfair",
    center: { lat: 51.5095, lng: -0.1480 },
    radiusMiles: 1.0,
    mapZoom: 15,
    metaTitle: "Find a Dentist in Mayfair, London",
    metaDescription:
      "Compare premium dentists in Mayfair. GDC-registered, verified reviews, transparent pricing — book free on Pearlie.",
    intro:
      "Mayfair is home to London's most prestigious dental practices, many of which specialise in high-end cosmetic and restorative dentistry.",
    description:
      "From Invisalign and porcelain veneers to full-mouth rehabilitation, Mayfair dentists offer world-class care in central London. Pearlie helps you compare options on quality and fit — not just price — so you find the right practitioner for your goals.",
    faq: [
      {
        question: "Why are Mayfair dentists more expensive?",
        answer:
          "Mayfair practices often invest in premium facilities, specialist clinicians, and advanced technology. However, costs vary significantly between clinics. Pearlie shows indicative pricing so you can compare and find the best value for your needs.",
      },
      {
        question: "Is it worth seeing a dentist in Mayfair?",
        answer:
          "Mayfair has a high concentration of experienced specialists, particularly for cosmetic and restorative work. If you're considering a complex treatment, seeing a specialist in the area can be worthwhile. Pearlie helps you decide by comparing verified clinics side-by-side.",
      },
    ],
    nearbyAreas: ["harley-street", "soho", "kensington-chelsea"],
  },
  {
    slug: "camden",
    name: "Camden",
    shortName: "Camden",
    center: { lat: 51.5392, lng: -0.1426 },
    radiusMiles: 1.5,
    mapZoom: 14,
    metaTitle: "Find a Dentist in Camden, London",
    metaDescription:
      "Compare verified dentists in Camden and North London. See ratings, treatments, and pricing — book free through Pearlie.",
    intro:
      "Camden and the surrounding North London area offers a great range of dental practices, from boutique clinics to larger multi-practitioner centres.",
    description:
      "Whether you're in Camden Town, Kentish Town, or King's Cross, there are quality dental options nearby. Pearlie helps you compare GDC-registered clinics based on treatment expertise, patient reviews, and availability — all in one place.",
    faq: [
      {
        question: "Are there good dentists near King's Cross?",
        answer:
          "Yes — our Camden search covers King's Cross, Kentish Town, Bloomsbury, and the wider North London area. All clinics on Pearlie are GDC-registered and independently verified.",
      },
      {
        question: "How do I register with a dentist in Camden?",
        answer:
          "Private dentists don't require formal registration like NHS practices. You can simply browse clinics on Pearlie, compare options, and book your first appointment directly.",
      },
    ],
    nearbyAreas: ["harley-street", "shoreditch", "soho"],
  },
  {
    slug: "notting-hill",
    name: "Notting Hill",
    shortName: "Notting Hill",
    center: { lat: 51.5092, lng: -0.1964 },
    radiusMiles: 1.5,
    mapZoom: 14,
    metaTitle: "Find a Dentist in Notting Hill, London",
    metaDescription:
      "Compare trusted dentists in Notting Hill and West London. GDC-registered, verified — book free through Pearlie.",
    intro:
      "Notting Hill and the surrounding West London area is served by a range of well-regarded private dental practices, offering both general and specialist care.",
    description:
      "From Portobello Road to Westbourne Grove, Notting Hill residents have access to excellent dental care. Pearlie lets you compare verified clinics nearby — see ratings, treatments offered, and indicative pricing before you book.",
    faq: [
      {
        question: "What dental clinics are near Notting Hill Gate?",
        answer:
          "Our Notting Hill search covers the wider area including Bayswater, Holland Park, and Ladbroke Grove. All clinics are verified by Pearlie and GDC-registered.",
      },
      {
        question: "Can I find a family dentist in Notting Hill?",
        answer:
          "Yes — many practices in the area welcome patients of all ages. Use Pearlie to filter by treatment type and find clinics that offer family-friendly care.",
      },
    ],
    nearbyAreas: ["kensington-chelsea", "mayfair", "harley-street"],
  },
  {
    slug: "brixton",
    name: "Brixton",
    shortName: "Brixton",
    center: { lat: 51.4613, lng: -0.1156 },
    radiusMiles: 2.0,
    mapZoom: 14,
    metaTitle: "Find a Dentist in Brixton, London",
    metaDescription:
      "Compare verified dentists near Brixton and South London. See ratings, pricing, and treatments — book free on Pearlie.",
    intro:
      "Brixton and South London has a growing selection of private dental practices offering modern, patient-focused care at a range of price points.",
    description:
      "Finding a good dentist in South London doesn't have to be difficult. Pearlie helps you compare verified, GDC-registered clinics near Brixton — see real patient ratings, treatment options, and indicative pricing all in one place.",
    faq: [
      {
        question: "Are there affordable private dentists near Brixton?",
        answer:
          "Yes — South London offers a range of private dental practices at different price points. Pearlie shows indicative pricing for each clinic, helping you find quality care that fits your budget.",
      },
      {
        question: "What areas does the Brixton dental search cover?",
        answer:
          "Our Brixton search includes Clapham, Herne Hill, Camberwell, Peckham, and the surrounding South London area — all within easy reach by public transport.",
      },
    ],
    nearbyAreas: ["kensington-chelsea", "canary-wharf"],
  },
  {
    slug: "stratford",
    name: "Stratford",
    shortName: "Stratford",
    center: { lat: 51.5430, lng: -0.0003 },
    radiusMiles: 2.0,
    mapZoom: 14,
    metaTitle: "Find a Dentist in Stratford, East London",
    metaDescription:
      "Compare GDC-registered dentists near Stratford and East London. Verified clinics, real ratings — book free through Pearlie.",
    intro:
      "Stratford and the Olympic Park area has seen significant growth in modern healthcare facilities, including quality private dental practices.",
    description:
      "East London's Stratford is well-connected and increasingly well-served by private dental clinics. Pearlie helps you find verified dentists nearby — compare treatments, read reviews, and book directly without the hassle.",
    faq: [
      {
        question: "Are there dentists near Westfield Stratford City?",
        answer:
          "Yes — our Stratford search covers the Westfield area, Olympic Park, Leyton, and the wider East London neighbourhood. All clinics are GDC-registered and verified by Pearlie.",
      },
      {
        question: "Is private dental care affordable in East London?",
        answer:
          "East London generally offers competitive private dental pricing compared to central London. Pearlie shows indicative costs for each clinic so you can compare options easily.",
      },
    ],
    nearbyAreas: ["shoreditch", "canary-wharf"],
  },
]

export function getAreaBySlug(slug: string): LondonArea | undefined {
  return LONDON_AREAS.find((a) => a.slug === slug)
}

export function getAllAreaSlugs(): string[] {
  return LONDON_AREAS.map((a) => a.slug)
}
