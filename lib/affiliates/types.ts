export interface Affiliate {
  id: string
  user_id: string | null
  name: string
  email: string
  phone: string | null
  tiktok_handle: string | null
  instagram_handle: string | null
  youtube_handle: string | null
  referral_code: string
  status: "pending" | "approved" | "suspended"
  commission_per_booking: number
  total_earned: number
  total_paid: number
  motivation: string | null
  created_at: string
  updated_at: string
}

export interface Referral {
  id: string
  affiliate_id: string
  visitor_ip: string | null
  landing_page: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  created_at: string
}

export interface ReferralConversion {
  id: string
  referral_id: string | null
  affiliate_id: string
  lead_id: string | null
  booking_id: string | null
  status: "pending_verification" | "confirmed" | "rejected" | "paid"
  commission_amount: number
  confirmed_at: string | null
  paid_at: string | null
  created_at: string
}

export interface AffiliatePayout {
  id: string
  affiliate_id: string
  amount: number
  payment_method: string | null
  payment_reference: string | null
  status: "pending" | "processing" | "completed" | "failed"
  period_start: string | null
  period_end: string | null
  created_at: string
}

export interface AffiliateStats {
  total_clicks: number
  total_conversions: number
  conversion_rate: number
  total_earned: number
  pending_earnings: number
  total_paid: number
}

export interface AffiliateSignupPayload {
  name: string
  email: string
  phone?: string
  tiktok_handle?: string
  instagram_handle?: string
  youtube_handle?: string
  motivation?: string
}
