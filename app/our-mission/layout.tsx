import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"

export const metadata: Metadata = {
  title: "Our Mission - Improving Dental Access in the UK",
  description:
    "Pearlie is on a mission to improve dental access across the UK by helping patients find the right dental clinic for their needs — quickly, transparently, and without pressure.",
  alternates: {
    canonical: "https://pearlie.org/our-mission",
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
