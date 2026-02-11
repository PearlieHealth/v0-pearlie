"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import { getCookieConsent, saveCookieConsent } from "@/lib/cookie-consent"

interface CookiePreferencesProps {
  onClose: () => void
}

export function CookiePreferences({ onClose }: CookiePreferencesProps) {
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    const consent = getCookieConsent()
    if (consent) {
      setAnalytics(consent.analytics)
      setMarketing(consent.marketing)
    }
  }, [])

  const handleSave = () => {
    saveCookieConsent({
      essential: true,
      analytics,
      marketing,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] bg-card rounded-lg shadow-lg border">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-2xl font-bold">Cookie Preferences</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 pb-4 border-b">
              <div className="flex-1">
                <Label className="text-lg font-semibold">Essential Cookies</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Required for the website to function properly. These cannot be disabled.
                </p>
              </div>
              <Switch checked={true} disabled className="mt-1" />
            </div>

            <div className="flex items-start justify-between gap-4 pb-4 border-b">
              <div className="flex-1">
                <Label htmlFor="analytics" className="text-lg font-semibold cursor-pointer">
                  Analytics Cookies
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Help us understand how visitors interact with our website by collecting anonymous usage data.
                </p>
              </div>
              <Switch id="analytics" checked={analytics} onCheckedChange={setAnalytics} className="mt-1" />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="marketing" className="text-lg font-semibold cursor-pointer">
                  Marketing Cookies
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Used to deliver personalized advertisements and track campaign effectiveness.
                </p>
              </div>
              <Switch id="marketing" checked={marketing} onCheckedChange={setMarketing} className="mt-1" />
            </div>
          </div>

          <div className="bg-accent p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              You can change your cookie preferences at any time using the "Cookie Settings" link in the footer.
            </p>
          </div>
        </div>

        <div className="border-t p-6 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  )
}
