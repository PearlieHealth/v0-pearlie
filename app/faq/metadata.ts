import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Find answers to common questions about how Pearlie matches you with dental clinics in London and the UK. Free, independent, no obligation.",
  alternates: {
    canonical: "https://pearlie.org/faq",
  },
  openGraph: {
    title: "Frequently Asked Questions | Pearlie",
    description:
      "Find answers to common questions about how Pearlie matches you with dental clinics in London and the UK.",
    url: "https://pearlie.org/faq",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Pearlie - FAQ" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Frequently Asked Questions | Pearlie",
    description:
      "Find answers to common questions about how Pearlie matches you with dental clinics in London and the UK.",
    images: ["/og-image.jpg"],
  },
}
