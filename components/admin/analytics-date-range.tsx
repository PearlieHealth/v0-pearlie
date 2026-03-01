"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"

const PRESETS = [
  { label: "7d", value: "7" },
  { label: "30d", value: "30" },
  { label: "90d", value: "90" },
  { label: "All", value: "all" },
]

export function AnalyticsDateRange() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentRange = searchParams.get("days") || "30"

  const handleRangeChange = (days: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (days === "all") {
      params.delete("days")
    } else {
      params.set("days", days)
    }
    router.push(`/admin/analytics?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1.5">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      {PRESETS.map((preset) => {
        const isActive =
          (preset.value === "all" && !searchParams.has("days")) ||
          currentRange === preset.value
        return (
          <Button
            key={preset.value}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className={`h-7 text-xs px-2.5 ${isActive ? "bg-[#0d1019] text-white" : ""}`}
            onClick={() => handleRangeChange(preset.value)}
          >
            {preset.label}
          </Button>
        )
      })}
    </div>
  )
}
