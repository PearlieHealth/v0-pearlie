"use client"

import { AffiliateSidebar } from "@/components/affiliate/affiliate-sidebar"
import { Banknote } from "lucide-react"

// Placeholder — will be replaced with real API data
export default function AffiliatePayoutsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <AffiliateSidebar affiliateName="Demo Affiliate" />

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
          <p className="text-4xl font-extrabold text-[#00F5A0]">£0.00</p>
          <p className="text-[#6B6B80] text-xs mt-1">
            Earnings not yet paid out
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

          {/* Empty state */}
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <Banknote className="w-6 h-6 text-[#6B6B80]" />
            </div>
            <p className="text-[#8B8BA3] text-sm mb-1">No payouts yet</p>
            <p className="text-[#6B6B80] text-xs">
              Payouts will appear here once you start earning
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
