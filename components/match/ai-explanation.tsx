import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIExplanationProps {
  explanation: string
  className?: string
}

export function AIExplanation({ explanation, className }: AIExplanationProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm leading-relaxed text-foreground">{explanation}</p>
      </div>
    </div>
  )
}
