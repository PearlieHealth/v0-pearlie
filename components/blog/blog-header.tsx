import Image from "next/image"
import { Clock, Calendar, ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { BlogPost } from "@/lib/content/blog"
import { BLOG_CATEGORIES, type BlogCategory } from "@/lib/content/blog"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

interface BlogHeaderProps {
  post: BlogPost
}

export function BlogHeader({ post }: BlogHeaderProps) {
  const category = BLOG_CATEGORIES[post.category as BlogCategory]
  const publishedDate = new Date(post.publishedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const updatedDate = post.updatedAt
    ? new Date(post.updatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
  ]

  if (category) {
    breadcrumbs.push({
      label: category.label,
      href: `/blog?category=${post.category}`,
    })
  }

  breadcrumbs.push({ label: post.title, href: `/blog/${post.slug}` })

  return (
    <div className="pt-28 pb-8 sm:pt-32 sm:pb-12 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <BreadcrumbNav items={breadcrumbs} />

          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all articles
          </Link>

          {category && (
            <span className="inline-block mb-4 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full">
              {category.label}
            </span>
          )}

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] text-foreground mb-6 text-balance">
            {post.title}
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-6">
            {post.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
            <span className="font-medium text-foreground">{post.author}</span>
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
              {post.readingTime}
            </span>
          </div>

          {post.heroImage && (
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-border/50">
              <Image
                src={post.heroImage}
                alt={post.heroImageAlt || post.title}
                fill
                priority
                className="object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
