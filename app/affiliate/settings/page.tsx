"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AffiliateSidebar } from "@/components/affiliate/affiliate-sidebar"
import { useAffiliate } from "@/hooks/use-affiliate"
import { Copy, Check, Loader2 } from "lucide-react"

const BASE_URL = "https://pearlie.org"

export default function AffiliateSettingsPage() {
  const router = useRouter()
  const { profile, loading: profileLoading, error } = useAffiliate()
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    name: "",
    phone: "",
    tiktok_handle: "",
    instagram_handle: "",
    youtube_handle: "",
  })

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        phone: profile.phone || "",
        tiktok_handle: profile.tiktok_handle || "",
        instagram_handle: profile.instagram_handle || "",
        youtube_handle: profile.youtube_handle || "",
      })
    }
  }, [profile])

  if (profileLoading) {
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

  const link = `${BASE_URL}/?ref=${profile.referral_code}`

  const handleCopy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch("/api/affiliates/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    "w-full bg-[#1C1C2E] border border-white/[0.08] rounded-[14px] px-4 py-3.5 text-white placeholder:text-[#6B6B80] focus:outline-none focus:border-[#FE2C55]/40 focus:ring-1 focus:ring-[#FE2C55]/20 transition-all"

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <AffiliateSidebar affiliateName={profile.name} />

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
              <input
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-[#8B8BA3] mb-1.5">Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className={inputClass + " opacity-50 cursor-not-allowed"}
              />
              <p className="text-xs text-[#6B6B80] mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm text-[#8B8BA3] mb-1.5">Phone</label>
              <input
                type="tel"
                placeholder="+44 7..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-[#8B8BA3] mb-1.5">TikTok</label>
                <input
                  type="text"
                  placeholder="@handle"
                  value={form.tiktok_handle}
                  onChange={(e) => setForm({ ...form, tiktok_handle: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-[#8B8BA3] mb-1.5">Instagram</label>
                <input
                  type="text"
                  placeholder="@handle"
                  value={form.instagram_handle}
                  onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-[#8B8BA3] mb-1.5">YouTube</label>
                <input
                  type="text"
                  placeholder="Channel"
                  value={form.youtube_handle}
                  onChange={(e) => setForm({ ...form, youtube_handle: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 rounded-[14px] font-bold text-white text-sm transition-all duration-300 disabled:opacity-50"
              style={{
                background: saved
                  ? "rgba(0,245,160,0.2)"
                  : "linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%)",
                boxShadow: saved ? "none" : "0 0 20px rgba(254,44,85,0.3)",
              }}
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
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
            Referral code: <span className="text-white">{profile.referral_code}</span>
          </p>
        </div>
      </main>
    </div>
  )
}
