"use client"

import { motion } from "framer-motion"

export function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedBar({
  width,
  color,
  delay = 0,
}: {
  width: string
  color: string
  delay?: number
}) {
  return (
    <motion.div
      className="h-full rounded-full"
      style={{ backgroundColor: color }}
      initial={{ width: 0 }}
      whileInView={{ width }}
      transition={{ duration: 1, ease: "easeOut", delay }}
      viewport={{ once: true }}
    />
  )
}
