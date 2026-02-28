import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { HeroPostcodeCta } from "@/components/treatments/hero-postcode-cta"
import { StickyMobilePostcode } from "@/components/treatments/sticky-mobile-postcode"
import { TreatmentClinicGrid } from "@/components/treatments/treatment-clinic-grid"
import { KeyFactsBar } from "@/components/treatments/key-facts-bar"
import { ClinicalStandards } from "@/components/treatments/clinical-standards"
import { ClinicDirectoryList } from "@/components/treatments/clinic-directory-list"
import { createClient } from "@/lib/supabase/server"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Invisalign vs Spark — Costs, Differences & Which to Choose | Pearlie",
  description:
    "Invisalign vs Spark clear aligners: compare costs, treatment times, and features. Invisalign from £2,500, Spark from £2,500. Find clinics offering both near you.",
  keywords: [
    "Invisalign vs Spark",
    "Spark aligners",
    "Invisalign comparison",
    "clear aligners UK",
    "Spark vs Invisalign cost",
    "best clear aligners",
  ],
  alternates: {
    canonical: "https://pearlie.org/treatments/invisalign-vs-spark",
  },
  openGraph: {
    title: "Invisalign vs Spark — Costs, Differences & Which to Choose",
    description:
      "Compare Invisalign and Spark clear aligners: costs, treatment time, attachments, and which is best for your case.",
    url: "https://pearlie.org/treatments/invisalign-vs-spark",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Invisalign vs Spark — Costs, Differences & Which to Choose",
    description:
      "Compare Invisalign and Spark clear aligners: costs, treatment time, attachments, and which is best for your case.",
  },
}

const CLINIC_SELECT =
  "id, name, slug, city, address, postcode, rating, review_count, images, treatments, price_range, highlight_chips, verified, description"

async function getClinicsForAligners() {
  try {
    const supabase = await createClient()

    const { data } = await supabase
      .from("clinics")
      .select(CLINIC_SELECT)
      .eq("is_archived", false)
      .eq("is_live", true)
      .overlaps("treatments", ["Invisalign"])
      .order("verified", { ascending: false })
      .order("rating", { ascending: false })
      .limit(20)

    if (data && data.length > 0) return data

    const { data: fallback } = await supabase
      .from("clinics")
      .select(CLINIC_SELECT)
      .eq("is_archived", false)
      .eq("is_live", true)
      .order("verified", { ascending: false })
      .order("rating", { ascending: false })
      .limit(8)

    return fallback || []
  } catch {
    return []
  }
}

const comparisonRows = [
  { factor: "Price range (UK)", invisalign: "£2,500 – £5,500", spark: "£2,500 – £5,000" },
  { factor: "Treatment time", invisalign: "6–18 months", spark: "6–18 months" },
  { factor: "Material", invisalign: "SmartTrack (polyurethane)", spark: "TruGEN (polycarbonate)" },
  { factor: "Attachments", invisalign: "Frequently required", spark: "Fewer required (claims)" },
  { factor: "Refinements", invisalign: "Included in Comprehensive", spark: "Varies by provider" },
  { factor: "Stain resistance", invisalign: "Good", spark: "Higher (TruGEN material)" },
  { factor: "Provider network", invisalign: "Very large (est. 14M+ patients)", spark: "Growing (newer system)" },
  { factor: "Digital planning", invisalign: "iTero / ClinCheck", spark: "Approver software" },
  { factor: "FDA/CE approved", invisalign: "Yes", spark: "Yes" },
]

const faqs = [
  {
    question: "Is Spark cheaper than Invisalign?",
    answer: "Spark and Invisalign are typically priced similarly, ranging from £2,500 to £5,500. Some clinics may offer Spark at a slightly lower price since it's a newer system competing for market share. The best approach is to get quotes from clinics offering both systems.",
  },
  {
    question: "Which is better for complex cases: Invisalign or Spark?",
    answer: "Invisalign has a longer track record and larger evidence base for complex cases. Invisalign Comprehensive offers unlimited aligners and refinements. Spark is effective for mild to moderate cases but has less published data on complex treatments.",
  },
  {
    question: "Do Spark aligners stain less than Invisalign?",
    answer: "Spark's TruGEN material is designed to be more stain-resistant than Invisalign's SmartTrack material. In practice, both systems perform well if you follow care instructions — remove aligners before eating/drinking anything other than water.",
  },
  {
    question: "Are Spark attachments less visible?",
    answer: "Spark claims their system requires fewer attachments (the small tooth-coloured bumps bonded to teeth). Fewer attachments can mean a more discreet look, but the number needed depends on your specific case, not just the brand.",
  },
  {
    question: "Can my dentist offer both Invisalign and Spark?",
    answer: "Some clinics offer both systems and can recommend the best fit for your case. However, many dentists are certified for one system only. Pearlie helps you find clinics offering clear aligners so you can discuss your options.",
  },
  {
    question: "How do I choose between Invisalign and Spark?",
    answer: "Both are effective clear aligner systems. Consider: your case complexity (Invisalign has more data on complex cases), your provider's experience with each system, and the quoted price. A good provider will recommend the system best suited to your teeth.",
  },
  {
    question: "Is Spark available in the UK?",
    answer: "Yes. Spark aligners are available in the UK through certified dental providers. The network is smaller than Invisalign's but growing. Use Pearlie to find clinics offering clear aligner treatment near you.",
  },
  {
    question: "Do both systems include retainers?",
    answer: "Retainer inclusion varies by clinic, not by brand. Some clinics include retainers in the treatment price; others charge £100–£400 separately. Always confirm what's included in your quote.",
  },
]

// FAQPage schema
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
}

export default async function InvisalignVsSparkPage() {
  const clinics = await getClinicsForAligners()

  // Split clinics: verified as full cards, non-verified as directory listings
  const verifiedClinics = clinics.filter((c) => c.verified)
  const directoryClinics = clinics.filter((c) => !c.verified)
  const featuredClinics = verifiedClinics.slice(0, 8)
  const moreClinics = verifiedClinics.slice(8)

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Treatments", href: "/treatments" },
    { label: "Invisalign", href: "/treatments/invisalign" },
    { label: "Invisalign vs Spark", href: "/treatments/invisalign-vs-spark" },
  ]

  const breadcrumbSchemaItems = [
    { name: "Home", url: "https://pearlie.org" },
    { name: "Treatments", url: "https://pearlie.org/treatments" },
    { name: "Invisalign", url: "https://pearlie.org/treatments/invisalign" },
    { name: "Invisalign vs Spark", url: "https://pearlie.org/treatments/invisalign-vs-spark" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema items={breadcrumbSchemaItems} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <MainNav />
      <StickyMobilePostcode
        treatmentName="Invisalign"
        intakeTreatment="Invisalign / Clear Aligners"
      />

      <main>
        {/* 1. PROMISE — Hero */}
        <div className="pt-28 pb-8 sm:pt-32 sm:pb-12 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <BreadcrumbNav items={breadcrumbs} />

              <Link
                href="/treatments/invisalign"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#0fbcb0] transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Invisalign
              </Link>

              <div className="flex items-center gap-3 mb-4">
                <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0fbcb0] bg-[#0fbcb0]/10 rounded-full">
                  Comparison
                </span>
                <span className="inline-block px-3 py-1 text-xs font-semibold text-[#004443] bg-[#004443]/10 rounded-full">
                  Clear aligners
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] text-[#004443] mb-6 text-balance">
                Invisalign vs Spark — Costs, Differences & Which to Choose
              </h1>

              <p data-speakable="description" className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8">
                Both Invisalign and Spark are effective clear aligner systems priced from around £2,500 in the UK. Here&apos;s how they compare on cost, material, attachments, and results — so you can make an informed choice.
              </p>

              <HeroPostcodeCta
                treatmentName="Invisalign"
                intakeTreatment="Invisalign / Clear Aligners"
                ctaButtonText="Compare clinics near me"
              />
            </div>
          </div>
        </div>

        {/* 2. Trust strip */}
        <KeyFactsBar />

        {/* 3. SUPPLY — Featured clinics early */}
        <TreatmentClinicGrid
          clinics={featuredClinics}
          treatmentName="clear aligners (Invisalign & Spark)"
        />

        {/* 4. EDUCATION — Quick summary table */}
        <section className="py-10 sm:py-14 bg-[var(--cream)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-6">
                Invisalign vs Spark: quick comparison
              </h2>

              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#004443]/10">
                      <th className="text-left py-3 pr-4 font-semibold text-[#004443]"></th>
                      <th className="text-left py-3 pr-4 font-semibold text-[#004443]">Invisalign</th>
                      <th className="text-left py-3 font-semibold text-[#004443]">Spark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap">{row.factor}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{row.invisalign}</td>
                        <td className="py-3 text-muted-foreground">{row.spark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Which is cheaper? */}
        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-4">
                Which is cheaper: Invisalign or Spark?
              </h2>
              <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
                <p>
                  Both systems are priced similarly in the UK, typically ranging from <strong className="text-foreground">£2,500 to £5,500</strong> depending on case complexity. Spark may be marginally cheaper at some clinics as providers compete for market share, but the difference is usually small.
                </p>
                <p>
                  The final cost depends more on your case complexity and the clinic you choose than on the brand. A mild case requiring 7–14 aligners will cost significantly less than a complex case needing unlimited aligners.
                </p>
                <p>
                  Both systems offer finance options at most clinics, with 0% interest plans over 12–24 months commonly available. Monthly payments typically start from £100–£250.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Which is better for... */}
        <section className="py-10 sm:py-14 bg-[var(--cream)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-6">
                Which is better for your case?
              </h2>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white border border-border/50">
                  <h3 className="font-heading font-bold text-[#004443] mb-2">Simple cases (mild crowding, minor gaps)</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Both systems perform equally well. Choose based on your provider&apos;s recommendation and pricing. Spark may offer slightly fewer attachments for simple movements.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-border/50">
                  <h3 className="font-heading font-bold text-[#004443] mb-2">Moderate cases (crowding + bite correction)</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Both systems can handle moderate cases. Invisalign has a larger evidence base and more predictable refinement processes. Your provider&apos;s experience matters more than the brand.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-border/50">
                  <h3 className="font-heading font-bold text-[#004443] mb-2">Complex cases (severe crowding, significant bite issues)</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Invisalign generally has the edge for complex cases due to its longer track record, SmartForce features, and Comprehensive plan with unlimited aligners and refinements. However, an experienced Spark provider can also achieve excellent results.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-border/50">
                  <h3 className="font-heading font-bold text-[#004443] mb-2">Aesthetics-focused (minimal attachments, stain resistance)</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Spark&apos;s TruGEN material is designed to be more stain-resistant and may require fewer attachments. If discreetness is your top priority, Spark could have a slight advantage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Mid-page CTA */}
        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="p-6 sm:p-8 rounded-2xl bg-white border border-border/50 text-center">
                <p className="text-lg font-heading font-bold text-[#004443] mb-2">
                  Get an exact quote from clear aligner clinics near you
                </p>
                <p className="text-sm text-muted-foreground mb-5">
                  Enter your postcode to compare verified providers offering Invisalign and Spark in your area.
                </p>
                <div className="flex justify-center">
                  <HeroPostcodeCta
                    treatmentName="Invisalign"
                    intakeTreatment="Invisalign / Clear Aligners"
                    ctaButtonText="Compare clinics near me"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. SUPPLY — More clinics */}
        {moreClinics.length > 0 && (
          <TreatmentClinicGrid
            clinics={moreClinics}
            treatmentName="clear aligners"
            heading="More clear aligner clinics"
            subheading="Explore more verified providers in your area."
          />
        )}

        {/* Directory listings */}
        <ClinicDirectoryList
          clinics={directoryClinics}
          treatmentName="Clear Aligners"
        />

        {/* Clinical Standards */}
        <ClinicalStandards treatmentName="Invisalign" />

        {/* FAQ */}
        <section data-speakable="faq" className="py-12 sm:py-16 bg-[var(--cream)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 id="faq" className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-8">
                Invisalign vs Spark: frequently asked questions
              </h2>

              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <details key={i} className="group rounded-xl border border-border/50 bg-white px-5 sm:px-6">
                    <summary className="flex items-center justify-between cursor-pointer py-5 text-base font-semibold text-foreground [&::-webkit-details-marker]:hidden list-none">
                      {faq.question}
                      <span className="ml-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    </summary>
                    <p className="text-base text-muted-foreground leading-relaxed pb-5">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Internal links */}
        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-heading font-bold text-[#004443] mb-4">
                Related treatment guides
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <Link
                  href="/treatments/invisalign"
                  className="p-4 rounded-xl border border-border/50 bg-white hover:border-[#0fbcb0]/30 hover:shadow-md transition-all"
                >
                  <p className="font-heading font-bold text-foreground mb-1">Invisalign cost guide</p>
                  <p className="text-sm text-muted-foreground">Full pricing breakdown, tiers, and what affects cost.</p>
                </Link>
                <Link
                  href="/treatments/composite-bonding"
                  className="p-4 rounded-xl border border-border/50 bg-white hover:border-[#0fbcb0]/30 hover:shadow-md transition-all"
                >
                  <p className="font-heading font-bold text-foreground mb-1">Composite bonding prices</p>
                  <p className="text-sm text-muted-foreground">From £250 per tooth. Same-day smile enhancement.</p>
                </Link>
                <Link
                  href="/treatments/teeth-whitening"
                  className="p-4 rounded-xl border border-border/50 bg-white hover:border-[#0fbcb0]/30 hover:shadow-md transition-all"
                >
                  <p className="font-heading font-bold text-foreground mb-1">Teeth whitening cost</p>
                  <p className="text-sm text-muted-foreground">In-chair, take-home, and premium options from £250.</p>
                </Link>
                <Link
                  href="/treatments/veneers"
                  className="p-4 rounded-xl border border-border/50 bg-white hover:border-[#0fbcb0]/30 hover:shadow-md transition-all"
                >
                  <p className="font-heading font-bold text-foreground mb-1">Porcelain veneers cost</p>
                  <p className="text-sm text-muted-foreground">From £700 per tooth. Full smile transformation.</p>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-12 sm:py-16 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-4">
                Compare clear aligner clinics near you
              </h2>
              <p className="text-white/70 mb-8 leading-relaxed">
                Enter your postcode and we&apos;ll match you with verified, GDC registered clinics offering Invisalign, Spark, and other clear aligner systems.
              </p>
              <div className="max-w-lg mx-auto">
                <div className="space-y-4">
                  <HeroPostcodeCta
                    treatmentName="Invisalign"
                    intakeTreatment="Invisalign / Clear Aligners"
                    ctaButtonText="Compare clinics near me"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Medical disclaimer */}
        <div className="border-t border-border/50 bg-[var(--cream)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-3xl mx-auto">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Medical disclaimer:</strong> This content is for
                informational purposes only and does not constitute medical or
                dental advice. Always consult a GDC-registered dental
                professional for diagnosis and treatment recommendations. Prices
                shown are estimates and may vary by clinic and individual case.
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
