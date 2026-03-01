"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { List } from "lucide-react"

interface TocItem {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  headings: TocItem[]
}

export function TableOfContents({ headings }: TableOfContentsProps) {
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

  // Filter out any headings with empty IDs
  const validHeadings = headings.filter((h) => h.id)

  if (validHeadings.length < 2) return null

  return (
    <nav className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <List className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-heading font-semibold text-foreground uppercase tracking-wider">
          In this article
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
  )
}
