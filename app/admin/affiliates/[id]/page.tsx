"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdminNav } from "@/components/admin/admin-nav"
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  MousePointer,
  FileText,
} from "lucide-react"

interface Affiliate {
  id: string
  name: string
  email: string
  phone: string | null
  referral_code: string
  status: string
  commission_per_booking: number
  total_earned: number
  total_paid: number
  total_clicks: number
  total_conversions: number
  created_at: string
}

interface LeadData {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  treatment_interest: string | null
  postcode: string | null
  booking_status: string | null
  booking_date: string | null
  booking_time: string | null
  created_at: string
}

interface Conversion {
  id: string
  status: string
  commission_amount: number
  confirmed_at: string | null
  paid_at: string | null
  fraud_flags: string[]
  fraud_score: number
  created_at: string
  leads: LeadData | null
  referral_click: {
    landing_page: string | null
    utm_source: string | null
    visitor_ip: string | null
    created_at: string
  } | null
  clinic_name: string | null
}

interface AuditEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string
  details: Record<string, unknown>
  performed_by: string | null
  created_at: string
}

const statusIcon: Record<string, React.ReactNode> = {
  pending_verification: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  confirmed: <CheckCircle2 className="w-3.5 h-3.5 text-[#0fbcb0]" />,
  rejected: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  paid: <Banknote className="w-3.5 h-3.5 text-green-600" />,
}

const statusLabel: Record<string, string> = {
  pending_verification: "Pending",
  confirmed: "Confirmed",
  rejected: "Rejected",
  paid: "Paid",
}

export default function AffiliateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState<"conversions" | "audit" | "fraud">("conversions")
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [affRes, convRes, auditRes] = await Promise.all([
        fetch("/api/admin/affiliates"),
        fetch(`/api/admin/affiliates/${id}/conversions`),
        fetch(`/api/admin/affiliates/${id}/audit-log`),
      ])

      if (affRes.ok) {
        const all = await affRes.json()
        setAffiliate(all.find((a: Affiliate) => a.id === id) || null)
      }
      if (convRes.ok) setConversions(await convRes.json())
      if (auditRes.ok) setAuditLog(await auditRes.json())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const flaggedConversions = conversions.filter((c) => c.fraud_score > 0)

  if (loading) {
    return (
      <>
        <AdminNav />
        <div className="min-h-screen bg-[#fdfdf4] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (!affiliate) {
    return (
      <>
        <AdminNav />
        <div className="min-h-screen bg-[#fdfdf4] flex items-center justify-center">
          <p className="text-muted-foreground">Affiliate not found</p>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNav />
      <div className="min-h-screen bg-[#fdfdf4]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <button
            onClick={() => router.push("/admin/affiliates")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to affiliates
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#004443]">{affiliate.name}</h1>
              <p className="text-sm text-muted-foreground">{affiliate.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor:
                    affiliate.status === "approved"
                      ? "rgba(0,245,160,0.15)"
                      : affiliate.status === "suspended"
                        ? "rgba(254,44,85,0.15)"
                        : "rgba(255,183,77,0.15)",
                  color:
                    affiliate.status === "approved"
                      ? "#00F5A0"
                      : affiliate.status === "suspended"
                        ? "#FE2C55"
                        : "#FFB74D",
                }}
              >
                {affiliate.status}
              </span>
              <code className="text-xs bg-[#f8f7f1] px-2 py-1 rounded">{affiliate.referral_code}</code>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: "Clicks", value: affiliate.total_clicks },
              { label: "Conversions", value: affiliate.total_conversions },
              { label: "Commission Rate", value: `£${affiliate.commission_per_booking}` },
              { label: "Total Earned", value: `£${affiliate.total_earned}`, highlight: true },
              { label: "Total Paid", value: `£${affiliate.total_paid}` },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.highlight ? "text-[#0fbcb0]" : "text-[#004443]"}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border mb-4">
            {[
              { key: "conversions" as const, label: "Conversions", icon: MousePointer, count: conversions.length },
              { key: "audit" as const, label: "Audit Log", icon: FileText, count: auditLog.length },
              {
                key: "fraud" as const,
                label: "Fraud Flags",
                icon: AlertTriangle,
                count: flaggedConversions.length,
              },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
                  tab === t.key
                    ? "border-[#0fbcb0] text-[#004443]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                {t.count > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      t.key === "fraud" && t.count > 0
                        ? "bg-red-100 text-red-700"
                        : "bg-[#f8f7f1] text-muted-foreground"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "conversions" && (
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              {conversions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No conversions yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Status</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Lead</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Treatment</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Clinic</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Click Source</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Commission</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Flags</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {conversions.map((conv) => {
                        const lead = conv.leads
                        return (
                          <tr key={conv.id} className="hover:bg-[#faf3e6]/50">
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1.5">
                                {statusIcon[conv.status] || null}
                                <span className="text-xs">{statusLabel[conv.status] || conv.status}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {lead ? (
                                <div>
                                  <p className="font-medium">
                                    {lead.first_name} {lead.last_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{lead.email}</p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {lead?.treatment_interest || "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {conv.clinic_name || "—"}
                            </td>
                            <td className="px-4 py-3">
                              {conv.referral_click ? (
                                <div className="text-xs">
                                  <p className="text-muted-foreground truncate max-w-[150px]">
                                    {conv.referral_click.utm_source || conv.referral_click.landing_page || "Direct"}
                                  </p>
                                  <p className="text-muted-foreground/60">
                                    {new Date(conv.referral_click.created_at).toLocaleDateString("en-GB")}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#0fbcb0]">
                              £{conv.commission_amount}
                            </td>
                            <td className="px-4 py-3">
                              {conv.fraud_score > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                                  <AlertTriangle className="w-3 h-3" />
                                  {conv.fraud_flags.join(", ")}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Clean</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {new Date(conv.created_at).toLocaleDateString("en-GB")}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "audit" && (
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              {auditLog.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No audit events yet
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-[#0fbcb0]" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">
                            {entry.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-muted-foreground bg-[#f8f7f1] px-2 py-0.5 rounded">
                            {entry.performed_by || "system"}
                          </span>
                        </div>
                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground space-x-3">
                            {Object.entries(entry.details).map(([key, val]) => (
                              <span key={key}>
                                {key.replace(/_/g, " ")}: <strong>{String(val)}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {new Date(entry.created_at).toLocaleString("en-GB")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "fraud" && (
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              {flaggedConversions.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-8 h-8 text-[#0fbcb0] mx-auto mb-2" />
                  <p className="text-muted-foreground">No fraud flags detected</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {flaggedConversions.map((conv) => {
                    const lead = conv.leads
                    return (
                      <div key={conv.id} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium">
                            {lead?.first_name} {lead?.last_name} — {lead?.email}
                          </span>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            Score: {conv.fraud_score}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 ml-6">
                          {conv.fraud_flags.map((flag) => (
                            <span
                              key={flag}
                              className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded"
                            >
                              {flag.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground ml-6 mt-1">
                          Status: {statusLabel[conv.status] || conv.status} | Commission: £{conv.commission_amount} | Created:{" "}
                          {new Date(conv.created_at).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
