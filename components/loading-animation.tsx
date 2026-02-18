"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface LoadingAnimationProps {
  onComplete?: () => void
}

export function LoadingAnimation({ onComplete }: LoadingAnimationProps) {
  const [animationPhase, setAnimationPhase] = useState<"morphing" | "exiting" | "done">("morphing")

  // Tooth path
  const toothPath =
    "M8 4.5C6.5 4.5 5.5 5.5 5.5 7C5.5 8 5.5 9 5.5 10C5.5 11 5.5 12 5.5 13C5.5 14 6 15 6.5 16C7 17 7.5 18 8 19C8.3 19.5 8.5 20 8.7 20.5C8.9 21 9 21.3 9.2 21.6C9.3 21.8 9.5 22 9.8 22C10 22 10.2 21.9 10.3 21.7C10.4 21.5 10.5 21.3 10.5 21C10.5 20.5 10.5 20 10.5 19.5C10.5 18.5 10.5 17.5 10.5 16.5C10.5 16 10.7 15.5 11.2 15.5C11.5 15.5 11.8 15.5 12 15.5C12.2 15.5 12.5 15.5 12.8 15.5C13.3 15.5 13.5 16 13.5 16.5C13.5 17.5 13.5 18.5 13.5 19.5C13.5 20 13.5 20.5 13.5 21C13.5 21.3 13.6 21.5 13.7 21.7C13.8 21.9 14 22 14.2 22C14.5 22 14.7 21.8 14.8 21.6C15 21.3 15.1 21 15.3 20.5C15.5 20 15.7 19.5 16 19C16.5 18 17 17 17.5 16C18 15 18.5 14 18.5 13C18.5 12 18.5 11 18.5 10C18.5 9 18.5 8 18.5 7C18.5 5.5 17.5 4.5 16 4.5C15.2 4.5 14.4 4.8 13.8 5.3C13.4 5.6 12.7 6 12 6C11.3 6 10.6 5.6 10.2 5.3C9.6 4.8 8.8 4.5 8 4.5Z"

  // Heart path
  const heartPath =
    "M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"

  // Start exit after morph completes - fast version
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationPhase("exiting")
    }, 800) // Quick display then exit
    return () => clearTimeout(timer)
  }, [])

  // Call onComplete after exit animation
  useEffect(() => {
    if (animationPhase === "exiting") {
      const timer = setTimeout(() => {
        onComplete?.()
      }, 300) // Quick exit
      return () => clearTimeout(timer)
    }
  }, [animationPhase, onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex items-center justify-center"
      initial={{ y: 0 }}
      animate={{ y: animationPhase === "exiting" ? "-100%" : 0 }}
      transition={{ duration: 0.3, ease: [0.43, 0.13, 0.23, 0.96] }}
    >
      <div className="flex items-center gap-3">
        {/* Animated tooth-to-heart icon */}
        <motion.div
          className="bg-[#F8F1E7] rounded-full p-3 w-14 h-14 flex items-center justify-center"
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{
            duration: 0.3,
            delay: 0.4,
            ease: "easeInOut",
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-foreground"
          >
            <motion.path
              initial={{ d: toothPath }}
              animate={{ d: heartPath }}
              transition={{
                duration: 0.4,
                delay: 0.2,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            />
          </svg>
        </motion.div>

        {/* Pearlie text */}
        <motion.span
          className="text-2xl font-semibold text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
Pearlie
        </motion.span>
      </div>
    </motion.div>
  )
}
