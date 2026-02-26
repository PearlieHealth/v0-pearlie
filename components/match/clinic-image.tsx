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
 * Routes external image URLs through our server-side proxy at /api/image-proxy.
 * This ensures images load reliably regardless of CORS, auth requirements, or
 * bucket privacy settings. The proxy handles Google API key injection for
 * Places photos and caches responses.
 */
export function getImageSrc(src: string): string {
  if (!src || !src.trim()) return ""

  try {
    const parsed = new URL(src)
    if (
      parsed.hostname === "places.googleapis.com" ||
      parsed.hostname.endsWith(".supabase.co") ||
      parsed.hostname === "lh3.googleusercontent.com" ||
      parsed.hostname === "images.unsplash.com" ||
      parsed.hostname === "i.imgur.com"
    ) {
      return `/api/image-proxy?url=${encodeURIComponent(src)}`
    }
  } catch {
    // Not a valid absolute URL — pass through as-is (e.g. /placeholder.svg)
  }
  return src
}

export function ClinicImage(props: ClinicImageProps) {
  const { src, alt, className, fallbackClassName, sizes } = props
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [src])

  if (hasError || !src || !src.trim()) {
    const letter = alt?.charAt(0)?.toUpperCase() || "?"
    return (
      <div className={fallbackClassName || "w-full h-full flex items-center justify-center bg-[#004443]"}>
        <span className="text-white font-bold text-lg drop-shadow-sm">{letter}</span>
      </div>
    )
  }

  const url = getImageSrc(src)

  /* eslint-disable @next/next/no-img-element */
  return (
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
