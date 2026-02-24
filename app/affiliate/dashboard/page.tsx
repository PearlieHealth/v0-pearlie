"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AffiliateSidebar } from "@/components/affiliate/affiliate-sidebar"
import { useAffiliate } from "@/hooks/use-affiliate"
import {
  MousePointerClick,
  ArrowUpRight,
  Percent,
  Banknote,
  Clock,
  CheckCircle,
  Copy,
  Check,
  TrendingUp,
  Loader2,
} from "lucide-react"

const BASE_URL = "https://pearlie.org"

function CopyLinkComponent({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false)
  const link = `${BASE_URL}/?ref=${referralCode}`

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [link])

  return (
    <div className="flex items-center bg-[#1C1C2E] border border-white/[0.08] rounded-[14px] overflow-hidden">
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
          <>
            <Check className="w-4 h-4 text-[#00F5A0]" />
            <span className="text-[#00F5A0]">Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy
          </>
        )}
      </button>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  isMoney,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  isMoney?: boolean
}) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] backdrop-blur-[20px] p-6 relative overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: "linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%)" }}
      />
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-[0.05em] text-[#8B8BA3]">{label}</span>
        <Icon className="w-4 h-4 text-[#6B6B80]" />
      </div>
      <p className={`text-3xl font-extrabold ${isMoney ? "text-[#00F5A0]" : "text-white"}`}>
        {isMoney ? `£${value}` : value}
      </p>
    </div>
  )
}

export default function AffiliateDashboardPage() {
  const router = useRouter()
  const { profile, stats, loading, error } = useAffiliate()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#8B8BA3]" />
      </div>
    )
  }

  if (error === "not_authenticated" || !profile) {
    router.push("/affiliate/login")
    return null
  }

  const s = stats || {
    total_clicks: 0,
    total_conversions: 0,
    conversion_rate: 0,
    total_earned: 0,
    pending_earnings: 0,
    total_paid: 0,
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <AffiliateSidebar affiliateName={profile.name} />

      <main className="md:ml-60 p-6 md:p-8 pb-24 md:pb-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Welcome back, {profile.name.split(" ")[0]}</h1>
          <p className="text-[#8B8BA3] text-sm">Here&apos;s your affiliate overview</p>
        </div>

        <div className="mb-8">
          <label className="block text-sm text-[#8B8BA3] mb-2">Your referral link</label>
          <CopyLinkComponent referralCode={profile.referral_code} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Clicks" value={s.total_clicks} icon={MousePointerClick} />
          <StatCard label="Conversions" value={s.total_conversions} icon={ArrowUpRight} />
          <StatCard label="Conversion Rate" value={`${s.conversion_rate}%`} icon={Percent} />
          <StatCard label="Total Earned" value={s.total_earned} icon={Banknote} isMoney />
          <StatCard label="Pending Earnings" value={s.pending_earnings} icon={Clock} isMoney />
          <StatCard label="Total Paid" value={s.total_paid} icon={CheckCircle} isMoney />
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] backdrop-blur-[20px] p-6">
          <h3 className="text-lg font-bold mb-4">Clicks & Conversions — Last 30 Days</h3>
          <div className="h-48 flex items-center justify-center text-[#6B6B80] text-sm">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-5 h-5 text-[#6B6B80]" />
              </div>
              <p>Chart will appear once you start getting clicks</p>
              <p className="text-[#6B6B80]/60 text-xs mt-1">Share your referral link to get started</p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white/[0.03] border border-white/[0.06] rounded-[20px] backdrop-blur-[20px] p-6">
          <h3 className="text-lg font-bold mb-4">Link Builder</h3>
          <p className="text-[#8B8BA3] text-sm mb-4">
            Add UTM parameters to track specific campaigns.
          </p>
          <LinkBuilder referralCode={profile.referral_code} />
        </div>
      </main>
    </div>
  )
}

function LinkBuilder({ referralCode }: { referralCode: string }) {
  const [source, setSource] = useState("")
  const [medium, setMedium] = useState("")
  const [campaign, setCampaign] = useState("")
  const [copied, setCopied] = useState(false)

  const params = new URLSearchParams()
  params.set("ref", referralCode)
  if (source) params.set("utm_source", source)
  if (medium) params.set("utm_medium", medium)
  if (campaign) params.set("utm_campaign", campaign)
  const fullLink = `${BASE_URL}/?${params.toString()}`

  const handleCopy = () => {
    navigator.clipboard.writeText(fullLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectClass =
    "bg-[#1C1C2E] border border-white/[0.08] rounded-[14px] px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FE2C55]/40 transition-all w-full appearance-none"
  const inputClass =
    "bg-[#1C1C2E] border border-white/[0.08] rounded-[14px] px-4 py-3 text-sm text-white placeholder:text-[#6B6B80] focus:outline-none focus:border-[#FE2C55]/40 transition-all w-full"

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-[#8B8BA3] mb-1.5">Source</label>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={selectClass}>
            <option value="">Select...</option>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
            <option value="blog">Blog</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#8B8BA3] mb-1.5">Medium</label>
          <select value={medium} onChange={(e) => setMedium(e.target.value)} className={selectClass}>
            <option value="">Select...</option>
            <option value="bio">Bio link</option>
            <option value="post">Post</option>
            <option value="story">Story</option>
            <option value="video_description">Video description</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#8B8BA3] mb-1.5">Campaign</label>
          <input
            type="text"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="e.g. dental_anxiety"
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex items-center bg-[#1C1C2E] border border-white/[0.08] rounded-[14px] overflow-hidden">
        <span className="flex-1 px-4 py-3 text-xs text-white font-mono truncate">{fullLink}</span>
        <button
          onClick={handleCopy}
          className="px-5 py-3 font-bold text-white text-sm transition-all duration-300 flex items-center gap-2 flex-shrink-0"
          style={{
            background: copied ? "transparent" : "linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%)",
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
    </div>
  )
}
