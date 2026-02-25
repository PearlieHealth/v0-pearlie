"use client"

import { useState } from "react"
import Image from "next/image"
import { MapPin } from "lucide-react"

interface ClinicImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  fallbackClassName?: string
  sizes?: string
}

export function ClinicImage({ src, alt, width, height, className, fallbackClassName, sizes }: ClinicImageProps) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className={fallbackClassName}>
        <MapPin className="w-10 h-10 text-[#004443]/20" />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      onError={() => setHasError(true)}
    />
  )
}
