import type { Metadata } from "next"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { GuideCard } from "@/components/guides/guide-card"
import { getAllGuides } from "@/lib/content/guides"

export const metadata: Metadata = {
  title: "Dental Guides - Comprehensive UK Treatment & Cost Guides",
  description:
    "In-depth guides to dental implants, Invisalign, costs and more. Everything UK patients need to know about dental treatments, written by dental professionals.",
  alternates: {
    canonical: "https://pearlie.org/guides",
  },
  openGraph: {
    title: "Dental Guides | Pearlie",
    description:
      "Comprehensive guides to dental treatments, costs and finding the right dentist in the UK.",
    url: "https://pearlie.org/guides",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dental Guides | Pearlie",
    description:
      "Comprehensive guides to dental treatments, costs and finding the right dentist in the UK.",
  },
}

export default function GuidesPage() {
  const guides = getAllGuides()

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://pearlie.org" },
          { name: "Guides", url: "https://pearlie.org/guides" },
        ]}
      />
      <MainNav />

      <main>
        {/* Hero */}
        <section className="pt-28 pb-10 sm:pt-32 sm:pb-14 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-[#0fbcb0]" />
                <span className="text-sm font-semibold uppercase tracking-wider text-[#0fbcb0]">
                  Pearlie Guides
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] text-white mb-4 text-balance">
                Comprehensive dental guides
              </h1>
              <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
                In-depth, expert-written guides covering everything you need to
                know about dental treatments, costs and care in the UK.
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-10 sm:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <BreadcrumbNav
                items={[
                  { label: "Home", href: "/" },
                  { label: "Guides", href: "/guides" },
                ]}
              />

              {guides.length === 0 ? (
                <div className="text-center py-20">
                  <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
                    Guides coming soon
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    We&apos;re working on comprehensive dental guides. Check
                    back soon.
                  </p>
                  <Button
                    size="lg"
                    className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full"
                    asChild
                  >
                    <Link href="/blog">Browse blog articles</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {guides.map((guide) => (
                    <GuideCard key={guide.slug} guide={guide} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 sm:py-16 bg-[#004443]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-4">
                Ready to find the right dental clinic?
              </h2>
              <p className="text-white/70 mb-6 leading-relaxed">
                Answer a few questions and get matched with verified,
                GDC-registered clinics tailored to your needs.
              </p>
              <Button
                size="lg"
                className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full px-8 h-12 text-base"
                asChild
              >
                <Link href="/intake">Get my clinic matches</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
