import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Your Clinic Matches | Pearlie",
  description: "View your matched dental clinics based on your treatment needs and location.",
  robots: "noindex, nofollow", // Don't index dynamic match pages
  openGraph: {
    title: "Your Clinic Matches | Pearlie",
    description: "View your personalised dental clinic matches based on your treatment needs and location.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Pearlie - Your Clinic Matches" }],
  },
  twitter: {
    card: "summary",
    title: "Your Clinic Matches | Pearlie",
    description: "View your personalised dental clinic matches based on your treatment needs and location.",
    images: ["/og-image.jpg"],
  },
}
