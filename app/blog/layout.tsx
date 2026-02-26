import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    template: "%s | Pearlie Blog",
    default: "Dental Blog - Expert Guides, Tips & Advice | Pearlie",
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
