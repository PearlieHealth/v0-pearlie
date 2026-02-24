"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AffiliateSidebar } from "@/components/affiliate/affiliate-sidebar"
import { useAffiliate } from "@/hooks/use-affiliate"
import { Banknote, Loader2 } from "lucide-react"

interface Payout {
  id: string
  amount: number
  status: "pending" | "processing" | "completed" | "failed"
  period_start: string | null
  period_end: string | null
  payment_reference: string | null
  created_at: string
}

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: "rgba(255,183,77,0.15)", text: "#FFB74D" },
  processing: { bg: "rgba(37,244,238,0.15)", text: "#25F4EE" },
  completed: { bg: "rgba(0,245,160,0.15)", text: "#00F5A0" },
  failed: { bg: "rgba(254,44,85,0.15)", text: "#FE2C55" },
}

export default function AffiliatePayoutsPage() {
  const router = useRouter()
  const { profile, stats, loading: profileLoading, error } = useAffiliate()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/affiliates/payouts")
        if (res.ok) {
          const data = await res.json()
          setPayouts(data || [])
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#8B8BA3]" />
      </div>
    )
  }

  if (error === "not_authenticated" || !profile) {
    router.push("/affiliate/login")
    return null
  }

  const unpaidBalance = (stats?.total_earned || 0) - (stats?.total_paid || 0)

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <AffiliateSidebar affiliateName={profile.name} />

      <main className="md:ml-60 p-6 md:p-8 pb-24 md:pb-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Payouts</h1>
          <p className="text-[#8B8BA3] text-sm">Your payment history and current balance</p>
        </div>

        {/* Balance card */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] backdrop-blur-[20px] p-6 mb-8 relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{ background: "linear-gradient(135deg, #00F5A0 0%, #00D9F5 100%)" }}
          />
          <p className="text-xs uppercase tracking-[0.05em] text-[#8B8BA3] mb-2">
            Current Balance (Unpaid)
          </p>
          <p className="text-4xl font-extrabold text-[#00F5A0]">
            £{unpaidBalance.toFixed(2)}
          </p>
          <p className="text-[#6B6B80] text-xs mt-1">
            Confirmed earnings not yet paid out
          </p>
        </div>

        {/* Payouts table */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] backdrop-blur-[20px] overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-6 py-3 text-xs uppercase tracking-[0.05em] text-[#8B8BA3] border-b border-white/[0.06]">
            <span>Period</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Reference</span>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#6B6B80] mx-auto" />
            </div>
          ) : payouts.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                <Banknote className="w-6 h-6 text-[#6B6B80]" />
              </div>
              <p className="text-[#8B8BA3] text-sm mb-1">No payouts yet</p>
              <p className="text-[#6B6B80] text-xs">
                Payouts will appear here once you start earning
              </p>
            </div>
          ) : (
            payouts.map((payout) => {
              const style = statusColors[payout.status] || statusColors.pending
              return (
                <div
                  key={payout.id}
                  className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-white/[0.04] text-sm"
                >
                  <span className="text-[#8B8BA3]">
                    {payout.period_start && payout.period_end
                      ? `${new Date(payout.period_start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${new Date(payout.period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                      : new Date(payout.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <span className="text-[#00F5A0] font-medium">£{payout.amount.toFixed(2)}</span>
                  <span>
                    <span
                      className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: style.bg, color: style.text }}
                    >
                      {payout.status}
                    </span>
                  </span>
                  <span className="text-[#6B6B80] truncate">
                    {payout.payment_reference || "-"}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
