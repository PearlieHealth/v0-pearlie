import { getAllContent, getContentBySlug, type ContentMeta } from "./mdx"
import readingTime from "reading-time"
import fs from "fs"
import path from "path"
import matter from "gray-matter"

export interface GuideMeta extends ContentMeta {
  readingTime: string
  clusterSlugs?: string[]
}

export function getAllGuides(): GuideMeta[] {
  const contentDir = path.join(process.cwd(), "content", "guides")

  if (!fs.existsSync(contentDir)) {
    return []
  }

  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".mdx"))

  const guides = files
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
      } as GuideMeta
    })
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )

  return guides
}

export function getGuideBySlug(
  slug: string
): { meta: GuideMeta; content: string } | null {
  const result = getContentBySlug<ContentMeta>("guides", slug)

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
