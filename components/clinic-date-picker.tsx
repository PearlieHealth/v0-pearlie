"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HOURLY_SLOTS } from "@/lib/constants"

interface ClinicDatePickerProps {
  availableDays: string[] // ["mon", "tue", "wed", "thu", "fri"]
  availableHours: string[] // ["09:00", "10:00", ...]
  acceptsSameDay: boolean
  onSelectSlot: (date: Date, time: string) => void
  className?: string
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
  availableHours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
  acceptsSameDay = false,
  onSelectSlot,
  className,
}: ClinicDatePickerProps) {
  const [startIndex, setStartIndex] = useState(0)
  const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null)
  const [hasAutoSelected, setHasAutoSelected] = useState(false)
  const [visibleCount, setVisibleCount] = useState(7)

  // Show fewer date columns on mobile for larger touch targets
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setVisibleCount(mq.matches ? 5 : 7)
    const handler = (e: MediaQueryListEvent) => setVisibleCount(e.matches ? 5 : 7)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  
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
  
  // Get available time slots for selected date
  const availableSlots = useMemo(() => {
    if (selectedDateIndex === null) return []
    
    const selectedDate = dates[selectedDateIndex]
    if (!selectedDate?.isAvailable) return []
    
    const ukNow = getUKTime()
    const isToday = selectedDate.isToday
    const currentHour = ukNow.getHours()
    
    // Filter slots based on clinic's available hours
    // For today, also filter out past times
    return HOURLY_SLOTS.filter((slot) => {
      if (!availableHours.includes(slot.key)) return false
      if (isToday && slot.hour <= currentHour) return false
      return true
    })
  }, [selectedDateIndex, dates, availableHours])
  
  // Count available slots for each date (for display)
  const getSlotCount = (dateIndex: number): number => {
    const date = dates[dateIndex]
    if (!date?.isAvailable) return 0
    
    const ukNow = getUKTime()
    const isToday = date.isToday
    const currentHour = ukNow.getHours()
    
    return availableHours.filter((hourKey) => {
      const hour = parseInt(hourKey.split(":")[0], 10)
      if (isToday && hour <= currentHour) return false
      return true
    }).length
  }
  
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
    }
  }
  
  const handleTimeSelect = (time: string) => {
    if (selectedDateIndex === null) return
    const selectedDate = dates[selectedDateIndex].date
    onSelectSlot(selectedDate, time)
  }
  
  const selectedDateFormatted = selectedDateIndex !== null 
    ? formatDate(dates[selectedDateIndex].date)
    : null
  
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
            const slotCount = getSlotCount(actualIndex)
            
            return (
              <button
                key={actualIndex}
                onClick={() => handleDateSelect(idx)}
                disabled={!dateInfo.isAvailable}
                className={cn(
                  "flex-1 min-w-[60px] py-2 px-1 rounded-lg border text-center transition-all",
                  dateInfo.isAvailable
                    ? isSelected
                      ? "border-[#004443] bg-[#004443]/10 text-[#004443]"
                      : "border-border bg-white hover:border-[#004443]/40 cursor-pointer"
                    : "border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-60"
                )}
              >
                <div className="text-[11px] sm:text-xs text-muted-foreground">{dayShort}</div>
                <div className={cn("text-sm sm:text-base font-semibold", isSelected && "text-[#004443]")}>{monthShort} {dateNum}</div>
                <div className={cn(
                  "text-xs",
                  dateInfo.isAvailable
                    ? isSelected ? "text-[#004443]" : "text-muted-foreground"
                    : "text-muted-foreground"
                )}>
                  {dateInfo.isAvailable ? `${slotCount} appts` : "Closed"}
                </div>
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
      
      {/* Time Slots */}
      {selectedDateIndex !== null && selectedDateFormatted && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Request a time on {selectedDateFormatted.dayShort}, {selectedDateFormatted.monthShort} {selectedDateFormatted.dateNum}
          </p>
          
          {availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {availableSlots.map((slot) => (
                <Button
                  key={slot.key}
                  variant="outline"
                  size="sm"
                  className="min-w-[80px] bg-transparent hover:bg-[#004443] hover:text-white hover:border-[#004443] transition-colors"
                  onClick={() => handleTimeSelect(slot.key)}
                >
                  {slot.label}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No available slots for this date</p>
          )}
        </div>
      )}
    </div>
  )
}
