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
 * If a URL is a Google Places photo that wasn't re-uploaded to Supabase,
 * route it through our server-side proxy which adds the API key.
 * All other URLs are used directly.
 */
export function getImageSrc(src: string): string {
  if (!src || !src.trim()) return ""

  try {
    const parsed = new URL(src)
    if (parsed.hostname === "places.googleapis.com") {
      return `/api/image-proxy?url=${encodeURIComponent(src)}`
    }
  } catch {
    // relative URL — pass through
  }
  return src
}

export function ClinicImage(props: ClinicImageProps) {
  const { src, alt, className, fallbackClassName } = props
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
