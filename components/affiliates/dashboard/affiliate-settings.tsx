"use client"

import { useState } from "react"
import { Settings, Loader2, Check } from "lucide-react"
import { CopyLink } from "./copy-link"
import type { Affiliate } from "@/lib/affiliates/types"

interface AffiliateSettingsProps {
  affiliate: Affiliate
  onUpdate: (affiliate: Affiliate) => void
}

export function AffiliateSettings({ affiliate, onUpdate }: AffiliateSettingsProps) {
  const [formData, setFormData] = useState({
    name: affiliate.name,
    phone: affiliate.phone || "",
    tiktok_handle: affiliate.tiktok_handle || "",
    instagram_handle: affiliate.instagram_handle || "",
    youtube_handle: affiliate.youtube_handle || "",
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSaved(false)

    try {
      const res = await fetch("/api/affiliates/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to update settings")
        return
      }

      onUpdate(data.affiliate)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    backgroundColor: "#F0F0F5",
    borderColor: "#F0F0F5",
    color: "#1A1A2E",
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5" style={{ color: "#0D4F4F" }} />
          <h1 className="text-2xl font-heading font-bold" style={{ color: "#0D4F4F" }}>
            Settings
          </h1>
        </div>
        <p className="text-sm" style={{ color: "#1A1A2E", opacity: 0.6 }}>
          Manage your affiliate profile and referral link
        </p>
      </div>

      {/* Referral link */}
      <div
        className="bg-white rounded-2xl p-6"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        <h3 className="font-heading font-bold mb-3" style={{ color: "#0D4F4F" }}>
          Your Referral Link
        </h3>
        <CopyLink referralCode={affiliate.referral_code} />
        <p className="text-xs mt-2" style={{ color: "#1A1A2E", opacity: 0.5 }}>
          Referral code: {affiliate.referral_code}
        </p>
      </div>

      {/* Profile form */}
      <div
        className="bg-white rounded-2xl p-6"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        <h3 className="font-heading font-bold mb-4" style={{ color: "#0D4F4F" }}>
          Profile
        </h3>

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm mb-4"
            style={{ backgroundColor: "rgba(255, 92, 114, 0.08)", color: "#FF5C72" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#0D4F4F" }}>
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#0D4F4F" }}>
              Email
            </label>
            <input
              type="email"
              value={affiliate.email}
              disabled
              className="w-full px-4 py-3 rounded-xl text-sm border outline-none opacity-60"
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: "#1A1A2E", opacity: 0.4 }}>
              Email cannot be changed. Contact us if you need to update it.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#0D4F4F" }}>
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+44 7XXX XXXXXX"
              className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#0D4F4F" }}>
                TikTok
              </label>
              <input
                type="text"
                value={formData.tiktok_handle}
                onChange={(e) => setFormData({ ...formData, tiktok_handle: e.target.value })}
                placeholder="@handle"
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#0D4F4F" }}>
                Instagram
              </label>
              <input
                type="text"
                value={formData.instagram_handle}
                onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                placeholder="@handle"
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#0D4F4F" }}>
                YouTube
              </label>
              <input
                type="text"
                value={formData.youtube_handle}
                onChange={(e) => setFormData({ ...formData, youtube_handle: e.target.value })}
                placeholder="@channel"
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #FF5C72 0%, #00D4FF 100%)" }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Account info */}
      <div
        className="bg-white rounded-2xl p-6"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        <h3 className="font-heading font-bold mb-3" style={{ color: "#0D4F4F" }}>
          Account
        </h3>
        <div className="space-y-2 text-sm" style={{ color: "#1A1A2E" }}>
          <div className="flex justify-between">
            <span style={{ opacity: 0.6 }}>Status</span>
            <span
              className="font-medium px-2.5 py-0.5 rounded-full text-xs capitalize"
              style={{
                backgroundColor:
                  affiliate.status === "approved"
                    ? "rgba(0, 214, 143, 0.15)"
                    : affiliate.status === "pending"
                      ? "rgba(255, 179, 0, 0.15)"
                      : "rgba(255, 92, 114, 0.15)",
                color:
                  affiliate.status === "approved"
                    ? "#00A36C"
                    : affiliate.status === "pending"
                      ? "#B8860B"
                      : "#FF5C72",
              }}
            >
              {affiliate.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ opacity: 0.6 }}>Commission per booking</span>
            <span className="font-medium">&pound;{(affiliate.commission_per_booking || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ opacity: 0.6 }}>Member since</span>
            <span className="font-medium">
              {new Date(affiliate.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
