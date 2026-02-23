"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

interface CopyLinkProps {
  referralCode: string
}

export function CopyLink({ referralCode }: CopyLinkProps) {
  const [copied, setCopied] = useState(false)
  const link = `https://pearlie.org/?ref=${referralCode}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const input = document.createElement("input")
      input.value = link
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex items-center rounded-xl overflow-hidden" style={{ backgroundColor: "#F0F0F5" }}>
      <div className="flex-1 px-4 py-3 text-sm truncate" style={{ color: "#1A1A2E" }}>
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
  )
}
