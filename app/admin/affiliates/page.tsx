"use client"

import { useState, useEffect, useCallback } from "react"
import { AdminNav } from "@/components/admin/admin-nav"
import {
  Users,
  Search,
  ChevronDown,
  Check,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react"

interface AffiliateRow {
  id: string
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
  total_clicks: number
  total_conversions: number
  motivation: string | null
  created_at: string
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  pending: { bg: "rgba(255,183,77,0.15)", text: "#FFB74D" },
  approved: { bg: "rgba(0,245,160,0.15)", text: "#00F5A0" },
  suspended: { bg: "rgba(254,44,85,0.15)", text: "#FE2C55" },
}

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editingCommission, setEditingCommission] = useState<{
    id: string
    value: string
  } | null>(null)
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateRow | null>(null)

  const fetchAffiliates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/affiliates")
      if (res.ok) {
        const data = await res.json()
        setAffiliates(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAffiliates()
  }, [fetchAffiliates])

  const updateAffiliate = async (id: string, updates: Record<string, unknown>) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/admin/affiliates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        await fetchAffiliates()
      }
    } catch {
      // ignore
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = affiliates.filter((a) => {
    const matchesSearch =
      search === "" ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.referral_code.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <>
      <AdminNav />
      <div className="min-h-screen bg-[#fdfdf4]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#004443]">Affiliates</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage affiliate applications and commissions
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              {affiliates.length} total
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0fbcb0]/20 focus:border-[#0fbcb0]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0fbcb0]/20"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-border">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {affiliates.length === 0
                  ? "No affiliate applications yet"
                  : "No affiliates match your filters"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Affiliate
                      </th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Code
                      </th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Commission
                      </th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Clicks
                      </th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Conversions
                      </th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Earned
                      </th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((aff) => {
                      const style = statusStyles[aff.status] || statusStyles.pending
                      return (
                        <tr
                          key={aff.id}
                          className="hover:bg-[#faf3e6]/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-foreground">{aff.name}</p>
                              <p className="text-xs text-muted-foreground">{aff.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-[#f8f7f1] px-2 py-1 rounded">
                              {aff.referral_code}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: style.bg,
                                color: style.text,
                              }}
                            >
                              {aff.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {editingCommission?.id === aff.id ? (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">£</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editingCommission.value}
                                  onChange={(e) =>
                                    setEditingCommission({
                                      ...editingCommission,
                                      value: e.target.value,
                                    })
                                  }
                                  className="w-16 px-2 py-1 rounded border border-border text-sm"
                                  autoFocus
                                />
                                <button
                                  onClick={() => {
                                    updateAffiliate(aff.id, {
                                      commission_per_booking: parseFloat(editingCommission.value),
                                    })
                                    setEditingCommission(null)
                                  }}
                                  className="text-[#0fbcb0] hover:text-[#0da399]"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingCommission(null)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  setEditingCommission({
                                    id: aff.id,
                                    value: String(aff.commission_per_booking),
                                  })
                                }
                                className="text-foreground hover:text-[#0fbcb0] transition-colors"
                              >
                                £{aff.commission_per_booking}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {aff.total_clicks}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {aff.total_conversions}
                          </td>
                          <td className="px-4 py-3 font-medium text-[#0fbcb0]">
                            £{aff.total_earned}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {aff.status === "pending" && (
                                <button
                                  onClick={() =>
                                    updateAffiliate(aff.id, { status: "approved" })
                                  }
                                  disabled={updatingId === aff.id}
                                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#0fbcb0]/10 text-[#0fbcb0] hover:bg-[#0fbcb0]/20 transition-colors disabled:opacity-50"
                                >
                                  Approve
                                </button>
                              )}
                              {aff.status === "approved" && (
                                <button
                                  onClick={() =>
                                    updateAffiliate(aff.id, { status: "suspended" })
                                  }
                                  disabled={updatingId === aff.id}
                                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  Suspend
                                </button>
                              )}
                              {aff.status === "suspended" && (
                                <button
                                  onClick={() =>
                                    updateAffiliate(aff.id, { status: "approved" })
                                  }
                                  disabled={updatingId === aff.id}
                                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#0fbcb0]/10 text-[#0fbcb0] hover:bg-[#0fbcb0]/20 transition-colors disabled:opacity-50"
                                >
                                  Reactivate
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedAffiliate(aff)}
                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#f8f7f1] text-muted-foreground hover:bg-border transition-colors"
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Detail drawer */}
        {selectedAffiliate && (
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setSelectedAffiliate(null)}>
            <div
              className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-[#004443]">Affiliate Details</h2>
                  <button
                    onClick={() => setSelectedAffiliate(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Name</label>
                    <p className="text-foreground font-medium">{selectedAffiliate.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Email</label>
                    <p className="text-foreground">{selectedAffiliate.email}</p>
                  </div>
                  {selectedAffiliate.phone && (
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">Phone</label>
                      <p className="text-foreground">{selectedAffiliate.phone}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    {selectedAffiliate.tiktok_handle && (
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider">TikTok</label>
                        <p className="text-foreground text-sm">{selectedAffiliate.tiktok_handle}</p>
                      </div>
                    )}
                    {selectedAffiliate.instagram_handle && (
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider">Instagram</label>
                        <p className="text-foreground text-sm">{selectedAffiliate.instagram_handle}</p>
                      </div>
                    )}
                    {selectedAffiliate.youtube_handle && (
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider">YouTube</label>
                        <p className="text-foreground text-sm">{selectedAffiliate.youtube_handle}</p>
                      </div>
                    )}
                  </div>
                  {selectedAffiliate.motivation && (
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">Motivation</label>
                      <p className="text-foreground text-sm">{selectedAffiliate.motivation}</p>
                    </div>
                  )}
                  <div className="pt-4 border-t border-border">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Referral Code</label>
                    <code className="block text-foreground bg-[#f8f7f1] px-3 py-2 rounded-lg mt-1">
                      {selectedAffiliate.referral_code}
                    </code>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-[#f8f7f1] rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Total Clicks</p>
                      <p className="text-xl font-bold text-[#004443]">{selectedAffiliate.total_clicks}</p>
                    </div>
                    <div className="bg-[#f8f7f1] rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Conversions</p>
                      <p className="text-xl font-bold text-[#004443]">{selectedAffiliate.total_conversions}</p>
                    </div>
                    <div className="bg-[#f8f7f1] rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Total Earned</p>
                      <p className="text-xl font-bold text-[#0fbcb0]">£{selectedAffiliate.total_earned}</p>
                    </div>
                    <div className="bg-[#f8f7f1] rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Total Paid</p>
                      <p className="text-xl font-bold text-[#004443]">£{selectedAffiliate.total_paid}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground pt-2">
                    Applied: {new Date(selectedAffiliate.created_at).toLocaleDateString("en-GB")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
