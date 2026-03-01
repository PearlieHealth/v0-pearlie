"use client"

import { useEffect, useState, useRef, type ReactNode } from "react"
import { motion, useInView } from "framer-motion"

interface StatsCardProps {
  value: number
  suffix?: string
  prefix?: string
  label: string
  icon: ReactNode
  delay?: number
}

export default function StatsCard({ value, suffix = "", prefix = "", label, icon, delay = 0 }: StatsCardProps) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (isInView && !hasAnimated.current) {
      hasAnimated.current = true
      const duration = 2000 // 2 seconds
      const steps = 60
      const increment = value / steps
      const stepDuration = duration / steps
      
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= value) {
          setCount(value)
          clearInterval(timer)
        } else {
          setCount(Math.floor(current))
        }
      }, stepDuration)

      return () => clearInterval(timer)
    }
  }, [isInView, value])

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return num.toLocaleString()
    }
    return num.toString()
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="relative group"
    >
      <div className="bg-gradient-to-br from-card to-secondary/30 rounded-2xl p-6 border border-border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] hover:border-primary/20">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
            {icon}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-5xl md:text-6xl font-bold text-foreground tracking-tight">
            {prefix}{formatNumber(count)}{suffix}
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        </div>
      </div>
    </motion.div>
  )
}
