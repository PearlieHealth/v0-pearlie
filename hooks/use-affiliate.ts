"use client"

import { useState, useEffect } from "react"

interface AffiliateProfile {
  id: string
  name: string
  email: string
  phone: string | null
  tiktok_handle: string | null
  instagram_handle: string | null
  youtube_handle: string | null
  referral_code: string
  status: string
  commission_per_booking: number
  total_earned: number
  total_paid: number
  created_at: string
}

interface AffiliateStats {
  total_clicks: number
  total_conversions: number
  conversion_rate: number
  total_earned: number
  pending_earnings: number
  total_paid: number
}

export function useAffiliate() {
  const [profile, setProfile] = useState<AffiliateProfile | null>(null)
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, statsRes] = await Promise.all([
          fetch("/api/affiliates/me"),
          fetch("/api/affiliates/stats"),
        ])

        if (!profileRes.ok) {
          setError("not_authenticated")
          return
        }

        const profileData = await profileRes.json()
        setProfile(profileData)

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }
      } catch {
        setError("fetch_failed")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { profile, stats, loading, error }
}
