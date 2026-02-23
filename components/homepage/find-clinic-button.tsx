"use client"

import { useCallback } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackTikTokEvent, trackTikTokServerRelay } from "@/lib/tiktok-pixel"
import { generateTikTokEventId } from "@/lib/tiktok-event-id"

interface FindClinicButtonProps {
  size?: "default" | "lg"
  className?: string
  children?: React.ReactNode
}

export function FindClinicButton({
  size = "lg",
  className = "text-base px-8 h-14 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] group border-0",
  children,
}: FindClinicButtonProps) {
  const handleClick = useCallback(() => {
    const eventId = generateTikTokEventId()
    trackTikTokEvent("Search", { content_name: "find_my_clinic" }, eventId)
    trackTikTokServerRelay("Search", { event_id: eventId, properties: { content_name: "find_my_clinic" } })
  }, [])

  return (
    <Button size={size} className={className} asChild>
      <Link href="/intake" onClick={handleClick}>
        {children || (
          <>
            Find my clinic
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </Link>
    </Button>
  )
}
