"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Shield } from "lucide-react"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { getCookieConsent, saveCookieConsent } from "@/lib/cookie-consent"

function CookieTable({ cookies }: { cookies: { name: string; provider: string; purpose: string; expiry: string; type: string }[] }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Name</th>
            <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Provider</th>
            <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Purpose</th>
            <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Expiry</th>
            <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Type</th>
          </tr>
        </thead>
        <tbody>
          {cookies.map((cookie) => (
            <tr key={cookie.name} className="border-b last:border-b-0">
              <td className="py-2 px-1 font-mono text-muted-foreground">{cookie.name}</td>
              <td className="py-2 px-1 text-muted-foreground">{cookie.provider}</td>
              <td className="py-2 px-1 text-muted-foreground">{cookie.purpose}</td>
              <td className="py-2 px-1 text-muted-foreground whitespace-nowrap">{cookie.expiry}</td>
              <td className="py-2 px-1 text-muted-foreground">{cookie.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const essentialCookies = [
  { name: "pearlie_cookie_consent", provider: "Pearlie", purpose: "Stores your cookie consent preferences", expiry: "Persistent", type: "Local Storage" },
  { name: "sb-access-token", provider: "Supabase", purpose: "Authentication session token", expiry: "1 hour", type: "HTTP Cookie" },
  { name: "sb-refresh-token", provider: "Supabase", purpose: "Refreshes your authentication session", expiry: "7 days", type: "HTTP Cookie" },
  { name: "__Host-next-auth", provider: "Next.js", purpose: "Session management and CSRF protection", expiry: "Session", type: "HTTP Cookie" },
]

const analyticsCookies = [
  { name: "_ga", provider: "Google", purpose: "Distinguishes unique users by assigning a randomly generated number", expiry: "2 years", type: "HTTP Cookie" },
  { name: "_ga_*", provider: "Google", purpose: "Used by Google Analytics to collect data on the number of visits, and session timestamps", expiry: "2 years", type: "HTTP Cookie" },
  { name: "_gid", provider: "Google", purpose: "Registers a unique ID used to generate statistical data on website usage", expiry: "1 day", type: "HTTP Cookie" },
  { name: "_gat", provider: "Google", purpose: "Used to throttle request rate to Google Analytics", expiry: "1 minute", type: "HTTP Cookie" },
]

const marketingCookies = [
  { name: "_fbp", provider: "Meta", purpose: "Identifies browsers for advertising and site analytics", expiry: "3 months", type: "HTTP Cookie" },
  { name: "_fbc", provider: "Meta", purpose: "Stores last visit from a Facebook ad click", expiry: "2 years", type: "HTTP Cookie" },
  { name: "fr", provider: "Meta", purpose: "Used by Facebook to deliver personalised advertisements", expiry: "3 months", type: "HTTP Cookie" },
  { name: "_ttp", provider: "TikTok", purpose: "Identifies browsers for advertising and site analytics", expiry: "13 months", type: "HTTP Cookie" },
  { name: "_tt_enable_cookie", provider: "TikTok", purpose: "Checks whether cookies are enabled for TikTok Pixel", expiry: "13 months", type: "HTTP Cookie" },
  { name: "tt_appInfo", provider: "TikTok", purpose: "Used to track visitor behaviour for advertising efficiency", expiry: "Session", type: "HTTP Cookie" },
  { name: "tt_pixel_session_index", provider: "TikTok", purpose: "Tracks session information for TikTok conversion tracking", expiry: "Session", type: "HTTP Cookie" },
]

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
      <div className="w-full max-w-2xl bg-card rounded-lg shadow-lg border max-h-[90vh] flex flex-col">
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
            <div className="p-6 overflow-y-auto flex-1">
              <h2 className="text-xl font-bold mb-2">Customise Cookie Preferences</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Click on the categories below to learn more about each type of cookie. You can toggle optional cookies on or off.
              </p>

              <Accordion type="multiple" className="w-full">
                <AccordionItem value="essential">
                  <div className="flex items-center justify-between gap-4">
                    <AccordionTrigger className="flex-1 hover:no-underline">
                      <div className="text-left">
                        <Label className="text-base font-semibold pointer-events-none">Essential Cookies ({essentialCookies.length})</Label>
                        <p className="text-sm text-muted-foreground mt-1 font-normal">
                          Required for the website to function. These cannot be disabled.
                        </p>
                      </div>
                    </AccordionTrigger>
                    <Switch checked={true} disabled className="shrink-0" />
                  </div>
                  <AccordionContent>
                    <CookieTable cookies={essentialCookies} />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="analytics">
                  <div className="flex items-center justify-between gap-4">
                    <AccordionTrigger className="flex-1 hover:no-underline">
                      <div className="text-left">
                        <Label className="text-base font-semibold pointer-events-none">Analytics Cookies ({analyticsCookies.length})</Label>
                        <p className="text-sm text-muted-foreground mt-1 font-normal">
                          Help us understand how visitors use our website by collecting anonymous usage data.
                        </p>
                      </div>
                    </AccordionTrigger>
                    <Switch
                      checked={analytics}
                      onCheckedChange={setAnalytics}
                      className="shrink-0"
                    />
                  </div>
                  <AccordionContent>
                    <CookieTable cookies={analyticsCookies} />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="marketing">
                  <div className="flex items-center justify-between gap-4">
                    <AccordionTrigger className="flex-1 hover:no-underline">
                      <div className="text-left">
                        <Label className="text-base font-semibold pointer-events-none">Marketing Cookies ({marketingCookies.length})</Label>
                        <p className="text-sm text-muted-foreground mt-1 font-normal">
                          Used to deliver personalised advertisements and measure campaign effectiveness.
                        </p>
                      </div>
                    </AccordionTrigger>
                    <Switch
                      checked={marketing}
                      onCheckedChange={setMarketing}
                      className="shrink-0"
                    />
                  </div>
                  <AccordionContent>
                    <CookieTable cookies={marketingCookies} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            <div className="border-t p-6 flex flex-col sm:flex-row gap-3 shrink-0">
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
