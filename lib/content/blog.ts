import { getAllContent, getContentBySlug, type ContentMeta } from "./mdx"
import readingTime from "reading-time"
import fs from "fs"
import path from "path"
import matter from "gray-matter"

export interface BlogPost extends ContentMeta {
  readingTime: string
}

export const BLOG_CATEGORIES = {
  "treatment-guides": {
    label: "Treatment Guides",
    description: "In-depth procedure explanations and what to expect",
  },
  "cost-finance": {
    label: "Cost & Finance",
    description: "Pricing, NHS bands, payment options and insurance",
  },
  "find-a-dentist": {
    label: "Find a Dentist",
    description: "Location-specific dental care guides",
  },
  "dental-health": {
    label: "Dental Health",
    description: "Preventive care, oral hygiene tips and advice",
  },
  "nervous-patients": {
    label: "Nervous Patients",
    description: "Dental anxiety, sedation options and overcoming fear",
  },
  "nhs-private": {
    label: "NHS & Private Care",
    description: "Navigating the UK dental system",
  },
  "for-clinics": {
    label: "For Clinics",
    description: "Practice management, marketing and growth for dental clinics",
  },
  "news-trends": {
    label: "News & Trends",
    description: "Industry updates, new treatments and dental news",
  },
} as const

export type BlogCategory = keyof typeof BLOG_CATEGORIES

export function getAllBlogPosts(): BlogPost[] {
  const contentDir = path.join(process.cwd(), "content", "blog")

  if (!fs.existsSync(contentDir)) {
    return []
  }

  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".mdx"))

  const posts = files
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, "")
      const filePath = path.join(contentDir, filename)
      const fileContents = fs.readFileSync(filePath, "utf8")
      const { data, content } = matter(fileContents)
      const stats = readingTime(content)

      return {
        ...data,
        slug,
        readingTime: stats.text,
      } as BlogPost
    })
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )

  return posts
}

export function getBlogPostBySlug(
  slug: string
): { meta: BlogPost; content: string } | null {
  const result = getContentBySlug<ContentMeta>("blog", slug)

  if (!result) {
    return null
  }

  const stats = readingTime(result.content)

  return {
    meta: {
      ...result.meta,
      readingTime: stats.text,
    },
    content: result.content,
  }
}

export function getBlogPostsByCategory(category: BlogCategory): BlogPost[] {
  return getAllBlogPosts().filter((post) => post.category === category)
}

export function getFeaturedBlogPosts(): BlogPost[] {
  return getAllBlogPosts().filter((post) => post.featured)
}

export function getRelatedPosts(currentSlug: string, limit = 3): BlogPost[] {
  const current = getBlogPostBySlug(currentSlug)
  if (!current) return []

  const allPosts = getAllBlogPosts().filter((p) => p.slug !== currentSlug)

  // First: explicitly linked related posts
  if (current.meta.relatedSlugs?.length) {
    const explicit = current.meta.relatedSlugs
      .map((slug) => allPosts.find((p) => p.slug === slug))
      .filter(Boolean) as BlogPost[]

    if (explicit.length >= limit) return explicit.slice(0, limit)

    // Fill remaining with same-category posts
    const remaining = allPosts
      .filter(
        (p) =>
          p.category === current.meta.category &&
          !current.meta.relatedSlugs!.includes(p.slug)
      )
      .slice(0, limit - explicit.length)

    return [...explicit, ...remaining]
  }

  // Fallback: same category posts
  return allPosts
    .filter((p) => p.category === current.meta.category)
    .slice(0, limit)
}
