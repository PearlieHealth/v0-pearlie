export interface Clinic {
  id: string
  slug?: string
  name: string
  address: string
  postcode: string
  city?: string
  latitude?: number
  longitude?: number
  phone?: string
  website?: string
  description?: string
  featured_review?: string
  rating: number
  review_count: number
  treatments: string[]
  facilities: string[]
  opening_hours: Record<string, string | { open: string; close: string; closed: boolean }>
  images: string[]
  price_range: string
  verified: boolean
  featured: boolean
  wheelchair_accessible: boolean
  parking_available: boolean
  accepts_nhs?: boolean
  is_archived: boolean
  tags?: string[]
  offers_free_consultation?: boolean
  show_treatment_prices?: boolean
  treatment_prices?: {
    category: string
    treatments: { name: string; price: string; description: string }[]
  }[]
  highlight_chips?: string[]
  google_place_id?: string
  google_rating?: number
  google_review_count?: number
  google_maps_url?: string
  available_days?: string[]
  available_hours?: string[]
  accepts_same_day?: boolean
  languages?: string[]
  before_after_images?: { before_url: string; after_url: string; treatment: string; description?: string }[]
}

export interface Lead {
  id: string
  treatment_interest?: string
  preferred_timing?: string
  budget_range?: string
  postcode?: string
  latitude?: number
  longitude?: number
  cosmetic_concern?: string
  pain_score?: number
  has_swelling?: boolean
  has_bleeding?: boolean
  additional_info?: string
}

export interface ProviderProfile {
  id: string
  name: string
  photo_url: string | null
  bio: string | null
  education: { degree: string; institution: string }[]
  certifications: { name: string; date?: string }[]
}
