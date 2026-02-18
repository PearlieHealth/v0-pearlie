"use client"

import { useEffect, useState, type ReactNode } from "react"

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
  const bgClass = isDark ? "bg-[#004443]" : "bg-[#004443]"
  const textClass = isDark ? "text-white/80" : "text-white/90"


  if (prefersReducedMotion) {
    return (
      <div className={`${bgClass} py-5 overflow-hidden`}>
        <div className="flex items-center justify-center gap-6 flex-wrap px-4">
          {items.map((item, i) => (
            <span key={i} className={`flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] ${textClass}`}>
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
      <span key={i} className="flex items-center gap-2 shrink-0 mx-6 sm:mx-10">
        <span className={`flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] whitespace-nowrap ${textClass}`}>
          {item.icon}
          {item.text}
        </span>
      </span>
    ))

  return (
    <div className={`${bgClass} py-5 overflow-hidden`} aria-hidden="true">
      <div
        className="flex items-center marquee-track"
        style={{ "--marquee-speed": `${speed}s` } as React.CSSProperties}
      >
        <div className="flex items-center shrink-0 marquee-content">
          {renderItems()}
        </div>
        <div className="flex items-center shrink-0 marquee-content">
          {renderItems()}
        </div>
      </div>
    </div>
  )
}
