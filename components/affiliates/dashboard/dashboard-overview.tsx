"use client"

import {
  MousePointerClick,
  Users,
  Percent,
  PoundSterling,
  Clock,
  Wallet,
} from "lucide-react"
import { CopyLink } from "./copy-link"
import { LinkBuilder } from "./link-builder"
import type { Affiliate, AffiliateStats } from "@/lib/affiliates/types"

interface DashboardOverviewProps {
  affiliate: Affiliate
  stats: AffiliateStats | null
}

export function DashboardOverview({ affiliate, stats }: DashboardOverviewProps) {
  const s = stats || {
    total_clicks: 0,
    total_conversions: 0,
    conversion_rate: 0,
    total_earned: 0,
    pending_earnings: 0,
    total_paid: 0,
  }

  const statCards = [
    {
      label: "Total Clicks",
      value: s.total_clicks.toLocaleString(),
      icon: MousePointerClick,
      color: "#0D4F4F",
    },
    {
      label: "Conversions",
      value: s.total_conversions.toLocaleString(),
      icon: Users,
      color: "#0D4F4F",
    },
    {
      label: "Conversion Rate",
      value: `${s.conversion_rate}%`,
      icon: Percent,
      color: "#00D4FF",
    },
    {
      label: "Total Earned",
      value: `\u00A3${s.total_earned.toFixed(2)}`,
      icon: PoundSterling,
      color: "#00D68F",
    },
    {
      label: "Pending",
      value: `\u00A3${s.pending_earnings.toFixed(2)}`,
      icon: Clock,
      color: "#FF5C72",
    },
    {
      label: "Total Paid",
      value: `\u00A3${s.total_paid.toFixed(2)}`,
      icon: Wallet,
      color: "#0D4F4F",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-heading font-bold mb-1" style={{ color: "#0D4F4F" }}>
          Welcome back, {affiliate.name.split(" ")[0]}
        </h1>
        <p className="text-sm" style={{ color: "#1A1A2E", opacity: 0.6 }}>
          Here&apos;s how your referrals are performing
        </p>
      </div>

      {/* Referral link */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "#0D4F4F" }}>
          Your Referral Link
        </label>
        <CopyLink referralCode={affiliate.referral_code} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl p-5 relative overflow-hidden"
              style={{
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                borderTop: "3px solid transparent",
                borderImage: "linear-gradient(135deg, #FF5C72, #00D4FF) 1",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: card.color, opacity: 0.6 }} />
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#1A1A2E", opacity: 0.5 }}>
                  {card.label}
                </span>
              </div>
              <p className="text-2xl font-extrabold tabular-nums" style={{ color: card.color }}>
                {card.value}
              </p>
            </div>
          )
        })}
      </div>

      {/* Link builder */}
      <LinkBuilder referralCode={affiliate.referral_code} />

      {/* Placeholder for chart */}
      <div
        className="bg-white rounded-2xl p-6"
        style={{
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          borderTop: "3px solid transparent",
          borderImage: "linear-gradient(135deg, #FF5C72, #00D4FF) 1",
        }}
      >
        <h3 className="font-heading font-bold mb-4" style={{ color: "#0D4F4F" }}>
          Clicks &amp; Conversions (Last 30 Days)
        </h3>
        <div
          className="h-48 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "#F0F0F5" }}
        >
          <p className="text-sm" style={{ color: "#1A1A2E", opacity: 0.4 }}>
            Chart will appear once you start getting referral clicks
          </p>
        </div>
      </div>
    </div>
  )
}
