import type React from "react"
import type { Metadata, Viewport } from "next"
import { DM_Sans, Inter_Tight } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { CookieBanner } from "@/components/cookie-banner"
import { AnalyticsScripts } from "@/components/analytics-scripts"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
})

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter-tight",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://pearlie.org"),
  title: {
    default: "Pearlie - Find the Right Dental Clinic for You",
    template: "%s | Pearlie",
  },
  description:
    "Match with trusted, GDC-registered dental clinics in London and across the UK. Free, independent, and tailored to your needs.",
  generator: "Pearlie",
  alternates: {
    canonical: "https://pearlie.org",
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://pearlie.org",
    siteName: "Pearlie",
    title: "Pearlie - Find the Right Dental Clinic in London & UK",
    description:
      "Match with trusted, GDC-registered dental clinics in London and across the UK. Free, independent, and tailored to your needs.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Pearlie - Find the Right Dental Clinic" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pearlie - Find the Right Dental Clinic in London & UK",
    description:
      "Match with trusted, GDC-registered dental clinics in London and across the UK.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/icon-light-32x32.jpg",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.jpg",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/apple-icon.jpg",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0fbcb0",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${interTight.variable}`}>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://pearlie.org/#organization",
                  name: "Pearlie",
                  url: "https://pearlie.org",
                  logo: "https://pearlie.org/apple-icon.jpg",
                  description:
                    "Independent dental clinic matching platform helping patients find the right dental clinic in London and across the UK.",
                  founder: {
                    "@type": "Person",
                    name: "Dr Grei Muskaj",
                  },
                  contactPoint: {
                    "@type": "ContactPoint",
                    email: "hello@pearlie.org",
                    contactType: "customer service",
                  },
                  areaServed: [
                    {
                      "@type": "City",
                      name: "London",
                      containedInPlace: {
                        "@type": "Country",
                        name: "United Kingdom",
                      },
                    },
                    {
                      "@type": "Country",
                      name: "United Kingdom",
                    },
                  ],
                  sameAs: [
                    "https://www.instagram.com/pearlie.uk",
                    "https://www.linkedin.com/company/pearlie-uk",
                    "https://x.com/pearlie_uk",
                  ],
                },
                {
                  "@type": "WebSite",
                  "@id": "https://pearlie.org/#website",
                  url: "https://pearlie.org",
                  name: "Pearlie",
                  publisher: { "@id": "https://pearlie.org/#organization" },
                  potentialAction: {
                    "@type": "SearchAction",
                    target: "https://pearlie.org/intake",
                    description: "Find your dental clinic match",
                  },
                },
                {
                  "@type": "WebApplication",
                  name: "Pearlie",
                  url: "https://pearlie.org",
                  applicationCategory: "HealthApplication",
                  operatingSystem: "Web",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "GBP",
                  },
                  provider: { "@id": "https://pearlie.org/#organization" },
                },
              ],
            }),
          }}
        />
        {children}
        <CookieBanner />
        <AnalyticsScripts />
        <Analytics />
        <Toaster />
        <SonnerToaster position="top-center" richColors />
      </body>
    </html>
  )
}
