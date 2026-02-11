import { z } from "zod"

export const LeadAnswersNormalizedSchema = z.object({
  id: z.string(),
  treatment: z.string().optional(),
  postcode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z.string().optional(),
  locationPreference: z.string().optional(), // 'near_home', 'travel_bit', 'travel_further'
  priorities: z.array(z.string()).optional(),
  anxietyLevel: z.string().optional(), // 'comfortable', 'slightly_anxious', 'quite_anxious', 'very_anxious'
  budgetRange: z.string().optional(),
  timingPreference: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
})

export type LeadAnswersNormalized = z.infer<typeof LeadAnswersNormalizedSchema>

export const ClinicProfileNormalizedSchema = z.object({
  id: z.string(),
  name: z.string(),
  postcode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  priceRange: z.string().optional(),
  financeAvailable: z.boolean().optional(),
  verified: z.boolean().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  treatments: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  filterKeys: z.array(z.string()).optional(), // From clinic_filter_selections
})

export type ClinicProfileNormalized = z.infer<typeof ClinicProfileNormalizedSchema>

export interface WeightsConfig {
  treatment: number // Max points for treatment match
  distance: number // Max points for distance
  priorities: number // Max points for priority matches
  anxiety: number // Max points for anxiety accommodation
  budget: number // Max points for budget match
  logistics: number // Max points for logistics (verified, reviews, etc)
}

export const DEFAULT_WEIGHTS: WeightsConfig = {
  treatment: 30,
  distance: 25,
  priorities: 20,
  anxiety: 10,
  budget: 10,
  logistics: 5,
}

export interface ScoringBreakdown {
  key: string
  label: string
  points: number
  maxPoints: number
  applicable: boolean // Whether this criterion applies to this lead
}

export interface ScoringResult {
  rawScore: number
  maxPossible: number // Dynamic - only counts applicable criteria
  percent: number // rawScore / maxPossible * 100
  breakdown: ScoringBreakdown[]
  distanceMiles?: number
}
