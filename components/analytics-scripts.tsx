"use client"

import { useEffect, useState } from "react"
import Script from "next/script"
import { hasConsentForAnalytics, hasConsentForMarketing } from "@/lib/cookie-consent"

export function AnalyticsScripts() {
  const [analyticsConsent, setAnalyticsConsent] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)

  useEffect(() => {
    // Initial check
    setAnalyticsConsent(hasConsentForAnalytics())
    setMarketingConsent(hasConsentForMarketing())

    // Listen for consent changes
    const handleConsentChange = () => {
      setAnalyticsConsent(hasConsentForAnalytics())
      setMarketingConsent(hasConsentForMarketing())
    }

    window.addEventListener("cookieConsentChanged", handleConsentChange)
    return () => window.removeEventListener("cookieConsentChanged", handleConsentChange)
  }, [])

  return (
    <>
      {/* Google Analytics - only load if analytics consent given */}
      {analyticsConsent && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
            `}
          </Script>
        </>
      )}

      {/* Meta Pixel - only load if marketing consent given */}
      {marketingConsent && process.env.NEXT_PUBLIC_META_PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  )
}
