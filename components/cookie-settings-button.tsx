"use client"

import { useState } from "react"
import { CookiePreferences } from "@/components/cookie-preferences"

export function CookieSettingsButton({ variant }: { variant?: "footer" }) {
  const [showPreferences, setShowPreferences] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowPreferences(true)}
        className={
          variant === "footer"
            ? "text-sm text-white/60 hover:text-white transition-colors"
            : "text-sm text-muted-foreground hover:text-foreground transition-colors"
        }
      >
        Cookie Settings
      </button>
      {showPreferences && <CookiePreferences onClose={() => setShowPreferences(false)} />}
    </>
  )
}
