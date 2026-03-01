import Link from "next/link"
import Image from "next/image"
import { Clock, ArrowRight } from "lucide-react"
import type { BlogPost } from "@/lib/content/blog"
import { BLOG_CATEGORIES, type BlogCategory } from "@/lib/content/blog"

interface BlogCardProps {
  post: BlogPost
  featured?: boolean
}

export function BlogCard({ post, featured = false }: BlogCardProps) {
  const category = BLOG_CATEGORIES[post.category as BlogCategory]

  if (featured) {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="group block rounded-2xl border border-border/50 bg-card overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300"
      >
        <div className="grid md:grid-cols-2 gap-0">
          {post.heroImage && (
            <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden">
              <Image
                src={post.heroImage}
                alt={post.heroImageAlt || post.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}
          <div className="p-6 md:p-8 flex flex-col justify-center">
            {category && (
              <span className="inline-block mb-3 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full w-fit">
                {category.label}
              </span>
            )}
            <h2 className="text-2xl md:text-3xl font-heading font-bold tracking-[-0.02em] text-foreground mb-3 group-hover:text-primary transition-colors">
              {post.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4 line-clamp-3">
              {post.description}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{post.author}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {post.readingTime}
              </span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-2xl border border-border/50 bg-card overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300"
    >
      {post.heroImage && (
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={post.heroImage}
            alt={post.heroImageAlt || post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      <div className="p-5 sm:p-6">
        {category && (
          <span className="inline-block mb-2.5 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full">
            {category.label}
          </span>
        )}
        <h3 className="text-lg font-heading font-bold tracking-[-0.01em] text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
          {post.description}
        </p>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{post.author}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {post.readingTime}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
        </div>
      </div>
    </Link>
  )
}
