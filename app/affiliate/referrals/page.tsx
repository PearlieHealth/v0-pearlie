"use client"

import { AffiliateSidebar } from "@/components/affiliate/affiliate-sidebar"
import { Link2 } from "lucide-react"

// Placeholder empty state — will be replaced with real API data
export default function AffiliateReferralsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <AffiliateSidebar affiliateName="Demo Affiliate" />

      <main className="md:ml-60 p-6 md:p-8 pb-24 md:pb-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Referrals</h1>
          <p className="text-[#8B8BA3] text-sm">Track every click from your referral links</p>
        </div>

        {/* Table header */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] backdrop-blur-[20px] overflow-hidden">
          <div className="grid grid-cols-5 gap-4 px-6 py-3 text-xs uppercase tracking-[0.05em] text-[#8B8BA3] border-b border-white/[0.06]">
            <span>Date</span>
            <span>Landing Page</span>
            <span>Source</span>
            <span>Medium</span>
            <span>Converted</span>
          </div>

          {/* Empty state */}
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-6 h-6 text-[#6B6B80]" />
            </div>
            <p className="text-[#8B8BA3] text-sm mb-1">No referrals yet</p>
            <p className="text-[#6B6B80] text-xs">
              Share your referral link to start tracking clicks
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
