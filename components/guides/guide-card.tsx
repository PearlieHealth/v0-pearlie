import Link from "next/link"
import { Clock, ArrowRight, BookOpen } from "lucide-react"
import type { GuideMeta } from "@/lib/content/guides"

interface GuideCardProps {
  guide: GuideMeta
}

export function GuideCard({ guide }: GuideCardProps) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group block rounded-2xl border border-border/50 bg-white overflow-hidden hover:shadow-lg hover:border-[#0fbcb0]/30 transition-all duration-300"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-full bg-[#0fbcb0]/10 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-[#0fbcb0]" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#0fbcb0]">
            Complete Guide
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-3 group-hover:text-[#0fbcb0] transition-colors">
          {guide.title}
        </h3>

        <p className="text-muted-foreground leading-relaxed mb-5 line-clamp-3">
          {guide.description}
        </p>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {guide.readingTime}
            </span>
            {guide.tags && guide.tags.length > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span>{guide.tags.length} topics covered</span>
              </>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-[#0fbcb0] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
        </div>
      </div>
    </Link>
  )
}
