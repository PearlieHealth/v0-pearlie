import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Affiliate Programme - Earn by Referring Patients",
  description:
    "Join the Pearlie Affiliate Programme. Earn commission for every confirmed booking from your referrals. Perfect for TikTok creators, influencers, and dental professionals.",
  openGraph: {
    title: "Pearlie Affiliate Programme - Earn by Referring Patients",
    description:
      "Join the Pearlie Affiliate Programme. Earn commission for every confirmed booking from your referrals.",
  },
}

export default function AffiliatesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
