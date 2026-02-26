import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Find Your Dental Clinic Match in London",
  description:
    "Complete our simple form to get matched with trusted, GDC-registered dental clinics in London and across the UK. Free, fast, and personalised.",
  keywords: "dental clinic finder, dentist near me, dental treatment, invisalign, veneers, teeth whitening, London dentist",
  alternates: {
    canonical: "https://pearlie.org/intake",
  },
  openGraph: {
    title: "Find Your Dental Clinic Match in London",
    description:
      "Complete our simple form to get matched with trusted, GDC-registered dental clinics in London. Free, fast, and personalised.",
    url: "https://pearlie.org/intake",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Pearlie - Find Your Dental Clinic Match" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Find Your Dental Clinic Match in London",
    description:
      "Get matched with trusted dental clinics in London. Free, fast, and personalised.",
    images: ["/og-image.jpg"],
  },
}
