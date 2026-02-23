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
    "Connect with trusted dental clinics in your area. Complete our simple form and get matched with the right clinic for your needs.",
  generator: "Pearlie",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://pearlie.org",
    siteName: "Pearlie",
    title: "Pearlie - Find the Right Dental Clinic for You",
    description:
      "Connect with trusted dental clinics in your area. Complete our simple form and get matched with the right clinic for your needs.",
    images: [{ url: "/apple-icon.jpg", width: 180, height: 180, alt: "Pearlie" }],
  },
  twitter: {
    card: "summary",
    title: "Pearlie - Find the Right Dental Clinic for You",
    description:
      "Connect with trusted dental clinics in your area.",
    images: ["/apple-icon.jpg"],
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
              "@type": "WebApplication",
              name: "Pearlie",
              url: "https://pearlie.org",
              description: "Dental clinic matching platform that connects patients with trusted dental clinics",
              applicationCategory: "HealthApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "GBP",
              },
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
