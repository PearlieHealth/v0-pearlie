"use client"

import { useState, useEffect, useCallback } from "react"
import { AdminNav } from "@/components/admin/admin-nav"
import {
  Banknote,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react"

interface Payout {
  id: string
  affiliate_id: string
  amount: number
  status: "pending" | "processing" | "completed" | "failed"
  payment_method: string | null
  payment_reference: string | null
  period_start: string | null
  period_end: string | null
  created_at: string
  affiliates: { name: string; email: string } | null
}

const statusConfig: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
  pending: {
    icon: <Clock className="w-3.5 h-3.5" />,
    bg: "rgba(255,183,77,0.15)",
    text: "#FFB74D",
    label: "Pending",
  },
  processing: {
    icon: <ArrowRight className="w-3.5 h-3.5" />,
    bg: "rgba(66,165,245,0.15)",
    text: "#42A5F5",
    label: "Processing",
  },
  completed: {
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    bg: "rgba(0,245,160,0.15)",
    text: "#00F5A0",
    label: "Completed",
  },
  failed: {
    icon: <XCircle className="w-3.5 h-3.5" />,
    bg: "rgba(254,44,85,0.15)",
    text: "#FE2C55",
    label: "Failed",
  },
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [refInput, setRefInput] = useState<{ id: string; value: string } | null>(null)

  const fetchPayouts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/payouts")
      if (res.ok) setPayouts(await res.json())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayouts()
  }, [fetchPayouts])

  const updatePayout = async (id: string, status: string, paymentRef?: string) => {
    setUpdatingId(id)
    try {
      const body: Record<string, string> = { status }
      if (paymentRef) body.payment_reference = paymentRef
      const res = await fetch(`/api/admin/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        await fetchPayouts()
        setRefInput(null)
      } else {
        const err = await res.json()
        alert(err.error || "Failed to update payout")
      }
    } catch {
      // ignore
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = payouts.filter((p) => statusFilter === "all" || p.status === statusFilter)

  const totalPending = payouts
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((sum, p) => sum + p.amount, 0)
  const totalCompleted = payouts
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <>
      <AdminNav />
      <div className="min-h-screen bg-[#fdfdf4]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#004443]">Payouts</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage affiliate payouts and payment status
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Pending: </span>
                <span className="font-bold text-amber-600">£{totalPending.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Paid: </span>
                <span className="font-bold text-[#0fbcb0]">£{totalCompleted.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0fbcb0]/20"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-border">
              <Banknote className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No payouts found</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Affiliate</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Amount</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Period</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Status</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Reference</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Created</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((payout) => {
                      const sc = statusConfig[payout.status] || statusConfig.pending
                      return (
                        <tr key={payout.id} className="hover:bg-[#faf3e6]/50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">{payout.affiliates?.name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{payout.affiliates?.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-bold text-[#0fbcb0]">£{payout.amount}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {payout.period_start && payout.period_end
                              ? `${new Date(payout.period_start).toLocaleDateString("en-GB")} — ${new Date(payout.period_end).toLocaleDateString("en-GB")}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: sc.bg, color: sc.text }}
                            >
                              {sc.icon}
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {payout.payment_reference || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(payout.created_at).toLocaleDateString("en-GB")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {payout.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => updatePayout(payout.id, "processing")}
                                    disabled={updatingId === payout.id}
                                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
                                  >
                                    Start Processing
                                  </button>
                                  <button
                                    onClick={() => updatePayout(payout.id, "failed")}
                                    disabled={updatingId === payout.id}
                                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                                  >
                                    Fail
                                  </button>
                                </>
                              )}
                              {payout.status === "processing" && (
                                <>
                                  {refInput?.id === payout.id ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        placeholder="Payment ref..."
                                        value={refInput.value}
                                        onChange={(e) => setRefInput({ id: payout.id, value: e.target.value })}
                                        className="w-28 px-2 py-1 rounded border border-border text-xs"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => updatePayout(payout.id, "completed", refInput.value)}
                                        disabled={updatingId === payout.id}
                                        className="px-2 py-1 rounded-md text-xs font-medium bg-[#0fbcb0]/10 text-[#0fbcb0] hover:bg-[#0fbcb0]/20 disabled:opacity-50"
                                      >
                                        Complete
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setRefInput({ id: payout.id, value: payout.payment_reference || "" })}
                                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#0fbcb0]/10 text-[#0fbcb0] hover:bg-[#0fbcb0]/20 transition-colors"
                                    >
                                      Mark Complete
                                    </button>
                                  )}
                                  <button
                                    onClick={() => updatePayout(payout.id, "failed")}
                                    disabled={updatingId === payout.id}
                                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                                  >
                                    Fail
                                  </button>
                                </>
                              )}
                              {(payout.status === "completed" || payout.status === "failed") && (
                                <span className="text-xs text-muted-foreground">Final</span>
                              )}
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
      </div>
    </>
  )
}
