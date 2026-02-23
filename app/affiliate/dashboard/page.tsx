"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { AffiliateDashboardShell } from "@/components/affiliates/dashboard/dashboard-shell"
import { DashboardOverview } from "@/components/affiliates/dashboard/dashboard-overview"
import type { Affiliate, AffiliateStats } from "@/lib/affiliates/types"

export default function AffiliateDashboardPage() {
  const router = useRouter()
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/affiliate/login")
        return
      }

      try {
        const [profileRes, statsRes] = await Promise.all([
          fetch("/api/affiliates/me"),
          fetch("/api/affiliates/stats"),
        ])

        if (!profileRes.ok) {
          router.replace("/affiliate/login")
          return
        }

        const profileData = await profileRes.json()
        setAffiliate(profileData.affiliate)

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData.stats)
        }
      } catch {
        router.replace("/affiliate/login")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router])

  if (loading || !affiliate) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F0" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#0D4F4F" }} />
      </div>
    )
  }

  return (
    <AffiliateDashboardShell affiliate={affiliate} activePage="overview">
      <DashboardOverview affiliate={affiliate} stats={stats} />
    </AffiliateDashboardShell>
  )
}
