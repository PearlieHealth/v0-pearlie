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
      {
        question: "What cosmetic dental treatments are available on Harley Street?",
        answer:
          "Harley Street clinics offer the full range of cosmetic dentistry including porcelain veneers, composite bonding, professional teeth whitening, Invisalign, smile makeovers, and dental implants. Many practitioners are recognised specialists in their field.",
      },
      {
        question: "Do Harley Street dentists offer payment plans or finance?",
        answer:
          "Many Harley Street practices offer interest-free finance or monthly payment plans for treatments like Invisalign, implants, and veneers. Ask clinics directly through Pearlie about their finance options before committing.",
      },
      {
        question: "Is Harley Street convenient by public transport?",
        answer:
          "Yes — Harley Street is a short walk from Oxford Circus, Regent's Park, Great Portland Street, and Bond Street stations. It's one of the best-connected dental districts in London.",
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
      {
        question: "What treatments can I get near Canary Wharf?",
        answer:
          "Dental clinics near Canary Wharf offer a full range of treatments including check-ups, hygiene appointments, teeth whitening, Invisalign, composite bonding, veneers, and emergency dental care. Use Pearlie to compare clinics by treatment speciality.",
      },
      {
        question: "Are there weekend dentists near Canary Wharf?",
        answer:
          "Some clinics in the Canary Wharf area offer Saturday appointments, and a few open on Sundays. Pearlie lets you check availability and message clinics directly to find a time that suits you.",
      },
      {
        question: "Is there a dentist inside Canary Wharf shopping centre?",
        answer:
          "There are dental practices within walking distance of Canary Wharf's main shopping and business areas, including inside nearby malls and office buildings. Our search covers all verified clinics in the immediate area.",
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
      {
        question: "How much does a private dentist cost in Kensington?",
        answer:
          "A private check-up in Kensington typically costs £80–£200. Cosmetic treatments like veneers start from around £500 per tooth. Pearlie shows indicative pricing for each clinic so you can compare before committing.",
      },
      {
        question: "Are there emergency dentists in Kensington and Chelsea?",
        answer:
          "Yes — several Kensington and Chelsea clinics offer same-day or urgent appointments for dental emergencies. Use Pearlie to find clinics with availability and message them directly.",
      },
      {
        question: "Can I get Invisalign in Kensington?",
        answer:
          "Many Kensington dental practices are certified Invisalign providers, including Diamond and Platinum-tier practices. Pearlie helps you compare clinics by experience level and indicative pricing for clear aligner treatment.",
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
      {
        question: "Can I find a cosmetic dentist in Shoreditch?",
        answer:
          "Yes — Shoreditch has a growing number of modern dental practices offering cosmetic treatments including teeth whitening, composite bonding, veneers, and Invisalign. Pearlie helps you compare clinics by treatment speciality.",
      },
      {
        question: "Are there weekend dentists near Shoreditch?",
        answer:
          "Some East London clinics offer Saturday appointments. Use Pearlie to check weekend availability and book directly with the clinic that suits your schedule.",
      },
      {
        question: "How do I find a good dentist near Liverpool Street?",
        answer:
          "Our Shoreditch search covers the Liverpool Street and City fringe area. All clinics on Pearlie are GDC-registered and independently verified — compare ratings, treatments, and pricing to find the right fit.",
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
      {
        question: "How much does a dentist in Soho cost?",
        answer:
          "Private check-ups in Soho and the West End typically cost £80–£200. Cosmetic treatments vary by clinic — Pearlie shows indicative pricing so you can compare before booking.",
      },
      {
        question: "Can I get emergency dental treatment in Soho?",
        answer:
          "Several central London clinics near Soho offer same-day emergency appointments for issues like toothache, broken teeth, or swelling. Use Pearlie to find clinics with urgent availability.",
      },
      {
        question: "What cosmetic treatments are available in Soho?",
        answer:
          "Soho clinics offer a wide range of cosmetic dentistry including teeth whitening, Invisalign, porcelain veneers, composite bonding, and smile makeovers. Many are conveniently located near West End tube stations.",
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
      {
        question: "What specialist treatments can I find in Mayfair?",
        answer:
          "Mayfair clinics offer advanced treatments including full-mouth rehabilitation, dental implants, porcelain veneers, smile makeovers, Invisalign, and sedation dentistry. Many practitioners are recognised specialists in prosthodontics or cosmetic dentistry.",
      },
      {
        question: "Do Mayfair dental clinics offer finance options?",
        answer:
          "Many Mayfair practices offer interest-free finance or monthly payment plans, especially for higher-value treatments like implants and veneers. Ask clinics directly through Pearlie about their finance options.",
      },
      {
        question: "Can I get a second opinion from a Mayfair dentist?",
        answer:
          "Yes — many patients visit Mayfair specialists for second opinions on complex treatment plans. Use Pearlie to find clinics with the right expertise and book a consultation.",
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
      {
        question: "How much does a dentist in Camden cost?",
        answer:
          "A private dental check-up in Camden typically costs £60–£150. Treatment costs vary — Invisalign starts from around £2,500, and teeth whitening from £250. Pearlie shows indicative pricing for each clinic.",
      },
      {
        question: "Can I find an emergency dentist in Camden?",
        answer:
          "Several Camden clinics offer same-day or urgent appointments for dental emergencies. Use Pearlie to check availability and message clinics directly to arrange urgent care.",
      },
      {
        question: "Are there dentists near Camden Town tube station?",
        answer:
          "Yes — there are several verified dental practices within walking distance of Camden Town station, as well as nearby Mornington Crescent and Chalk Farm. All are listed on Pearlie with ratings and pricing.",
      },
    ],
    nearbyAreas: ["islington", "harley-street", "hampstead"],
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
      {
        question: "How much does a private dentist cost in Notting Hill?",
        answer:
          "A private check-up in Notting Hill typically costs £70–£180. Treatment costs vary by procedure — Pearlie shows indicative pricing for each clinic so you can compare before booking.",
      },
      {
        question: "Are there cosmetic dentists near Notting Hill?",
        answer:
          "Yes — Notting Hill and the surrounding West London area has several clinics specialising in cosmetic dentistry including veneers, Invisalign, teeth whitening, and composite bonding.",
      },
      {
        question: "Can I get an emergency dental appointment in Notting Hill?",
        answer:
          "Several practices near Notting Hill offer same-day or next-day emergency slots. Use Pearlie to check availability and message clinics directly for urgent care.",
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
      {
        question: "Can I find an emergency dentist near Brixton?",
        answer:
          "Several South London clinics offer same-day or urgent emergency appointments. Use Pearlie to check availability near Brixton and message clinics directly for urgent dental care.",
      },
      {
        question: "What treatments can I get at Brixton dental clinics?",
        answer:
          "Brixton clinics offer a full range of treatments including check-ups, hygiene appointments, teeth whitening, Invisalign, composite bonding, fillings, root canals, and emergency care. Compare options on Pearlie.",
      },
      {
        question: "Are there weekend dentists near Brixton?",
        answer:
          "Some practices in South London offer Saturday appointments. Pearlie lets you check weekend availability and book directly with clinics that suit your schedule.",
      },
    ],
    nearbyAreas: ["clapham", "peckham"],
  },
  {
    slug: "clapham",
    name: "Clapham",
    shortName: "Clapham",
    center: { lat: 51.4620, lng: -0.1380 },
    radiusMiles: 1.5,
    mapZoom: 14,
    metaTitle: "Find a Dentist in Clapham, London",
    metaDescription:
      "Compare trusted, GDC-registered dentists in Clapham and South London. See ratings, treatments, and pricing — book free through Pearlie.",
    intro:
      "Clapham is one of South London's most popular residential areas, with a strong selection of modern private dental practices.",
    description:
      "From Clapham Common to Clapham Junction, residents have access to quality dental care without heading into Central London. Pearlie helps you compare verified clinics nearby — see ratings, treatments, and pricing before you book.",
    faq: [
      {
        question: "Are there private dentists near Clapham Common?",
        answer:
          "Yes — our Clapham search covers Clapham Common, Clapham Junction, Battersea, and Balham. All clinics on Pearlie are GDC-registered and independently verified.",
      },
      {
        question: "How much does a dental check-up cost in Clapham?",
        answer:
          "A private dental check-up in Clapham typically costs £60–£130. Pearlie shows indicative pricing for each clinic so you can compare before committing.",
      },
      {
        question: "Can I get teeth whitening in Clapham?",
        answer:
          "Yes — several Clapham dental practices offer professional teeth whitening, both in-clinic and take-home options. Costs typically start from £250. Pearlie helps you compare whitening providers nearby.",
      },
      {
        question: "Are there evening or weekend dentists in Clapham?",
        answer:
          "Some Clapham practices offer evening appointments and Saturday clinics. Use Pearlie to check availability and find a time that suits your schedule.",
      },
      {
        question: "Is it better to go private or NHS for a dentist in Clapham?",
        answer:
          "Private dental care in Clapham offers shorter wait times, longer appointments, and a wider choice of cosmetic treatments. Pearlie focuses on verified private clinics — for NHS dental services, try the NHS Find a Dentist tool.",
      },
    ],
    nearbyAreas: ["brixton", "peckham", "kensington-chelsea"],
  },
  {
    slug: "peckham",
    name: "Peckham",
    shortName: "Peckham",
    center: { lat: 51.4737, lng: -0.0693 },
    radiusMiles: 1.5,
    mapZoom: 14,
    metaTitle: "Find a Dentist in Peckham, London",
    metaDescription:
      "Compare verified dentists near Peckham and South East London. GDC-registered, transparent pricing — book free through Pearlie.",
    intro:
      "Peckham and the surrounding South East London area has a growing number of quality private dental practices serving the local community.",
    description:
      "Whether you live or work in Peckham, Camberwell, or Dulwich, finding a good dentist is straightforward with Pearlie. Compare GDC-registered clinics, see real reviews, and book with confidence.",
    faq: [
      {
        question: "What areas does the Peckham dental search cover?",
        answer:
          "Our Peckham search covers Peckham, Camberwell, Dulwich, East Dulwich, and the surrounding South East London area. All clinics are verified by Pearlie.",
      },
      {
        question: "Are there affordable dentists near Peckham?",
        answer:
          "Yes — South East London offers a range of private dental practices at competitive price points. Pearlie shows indicative pricing for each clinic.",
      },
      {
        question: "Can I find an emergency dentist near Peckham?",
        answer:
          "Several practices in South East London offer same-day or next-day emergency appointments. Use Pearlie to find clinics with urgent availability near Peckham, Camberwell, and Dulwich.",
      },
      {
        question: "What cosmetic treatments are available near Peckham?",
        answer:
          "Clinics near Peckham offer cosmetic treatments including teeth whitening, composite bonding, Invisalign, and veneers. Use Pearlie to compare clinics by treatment speciality and pricing.",
      },
      {
        question: "How do I choose a dentist in Peckham?",
        answer:
          "Look for GDC registration, patient reviews, and experience with your specific treatment. Pearlie lets you compare all of this side-by-side — plus message clinics directly with questions before you book.",
      },
    ],
    nearbyAreas: ["brixton", "clapham", "canary-wharf"],
  },
  {
    slug: "islington",
    name: "Islington",
    shortName: "Islington",
    center: { lat: 51.5362, lng: -0.1033 },
    radiusMiles: 1.5,
    mapZoom: 14,
    metaTitle: "Find a Dentist in Islington, London",
    metaDescription:
      "Compare GDC-registered dentists in Islington and North London. See ratings, treatments, and pricing — book free through Pearlie.",
    intro:
      "Islington is one of North London's most vibrant boroughs, with a wide range of well-regarded private dental practices.",
    description:
      "From Angel to Highbury, Islington offers excellent dental care across general, cosmetic, and specialist treatments. Pearlie helps you compare verified clinics side-by-side — so you find the right dentist for your needs.",
    faq: [
      {
        question: "Are there dentists near Angel station?",
        answer:
          "Yes — our Islington search covers Angel, Highbury, Holloway, and the wider Islington area. All clinics on Pearlie are GDC-registered and independently verified.",
      },
      {
        question: "What dental treatments are available in Islington?",
        answer:
          "Islington clinics offer a full range of treatments including check-ups, teeth whitening, Invisalign, veneers, composite bonding, implants, and more. Use Pearlie to compare options.",
      },
      {
        question: "How much does a private dentist cost in Islington?",
        answer:
          "A private dental check-up in Islington typically costs £60–£150. Treatment costs vary — Invisalign starts from around £2,500, and composite bonding from £150 per tooth. Pearlie shows indicative pricing for each clinic.",
      },
      {
        question: "Can I find an emergency dentist in Islington?",
        answer:
          "Several Islington practices offer same-day emergency appointments for toothache, broken teeth, or swelling. Use Pearlie to find clinics with urgent availability and message them directly.",
      },
      {
        question: "Are there evening dentists near Angel or Highbury?",
        answer:
          "Some Islington clinics offer early morning or evening appointments to suit working schedules. Check availability on Pearlie and book directly with a clinic that fits your timetable.",
      },
    ],
    nearbyAreas: ["camden", "shoreditch", "hampstead"],
  },
  {
    slug: "hampstead",
    name: "Hampstead",
    shortName: "Hampstead",
    center: { lat: 51.5557, lng: -0.1780 },
    radiusMiles: 1.5,
    mapZoom: 14,
    metaTitle: "Find a Dentist in Hampstead, London",
    metaDescription:
      "Compare premium dentists in Hampstead and North London. GDC-registered, verified reviews — book free on Pearlie.",
    intro:
      "Hampstead is home to some of North London's finest private dental practices, offering premium care in a leafy, residential setting.",
    description:
      "From Hampstead Village to Swiss Cottage and Belsize Park, the area has a concentration of experienced dental practitioners. Pearlie helps you compare verified clinics based on quality, treatments, and patient reviews.",
    faq: [
      {
        question: "Are Hampstead dentists more expensive?",
        answer:
          "Hampstead dental practices range in price. While some offer premium services, there are also competitively priced options. Pearlie shows indicative pricing so you can compare and choose.",
      },
      {
        question: "What areas does the Hampstead search cover?",
        answer:
          "Our Hampstead search includes Hampstead Village, Swiss Cottage, Belsize Park, Finchley Road, and the wider North West London area.",
      },
      {
        question: "Can I get Invisalign in Hampstead?",
        answer:
          "Yes — several Hampstead dental practices are certified Invisalign providers. Use Pearlie to compare clinics by experience, reviews, and indicative pricing for clear aligner treatment.",
      },
      {
        question: "Are there family dentists in Hampstead?",
        answer:
          "Many Hampstead practices welcome patients of all ages, from children's check-ups to adult cosmetic treatments. Pearlie helps you find family-friendly clinics with the right services.",
      },
      {
        question: "Can I find a weekend dentist near Hampstead?",
        answer:
          "Some clinics near Hampstead and Swiss Cottage offer Saturday appointments. Use Pearlie to check weekend availability and book directly.",
      },
    ],
    nearbyAreas: ["camden", "islington"],
  },
  {
    slug: "hammersmith",
    name: "Hammersmith",
    shortName: "Hammersmith",
    center: { lat: 51.4927, lng: -0.2228 },
    radiusMiles: 1.5,
    mapZoom: 14,
    metaTitle: "Find a Dentist in Hammersmith, London",
    metaDescription:
      "Compare verified dentists in Hammersmith and West London. GDC-registered, transparent pricing — book free through Pearlie.",
    intro:
      "Hammersmith is a busy West London hub with a strong selection of private dental practices offering general, cosmetic, and specialist care.",
    description:
      "Whether you work near Hammersmith Broadway or live in nearby Shepherd's Bush or Chiswick, there are quality dental options within easy reach. Pearlie helps you compare verified clinics and book with confidence.",
    faq: [
      {
        question: "Are there dentists near Hammersmith station?",
        answer:
          "Yes — our Hammersmith search covers Hammersmith, Shepherd's Bush, Chiswick, Fulham, and the surrounding West London area. All clinics are GDC-registered and verified.",
      },
      {
        question: "Can I find an evening dentist in Hammersmith?",
        answer:
          "Many dental clinics near Hammersmith offer extended hours including evening appointments. Check availability on Pearlie and book directly.",
      },
      {
        question: "How much does a dentist cost near Hammersmith?",
        answer:
          "A private dental check-up near Hammersmith typically costs £60–£150. Treatment costs vary — Pearlie shows indicative pricing for each clinic so you can compare options.",
      },
      {
        question: "Can I find an emergency dentist in Hammersmith?",
        answer:
          "Several West London clinics offer same-day emergency appointments. Use Pearlie to check urgent availability near Hammersmith and Shepherd's Bush.",
      },
      {
        question: "What treatments are available near Hammersmith?",
        answer:
          "Hammersmith clinics offer general dentistry, hygiene appointments, teeth whitening, Invisalign, composite bonding, veneers, implants, and emergency care. Compare clinics and treatments on Pearlie.",
      },
    ],
    nearbyAreas: ["kensington-chelsea", "notting-hill"],
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
      {
        question: "Can I find an emergency dentist near Stratford?",
        answer:
          "Several clinics in the Stratford and wider East London area offer same-day or urgent emergency appointments. Use Pearlie to find clinics with availability and message them directly.",
      },
      {
        question: "What dental treatments are available in Stratford?",
        answer:
          "Stratford clinics offer a full range of treatments including check-ups, teeth whitening, Invisalign, composite bonding, veneers, implants, and root canals. Compare options on Pearlie.",
      },
      {
        question: "Are there weekend or evening dentists near Stratford?",
        answer:
          "Some East London practices offer Saturday clinics and extended weekday hours. Pearlie lets you check availability and book directly with clinics near Stratford that suit your schedule.",
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

// ─── London Regions ────────────────────────────────────────────────

export type LondonRegionSlug =
  | "central-london"
  | "south-london"
  | "north-london"
  | "west-london"
  | "east-london"

export interface LondonRegion {
  slug: LondonRegionSlug
  name: string
  center: { lat: number; lng: number }
  radiusMiles: number
  mapZoom: number
  metaTitle: string
  metaDescription: string
  intro: string
  description: string
  /** Area slugs that belong to this region */
  areaSlugs: string[]
  faq: AreaFaqItem[]
}

export const LONDON_REGIONS: LondonRegion[] = [
  {
    slug: "central-london",
    name: "Central London",
    center: { lat: 51.5145, lng: -0.1400 },
    radiusMiles: 3.0,
    mapZoom: 13,
    metaTitle: "Find a Dentist in Central London",
    metaDescription:
      "Compare trusted, GDC-registered dental clinics across Central London. See ratings, treatments, and pricing — book free through Pearlie.",
    intro:
      "Central London is home to some of the UK's most prestigious dental practices, from Harley Street specialists to modern clinics in Soho and Mayfair.",
    description:
      "Whether you work in the City or live nearby, Central London offers an unmatched concentration of dental expertise. From routine check-ups to complex cosmetic procedures, Pearlie helps you compare verified clinics and find the right fit — without the endless searching.",
    areaSlugs: ["harley-street", "soho", "mayfair"],
    faq: [
      {
        question: "How much does a dentist in Central London cost?",
        answer:
          "Private dental check-ups in Central London typically range from £80–£250 depending on the clinic and area. Specialist treatments like Invisalign start from around £2,500. Pearlie shows indicative pricing for each clinic so you can compare.",
      },
      {
        question: "Are Central London dentists open on weekends?",
        answer:
          "Many Central London practices offer Saturday appointments, and some open on Sundays. Check availability on Pearlie and book directly with the clinic.",
      },
      {
        question: "How do I choose between Central London dental clinics?",
        answer:
          "Look for GDC registration, verified reviews, and experience with your specific treatment. Pearlie lets you compare all of this side-by-side, plus message clinics directly before booking.",
      },
      {
        question: "Can I get emergency dental treatment in Central London?",
        answer:
          "Yes — many Central London clinics offer same-day or next-day emergency appointments for toothache, broken teeth, or swelling. Use Pearlie to find clinics with urgent availability near you.",
      },
      {
        question: "What cosmetic dental treatments are popular in Central London?",
        answer:
          "Central London is a hub for cosmetic dentistry. Popular treatments include Invisalign, porcelain veneers, composite bonding, professional teeth whitening, and smile makeovers. Harley Street and Mayfair are particularly well-known for specialist cosmetic work.",
      },
      {
        question: "Do Central London dental clinics accept insurance?",
        answer:
          "Many private clinics in Central London accept dental insurance plans from providers like Bupa, AXA, and Vitality. Check with individual clinics through Pearlie to confirm which plans they accept.",
      },
      {
        question: "Is it worth paying more for a Central London dentist?",
        answer:
          "Central London offers access to some of the UK's most experienced specialists and advanced technology. However, quality care exists at all price points. Pearlie helps you compare based on your specific needs — not just price or location.",
      },
    ],
  },
  {
    slug: "south-london",
    name: "South London",
    center: { lat: 51.4500, lng: -0.1000 },
    radiusMiles: 5.0,
    mapZoom: 12,
    metaTitle: "Find a Dentist in South London",
    metaDescription:
      "Compare verified dental clinics across South London. GDC-registered, transparent pricing — book free through Pearlie.",
    intro:
      "South London has a growing network of quality private dental practices, from Brixton and Clapham to Dulwich and Greenwich — offering modern care at a range of price points.",
    description:
      "Finding a good dentist in South London doesn't have to be difficult. Whether you're in Brixton, Peckham, Camberwell, or further south, Pearlie helps you compare GDC-registered clinics based on ratings, treatments, and pricing — all in one place.",
    areaSlugs: ["clapham", "brixton", "peckham"],
    faq: [
      {
        question: "Are there affordable private dentists in South London?",
        answer:
          "Yes — South London offers a wide range of private dental practices at different price points. Pearlie shows indicative pricing so you can find care that fits your budget.",
      },
      {
        question: "What areas does the South London search cover?",
        answer:
          "Our South London search covers Brixton, Clapham, Peckham, Camberwell, Dulwich, Greenwich, Lewisham, and the wider South London area.",
      },
      {
        question: "Can I find an emergency dentist in South London?",
        answer:
          "Yes — several South London practices offer same-day or next-day emergency appointments. Use Pearlie to check availability in Clapham, Brixton, Peckham, and surrounding areas.",
      },
      {
        question: "How much does a dental check-up cost in South London?",
        answer:
          "A private dental check-up in South London typically costs £50–£130, depending on the clinic and area. Pearlie shows indicative pricing for each clinic so you can compare before booking.",
      },
      {
        question: "Are there cosmetic dentists in South London?",
        answer:
          "Yes — South London has a growing number of clinics offering cosmetic treatments including teeth whitening, Invisalign, composite bonding, and veneers. Pearlie helps you find and compare cosmetic dentists nearby.",
      },
      {
        question: "Is private dental care in South London cheaper than Central London?",
        answer:
          "Generally, yes — South London clinics tend to be more competitively priced than Central London while still offering high-quality care. Use Pearlie to compare pricing across different areas and find the best value.",
      },
      {
        question: "Can I find a weekend dentist in South London?",
        answer:
          "Some South London practices offer Saturday appointments. Pearlie lets you check weekend availability and book directly with clinics that suit your schedule.",
      },
    ],
  },
  {
    slug: "north-london",
    name: "North London",
    center: { lat: 51.5600, lng: -0.1200 },
    radiusMiles: 5.0,
    mapZoom: 12,
    metaTitle: "Find a Dentist in North London",
    metaDescription:
      "Compare GDC-registered dentists across North London. See ratings, treatments, and pricing — book free through Pearlie.",
    intro:
      "North London offers a wide range of dental practices, from boutique clinics in Camden and Islington to larger centres serving Finsbury Park, Highgate, and beyond.",
    description:
      "Whether you're in Islington, Hampstead, Finchley, or Enfield, North London has excellent dental options. Pearlie helps you compare verified clinics based on your needs — not just what's closest.",
    areaSlugs: ["islington", "camden", "hampstead"],
    faq: [
      {
        question: "Are there good dentists near Islington or Highbury?",
        answer:
          "Yes — our North London search covers Islington, Highbury, Camden, Finsbury Park, and surrounding areas. All clinics on Pearlie are GDC-registered and independently verified.",
      },
      {
        question: "How much does a dental check-up cost in North London?",
        answer:
          "A private check-up in North London typically costs £60–£150. Pearlie shows indicative pricing for each clinic so you can compare before committing.",
      },
      {
        question: "Can I find an emergency dentist in North London?",
        answer:
          "Yes — several North London clinics offer same-day or urgent emergency appointments. Use Pearlie to find clinics with availability in Islington, Camden, Hampstead, and surrounding areas.",
      },
      {
        question: "What cosmetic treatments are available in North London?",
        answer:
          "North London clinics offer a full range of cosmetic treatments including Invisalign, teeth whitening, composite bonding, veneers, and smile makeovers. Camden, Islington, and Hampstead all have well-regarded cosmetic practices.",
      },
      {
        question: "Are there family dentists in North London?",
        answer:
          "Yes — many North London practices welcome patients of all ages, from children's check-ups to adult cosmetic treatments. Use Pearlie to find family-friendly clinics near you.",
      },
      {
        question: "Do North London dentists offer evening or Saturday appointments?",
        answer:
          "Many North London practices offer extended hours including early morning, evening, and Saturday appointments. Pearlie lets you check availability and book directly.",
      },
      {
        question: "How do I find a specialist dentist in North London?",
        answer:
          "Pearlie lists verified clinics with details on their treatment specialities, from orthodontics and implants to endodontics and periodontics. Compare clinics based on expertise, reviews, and pricing.",
      },
    ],
  },
  {
    slug: "west-london",
    name: "West London",
    center: { lat: 51.5000, lng: -0.2200 },
    radiusMiles: 5.0,
    mapZoom: 12,
    metaTitle: "Find a Dentist in West London",
    metaDescription:
      "Compare trusted dentists across West London. Kensington, Notting Hill, Hammersmith, and more — book free on Pearlie.",
    intro:
      "West London is served by well-established dental practices across Kensington, Notting Hill, Hammersmith, Chiswick, and Ealing — offering everything from routine care to specialist treatments.",
    description:
      "From the premium practices of Kensington to family-friendly clinics in Ealing, West London has dental options for every need and budget. Pearlie helps you compare verified, GDC-registered clinics and book with confidence.",
    areaSlugs: ["kensington-chelsea", "notting-hill", "hammersmith"],
    faq: [
      {
        question: "What areas does the West London dental search cover?",
        answer:
          "Our West London search includes Kensington, Chelsea, Notting Hill, Hammersmith, Shepherd's Bush, Chiswick, and the wider West London area.",
      },
      {
        question: "Can I find a family dentist in West London?",
        answer:
          "Yes — many West London practices welcome patients of all ages. Use Pearlie to find clinics that offer family-friendly care near you.",
      },
      {
        question: "How much does a private dentist cost in West London?",
        answer:
          "Private dental check-ups in West London range from £70–£200, depending on the area and clinic. Kensington tends to be at the higher end, while Hammersmith and Shepherd's Bush offer more competitive pricing. Pearlie shows indicative costs for each clinic.",
      },
      {
        question: "Can I get an emergency dental appointment in West London?",
        answer:
          "Yes — several West London practices offer same-day or urgent emergency slots. Use Pearlie to check availability across Kensington, Notting Hill, Hammersmith, and surrounding areas.",
      },
      {
        question: "Are there cosmetic dentists in West London?",
        answer:
          "West London has many well-established cosmetic dental practices, particularly in Kensington and Notting Hill. Treatments include veneers, Invisalign, teeth whitening, and composite bonding. Compare options on Pearlie.",
      },
      {
        question: "Do West London dentists offer payment plans?",
        answer:
          "Many West London dental practices offer interest-free finance or monthly payment plans for treatments like Invisalign, implants, and veneers. Ask clinics directly through Pearlie about their finance options.",
      },
      {
        question: "Are there weekend dentists in West London?",
        answer:
          "Some West London clinics offer Saturday appointments, particularly in Hammersmith and Kensington. Use Pearlie to check weekend availability and book directly.",
      },
    ],
  },
  {
    slug: "east-london",
    name: "East London",
    center: { lat: 51.5300, lng: -0.0300 },
    radiusMiles: 5.0,
    mapZoom: 12,
    metaTitle: "Find a Dentist in East London",
    metaDescription:
      "Compare verified dentists across East London. Shoreditch, Stratford, Canary Wharf — book free through Pearlie.",
    intro:
      "East London has a vibrant and growing dental scene, from modern practices in Shoreditch and Canary Wharf to community-focused clinics in Stratford and beyond.",
    description:
      "Whether you live or work in East London, there are quality dental options nearby. Pearlie helps you compare GDC-registered clinics across Shoreditch, Canary Wharf, Stratford, and more — see ratings, treatments, and indicative pricing all in one place.",
    areaSlugs: ["shoreditch", "canary-wharf", "stratford"],
    faq: [
      {
        question: "Are there affordable dentists in East London?",
        answer:
          "Yes — East London offers competitive private dental pricing compared to central London. Pearlie shows indicative costs for each clinic so you can compare options easily.",
      },
      {
        question: "What areas does the East London search cover?",
        answer:
          "Our East London search covers Shoreditch, Hackney, Bethnal Green, Canary Wharf, Stratford, Leyton, and the wider East London area.",
      },
      {
        question: "Can I find an emergency dentist in East London?",
        answer:
          "Yes — several East London clinics offer same-day or urgent emergency appointments across Shoreditch, Canary Wharf, and Stratford. Use Pearlie to find clinics with availability.",
      },
      {
        question: "How much does a dental check-up cost in East London?",
        answer:
          "A private dental check-up in East London typically costs £50–£130. Prices tend to be more competitive than Central London. Pearlie shows indicative pricing for each clinic.",
      },
      {
        question: "Are there cosmetic dentists in East London?",
        answer:
          "Yes — East London has a growing number of modern practices offering cosmetic treatments including teeth whitening, Invisalign, composite bonding, and veneers. Shoreditch and Canary Wharf are particularly well-served.",
      },
      {
        question: "Do East London dentists offer evening appointments?",
        answer:
          "Many East London clinics, particularly those in Canary Wharf and Stratford, offer early morning and evening appointments for working professionals. Check availability on Pearlie.",
      },
      {
        question: "Is private dental care in East London good value?",
        answer:
          "East London generally offers strong value for private dental care, combining modern facilities with competitive pricing. Use Pearlie to compare quality, treatments, and costs across different areas.",
      },
    ],
  },
]

export function getRegionBySlug(slug: string): LondonRegion | undefined {
  return LONDON_REGIONS.find((r) => r.slug === slug)
}

export function getAllRegionSlugs(): LondonRegionSlug[] {
  return LONDON_REGIONS.map((r) => r.slug)
}

/** Get all areas that belong to a region */
export function getAreasForRegion(region: LondonRegion): LondonArea[] {
  return region.areaSlugs
    .map((slug) => getAreaBySlug(slug))
    .filter((a): a is LondonArea => a !== undefined)
}
