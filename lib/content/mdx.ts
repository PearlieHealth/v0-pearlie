import fs from "fs"
import path from "path"
import matter from "gray-matter"

const contentDirectory = path.join(process.cwd(), "content")

export interface ContentMeta {
  title: string
  slug: string
  description: string
  category: string
  tags: string[]
  author: string
  publishedAt: string
  updatedAt?: string
  heroImage?: string
  heroImageAlt?: string
  featured?: boolean
  keywords?: string[]
  relatedSlugs?: string[]
}

export function getContentDirectory(type: string): string {
  return path.join(contentDirectory, type)
}

export function getContentBySlug<T extends ContentMeta>(
  type: string,
  slug: string
): { meta: T; content: string } | null {
  const dir = getContentDirectory(type)
  const filePath = path.join(dir, `${slug}.mdx`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const fileContents = fs.readFileSync(filePath, "utf8")
  const { data, content } = matter(fileContents)

  return {
    meta: { ...data, slug } as T,
    content,
  }
}

export function getAllContent<T extends ContentMeta>(type: string): T[] {
  const dir = getContentDirectory(type)

  if (!fs.existsSync(dir)) {
    return []
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"))

  const items = files
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, "")
      const filePath = path.join(dir, filename)
      const fileContents = fs.readFileSync(filePath, "utf8")
      const { data } = matter(fileContents)

      return { ...data, slug } as T
    })
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )

  return items
}

/**
 * Strip markdown inline formatting to get plain text.
 * Handles: **bold**, *italic*, [links](url), `code`
 */
function stripMarkdownInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) → text
    .replace(/`([^`]+)`/g, "$1") // `code` → code
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold** → bold
    .replace(/\*([^*]+)\*/g, "$1") // *italic* → italic
    .replace(/__([^_]+)__/g, "$1") // __bold__ → bold
    .replace(/_([^_]+)_/g, "$1") // _italic_ → italic
}

export function extractHeadings(
  content: string
): { id: string; text: string; level: number }[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm
  const headings: { id: string; text: string; level: number }[] = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const rawText = match[2].trim()
    const text = stripMarkdownInline(rawText)
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    if (id) {
      headings.push({ id, text, level })
    }
  }

  return headings
}
