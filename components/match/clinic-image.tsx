"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { MapPin } from "lucide-react"

interface ClinicImageBaseProps {
  src: string
  alt: string
  className?: string
  fallbackClassName?: string
  sizes?: string
}

interface ClinicImageSizedProps extends ClinicImageBaseProps {
  width: number
  height: number
  fill?: never
}

interface ClinicImageFillProps extends ClinicImageBaseProps {
  fill: true
  width?: never
  height?: never
}

type ClinicImageProps = ClinicImageSizedProps | ClinicImageFillProps

/**
 * Returns a proxied URL for Google Places photo URLs, or the original URL
 * for other image sources (Supabase, Unsplash, etc.)
 */
export function getImageSrc(src: string): { url: string; unoptimized: boolean } {
  if (!src) return { url: "", unoptimized: false }

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

export function ClinicImage(props: ClinicImageProps) {
  const { src, alt, className, fallbackClassName, sizes } = props
  const [hasError, setHasError] = useState(false)

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false)
  }, [src])

  if (hasError || !src) {
    return (
      <div className={fallbackClassName}>
        <MapPin className="w-10 h-10 text-[#004443]/20" />
      </div>
    )
  }

  const { url, unoptimized } = getImageSrc(src)

  if (props.fill) {
    return (
      <Image
        src={url}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        unoptimized={unoptimized}
        onError={() => setHasError(true)}
      />
    )
  }

  return (
    <Image
      src={url}
      alt={alt}
      width={props.width}
      height={props.height}
      className={className}
      sizes={sizes}
      unoptimized={unoptimized}
      onError={() => setHasError(true)}
    />
  )
}
