"use client"

import { Globe2 } from "lucide-react"

interface LanguagesSectionProps {
  languages: string[]
}

export function LanguagesSection({ languages }: LanguagesSectionProps) {
  if (!languages || languages.length === 0) return null

  return (
    <section>
      <div className="flex items-center gap-2.5 mb-3">
        <Globe2 className="h-[18px] w-[18px] text-muted-foreground" />
        <h3 className="font-bold text-foreground text-[15px]">Languages Spoken</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {languages.map((lang) => (
          <span
            key={lang}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-foreground/70 text-sm font-medium"
          >
            {lang}
          </span>
        ))}
      </div>
    </section>
  )
}
