"use client"

import { Wallet } from "lucide-react"
import type { Affiliate, AffiliatePayout } from "@/lib/affiliates/types"

interface PayoutsTableProps {
  payouts: AffiliatePayout[]
  affiliate: Affiliate
}

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: "rgba(255, 179, 0, 0.15)", text: "#B8860B" },
  processing: { bg: "rgba(0, 212, 255, 0.15)", text: "#00A3CC" },
  completed: { bg: "rgba(0, 214, 143, 0.15)", text: "#00A36C" },
  failed: { bg: "rgba(255, 92, 114, 0.15)", text: "#FF5C72" },
}

export function PayoutsTable({ payouts, affiliate }: PayoutsTableProps) {
  const unpaidBalance = (affiliate.total_earned || 0) - (affiliate.total_paid || 0)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-5 h-5" style={{ color: "#0D4F4F" }} />
          <h1 className="text-2xl font-heading font-bold" style={{ color: "#0D4F4F" }}>
            Payouts
          </h1>
        </div>
        <p className="text-sm" style={{ color: "#1A1A2E", opacity: 0.6 }}>
          Your payout history and current balance
        </p>
      </div>

      {/* Balance card */}
      <div
        className="bg-white rounded-2xl p-6"
        style={{
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          borderLeft: "4px solid transparent",
          borderImage: "linear-gradient(to bottom, #FF5C72, #00D4FF) 1",
        }}
      >
        <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "#1A1A2E", opacity: 0.5 }}>
          Unpaid Balance
        </p>
        <p className="text-3xl font-extrabold" style={{ color: "#00D68F" }}>
          &pound;{unpaidBalance.toFixed(2)}
        </p>
        <p className="text-xs mt-1" style={{ color: "#1A1A2E", opacity: 0.5 }}>
          Total earned: &pound;{(affiliate.total_earned || 0).toFixed(2)} &middot; Total paid: &pound;{(affiliate.total_paid || 0).toFixed(2)}
        </p>
      </div>

      {/* Payouts table */}
      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        {payouts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm" style={{ color: "#1A1A2E", opacity: 0.5 }}>
              No payouts yet. Payouts are processed monthly once you have confirmed earnings.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: "#0D4F4F" }}>
                  <th className="text-left text-xs font-semibold text-white px-5 py-3">Period</th>
                  <th className="text-left text-xs font-semibold text-white px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-white px-5 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-white px-5 py-3">Reference</th>
                  <th className="text-left text-xs font-semibold text-white px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout, idx) => {
                  const colors = statusColors[payout.status] || statusColors.pending
                  return (
                    <tr
                      key={payout.id}
                      style={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FFF8F0" }}
                    >
                      <td className="px-5 py-3 text-sm" style={{ color: "#1A1A2E" }}>
                        {payout.period_start && payout.period_end
                          ? `${new Date(payout.period_start).toLocaleDateString("en-GB", { month: "short", day: "numeric" })} - ${new Date(payout.period_end).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}`
                          : "-"
                        }
                      </td>
                      <td className="px-5 py-3 text-sm font-bold" style={{ color: "#00D68F" }}>
                        &pound;{payout.amount.toFixed(2)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="text-xs font-medium px-2.5 py-1 rounded-full capitalize"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {payout.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: "#1A1A2E" }}>
                        {payout.payment_reference || "-"}
                      </td>
                      <td className="px-5 py-3 text-sm" style={{ color: "#1A1A2E" }}>
                        {new Date(payout.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
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
