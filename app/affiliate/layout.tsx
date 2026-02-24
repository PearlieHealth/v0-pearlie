import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Affiliate Dashboard",
    template: "%s | Pearlie Affiliates",
  },
  robots: "noindex, nofollow",
}

export default function AffiliateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
