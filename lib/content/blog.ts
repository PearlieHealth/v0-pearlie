import { getAllContent, getContentBySlug, type ContentMeta } from "./mdx"
import readingTime from "reading-time"
import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { createAdminClient } from "@/lib/supabase/admin"

export interface BlogPost extends ContentMeta {
  readingTime: string
  /** Source of the article: 'mdx' (file-based) or 'outrank' (webhook) */
  source?: "mdx" | "outrank"
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

export const POSTS_PER_PAGE = 9

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

export function getPaginatedBlogPosts(
  page: number,
  category?: string
): { posts: BlogPost[]; totalPages: number; totalPosts: number } {
  let allPosts = getAllBlogPosts()

  if (category) {
    allPosts = allPosts.filter((post) => post.category === category)
  }

  const totalPosts = allPosts.length
  const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE))
  const start = (page - 1) * POSTS_PER_PAGE
  const posts = allPosts.slice(start, start + POSTS_PER_PAGE)

  return { posts, totalPages, totalPosts }
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

// ── Async variants that merge file-based MDX + Supabase seo_articles ──

async function getOutrankArticles(): Promise<BlogPost[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("seo_articles")
      .select("*")
      .order("published_at", { ascending: false })

    if (error || !data) return []

    return data.map((article) => {
      const stats = readingTime(article.content_markdown)
      return {
        title: article.title,
        slug: article.slug,
        description: article.meta_description || "",
        category: "news-trends",
        tags: article.tags || [],
        author: "Pearlie Editorial",
        publishedAt: article.published_at,
        updatedAt: article.updated_at,
        heroImage: article.image_url || undefined,
        readingTime: stats.text,
        source: "outrank" as const,
      }
    })
  } catch (err) {
    console.error("[blog] Failed to fetch outrank articles:", err)
    return []
  }
}

export async function getAllBlogPostsAsync(): Promise<BlogPost[]> {
  const mdxPosts = getAllBlogPosts().map((p) => ({
    ...p,
    source: "mdx" as const,
  }))
  const outrankPosts = await getOutrankArticles()

  // Deduplicate by slug (MDX takes priority)
  const slugSet = new Set(mdxPosts.map((p) => p.slug))
  const uniqueOutrank = outrankPosts.filter((p) => !slugSet.has(p.slug))

  return [...mdxPosts, ...uniqueOutrank].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
}

export async function getPaginatedBlogPostsAsync(
  page: number,
  category?: string
): Promise<{ posts: BlogPost[]; totalPages: number; totalPosts: number }> {
  let allPosts = await getAllBlogPostsAsync()

  if (category) {
    allPosts = allPosts.filter((post) => post.category === category)
  }

  const totalPosts = allPosts.length
  const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE))
  const start = (page - 1) * POSTS_PER_PAGE
  const posts = allPosts.slice(start, start + POSTS_PER_PAGE)

  return { posts, totalPages, totalPosts }
}

export async function getBlogPostBySlugAsync(
  slug: string
): Promise<{ meta: BlogPost; content: string } | null> {
  // Try file-based MDX first
  const mdxResult = getBlogPostBySlug(slug)
  if (mdxResult) return mdxResult

  // Fall back to Supabase seo_articles
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("seo_articles")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()

    if (error || !data) return null

    const stats = readingTime(data.content_markdown)

    return {
      meta: {
        title: data.title,
        slug: data.slug,
        description: data.meta_description || "",
        category: "news-trends",
        tags: data.tags || [],
        author: "Pearlie Editorial",
        publishedAt: data.published_at,
        updatedAt: data.updated_at,
        heroImage: data.image_url || undefined,
        readingTime: stats.text,
        source: "outrank",
      },
      content: data.content_markdown,
    }
  } catch (err) {
    console.error("[blog] Failed to fetch outrank article by slug:", err)
    return null
  }
}

export async function getRelatedPostsAsync(
  currentSlug: string,
  limit = 3
): Promise<BlogPost[]> {
  const current = await getBlogPostBySlugAsync(currentSlug)
  if (!current) return []

  const allPosts = (await getAllBlogPostsAsync()).filter(
    (p) => p.slug !== currentSlug
  )

  if (current.meta.relatedSlugs?.length) {
    const explicit = current.meta.relatedSlugs
      .map((slug) => allPosts.find((p) => p.slug === slug))
      .filter(Boolean) as BlogPost[]

    if (explicit.length >= limit) return explicit.slice(0, limit)

    const remaining = allPosts
      .filter(
        (p) =>
          p.category === current.meta.category &&
          !current.meta.relatedSlugs!.includes(p.slug)
      )
      .slice(0, limit - explicit.length)

    return [...explicit, ...remaining]
  }

  return allPosts
    .filter((p) => p.category === current.meta.category)
    .slice(0, limit)
}
