"use client"

import { getChipData } from "@/lib/chipData"

interface HighlightBadgeStripProps {
  chips: string[]
  maxVisible?: number
}

export function HighlightBadgeStrip({ chips, maxVisible = 6 }: HighlightBadgeStripProps) {
  if (!chips || chips.length === 0) return null

  const visible = chips.slice(0, maxVisible)
  const remaining = chips.length - maxVisible

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((chip) => {
        const data = getChipData(chip)
        return (
          <span
            key={chip}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-foreground/15 text-foreground bg-foreground/5 text-sm font-medium"
          >
            <span className="flex-shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-foreground">
              {data.icon}
            </span>
            {data.label}
          </span>
        )
      })}
      {remaining > 0 && (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-secondary text-muted-foreground text-sm font-medium">
          +{remaining} more
        </span>
      )}
    </div>
  )
}
