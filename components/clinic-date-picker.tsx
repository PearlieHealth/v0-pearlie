"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ClinicDatePickerProps {
  availableDays: string[] // ["mon", "tue", "wed", "thu", "fri"]
  availableHours?: string[] // kept for backward compat, no longer displayed
  acceptsSameDay: boolean
  onSelectDate: (date: Date) => void
  className?: string
  maxVisible?: number // Override max visible dates (useful for narrow containers like sidebars)
}

// Map day index (0 = Sunday) to day key
const dayIndexToKey: Record<number, string> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
}

// Get current time in UK timezone
function getUKTime(): Date {
  const now = new Date()
  // Create a date string in UK timezone and parse it back
  const ukTimeString = now.toLocaleString("en-GB", { timeZone: "Europe/London" })
  const [datePart, timePart] = ukTimeString.split(", ")
  const [day, month, year] = datePart.split("/").map(Number)
  const [hours, minutes] = timePart.split(":").map(Number)
  const ukDate = new Date(year, month - 1, day, hours, minutes)
  return ukDate
}

// Format date for display
function formatDate(date: Date): { dayShort: string; dateNum: number; monthShort: string } {
  const dayShort = date.toLocaleDateString("en-GB", { weekday: "short" })
  const dateNum = date.getDate()
  const monthShort = date.toLocaleDateString("en-GB", { month: "short" })
  return { dayShort, dateNum, monthShort }
}

export function ClinicDatePicker({
  availableDays = ["mon", "tue", "wed", "thu", "fri"],
  acceptsSameDay = false,
  onSelectDate,
  className,
  maxVisible,
}: ClinicDatePickerProps) {
  const [startIndex, setStartIndex] = useState(0)
  const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null)
  const [hasAutoSelected, setHasAutoSelected] = useState(false)
  const [visibleCount, setVisibleCount] = useState(maxVisible || 7)

  // Show fewer date columns on mobile for larger touch targets
  useEffect(() => {
    if (maxVisible) {
      setVisibleCount(maxVisible)
      return
    }
    const mq = window.matchMedia('(max-width: 639px)')
    setVisibleCount(mq.matches ? 5 : 7)
    const handler = (e: MediaQueryListEvent) => setVisibleCount(e.matches ? 5 : 7)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [maxVisible])
  
  // Generate next 14 days
  const dates = useMemo(() => {
    const ukNow = getUKTime()
    const result: { date: Date; dayKey: string; isAvailable: boolean; isToday: boolean }[] = []
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(ukNow)
      date.setDate(ukNow.getDate() + i)
      date.setHours(0, 0, 0, 0)
      
      const dayKey = dayIndexToKey[date.getDay()]
      const isToday = i === 0
      const isAvailable = availableDays.includes(dayKey) && (!isToday || acceptsSameDay)
      
      result.push({ date, dayKey, isAvailable, isToday })
    }
    
    return result
  }, [availableDays, acceptsSameDay])
  
  // Auto-select the first available day on mount
  useEffect(() => {
    if (!hasAutoSelected && dates.length > 0) {
      // Find the first available date
      const firstAvailableIndex = dates.findIndex(d => d.isAvailable)
      if (firstAvailableIndex !== -1) {
        setSelectedDateIndex(firstAvailableIndex)
        setHasAutoSelected(true)
      }
    }
  }, [dates, hasAutoSelected])
  
  // Visible dates (responsive: 5 on mobile, 7 on desktop)
  const visibleDates = dates.slice(startIndex, startIndex + visibleCount)
  
  const handlePrev = () => {
    setStartIndex(Math.max(0, startIndex - 1))
  }
  
  const handleNext = () => {
    setStartIndex(Math.min(dates.length - visibleCount, startIndex + 1))
  }
  
  const handleDateSelect = (index: number) => {
    const actualIndex = startIndex + index
    if (dates[actualIndex]?.isAvailable) {
      setSelectedDateIndex(actualIndex)
      onSelectDate(dates[actualIndex].date)
    }
  }
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Date Picker Row */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handlePrev}
          disabled={startIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex gap-1 overflow-hidden flex-1">
          {visibleDates.map((dateInfo, idx) => {
            const { dayShort, dateNum, monthShort } = formatDate(dateInfo.date)
            const actualIndex = startIndex + idx
            const isSelected = selectedDateIndex === actualIndex
            
            return (
              <button
                key={actualIndex}
                onClick={() => handleDateSelect(idx)}
                disabled={!dateInfo.isAvailable}
                className={cn(
                  "flex-1 min-w-0 py-2 px-1 rounded-lg border text-center transition-all",
                  dateInfo.isAvailable
                    ? isSelected
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-card hover:border-primary/40 cursor-pointer"
                    : "border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-60"
                )}
              >
                <div className="text-[11px] text-muted-foreground leading-tight">{dayShort}</div>
                <div className={cn("text-base font-semibold leading-tight", isSelected ? "text-primary" : "text-foreground")}>{dateNum}</div>
                <div className="text-[11px] text-muted-foreground leading-tight">{monthShort}</div>
              </button>
            )
          })}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleNext}
          disabled={startIndex >= dates.length - visibleCount}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
    </div>
  )
}
