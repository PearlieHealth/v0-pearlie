"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, MapPin, Star } from "lucide-react"
import Image from "next/image"

interface ClinicImage {
  src: string
  alt: string
  name: string
  location: string
  rating: number
}

const fallbackImages: ClinicImage[] = [
  {
    src: "/clinic-reception-modern-dental.jpg",
    alt: "Modern dental clinic reception",
    name: "Smile Dental London",
    location: "Kensington, London",
    rating: 4.9,
  },
  {
    src: "/dental-treatment-room-premium.jpg",
    alt: "Premium dental treatment room",
    name: "Manchester Dental Care",
    location: "Manchester City Centre",
    rating: 4.8,
  },
]

export default function ClinicCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [clinicImages, setClinicImages] = useState<ClinicImage[]>(fallbackImages)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const res = await fetch("/api/clinics/carousel")
        if (!res.ok) return
        const data = await res.json()
        if (data.clinics && data.clinics.length > 0) {
          setClinicImages(data.clinics)
        }
      } catch (err) {
        console.error("Failed to fetch clinics:", err)
      }
    }
    fetchClinics()
  }, [])

  // --- Mobile carousel logic ---
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  }

  const paginate = useCallback((newDirection: number) => {
    setDirection(newDirection)
    setCurrentIndex((prev) => (prev + newDirection + clinicImages.length) % clinicImages.length)
  }, [clinicImages.length])

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1)
    setCurrentIndex(index)
    setIsAutoPlaying(false)
  }

  useEffect(() => {
    if (!isAutoPlaying) return
    const timer = setInterval(() => {
      paginate(1)
    }, 4000)
    return () => clearInterval(timer)
  }, [isAutoPlaying, paginate])

  // --- Desktop marquee ---
  const marqueeImages = [...clinicImages, ...clinicImages]
  const marqueeDuration = clinicImages.length * 5

  return (
    <>
      {/* MOBILE: Original horizontal carousel (hidden on lg+) */}
      <div
        className="lg:hidden relative w-full max-w-md mx-auto"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl bg-secondary/20">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="absolute inset-0"
            >
              <Image
                src={clinicImages[currentIndex].src || "/placeholder.svg"}
                alt={clinicImages[currentIndex].alt}
                fill
                className="object-cover"
                priority={currentIndex === 0}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <h3 className="font-semibold text-lg">{clinicImages[currentIndex].name}</h3>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1.5 text-sm text-white/90">
                    <MapPin className="w-3.5 h-3.5" />
                    {clinicImages[currentIndex].location}
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{clinicImages[currentIndex].rating}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <button
            onClick={() => { paginate(-1); setIsAutoPlaying(false); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center hover:bg-white transition-colors z-10"
            aria-label="Previous clinic"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={() => { paginate(1); setIsAutoPlaying(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center hover:bg-white transition-colors z-10"
            aria-label="Next clinic"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4">
          {clinicImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-primary w-6"
                  : "bg-primary/30 hover:bg-primary/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* DESKTOP: Vertical marquee strip (hidden below lg) */}
      <div
        className="hidden lg:block relative w-full max-w-sm overflow-hidden"
        style={{ height: "520px" }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Top fade */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />

        <div
          className="marquee-vertical-track flex flex-col gap-4"
          style={{
            ["--marquee-speed" as string]: `${marqueeDuration}s`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        >
          {marqueeImages.map((clinic, i) => (
            <div
              key={`${clinic.name}-${i}`}
              className="relative flex-shrink-0 w-full rounded-2xl overflow-hidden shadow-md group"
              style={{ height: "240px" }}
            >
              <Image
                src={clinic.src || "/placeholder.svg"}
                alt={clinic.alt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="360px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="font-semibold text-base">{clinic.name}</h3>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1.5 text-sm text-white/90">
                    <MapPin className="w-3.5 h-3.5" />
                    {clinic.location}
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{clinic.rating}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
