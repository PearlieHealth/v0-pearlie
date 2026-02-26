import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { MDXRemote } from "next-mdx-remote/rsc"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import { BreadcrumbSchema } from "@/components/breadcrumb-schema"
import { BlogHeader } from "@/components/blog/blog-header"
import { TableOfContents } from "@/components/blog/table-of-contents"
import { RelatedPosts } from "@/components/blog/related-posts"
import { useMDXComponents } from "@/components/blog/mdx-components"
import {
  getBlogPostBySlug,
  getAllBlogPosts,
  getRelatedPosts,
  BLOG_CATEGORIES,
  type BlogCategory,
} from "@/lib/content/blog"
import { extractHeadings } from "@/lib/content/mdx"

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = getAllBlogPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    return { title: "Post Not Found" }
  }

  const { meta } = post

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical: `https://pearlie.org/blog/${meta.slug}`,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `https://pearlie.org/blog/${meta.slug}`,
      type: "article",
      publishedTime: meta.publishedAt,
      modifiedTime: meta.updatedAt || meta.publishedAt,
      authors: [meta.author],
      images: meta.heroImage
        ? [
            {
              url: meta.heroImage,
              width: 1200,
              height: 630,
              alt: meta.heroImageAlt || meta.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: meta.heroImage ? [meta.heroImage] : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const { meta, content } = post
  const headings = extractHeadings(content)
  const relatedPosts = getRelatedPosts(slug, 3)
  const components = useMDXComponents()
  const category = BLOG_CATEGORIES[meta.category as BlogCategory]

  // Article structured data
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    image: meta.heroImage
      ? `https://pearlie.org${meta.heroImage}`
      : undefined,
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
      "@id": `https://pearlie.org/blog/${meta.slug}`,
    },
    ...(meta.keywords && { keywords: meta.keywords.join(", ") }),
  }

  // MedicalWebPage schema for dental/health content (YMYL signal)
  const medicalPageSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: meta.title,
    description: meta.description,
    url: `https://pearlie.org/blog/${meta.slug}`,
    lastReviewed: meta.updatedAt || meta.publishedAt,
    reviewedBy: {
      "@type": "Organization",
      name: "Pearlie",
      url: "https://pearlie.org",
    },
  }

  // Breadcrumb schema
  const breadcrumbItems = [
    { name: "Home", url: "https://pearlie.org" },
    { name: "Blog", url: "https://pearlie.org/blog" },
  ]
  if (category) {
    breadcrumbItems.push({
      name: category.label,
      url: `https://pearlie.org/blog?category=${meta.category}`,
    })
  }
  breadcrumbItems.push({
    name: meta.title,
    url: `https://pearlie.org/blog/${meta.slug}`,
  })

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbSchema items={breadcrumbItems} />

      {/* Article Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* MedicalWebPage Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalPageSchema) }}
      />

      <MainNav />

      <main>
        <BlogHeader post={meta} />

        {/* Article body */}
        <section className="py-8 sm:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-[1fr_280px] gap-10">
                {/* Main content */}
                <article className="min-w-0">
                  <MDXRemote source={content} components={components} />

                  {/* Inline CTA at end of article */}
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

                {/* Sidebar — TOC (desktop only) */}
                <aside className="hidden lg:block">
                  <div className="sticky top-24">
                    <TableOfContents headings={headings} />
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>

        {/* Related posts */}
        <RelatedPosts posts={relatedPosts} />
      </main>

      <SiteFooter />
    </div>
  )
}
