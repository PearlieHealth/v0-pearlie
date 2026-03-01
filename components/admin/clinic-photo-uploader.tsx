"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Loader2, ImageIcon, LinkIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getImageSrc } from "@/components/match/clinic-image"

interface PhotoUploaderProps {
  value?: string
  onChange: (url: string) => void
  label: string
  maxSizeMB?: number
  type?: "main" | "gallery"
}

const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]
const ALLOWED_HOSTNAMES = [
  "images.unsplash.com",
  "lh3.googleusercontent.com",
  "i.imgur.com",
  "wkcerujgiobxdspwzmhs.supabase.co", // Supabase storage domain
]

function isValidImageUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url)
    const pathname = parsedUrl.pathname.toLowerCase()

    // Check if URL ends with valid image extension
    const hasValidExtension = ALLOWED_IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext))

    // Check if hostname is in allowlist
    const hasAllowedHostname = ALLOWED_HOSTNAMES.some(
      (hostname) => parsedUrl.hostname === hostname || parsedUrl.hostname.endsWith("." + hostname),
    )

    if (hasValidExtension || hasAllowedHostname) {
      return { valid: true }
    }

    return {
      valid: false,
      error: "This link isn't a direct image. Paste a direct image URL (ends in .jpg/.png) or upload a photo.",
    }
  } catch {
    return { valid: false, error: "Please enter a valid URL" }
  }
}

export function PhotoUploader({ value, onChange, label, maxSizeMB = 5, type = "main" }: PhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null)
  const [urlInput, setUrlInput] = useState("")
  const [urlPreview, setUrlPreview] = useState<string | null>(null)
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null)
  const [isValidatingImage, setIsValidatingImage] = useState(false)

  // Sync previewUrl when the value prop changes externally (e.g. Google import)
  useEffect(() => {
    if (value && value !== previewUrl) {
      setPreviewUrl(value)
    } else if (!value && previewUrl && !isUploading) {
      setPreviewUrl(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    if (!urlInput.trim()) {
      setUrlPreview(null)
      setUrlValidationError(null)
      return
    }

    const timer = setTimeout(() => {
      const validation = isValidImageUrl(urlInput)

      if (!validation.valid) {
        setUrlValidationError(validation.error || null)
        setUrlPreview(null)
      } else {
        setUrlValidationError(null)
        // Try to load image to verify it's actually an image
        setIsValidatingImage(true)
        const img = new Image()
        img.onload = () => {
          setUrlPreview(urlInput)
          setIsValidatingImage(false)
        }
        img.onerror = () => {
          setUrlValidationError("Unable to load image from this URL")
          setUrlPreview(null)
          setIsValidatingImage(false)
        }
        img.src = urlInput
      }
    }, 500) // Debounce validation

    return () => clearTimeout(timer)
  }, [urlInput])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log("[v0] File selected:", file.name, file.type, file.size)

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPEG, JPG, and PNG files are allowed")
      console.log("[v0] File type rejected:", file.type)
      return
    }

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size must be less than ${maxSizeMB}MB`)
      console.log("[v0] File size rejected:", file.size)
      return
    }

    setError(null)
    setIsUploading(true)
    console.log("[v0] Starting upload...")

    try {
      // Create preview
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)

      // Upload file
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)

      console.log("[v0] Sending upload request to /api/admin/upload-clinic-photo")
      const response = await fetch("/api/admin/upload-clinic-photo", {
        method: "POST",
        body: formData,
      })

      console.log("[v0] Upload response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.log("[v0] Upload error response:", errorData)
        throw new Error(errorData.error || "Upload failed")
      }

      const data = await response.json()
      console.log("[v0] Upload successful, URL:", data.url)
      onChange(data.url)
      setPreviewUrl(data.url)

      // Clean up object URL
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error("[v0] Upload error:", err)
      setError(err instanceof Error ? err.message : "Failed to upload photo")
      setPreviewUrl(null)
      if (err instanceof Error && err.message.includes("Bucket not found")) {
        setError(
          "Storage bucket not configured. Please use the 'Enter URL' tab or contact support to set up file uploads.",
        )
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      setError("Please enter a valid URL")
      return
    }

    const validation = isValidImageUrl(urlInput)
    if (!validation.valid) {
      setError(validation.error || "Invalid image URL")
      return
    }

    setError(null)
    setPreviewUrl(urlInput)
    onChange(urlInput)
    setUrlInput("")
    setUrlPreview(null)
    setUrlValidationError(null)
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    onChange("")
    setError(null)
    setUrlInput("")
    setUrlPreview(null)
    setUrlValidationError(null)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>

      {previewUrl ? (
        <div className="relative group">
          <img
            src={getImageSrc(previewUrl || "") || "/placeholder.svg"}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border border-gray-200"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="url">Enter URL</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-2">
            <label
              className={cn(
                "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                "hover:bg-secondary hover:border-border",
                "border-border bg-card",
                isUploading && "opacity-50 cursor-not-allowed",
              )}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isUploading ? (
                  <>
                    <Loader2 className="w-10 h-10 mb-3 text-gray-400 animate-spin" />
                    <p className="text-sm text-gray-500">Uploading...</p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-400">JPEG, JPG, or PNG (max {maxSizeMB}MB)</p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          </TabsContent>

          <TabsContent value="url" className="mt-2">
            <div className="flex flex-col items-center justify-center w-full min-h-48 border-2 border-dashed rounded-lg border-gray-300 bg-card p-6">
              <LinkIcon className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-4 text-sm text-gray-500 text-center">Enter an image URL</p>

              <div className="w-full space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className={cn("w-full", urlValidationError && "border-red-500 focus-visible:ring-red-500")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !urlValidationError) {
                          handleUrlSubmit()
                        }
                      }}
                    />
                    {urlValidationError && <p className="text-xs text-red-600 mt-1">{urlValidationError}</p>}
                  </div>

                  {urlPreview && (
                    <div className="w-16 h-16 flex-shrink-0 border border-border rounded overflow-hidden bg-secondary">
                      <img
                        src={urlPreview || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {isValidatingImage && (
                    <div className="w-16 h-16 flex-shrink-0 border border-border rounded flex items-center justify-center bg-secondary">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleUrlSubmit}
                  className="w-full bg-transparent"
                  variant="outline"
                  disabled={!!urlValidationError || !urlInput.trim() || isValidatingImage}
                >
                  Add URL
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
    </div>
  )
}
