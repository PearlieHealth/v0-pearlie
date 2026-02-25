"use client"

import { useState, useEffect } from "react"

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
export function getImageSrc(src: string): { url: string } {
  if (!src || !src.trim()) return { url: "" }

  try {
    const parsed = new URL(src)
    if (parsed.hostname === "places.googleapis.com") {
      // Route through our server-side proxy to avoid API key / CORS issues
      return {
        url: `/api/image-proxy?url=${encodeURIComponent(src)}`,
      }
    }
  } catch {
    // Not a valid URL, pass through
  }
  return { url: src }
}

export function ClinicImage(props: ClinicImageProps) {
  const { src, alt, className, fallbackClassName, sizes } = props
  const [hasError, setHasError] = useState(false)

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false)
  }, [src])

  if (hasError || !src || !src.trim()) {
    // Show clinic initial letter as a visible avatar fallback
    const letter = alt?.charAt(0)?.toUpperCase() || "?"
    return (
      <div className={fallbackClassName || "w-full h-full flex items-center justify-center bg-[#004443]"}>
        <span className="text-white font-bold text-lg drop-shadow-sm">{letter}</span>
      </div>
    )
  }

  const { url } = getImageSrc(src)

  // Use a plain <img> tag for reliable error handling.
  // Next.js <Image> can fail silently through its optimizer layer.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={className}
      sizes={sizes}
      loading="lazy"
      onError={() => setHasError(true)}
      style={
        props.fill
          ? { position: "absolute", width: "100%", height: "100%", inset: 0, objectFit: "cover" as const }
          : undefined
      }
    />
  )
}
