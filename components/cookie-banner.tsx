"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Cookie } from "lucide-react"
import { getCookieConsent, saveCookieConsent } from "@/lib/cookie-consent"

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showCustomise, setShowCustomise] = useState(false)
  const [analytics, setAnalytics] = useState(true)
  const [marketing, setMarketing] = useState(true)
  const acceptedRef = useRef(false)

  const acceptAll = useCallback((dismiss = true) => {
    if (acceptedRef.current) return
    acceptedRef.current = true
    saveCookieConsent({
      essential: true,
      analytics: true,
      marketing: true,
    })
    if (dismiss) setShowBanner(false)
  }, [])

  useEffect(() => {
    const consent = getCookieConsent()
    if (consent) return

    setShowBanner(true)

    // Implied consent: dismiss banner when user starts interacting with a form
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target.closest("[data-cookie-banner]")) return
      const isFormElement =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.getAttribute("role") === "combobox"
      if (isFormElement) {
        acceptAll(true)
      }
    }

    document.addEventListener("focusin", handleFocusIn)
    return () => {
      document.removeEventListener("focusin", handleFocusIn)
    }
  }, [acceptAll])

  const handleSavePreferences = () => {
    acceptedRef.current = true
    saveCookieConsent({
      essential: true,
      analytics,
      marketing,
    })
    setShowBanner(false)
    setShowCustomise(false)
  }

  if (!showBanner) return null

  return (
    <>
      <div data-cookie-banner className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-start gap-3">
                <Cookie className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Cookie Preferences</h3>
                  <p className="text-sm text-muted-foreground">
                    We use cookies to personalise your experience, analyse site traffic, and support our marketing
                    efforts. By continuing to use this website, you agree to our use of cookies.{" "}
                    <a href="/cookies" className="underline hover:text-foreground">
                      Learn more
                    </a>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button variant="outline" onClick={() => setShowCustomise(true)} className="whitespace-nowrap bg-transparent">
                Customise
              </Button>
              <Button onClick={acceptAll} className="whitespace-nowrap">
                Accept All Cookies
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showCustomise && (
        <div data-cookie-banner className="fixed inset-0 z-50 bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-lg shadow-lg border">
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
          </div>
        </div>
      )}
    </>
  )
}
