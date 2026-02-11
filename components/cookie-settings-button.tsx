"use client"

import { useState } from "react"
import { CookiePreferences } from "@/components/cookie-preferences"

export function CookieSettingsButton() {
  const [showPreferences, setShowPreferences] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowPreferences(true)}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Cookie Settings
      </button>
      {showPreferences && <CookiePreferences onClose={() => setShowPreferences(false)} />}
    </>
  )
}
