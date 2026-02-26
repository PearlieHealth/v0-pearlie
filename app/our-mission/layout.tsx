import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"

export const metadata: Metadata = {
  title: "Our Mission - Improving Dental Access in the UK",
  description:
    "Pearlie is on a mission to improve dental access across the UK by helping patients find the right dental clinic for their needs — quickly and transparently.",
  alternates: {
    canonical: "https://pearlie.org/our-mission",
  },
  openGraph: {
    title: "Our Mission - Improving Dental Access in the UK",
    description:
      "Over 13 million adults in England have unmet dental needs. Pearlie is building a better way to connect patients with the right dental clinics.",
    url: "https://pearlie.org/our-mission",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Pearlie - Improving Dental Access" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Mission - Improving Dental Access in the UK",
    description:
      "Over 13 million adults in England have unmet dental needs. Pearlie is building a better way to connect patients with the right dental clinics.",
    images: ["/og-image.jpg"],
  },
}

export default function OurMissionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://pearlie.org" },
        { name: "Our Mission", url: "https://pearlie.org/our-mission" },
      ]} />
      {children}
    </>
  )
}
