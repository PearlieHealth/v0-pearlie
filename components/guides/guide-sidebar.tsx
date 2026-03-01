"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { List, FileText } from "lucide-react"

interface TocItem {
  id: string
  text: string
  level: number
}

interface ClusterPost {
  slug: string
  title: string
}

interface GuideSidebarProps {
  headings: TocItem[]
  clusterPosts?: ClusterPost[]
}

export function GuideSidebar({ headings, clusterPosts }: GuideSidebarProps) {
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: "-80px 0px -80% 0px" }
    )

    headings.forEach(({ id }) => {
      if (!id) return
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [headings])

  const validHeadings = headings.filter((h) => h.id)

  return (
    <div className="space-y-6">
      {/* Table of Contents */}
      {validHeadings.length >= 2 && (
        <nav className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <List className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-heading font-semibold text-foreground uppercase tracking-wider">
              In this guide
            </h2>
          </div>
          <ul className="space-y-1.5">
            {validHeadings.map((heading) => (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  className={cn(
                    "block text-sm leading-relaxed transition-colors duration-200",
                    heading.level === 3 && "pl-4",
                    activeId === heading.id
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Related Blog Posts */}
      {clusterPosts && clusterPosts.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-heading font-semibold text-foreground uppercase tracking-wider">
              Related articles
            </h2>
          </div>
          <ul className="space-y-2">
            {clusterPosts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors leading-relaxed"
                >
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
