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

/**
 * Returns a proxied URL for Google Places photo URLs, or the original URL
 * for other image sources (Supabase, Unsplash, etc.)
 */
function getImageSrc(src: string): { url: string; unoptimized: boolean } {
  try {
    const parsed = new URL(src)
    if (parsed.hostname === "places.googleapis.com") {
      // Route through our server-side proxy to avoid API key / CORS issues
      return {
        url: `/api/image-proxy?url=${encodeURIComponent(src)}`,
        unoptimized: true,
      }
    }
  } catch {
    // Not a valid URL, pass through
  }
  return { url: src, unoptimized: false }
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

  const { url, unoptimized } = getImageSrc(src)

  return (
    <Image
      src={url}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      unoptimized={unoptimized}
      onError={() => setHasError(true)}
    />
  )
}
