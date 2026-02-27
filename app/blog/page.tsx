import type { Metadata } from "next"
import Link from "next/link"
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { TrustBadgeStrip } from "@/components/trust-badge-strip"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"
import { BlogCard } from "@/components/blog/blog-card"
import {
  getAllBlogPosts,
  getPaginatedBlogPosts,
  BLOG_CATEGORIES,
  POSTS_PER_PAGE,
  type BlogCategory,
} from "@/lib/content/blog"

export const metadata: Metadata = {
  title: "Dental Blog - Expert Guides, Tips & Advice",
  description:
    "Expert dental guides, treatment cost breakdowns, and tips for finding the right dentist in the UK. Written by dental professionals for patients and clinics.",
  alternates: {
    canonical: "https://pearlie.org/blog",
  },
  openGraph: {
    title: "Dental Blog | Pearlie",
    description:
      "Expert dental guides, treatment cost breakdowns, and tips for finding the right dentist in the UK.",
    url: "https://pearlie.org/blog",
    type: "website",
  },
}

interface BlogPageProps {
  searchParams: Promise<{ category?: string; page?: string }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { category: activeCategory, page: pageParam } = await searchParams
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10) || 1)

  const { posts: paginatedPosts, totalPages, totalPosts } = getPaginatedBlogPosts(
    currentPage,
    activeCategory
  )

  const allPosts = getAllBlogPosts()
  const featuredPost = allPosts.find((post) => post.featured) || allPosts[0]

  // On the first page with no category filter, show featured separately
  const showFeatured = !activeCategory && currentPage === 1 && featuredPost
  const displayPosts = showFeatured
    ? paginatedPosts.filter((p) => p.slug !== featuredPost.slug)
    : paginatedPosts

  const categories = Object.entries(BLOG_CATEGORIES) as [
    BlogCategory,
    { label: string; description: string },
  ][]

  function buildPageUrl(page: number) {
    const params = new URLSearchParams()
    if (activeCategory) params.set("category", activeCategory)
    if (page > 1) params.set("page", String(page))
    const qs = params.toString()
    return `/blog${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://pearlie.org" },
          { name: "Blog", url: "https://pearlie.org/blog" },
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
                  The Pearlie Blog
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] text-white mb-4 text-balance">
                Dental guides, costs & expert advice
              </h1>
              <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
                Everything you need to know about dental treatments, costs, and
                finding the right dentist in the UK.
              </p>
            </div>
          </div>
        </section>

        <TrustBadgeStrip />

        {/* Category filters */}
        <section className="border-b border-border/50 bg-white sticky top-0 z-40">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-2 py-3 min-w-max">
                <Link
                  href="/blog"
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    !activeCategory
                      ? "bg-[#0fbcb0] text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  All
                </Link>
                {categories.map(([slug, cat]) => (
                  <Link
                    key={slug}
                    href={`/blog?category=${slug}`}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      activeCategory === slug
                        ? "bg-[#0fbcb0] text-white"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
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
                  { label: "Blog", href: "/blog" },
                  ...(activeCategory &&
                  BLOG_CATEGORIES[activeCategory as BlogCategory]
                    ? [
                        {
                          label:
                            BLOG_CATEGORIES[activeCategory as BlogCategory]
                              .label,
                          href: `/blog?category=${activeCategory}`,
                        },
                      ]
                    : []),
                ]}
              />

              {allPosts.length === 0 ? (
                <div className="text-center py-20">
                  <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
                    Articles coming soon
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    We&apos;re working on expert dental guides and advice. Check
                    back soon.
                  </p>
                  <Button
                    size="lg"
                    className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full"
                    asChild
                  >
                    <Link href="/intake">Find my clinic</Link>
                  </Button>
                </div>
              ) : (
                <>
                  {/* Featured post (first page, no category filter) */}
                  {showFeatured && (
                    <div className="mb-10">
                      <BlogCard post={featuredPost} featured />
                    </div>
                  )}

                  {/* Post grid */}
                  {displayPosts.length > 0 && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {displayPosts.map((post) => (
                        <BlogCard key={post.slug} post={post} />
                      ))}
                    </div>
                  )}

                  {paginatedPosts.length === 0 && activeCategory && (
                    <div className="text-center py-16">
                      <p className="text-muted-foreground mb-4">
                        No articles in this category yet.
                      </p>
                      <Button
                        variant="outline"
                        className="rounded-full"
                        asChild
                      >
                        <Link href="/blog">View all articles</Link>
                      </Button>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <nav
                      aria-label="Blog pagination"
                      className="mt-12 flex items-center justify-center gap-2"
                    >
                      {currentPage > 1 ? (
                        <Link
                          href={buildPageUrl(currentPage - 1)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-full border border-border/50 hover:border-border transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground/40 rounded-full border border-border/30 cursor-not-allowed">
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                          (page) => (
                            <Link
                              key={page}
                              href={buildPageUrl(page)}
                              className={`w-10 h-10 inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                                page === currentPage
                                  ? "bg-[#0fbcb0] text-white"
                                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                              }`}
                            >
                              {page}
                            </Link>
                          )
                        )}
                      </div>

                      {currentPage < totalPages ? (
                        <Link
                          href={buildPageUrl(currentPage + 1)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-full border border-border/50 hover:border-border transition-colors"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground/40 rounded-full border border-border/30 cursor-not-allowed">
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      )}
                    </nav>
                  )}
                </>
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
