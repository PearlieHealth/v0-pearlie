"use client"

import { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Star } from "lucide-react"

const testimonials = [
  {
    label: "New to London",
    text: "I\u2019d just moved to London and didn\u2019t know where to begin. Instead of scrolling endlessly, I answered a few questions and had solid options straight away.",
    name: "Sophie M.",
  },
  {
    label: "Emergency",
    text: "I needed to be seen quickly, but I didn\u2019t want to rush into the wrong place. Pearlie helped me compare properly before booking.",
    name: "James R.",
  },
  {
    label: "Second Opinion",
    text: "I wasn\u2019t sure what treatment I actually needed. Pearlie matched me with clinics that explained my options clearly, without pushing anything.",
    name: "Priya K.",
  },
  {
    label: "Invisalign",
    text: "I wanted Invisalign but didn\u2019t know where to start. The clinics Pearlie suggested had experience with adult cases like mine. I finally felt confident choosing.",
    name: "Tom H.",
  },
  {
    label: "Cosmetic",
    text: "I was overwhelmed researching cosmetic dentists. Pearlie matched me with a clinic that specialised in natural-looking results. The consultation felt thoughtful \u2014 not salesy.",
    name: "Amara L.",
  },
  {
    label: "Nervous Patient",
    text: "I\u2019m a nervous patient and usually avoid dentists. The clinic I found through Pearlie really understood that. It made the whole process feel manageable.",
    name: "Hannah W.",
  },
  {
    label: "Clinic Partner",
    text: "Pearlie brings us patients who already know what they want \u2014 the matching and messaging saves time and improves the quality of enquiries.",
    name: "London Dental Centre",
  },
]

export function PatientExperiences() {
  const railRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect() } },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-16 md:pt-20 md:pb-28 lg:pt-24 lg:pb-32 bg-[#f8f7f1] overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block text-xs font-extrabold tracking-[0.08em] uppercase text-[#004443] mb-4">
              Patient Experiences
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-[3rem] font-heading font-bold tracking-[-0.03em] mb-6 text-[#004443] leading-[1.05]">
              Real stories.<br />Thoughtful decisions.<br /><span className="text-[#0fbcb0]">Confident choices.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Real experiences from people who used Pearlie to choose with confidence.
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal scroll rail */}
      <div
        ref={railRef}
        className="flex gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide px-4 sm:px-6 lg:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] pb-4 -mb-4"
      >
        {testimonials.map((testimonial, i) => (
          <motion.div
            key={i}
            className="snap-start flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px]"
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Card className="p-5 border border-[#e8e4dc] shadow-none rounded-2xl bg-white h-full flex flex-col hover:shadow-md hover:border-[#d5cfc8] hover:-translate-y-0.5 focus-within:shadow-md focus-within:border-[#d5cfc8] focus-within:-translate-y-0.5 transition-all duration-300 ease-out">
              <span className="text-[9px] font-extrabold tracking-[0.1em] uppercase text-[#0fbcb0] mb-2.5">
                {testimonial.label}
              </span>
              <p className="text-[14px] text-muted-foreground leading-snug mb-4 flex-1">
                &ldquo;{testimonial.text}&rdquo;
              </p>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-foreground">{testimonial.name}</p>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-3 h-3 fill-[#0fbcb0]/50 text-[#0fbcb0]/50" />
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
