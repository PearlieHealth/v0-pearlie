"use client"

import { useState } from "react"
import { AffiliateSidebar } from "@/components/affiliate/affiliate-sidebar"
import { Copy, Check } from "lucide-react"

const DEMO_REFERRAL_CODE = "AFF-demo1"
const BASE_URL = "https://pearlie.org"

export default function AffiliateSettingsPage() {
  const [copied, setCopied] = useState(false)
  const link = `${BASE_URL}/?ref=${DEMO_REFERRAL_CODE}`

  const handleCopy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputClass =
    "w-full bg-[#1C1C2E] border border-white/[0.08] rounded-[14px] px-4 py-3.5 text-white placeholder:text-[#6B6B80] focus:outline-none focus:border-[#FE2C55]/40 focus:ring-1 focus:ring-[#FE2C55]/20 transition-all"

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <AffiliateSidebar affiliateName="Demo Affiliate" />

      <main className="md:ml-60 p-6 md:p-8 pb-24 md:pb-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Settings</h1>
          <p className="text-[#8B8BA3] text-sm">Manage your profile and referral link</p>
        </div>

        {/* Profile form */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] backdrop-blur-[20px] p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">Profile</h3>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm text-[#8B8BA3] mb-1.5">Name</label>
              <input type="text" placeholder="Your name" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-[#8B8BA3] mb-1.5">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                disabled
                className={inputClass + " opacity-50 cursor-not-allowed"}
              />
              <p className="text-xs text-[#6B6B80] mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm text-[#8B8BA3] mb-1.5">Phone</label>
              <input type="tel" placeholder="+44 7..." className={inputClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-[#8B8BA3] mb-1.5">TikTok</label>
                <input type="text" placeholder="@handle" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm text-[#8B8BA3] mb-1.5">Instagram</label>
                <input type="text" placeholder="@handle" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm text-[#8B8BA3] mb-1.5">YouTube</label>
                <input type="text" placeholder="Channel" className={inputClass} />
              </div>
            </div>
            <button
              className="px-6 py-3 rounded-[14px] font-bold text-white text-sm transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%)",
                boxShadow: "0 0 20px rgba(254,44,85,0.3)",
              }}
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Referral link */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] backdrop-blur-[20px] p-6">
          <h3 className="text-lg font-bold mb-4">Your Referral Link</h3>
          <div className="flex items-center bg-[#1C1C2E] border border-white/[0.08] rounded-[14px] overflow-hidden max-w-lg">
            <span className="flex-1 px-4 py-3 text-sm text-white font-mono truncate">{link}</span>
            <button
              onClick={handleCopy}
              className="px-5 py-3 font-bold text-white text-sm transition-all duration-300 flex items-center gap-2 flex-shrink-0"
              style={{
                background: copied
                  ? "transparent"
                  : "linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%)",
              }}
            >
              {copied ? (
                <span className="text-[#00F5A0] flex items-center gap-1">
                  <Check className="w-4 h-4" /> Copied
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Copy className="w-4 h-4" /> Copy
                </span>
              )}
            </button>
          </div>
          <p className="text-[#6B6B80] text-xs mt-2">
            Referral code: <span className="text-white">{DEMO_REFERRAL_CODE}</span>
          </p>
        </div>
      </main>
    </div>
  )
}
