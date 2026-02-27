import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { MDXRemote } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { GuideSidebar } from "@/components/guides/guide-sidebar"
import { useMDXComponents } from "@/components/blog/mdx-components"
import { getGuideBySlug, getAllGuides } from "@/lib/content/guides"
import { getAllBlogPosts } from "@/lib/content/blog"
import { extractHeadings } from "@/lib/content/mdx"
import { Clock, Calendar, ArrowLeft, BookOpen } from "lucide-react"

interface GuidePageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const guides = getAllGuides()
  return guides.map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuideBySlug(slug)

  if (!guide) {
    return { title: "Guide Not Found" }
  }

  const { meta } = guide

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical: `https://pearlie.org/guides/${meta.slug}`,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `https://pearlie.org/guides/${meta.slug}`,
      type: "article",
      publishedTime: meta.publishedAt,
      modifiedTime: meta.updatedAt || meta.publishedAt,
      authors: [meta.author],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
  }
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params
  const guide = getGuideBySlug(slug)

  if (!guide) {
    notFound()
  }

  const { meta, content } = guide
  const headings = extractHeadings(content)
  const components = useMDXComponents()

  // Find cluster blog posts linked from this guide
  const allPosts = getAllBlogPosts()
  const clusterPosts = meta.clusterSlugs
    ? meta.clusterSlugs
        .map((s) => allPosts.find((p) => p.slug === s))
        .filter(Boolean)
        .map((p) => ({ slug: p!.slug, title: p!.title }))
    : []

  const publishedDate = new Date(meta.publishedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const updatedDate = meta.updatedAt
    ? new Date(meta.updatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  // Article structured data
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    datePublished: meta.publishedAt,
    dateModified: meta.updatedAt || meta.publishedAt,
    author: {
      "@type": "Organization",
      name: meta.author,
      url: "https://pearlie.org",
    },
    publisher: {
      "@type": "Organization",
      name: "Pearlie",
      logo: {
        "@type": "ImageObject",
        url: "https://pearlie.org/apple-icon.jpg",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://pearlie.org/guides/${meta.slug}`,
    },
    ...(meta.keywords && { keywords: meta.keywords.join(", ") }),
  }

  // MedicalWebPage schema for dental/health content (YMYL signal)
  const medicalPageSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: meta.title,
    description: meta.description,
    url: `https://pearlie.org/guides/${meta.slug}`,
    lastReviewed: meta.updatedAt || meta.publishedAt,
    reviewedBy: {
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
          { name: "Guides", url: "https://pearlie.org/guides" },
          {
            name: meta.title,
            url: `https://pearlie.org/guides/${meta.slug}`,
          },
        ]}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalPageSchema) }}
      />

      <MainNav />

      <main>
        {/* Guide Header */}
        <div className="pt-28 pb-8 sm:pt-32 sm:pb-12 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <BreadcrumbNav
                items={[
                  { label: "Home", href: "/" },
                  { label: "Guides", href: "/guides" },
                  { label: meta.title, href: `/guides/${meta.slug}` },
                ]}
              />

              <Link
                href="/guides"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#0fbcb0] transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                All guides
              </Link>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#0fbcb0]/10 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-[#0fbcb0]" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0fbcb0]">
                  Complete Guide
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] text-[#004443] mb-6 text-balance">
                {meta.title}
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-6">
                {meta.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{meta.author}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {publishedDate}
                </span>
                {updatedDate && updatedDate !== publishedDate && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                    <span className="text-muted-foreground/70">
                      Updated {updatedDate}
                    </span>
                  </>
                )}
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {meta.readingTime}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Guide body */}
        <section className="py-8 sm:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-[1fr_280px] gap-10">
                {/* Main content */}
                <article className="min-w-0">
                  <MDXRemote
                    source={content}
                    components={components}
                    options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
                  />

                  {/* Inline CTA */}
                  <div className="mt-12 rounded-2xl bg-[var(--cream)] border border-border/50 p-6 md:p-8 text-center">
                    <h3 className="text-xl font-heading font-bold text-[#004443] mb-2">
                      Looking for a dentist?
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Pearlie matches you with verified, GDC-registered clinics
                      tailored to your needs. Free and independent.
                    </p>
                    <Button
                      size="lg"
                      className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full px-8"
                      asChild
                    >
                      <Link href="/intake">Find my clinic</Link>
                    </Button>
                  </div>

                  {/* Tags */}
                  {meta.tags && meta.tags.length > 0 && (
                    <div className="mt-8 flex flex-wrap gap-2">
                      {meta.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 text-xs font-medium text-muted-foreground bg-secondary rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>

                {/* Sidebar */}
                <aside className="hidden lg:block">
                  <div className="sticky top-24">
                    <GuideSidebar
                      headings={headings}
                      clusterPosts={clusterPosts}
                    />
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
