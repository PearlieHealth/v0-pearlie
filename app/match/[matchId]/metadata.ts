import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Your Clinic Matches | Pearlie",
  description: "View your matched dental clinics based on your treatment needs and location.",
  robots: "noindex, nofollow", // Don't index dynamic match pages
  openGraph: {
    title: "Your Clinic Matches | Pearlie",
    description: "View your personalised dental clinic matches based on your treatment needs and location.",
  },
  twitter: {
    card: "summary",
    title: "Your Clinic Matches | Pearlie",
    description: "View your personalised dental clinic matches based on your treatment needs and location.",
  },
}
