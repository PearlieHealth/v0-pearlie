"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { validateUKPostcode } from "@/lib/postcodes-io"
import { AlertCircle } from "lucide-react"
import { SUPPORTED_REGION, REGION_NOT_AVAILABLE_MESSAGE } from "@/lib/intake-form-config"

interface PostcodeInputProps {
  value: string
  onChange: (value: string) => void
  onValidChange?: (isValid: boolean) => void
  onOutsideLondon?: (area: string) => void
  inputClassName?: string
}

export function PostcodeInput({ value, onChange, onValidChange, onOutsideLondon, inputClassName }: PostcodeInputProps) {
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const onValidChangeRef = useRef(onValidChange)
  const onOutsideLondonRef = useRef(onOutsideLondon)

  useEffect(() => {
    onValidChangeRef.current = onValidChange
  }, [onValidChange])

  useEffect(() => {
    onOutsideLondonRef.current = onOutsideLondon
  }, [onOutsideLondon])

  useEffect(() => {
    if (!value) {
      setError(null)
      onValidChangeRef.current?.(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsValidating(true)

      // Client-side regex validation
      if (!validateUKPostcode(value)) {
        setError("Enter a full UK postcode (e.g. SW1A 1AA)")
        onValidChangeRef.current?.(false)
        setIsValidating(false)
        return
      }

      // Server-side verification with postcodes.io
      try {
        const sanitized = value.replace(/\s/g, "").toUpperCase()
        const response = await fetch(`https://api.postcodes.io/postcodes/${sanitized}`)

        if (!response.ok) {
          setError("Please enter a valid UK postcode")
          onValidChangeRef.current?.(false)
        } else {
          const data = await response.json()
          const region = data.result?.region || ""
          const area = data.result?.admin_district || region

          if (region !== SUPPORTED_REGION) {
            setError(REGION_NOT_AVAILABLE_MESSAGE)
            onValidChangeRef.current?.(false)
            onOutsideLondonRef.current?.(area)
          } else {
            setError(null)
            onValidChangeRef.current?.(true)
          }
        }
      } catch (err) {
        console.warn("[v0] Postcode validation error:", err)
        // Allow continuation on network error (don't block user)
        setError(null)
        onValidChangeRef.current?.(true)
      } finally {
        setIsValidating(false)
      }
    }, 500) // Debounce for 500ms

    return () => clearTimeout(timer)
  }, [value])

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type="text"
          placeholder="e.g., SW1A 1AA"
          value={value}
          onChange={(e) => {
            const upper = e.target.value.toUpperCase()
            onChange(upper)
          }}
          className={`h-14 text-lg rounded-xl ${inputClassName || ""} ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
        />
        {isValidating && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-[#0fbcb0] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
