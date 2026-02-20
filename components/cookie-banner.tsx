"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Cookie } from "lucide-react"
import { getCookieConsent, saveCookieConsent } from "@/lib/cookie-consent"
import { CookiePreferences } from "@/components/cookie-preferences"

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)

  useEffect(() => {
    const consent = getCookieConsent()
    setShowBanner(!consent)
  }, [])

  const handleOk = () => {
    saveCookieConsent({
      essential: true,
      analytics: true,
      marketing: true,
    })
    setShowBanner(false)
  }

  const handleManagePreferences = () => {
    setShowPreferences(true)
  }

  const handlePreferencesSaved = () => {
    setShowBanner(false)
    setShowPreferences(false)
  }

  if (!showBanner) return null

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-start gap-3">
                <Cookie className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <p className="text-sm text-muted-foreground">
                  By using this website, you agree to our use of cookies. We use cookies to provide you with a great
                  experience and to help our website run effectively.{" "}
                  <a href="/cookies" className="underline hover:text-foreground">
                    Learn more
                  </a>
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button variant="outline" onClick={handleManagePreferences} className="whitespace-nowrap bg-transparent">
                Manage Preferences
              </Button>
              <Button onClick={handleOk} className="whitespace-nowrap">
                OK
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showPreferences && <CookiePreferences onClose={handlePreferencesSaved} />}
    </>
  )
}
