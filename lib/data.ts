// Data models and in-memory storage for MVP

export type Clinic = {
  clinicId: string
  name: string
  area: string
  postcode: string
  lat: number
  lng: number
  treatments: string[]
  priceBand: "£" | "££" | "£££"
  descriptionShort: string
  whyChosenTemplate: string
  bookingUrl: string
  active: boolean
  capacityStatus: "open" | "limited" | "paused"
  priorityWeight: number
}

export type Lead = {
  leadId: string
  createdAt: string
  treatmentInterest: string
  postcode: string
  budgetRange: "Under £1,000" | "£1,000–£2,000" | "£2,000–£4,000" | "£4,000+"
  contactMethod: "Email" | "Phone/WhatsApp"
  contactValue: string
  consent: boolean
  preferredTiming?: string
}

export type Match = {
  matchId: string
  leadId: string
  createdAt: string
  clinicIds: [string, string]
}

export type Event = {
  eventId: string
  createdAt: string
  eventType: "view_match" | "click_book"
  matchId: string
  clinicId?: string
}

// Mocked postcode to lat/lng mapping (simplified for MVP)
export const postcodeToCoords: Record<string, { lat: number; lng: number }> = {
  SW1A: { lat: 51.5014, lng: -0.1419 }, // Westminster
  SW3: { lat: 51.4875, lng: -0.1687 }, // Chelsea
  W1: { lat: 51.5155, lng: -0.1416 }, // West End
  EC1: { lat: 51.5201, lng: -0.1034 }, // Clerkenwell
  N1: { lat: 51.5405, lng: -0.1028 }, // Islington
  SE1: { lat: 51.5045, lng: -0.0865 }, // Southwark
  WC2: { lat: 51.5119, lng: -0.125 }, // Covent Garden
  E1: { lat: 51.5154, lng: -0.0649 }, // Whitechapel
}

// Seed clinic data
export const seedClinics: Clinic[] = [
  {
    clinicId: "clinic-1",
    name: "Chelsea Dental Spa",
    area: "Chelsea, London",
    postcode: "SW3",
    lat: 51.4875,
    lng: -0.1687,
    treatments: ["Invisalign", "Veneers", "Teeth whitening", "Composite bonding"],
    priceBand: "£££",
    descriptionShort:
      "Award-winning cosmetic dentistry in the heart of Chelsea with a focus on natural-looking results.",
    whyChosenTemplate: "Chosen for proximity and expertise in {treatment}.",
    bookingUrl: "https://example.com/chelsea-dental",
    active: true,
    capacityStatus: "open",
    priorityWeight: 2,
  },
  {
    clinicId: "clinic-2",
    name: "Bright Smiles Islington",
    area: "Islington, London",
    postcode: "N1",
    lat: 51.5405,
    lng: -0.1028,
    treatments: ["Invisalign", "Composite bonding", "Teeth whitening", "Dental implants"],
    priceBand: "££",
    descriptionShort: "Modern, patient-centered clinic specializing in smile makeovers and nervous patient care.",
    whyChosenTemplate: "Chosen for their excellent patient care and {treatment} expertise.",
    bookingUrl: "https://example.com/bright-smiles",
    active: true,
    capacityStatus: "open",
    priorityWeight: 1,
  },
  {
    clinicId: "clinic-3",
    name: "The Dental Studio",
    area: "Clerkenwell, London",
    postcode: "EC1",
    lat: 51.5201,
    lng: -0.1034,
    treatments: ["Veneers", "Composite bonding", "Teeth whitening"],
    priceBand: "££",
    descriptionShort: "Boutique dental practice focused on cosmetic dentistry with flexible payment plans.",
    whyChosenTemplate: "Chosen for competitive pricing and {treatment} specialization.",
    bookingUrl: "https://example.com/dental-studio",
    active: true,
    capacityStatus: "limited",
    priorityWeight: 1,
  },
  {
    clinicId: "clinic-4",
    name: "Westminster Smile Centre",
    area: "Westminster, London",
    postcode: "SW1A",
    lat: 51.5014,
    lng: -0.1419,
    treatments: ["Dental implants", "Veneers", "Invisalign", "Composite bonding"],
    priceBand: "£££",
    descriptionShort: "Premium dental care in central London with specialist consultants and advanced technology.",
    whyChosenTemplate: "Chosen for their advanced technology and {treatment} specialists.",
    bookingUrl: "https://example.com/westminster-smile",
    active: true,
    capacityStatus: "open",
    priorityWeight: 2,
  },
  {
    clinicId: "clinic-5",
    name: "Southbank Dental Care",
    area: "Southwark, London",
    postcode: "SE1",
    lat: 51.5045,
    lng: -0.0865,
    treatments: ["Teeth whitening", "Composite bonding", "Invisalign"],
    priceBand: "£",
    descriptionShort: "Affordable, high-quality dental care near London Bridge with convenient evening appointments.",
    whyChosenTemplate: "Chosen for their convenient location and {treatment} services.",
    bookingUrl: "https://example.com/southbank-dental",
    active: true,
    capacityStatus: "open",
    priorityWeight: 1,
  },
  {
    clinicId: "clinic-6",
    name: "West End Dental Boutique",
    area: "West End, London",
    postcode: "W1",
    lat: 51.5155,
    lng: -0.1416,
    treatments: ["Invisalign", "Veneers", "Composite bonding", "Teeth whitening", "Dental implants"],
    priceBand: "£££",
    descriptionShort: "Luxury dental practice offering comprehensive cosmetic and restorative treatments.",
    whyChosenTemplate: "Chosen for their comprehensive {treatment} services and central location.",
    bookingUrl: "https://example.com/west-end-dental",
    active: true,
    capacityStatus: "open",
    priorityWeight: 2,
  },
]

// In-memory storage (will reset on server restart - suitable for MVP)
export const storage = {
  leads: [] as Lead[],
  matches: [] as Match[],
  events: [] as Event[],
}

// Helper function to calculate distance between two coordinates (Haversine formula)
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Matching logic
export function findMatchingClinics(lead: Lead): Clinic[] {
  // Get lead coordinates (approximate from postcode)
  const postcodePrefix = lead.postcode.replace(/\s/g, "").substring(0, 3).toUpperCase()
  const leadCoords = postcodeToCoords[postcodePrefix] || postcodeToCoords["W1"] // fallback

  // Filter active clinics not paused
  const candidates = seedClinics.filter((clinic) => clinic.active && clinic.capacityStatus !== "paused")

  // Try to match by treatment
  let treatmentMatches = candidates.filter((clinic) =>
    clinic.treatments.some(
      (t) =>
        lead.treatmentInterest.toLowerCase().includes(t.toLowerCase()) ||
        t.toLowerCase().includes(lead.treatmentInterest.toLowerCase()),
    ),
  )

  // If we don't have enough treatment matches, use all candidates
  if (treatmentMatches.length < 2) {
    treatmentMatches = candidates
  }

  // Calculate distances and sort
  const clinicsWithDistance = treatmentMatches.map((clinic) => ({
    clinic,
    distance: calculateDistance(leadCoords.lat, leadCoords.lng, clinic.lat, clinic.lng),
  }))

  // Sort by distance first, then by priorityWeight
  clinicsWithDistance.sort((a, b) => {
    const distanceDiff = a.distance - b.distance
    if (Math.abs(distanceDiff) < 1) {
      // If distances are very close, use priority weight
      return b.clinic.priorityWeight - a.clinic.priorityWeight
    }
    return distanceDiff
  })

  // Return top 2 clinics
  return clinicsWithDistance.slice(0, 2).map((c) => c.clinic)
}
