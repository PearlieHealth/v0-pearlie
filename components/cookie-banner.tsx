"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Shield } from "lucide-react"
import { getCookieConsent, saveCookieConsent } from "@/lib/cookie-consent"

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showCustomise, setShowCustomise] = useState(false)
  const [analytics, setAnalytics] = useState(true)
  const [marketing, setMarketing] = useState(true)

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

  const handleSavePreferences = () => {
    saveCookieConsent({
      essential: true,
      analytics,
      marketing,
    })
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card rounded-lg shadow-lg border">
        {!showCustomise ? (
          <>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-8 h-8 text-primary flex-shrink-0" />
                <h2 className="text-xl font-bold">This website uses cookies</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                We use cookies to personalise your experience, analyse site traffic, and support our marketing efforts.
                All cookie categories are preselected for the best experience.
              </p>
              <p className="text-sm text-muted-foreground">
                You can customise your preferences or accept all cookies to continue.{" "}
                <a href="/cookies" className="text-primary underline hover:text-primary/80">
                  Cookie Policy
                </a>
              </p>
            </div>
            <div className="border-t p-6 flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCustomise(true)}
                className="flex-1 bg-transparent"
              >
                Customise
              </Button>
              <Button onClick={handleAcceptAll} className="flex-1">
                Accept All Cookies
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Customise Cookie Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 pb-4 border-b">
                  <div className="flex-1">
                    <Label className="text-base font-semibold">Essential Cookies</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Required for the website to function. These cannot be disabled.
                    </p>
                  </div>
                  <Switch checked={true} disabled className="mt-1" />
                </div>

                <div className="flex items-start justify-between gap-4 pb-4 border-b">
                  <div className="flex-1">
                    <Label htmlFor="banner-analytics" className="text-base font-semibold cursor-pointer">
                      Analytics Cookies
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Help us understand how visitors use our website.
                    </p>
                  </div>
                  <Switch
                    id="banner-analytics"
                    checked={analytics}
                    onCheckedChange={setAnalytics}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label htmlFor="banner-marketing" className="text-base font-semibold cursor-pointer">
                      Marketing Cookies
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Used for personalised ads and campaign tracking.
                    </p>
                  </div>
                  <Switch
                    id="banner-marketing"
                    checked={marketing}
                    onCheckedChange={setMarketing}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            <div className="border-t p-6 flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCustomise(false)}
                className="flex-1 bg-transparent"
              >
                Back
              </Button>
              <Button onClick={handleSavePreferences} className="flex-1">
                Save Preferences
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
