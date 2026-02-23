"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { AffiliateDashboardShell } from "@/components/affiliates/dashboard/dashboard-shell"
import { ReferralsTable } from "@/components/affiliates/dashboard/referrals-table"
import type { Affiliate, Referral } from "@/lib/affiliates/types"

export default function AffiliateReferralsPage() {
  const router = useRouter()
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
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

        const referralsRes = await fetch(`/api/affiliates/referrals?page=${page}&limit=20`)
        if (referralsRes.ok) {
          const data = await referralsRes.json()
          setReferrals(data.referrals)
          setTotal(data.total)
        }
      } catch {
        router.replace("/affiliate/login")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router, page])

  if (loading || !affiliate) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F0" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#0D4F4F" }} />
      </div>
    )
  }

  return (
    <AffiliateDashboardShell affiliate={affiliate} activePage="referrals">
      <ReferralsTable
        referrals={referrals}
        total={total}
        page={page}
        onPageChange={setPage}
      />
    </AffiliateDashboardShell>
  )
}
