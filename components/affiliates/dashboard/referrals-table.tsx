"use client"

import { ChevronLeft, ChevronRight, MousePointerClick } from "lucide-react"
import type { Referral } from "@/lib/affiliates/types"

interface ReferralsTableProps {
  referrals: Referral[]
  total: number
  page: number
  onPageChange: (page: number) => void
}

export function ReferralsTable({ referrals, total, page, onPageChange }: ReferralsTableProps) {
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MousePointerClick className="w-5 h-5" style={{ color: "#0D4F4F" }} />
          <h1 className="text-2xl font-heading font-bold" style={{ color: "#0D4F4F" }}>
            Referrals
          </h1>
        </div>
        <p className="text-sm" style={{ color: "#1A1A2E", opacity: 0.6 }}>
          All clicks from your referral link ({total} total)
        </p>
      </div>

      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        {referrals.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm" style={{ color: "#1A1A2E", opacity: 0.5 }}>
              No referrals yet. Share your link to start tracking clicks.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: "#0D4F4F" }}>
                    <th className="text-left text-xs font-semibold text-white px-5 py-3">Date</th>
                    <th className="text-left text-xs font-semibold text-white px-5 py-3">Landing Page</th>
                    <th className="text-left text-xs font-semibold text-white px-5 py-3">Source</th>
                    <th className="text-left text-xs font-semibold text-white px-5 py-3">Medium</th>
                    <th className="text-left text-xs font-semibold text-white px-5 py-3">Campaign</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral, idx) => (
                    <tr
                      key={referral.id}
                      style={{
                        backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FFF8F0",
                      }}
                    >
                      <td className="px-5 py-3 text-sm" style={{ color: "#1A1A2E" }}>
                        {new Date(referral.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3 text-sm truncate max-w-[200px]" style={{ color: "#1A1A2E" }}>
                        {referral.landing_page || "-"}
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: "#1A1A2E" }}>
                        {referral.utm_source || "-"}
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: "#1A1A2E" }}>
                        {referral.utm_medium || "-"}
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: "#1A1A2E" }}>
                        {referral.utm_campaign || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "#F0F0F5" }}>
                <p className="text-xs" style={{ color: "#1A1A2E", opacity: 0.5 }}>
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                    style={{ color: "#0D4F4F" }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                    style={{ color: "#0D4F4F" }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
