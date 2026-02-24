"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AffiliateSidebar } from "@/components/affiliate/affiliate-sidebar"
import { useAffiliate } from "@/hooks/use-affiliate"
import { Link2, Loader2, ChevronLeft, ChevronRight } from "lucide-react"

interface Referral {
  id: string
  landing_page: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  created_at: string
}

export default function AffiliateReferralsPage() {
  const router = useRouter()
  const { profile, loading: profileLoading, error } = useAffiliate()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/affiliates/referrals?page=${page}`)
        if (res.ok) {
          const data = await res.json()
          setReferrals(data.data || [])
          setTotalPages(data.total_pages || 1)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [page])

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

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <AffiliateSidebar affiliateName={profile.name} />

      <main className="md:ml-60 p-6 md:p-8 pb-24 md:pb-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Referrals</h1>
          <p className="text-[#8B8BA3] text-sm">Track every click from your referral links</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] backdrop-blur-[20px] overflow-hidden">
          <div className="grid grid-cols-5 gap-4 px-6 py-3 text-xs uppercase tracking-[0.05em] text-[#8B8BA3] border-b border-white/[0.06]">
            <span>Date</span>
            <span>Landing Page</span>
            <span>Source</span>
            <span>Medium</span>
            <span>Campaign</span>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#6B6B80] mx-auto" />
            </div>
          ) : referrals.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                <Link2 className="w-6 h-6 text-[#6B6B80]" />
              </div>
              <p className="text-[#8B8BA3] text-sm mb-1">No referrals yet</p>
              <p className="text-[#6B6B80] text-xs">
                Share your referral link to start tracking clicks
              </p>
            </div>
          ) : (
            <>
              {referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="grid grid-cols-5 gap-4 px-6 py-3 border-b border-white/[0.04] text-sm"
                >
                  <span className="text-[#8B8BA3]">
                    {new Date(ref.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-white truncate">{ref.landing_page || "/"}</span>
                  <span className="text-[#8B8BA3]">{ref.utm_source || "-"}</span>
                  <span className="text-[#8B8BA3]">{ref.utm_medium || "-"}</span>
                  <span className="text-[#8B8BA3]">{ref.utm_campaign || "-"}</span>
                </div>
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 py-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-[#8B8BA3] hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-[#8B8BA3]">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="text-[#8B8BA3] hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
