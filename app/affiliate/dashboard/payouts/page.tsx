"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { AffiliateDashboardShell } from "@/components/affiliates/dashboard/dashboard-shell"
import { PayoutsTable } from "@/components/affiliates/dashboard/payouts-table"
import type { Affiliate, AffiliatePayout } from "@/lib/affiliates/types"

export default function AffiliatePayoutsPage() {
  const router = useRouter()
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/affiliate/login"); return }

      try {
        const profileRes = await fetch("/api/affiliates/me")
        if (!profileRes.ok) { router.replace("/affiliate/login"); return }
        const profileData = await profileRes.json()
        setAffiliate(profileData.affiliate)

        const payoutsRes = await fetch("/api/affiliates/payouts")
        if (payoutsRes.ok) {
          const data = await payoutsRes.json()
          setPayouts(data.payouts)
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
    <AffiliateDashboardShell affiliate={affiliate} activePage="payouts">
      <PayoutsTable payouts={payouts} affiliate={affiliate} />
    </AffiliateDashboardShell>
  )
}
