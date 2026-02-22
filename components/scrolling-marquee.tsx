"use client"

import type { ReactNode } from "react"

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
  const isDark = variant === "dark"
  const bgClass = isDark ? "bg-[#004443]" : "bg-[#004443]"
  const textClass = isDark ? "text-white/80" : "text-white/90"

  // Render content row — duplicated for seamless looping.
  // When prefers-reduced-motion is active, the CSS media query stops the
  // animation and the track stays at translateX(0), showing the first set of
  // items as a static banner — same visual layout, no jarring layout shift.
  const renderItems = () =>
    items.map((item, i) => (
      <span key={i} className="flex items-center gap-2 shrink-0 mx-6 sm:mx-10">
        <span className={`flex items-center gap-2 text-base font-bold uppercase tracking-[0.2em] whitespace-nowrap ${textClass}`}>
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
