import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Bricolage_Grotesque } from "next/font/google"
import ForClinicsPage from "@/components/ForClinicsPage"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
})

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-bricolage",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Pearly — Get Pre-Qualified Dental Patients | For Clinics",
  description:
    "Receive high-need, pre-qualified patients for £287/month. 3 patients included. No contracts, no ad spend, no agency needed. Cancel anytime.",
  alternates: {
    canonical: "https://pearlie.org/for-clinics",
  },
  openGraph: {
    title: "Pearly — Get Pre-Qualified Dental Patients",
    description:
      "Receive high-need patients who are ready to book — for less than the cost of a Google ad.",
    url: "https://pearlie.org/for-clinics",
    siteName: "Pearly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pearly — Get Pre-Qualified Dental Patients",
    description:
      "Receive high-need patients who are ready to book — for less than the cost of a Google ad.",
  },
}

export default function ForClinicsRoute() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://pearlie.org" },
          { name: "For Clinics", url: "https://pearlie.org/for-clinics" },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Pearly Standard Plan",
            description:
              "Monthly dental clinic subscription — 3 matched patient leads included with full patient intent data.",
            provider: { "@id": "https://pearlie.org/#organization" },
            offers: [
              {
                "@type": "Offer",
                name: "Standard",
                price: "287",
                priceCurrency: "GBP",
                availability: "https://schema.org/InStock",
                description: "3 pre-qualified patient leads per month",
              },
              {
                "@type": "Offer",
                name: "Premium",
                price: "450",
                priceCurrency: "GBP",
                availability: "https://schema.org/InStock",
                description: "5 pre-qualified patient leads per month with priority matching",
              },
            ],
          }),
        }}
      />
      <div className={`${jakarta.variable} ${bricolage.variable}`}>
        <ForClinicsPage />
      </div>
    </>
  )
}
