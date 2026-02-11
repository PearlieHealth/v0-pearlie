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

  const handleAcceptAll = () => {
    saveCookieConsent({
      essential: true,
      analytics: true,
      marketing: true,
    })
    setShowBanner(false)
  }

  const handleRejectNonEssential = () => {
    saveCookieConsent({
      essential: true,
      analytics: false,
      marketing: false,
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
                <div>
                  <h3 className="font-semibold text-lg mb-1">Cookie Preferences</h3>
                  <p className="text-sm text-muted-foreground">
                    We use cookies to improve your experience and analyze site usage. Essential cookies are always
                    active. You can accept all cookies or manage your preferences.{" "}
                    <a href="/cookies" className="underline hover:text-foreground">
                      Learn more
                    </a>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button variant="outline" onClick={handleRejectNonEssential} className="whitespace-nowrap bg-transparent">
                Reject Non-Essential
              </Button>
              <Button variant="outline" onClick={handleManagePreferences} className="whitespace-nowrap bg-transparent">
                Manage Preferences
              </Button>
              <Button onClick={handleAcceptAll} className="whitespace-nowrap">
                Accept All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showPreferences && <CookiePreferences onClose={handlePreferencesSaved} />}
    </>
  )
}
