"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

interface LinkBuilderProps {
  referralCode: string
}

const sourceOptions = [
  { value: "", label: "Select source" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "blog", label: "Blog" },
  { value: "other", label: "Other" },
]

const mediumOptions = [
  { value: "", label: "Select medium" },
  { value: "bio", label: "Bio link" },
  { value: "post", label: "Post" },
  { value: "story", label: "Story" },
  { value: "video", label: "Video description" },
]

export function LinkBuilder({ referralCode }: LinkBuilderProps) {
  const [source, setSource] = useState("")
  const [medium, setMedium] = useState("")
  const [campaign, setCampaign] = useState("")
  const [copied, setCopied] = useState(false)

  let link = `https://pearlie.org/?ref=${referralCode}`
  const params = new URLSearchParams()
  if (source) params.set("utm_source", source)
  if (medium) params.set("utm_medium", medium)
  if (campaign) params.set("utm_campaign", campaign)
  const utmString = params.toString()
  if (utmString) link += `&${utmString}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const input = document.createElement("input")
      input.value = link
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectStyle = {
    backgroundColor: "#F0F0F5",
    borderColor: "#F0F0F5",
    color: "#1A1A2E",
  }

  return (
    <div
      className="bg-white rounded-2xl p-6"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      <h3 className="font-heading font-bold mb-4" style={{ color: "#0D4F4F" }}>
        Link Builder
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#0D4F4F" }}>
            Source
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
            style={selectStyle}
          >
            {sourceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#0D4F4F" }}>
            Medium
          </label>
          <select
            value={medium}
            onChange={(e) => setMedium(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
            style={selectStyle}
          >
            {mediumOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#0D4F4F" }}>
            Campaign
          </label>
          <input
            type="text"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="e.g. dental_tips"
            className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
            style={selectStyle}
          />
        </div>
      </div>

      {/* Generated link */}
      <div className="flex items-center rounded-xl overflow-hidden" style={{ backgroundColor: "#F0F0F5" }}>
        <div className="flex-1 px-4 py-3 text-sm truncate font-mono" style={{ color: "#1A1A2E" }}>
          {link}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-5 py-3 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #FF5C72 0%, #00D4FF 100%)" }}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  )
}
