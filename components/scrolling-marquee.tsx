"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Heart } from "lucide-react"

interface MarqueeItem {
  text: string
  icon?: ReactNode
}

interface ScrollingMarqueeProps {
  items: MarqueeItem[]
  speed?: number
  variant?: "light" | "dark"
}

export function ScrollingMarquee({ items, speed = 30, variant = "light" }: ScrollingMarqueeProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const isDark = variant === "dark"
  const bgClass = isDark ? "bg-[#004443]" : "bg-[#F8F1E7]"
  const textClass = isDark ? "text-white/80" : "text-[#004443]"
  const separatorClass = isDark ? "text-[#0fbcb0]/40" : "text-[#0fbcb0]/30"

  if (prefersReducedMotion) {
    return (
      <div className={`${bgClass} py-4 overflow-hidden`}>
        <div className="flex items-center justify-center gap-6 flex-wrap px-4">
          {items.map((item, i) => (
            <span key={i} className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] ${textClass}`}>
              {item.icon}
              {item.text}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // Render content row — duplicated for seamless looping
  const renderItems = () =>
    items.map((item, i) => (
      <span key={i} className="flex items-center gap-4 sm:gap-6 shrink-0">
        <span className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] whitespace-nowrap ${textClass}`}>
          {item.icon}
          {item.text}
        </span>
        <Heart className={`w-3 h-3 ${separatorClass} fill-current shrink-0`} />
      </span>
    ))

  return (
    <div className={`${bgClass} py-4 overflow-hidden`} aria-hidden="true">
      <div
        className="flex items-center gap-4 sm:gap-6 marquee-track"
        style={{ "--marquee-speed": `${speed}s` } as React.CSSProperties}
      >
        <div className="flex items-center gap-4 sm:gap-6 shrink-0 marquee-content">
          {renderItems()}
        </div>
        <div className="flex items-center gap-4 sm:gap-6 shrink-0 marquee-content">
          {renderItems()}
        </div>
      </div>
    </div>
  )
}
