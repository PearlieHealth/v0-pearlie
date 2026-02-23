import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Affiliate Dashboard | Pearlie",
  robots: "noindex, nofollow",
}

export default function AffiliateDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
