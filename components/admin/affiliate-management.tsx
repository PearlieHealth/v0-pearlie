"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Users,
  Check,
  X,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  PoundSterling,
  MousePointerClick,
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
  motivation: string | null
  created_at: string
}

type StatusFilter = "all" | "pending" | "approved" | "suspended"

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: "rgba(255, 179, 0, 0.15)", text: "#B8860B" },
  approved: { bg: "rgba(0, 214, 143, 0.15)", text: "#00A36C" },
  suspended: { bg: "rgba(255, 92, 114, 0.15)", text: "#FF5C72" },
}

export function AffiliateManagement() {
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingCommission, setEditingCommission] = useState<{ id: string; value: string } | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchAffiliates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/affiliates")
      if (res.ok) {
        const data = await res.json()
        setAffiliates(data.affiliates || [])
      }
    } catch (err) {
      console.error("Failed to fetch affiliates:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAffiliates()
  }, [fetchAffiliates])

  async function updateAffiliate(id: string, updates: Record<string, any>) {
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/affiliates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (res.ok) {
        const data = await res.json()
        setAffiliates((prev) =>
          prev.map((a) => (a.id === id ? { ...a, ...data.affiliate } : a))
        )
      }
    } catch (err) {
      console.error("Failed to update affiliate:", err)
    } finally {
      setUpdating(null)
    }
  }

  function handleCommissionSave(id: string) {
    if (!editingCommission) return
    const value = parseFloat(editingCommission.value)
    if (isNaN(value) || value < 0) return
    updateAffiliate(id, { commission_per_booking: value })
    setEditingCommission(null)
  }

  const filtered = affiliates.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.referral_code.toLowerCase().includes(q) ||
        (a.tiktok_handle || "").toLowerCase().includes(q) ||
        (a.instagram_handle || "").toLowerCase().includes(q)
      )
    }
    return true
  })

  const counts = {
    all: affiliates.length,
    pending: affiliates.filter((a) => a.status === "pending").length,
    approved: affiliates.filter((a) => a.status === "approved").length,
    suspended: affiliates.filter((a) => a.status === "suspended").length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs + search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-border">
          {(["all", "pending", "approved", "suspended"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                filter === s
                  ? "bg-[#004443] text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {s} ({counts[s]})
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search affiliates..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border text-sm bg-white outline-none focus:ring-2 focus:ring-[#004443]/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            No affiliates found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#004443] text-white">
                  <th className="text-left text-xs font-semibold px-4 py-3">Affiliate</th>
                  <th className="text-left text-xs font-semibold px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold px-4 py-3">Code</th>
                  <th className="text-right text-xs font-semibold px-4 py-3">Clicks</th>
                  <th className="text-right text-xs font-semibold px-4 py-3">Commission</th>
                  <th className="text-right text-xs font-semibold px-4 py-3">Earned</th>
                  <th className="text-left text-xs font-semibold px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((affiliate, idx) => {
                  const isExpanded = expandedId === affiliate.id
                  const isUpdating = updating === affiliate.id
                  const colors = statusColors[affiliate.status]

                  return (
                    <>
                      <tr
                        key={affiliate.id}
                        className={`border-b border-border/50 ${idx % 2 === 0 ? "bg-white" : "bg-[#faf6f0]"}`}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : affiliate.id)}
                            className="flex items-center gap-2 text-left"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{affiliate.name}</p>
                              <p className="text-xs text-muted-foreground">{affiliate.email}</p>
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs font-medium px-2.5 py-1 rounded-full capitalize"
                            style={{ backgroundColor: colors.bg, color: colors.text }}
                          >
                            {affiliate.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                            {affiliate.referral_code}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium">{affiliate.total_clicks}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editingCommission?.id === affiliate.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-xs">&pound;</span>
                              <input
                                type="number"
                                step="0.01"
                                value={editingCommission.value}
                                onChange={(e) =>
                                  setEditingCommission({ id: affiliate.id, value: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleCommissionSave(affiliate.id)
                                  if (e.key === "Escape") setEditingCommission(null)
                                }}
                                className="w-16 px-1.5 py-0.5 text-xs rounded border border-border outline-none text-right"
                                autoFocus
                              />
                              <button
                                onClick={() => handleCommissionSave(affiliate.id)}
                                className="text-green-600 hover:text-green-800"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                setEditingCommission({
                                  id: affiliate.id,
                                  value: affiliate.commission_per_booking.toString(),
                                })
                              }
                              className="text-sm font-medium hover:underline"
                            >
                              &pound;{affiliate.commission_per_booking.toFixed(2)}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-green-700">
                            &pound;{affiliate.total_earned.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {affiliate.status === "pending" && (
                              <button
                                onClick={() => updateAffiliate(affiliate.id, { status: "approved" })}
                                disabled={isUpdating}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                {isUpdating ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                Approve
                              </button>
                            )}
                            {affiliate.status === "approved" && (
                              <button
                                onClick={() => updateAffiliate(affiliate.id, { status: "suspended" })}
                                disabled={isUpdating}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                                title="Suspend"
                              >
                                {isUpdating ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                                Suspend
                              </button>
                            )}
                            {affiliate.status === "suspended" && (
                              <button
                                onClick={() => updateAffiliate(affiliate.id, { status: "approved" })}
                                disabled={isUpdating}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                                title="Reactivate"
                              >
                                {isUpdating ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded details row */}
                      {isExpanded && (
                        <tr key={`${affiliate.id}-details`} className="bg-[#faf6f0]">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Contact</p>
                                <p>{affiliate.phone || "No phone"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Social Handles</p>
                                <div className="space-y-0.5">
                                  {affiliate.tiktok_handle && <p>TikTok: {affiliate.tiktok_handle}</p>}
                                  {affiliate.instagram_handle && <p>Instagram: {affiliate.instagram_handle}</p>}
                                  {affiliate.youtube_handle && <p>YouTube: {affiliate.youtube_handle}</p>}
                                  {!affiliate.tiktok_handle && !affiliate.instagram_handle && !affiliate.youtube_handle && (
                                    <p className="text-muted-foreground">None provided</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Financial</p>
                                <p>Earned: &pound;{affiliate.total_earned.toFixed(2)}</p>
                                <p>Paid: &pound;{affiliate.total_paid.toFixed(2)}</p>
                                <p>
                                  Balance: &pound;
                                  {(affiliate.total_earned - affiliate.total_paid).toFixed(2)}
                                </p>
                              </div>
                              {affiliate.motivation && (
                                <div className="sm:col-span-3">
                                  <p className="text-xs text-muted-foreground mb-1">Motivation</p>
                                  <p className="text-sm">{affiliate.motivation}</p>
                                </div>
                              )}
                              <div className="sm:col-span-3">
                                <p className="text-xs text-muted-foreground mb-1">Applied</p>
                                <p>
                                  {new Date(affiliate.created_at).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
