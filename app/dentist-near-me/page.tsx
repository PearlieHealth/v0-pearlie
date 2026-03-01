import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { CLINIC_CARD_SELECT } from "@/lib/clinics/queries"
import { LONDON_BOROUGHS } from "@/lib/data/london-boroughs"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { DentistNearMeClient } from "./client"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Dentist Near Me | Compare Verified Local Clinics | Pearlie",
  description:
    "Find a dentist near you. Compare GDC-registered dental clinics, see real reviews and transparent pricing, and get matched free. No booking fees.",
  alternates: {
    canonical: "https://pearlie.org/dentist-near-me",
  },
  openGraph: {
    title: "Dentist Near Me | Compare Verified Local Clinics | Pearlie",
    description:
      "Find a dentist near you. Compare GDC-registered dental clinics, see real reviews and transparent pricing, and get matched free.",
    url: "https://pearlie.org/dentist-near-me",
  },
}

const FAQS = [
  {
    question: "How do I find a dentist near me?",
    answer:
      "Enter your postcode on Pearlie and we'll show you verified, GDC-registered dental clinics nearby. You can compare ratings, pricing, treatments and availability, then contact clinics directly — all free.",
  },
  {
    question: "Are NHS dentists accepting new patients near me?",
    answer:
      "NHS dental availability varies significantly by area. Many practices have long waiting lists. You can check the NHS Find a Dentist tool for NHS availability, or compare affordable private options on Pearlie — many clinics offer NHS-competitive pricing for routine care.",
  },
  {
    question: "How much does a private dentist cost near me?",
    answer:
      "A private dental check-up in London typically costs £50–£150. Hygiene appointments range from £70–£150. Cosmetic treatments vary: teeth whitening from £250, composite bonding from £200 per tooth, and Invisalign from £2,500. Pearlie shows transparent pricing so you can compare before booking.",
  },
  {
    question: "Can I see an emergency dentist today?",
    answer:
      "Yes. Many private dental clinics offer same-day emergency appointments, typically costing £50–£250. If you're in severe pain, have a broken tooth or facial swelling, contact a clinic directly through Pearlie or call NHS 111 for out-of-hours referrals.",
  },
]

const TREATMENT_SHORTCUTS = [
  { label: "Emergency Dentist Near Me", slug: "emergency-dental" },
  { label: "Invisalign Near Me", slug: "invisalign" },
  { label: "Dental Implants Near Me", slug: "dental-implants" },
  { label: "Teeth Whitening Near Me", slug: "teeth-whitening" },
  { label: "Composite Bonding Near Me", slug: "composite-bonding" },
  { label: "Veneers Near Me", slug: "veneers" },
]

async function getTopClinics() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("clinics")
      .select(CLINIC_CARD_SELECT)
      .eq("is_archived", false)
      .eq("verified", true)
      .order("rating", { ascending: false })
      .limit(6)
    return data || []
  } catch {
    return []
  }
}

async function getClinicStats() {
  try {
    const supabase = await createClient()
    const { count } = await supabase
      .from("clinics")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .eq("verified", true)
    return { totalClinics: count || 0 }
  } catch {
    return { totalClinics: 0 }
  }
}

export default async function DentistNearMePage() {
  const [clinics, stats] = await Promise.all([getTopClinics(), getClinicStats()])

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Verified Dental Clinics Near You",
    numberOfItems: clinics.length,
    itemListElement: clinics.map((clinic: Record<string, unknown>, i: number) => ({
      "@type": "ListItem",
      position: i + 1,
      name: clinic.name as string,
      url: `https://pearlie.org/clinic/${clinic.id}`,
    })),
  }

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Dentist Near Me | Pearlie",
    description:
      "Find a dentist near you. Compare GDC-registered dental clinics, see real reviews and transparent pricing, and get matched free.",
    url: "https://pearlie.org/dentist-near-me",
    publisher: {
      "@type": "Organization",
      name: "Pearlie",
      url: "https://pearlie.org",
    },
  }

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://pearlie.org" },
          { name: "Dentist Near Me", url: "https://pearlie.org/dentist-near-me" },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <MainNav />
      <main>
        <DentistNearMeClient
          clinics={clinics}
          totalClinics={stats.totalClinics}
          faqs={FAQS}
          treatmentShortcuts={TREATMENT_SHORTCUTS}
          boroughs={LONDON_BOROUGHS.map((b) => ({ slug: b.slug, name: b.name }))}
        />
      </main>
      <SiteFooter />
    </div>
  )
}
