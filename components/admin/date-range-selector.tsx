"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays } from "lucide-react"

const PRESETS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
] as const

export function DateRangeSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get("days") || "all"

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete("days")
    } else {
      params.set("days", value)
    }
    const query = params.toString()
    router.push(`/admin/analytics${query ? `?${query}` : ""}`)
  }

  const activeLabel = PRESETS.find((p) => p.value === current)?.label || "All time"

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="h-4 w-4 text-muted-foreground" />
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger className="w-[150px] h-8 text-xs">
          <SelectValue>{activeLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((preset) => (
            <SelectItem key={preset.value} value={preset.value} className="text-xs">
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
