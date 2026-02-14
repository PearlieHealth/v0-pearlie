"use client"

import React from "react"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Building2,
  MapPin,
  Phone,
  Globe,
  Mail,
  Clock,
  Save,
  Plus,
  X,
  Pencil,
  Check,
  Languages,
  Accessibility,
  CreditCard,
  ImagePlus,
  Star,
  CheckCircle,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Bell,
  AlertTriangle,
  Loader2,
  Trash2,
  PoundSterling,
} from "lucide-react"
import { toast } from "sonner"
import { HIGHLIGHT_CATEGORIES, getHighlightLabel } from "@/lib/clinic-highlights-config"
import { DEFAULT_TREATMENT_CATEGORIES, type TreatmentCategory, type TreatmentItem } from "@/lib/treatment-pricing-config"

interface BeforeAfterImage {
  before_url: string
  after_url: string
  treatment: string
  description?: string
}

interface ClinicProfile {
  id: string
  slug?: string
  name: string
  address: string
  city: string
  postcode: string
  phone: string
  email: string
  notification_email: string
  website: string
  description: string
  featured_review: string
  accepts_urgent: boolean
  treatments: string[]
  services: string[]
  languages: string[]
  accessibility_features: string[]
  key_selling_points: string[]
  finance_provider_names: string[]
  opening_hours: Record<string, { open: string; close: string; closed: boolean }>
  ideal_patient_tags: string[]
  exclusion_tags: string[]
  highlight_chips: string[]
  images: string[]
  before_after_images: BeforeAfterImage[]
  show_treatment_prices: boolean
  treatment_prices: TreatmentCategory[]
  google_rating?: number
  google_review_count?: number
  latitude?: number
  longitude?: number
  verified?: boolean
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const LANGUAGE_OPTIONS = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese",
  "Polish", "Romanian", "Arabic", "Hindi", "Urdu", "Bengali", "Punjabi",
  "Gujarati", "Tamil", "Mandarin", "Cantonese", "Japanese", "Korean",
  "Russian", "Turkish", "Greek", "Dutch",
]

// Inline editable field component
function InlineField({
  label,
  value,
  icon: Icon,
  onChange,
  type = "text",
  verified = false,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  onChange: (val: string) => void
  type?: string
  verified?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  if (editing) {
    return (
      <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          type={type}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          className="flex-1 h-8 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onChange(localValue)
              setEditing(false)
            }
            if (e.key === "Escape") {
              setLocalValue(value)
              setEditing(false)
            }
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-green-600"
          onClick={() => {
            onChange(localValue)
            setEditing(false)
          }}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setLocalValue(value)
            setEditing(false)
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0 group">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm truncate">{value || <span className="text-muted-foreground italic">Not set</span>}</p>
      </div>
      {verified && (
        <Badge variant="outline" className="text-[10px] h-5 border-green-300 text-green-700 bg-green-50">
          VERIFIED
        </Badge>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setEditing(true)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// Tag list editor component
function TagEditor({
  tags,
  onAdd,
  onRemove,
  placeholder,
  variant = "secondary",
}: {
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
  placeholder: string
  variant?: "secondary" | "default" | "destructive"
}) {
  const [newTag, setNewTag] = useState("")

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {tags.map((tag) => (
          <Badge key={tag} variant={variant} className="gap-1 text-xs">
            {tag}
            <button onClick={() => onRemove(tag)} className="ml-0.5 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {tags.length === 0 && (
          <p className="text-xs text-muted-foreground italic">None added yet</p>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newTag.trim()) {
              onAdd(newTag.trim())
              setNewTag("")
            }
          }}
          className="h-8 text-sm"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 bg-transparent"
          onClick={() => {
            if (newTag.trim()) {
              onAdd(newTag.trim())
              setNewTag("")
            }
          }}
          disabled={!newTag.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export default function ClinicProfilePage() {
  const [profile, setProfile] = useState<ClinicProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUploadingGallery, setIsUploadingGallery] = useState(false)
  const [isUploadingBeforeAfter, setIsUploadingBeforeAfter] = useState<string | null>(null) // 'before' | 'after' | null
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    highlights: false,
    matching: false,
  })

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleGalleryUpload = async (files: FileList) => {
    if (!profile) return
    setIsUploadingGallery(true)
    const newUrls: string[] = []
    for (const file of Array.from(files)) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error(`${file.name}: Invalid type. Use JPEG, PNG, or WEBP.`)
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: Too large (max 10MB).`)
        continue
      }
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("type", "gallery")
        const res = await fetch("/api/clinics/upload", { method: "POST", body: formData })
        const data = await res.json()
        if (res.ok && data.url) {
          newUrls.push(data.url)
        } else {
          toast.error(`${file.name}: ${data.error || "Upload failed"}`)
        }
      } catch {
        toast.error(`${file.name}: Upload failed`)
      }
    }
    if (newUrls.length > 0) {
      setProfile({ ...profile, images: [...(profile.images || []), ...newUrls] })
      toast.success(`${newUrls.length} photo${newUrls.length > 1 ? "s" : ""} uploaded`)
    }
    setIsUploadingGallery(false)
  }

  const removeGalleryImage = (index: number) => {
    if (!profile) return
    setProfile({ ...profile, images: profile.images.filter((_, i) => i !== index) })
  }

  const handleBeforeAfterUpload = async (file: File, pairIndex: number, side: "before" | "after") => {
    if (!profile) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Invalid file type. Use JPEG, PNG, or WEBP.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB).")
      return
    }
    setIsUploadingBeforeAfter(`${pairIndex}-${side}`)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "gallery")
      const res = await fetch("/api/clinics/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (res.ok && data.url) {
        const updated = [...profile.before_after_images]
        updated[pairIndex] = { ...updated[pairIndex], [`${side}_url`]: data.url }
        setProfile({ ...profile, before_after_images: updated })
        toast.success(`${side === "before" ? "Before" : "After"} photo uploaded`)
      } else {
        toast.error(data.error || "Upload failed")
      }
    } catch {
      toast.error("Upload failed")
    }
    setIsUploadingBeforeAfter(null)
  }

  const addBeforeAfterPair = () => {
    if (!profile) return
    setProfile({
      ...profile,
      before_after_images: [...profile.before_after_images, { before_url: "", after_url: "", treatment: "" }],
    })
  }

  const removeBeforeAfterPair = (index: number) => {
    if (!profile) return
    setProfile({
      ...profile,
      before_after_images: profile.before_after_images.filter((_, i) => i !== index),
    })
  }

  const fetchProfile = useCallback(async (showRefreshToast = false) => {
    if (showRefreshToast) setIsRefreshing(true)
    try {
      const response = await fetch("/api/clinic/profile")
      if (!response.ok) {
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }
      const { clinic } = await response.json()
      if (clinic) {
        setProfile({
          id: clinic.id,
          slug: clinic.slug || undefined,
          name: clinic.name || "",
          address: clinic.address || "",
          city: clinic.city || "",
          postcode: clinic.postcode || "",
          phone: clinic.phone || "",
          email: clinic.email || "",
          notification_email: clinic.notification_email || "",
          website: clinic.website || "",
          description: clinic.description || "",
          accepts_urgent: clinic.accepts_urgent || false,
          featured_review: clinic.featured_review || "",
          treatments: clinic.treatments || [],
          services: clinic.services || [],
          languages: clinic.languages || [],
          accessibility_features: clinic.accessibility_features || [],
          key_selling_points: clinic.key_selling_points || [],
          finance_provider_names: clinic.finance_provider_names || [],
          opening_hours: clinic.opening_hours || {},
          ideal_patient_tags: clinic.ideal_patient_tags || [],
          exclusion_tags: clinic.exclusion_tags || [],
          highlight_chips: clinic.highlight_chips || [],
          images: clinic.images || [],
          before_after_images: clinic.before_after_images || [],
          show_treatment_prices: clinic.show_treatment_prices || false,
          treatment_prices: clinic.treatment_prices || [],
          google_rating: clinic.google_rating,
          google_review_count: clinic.google_review_count,
          latitude: clinic.latitude,
          longitude: clinic.longitude,
          verified: clinic.verified,
        })
      }
      setIsLoading(false)
      setIsRefreshing(false)
      if (showRefreshToast) toast.success("Profile data refreshed")
    } catch (error) {
      console.error("Error fetching profile:", error)
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile(false)
  }, [fetchProfile])

  const handleSave = async () => {
    if (!profile) return
    setIsSaving(true)
    try {
      const response = await fetch("/api/clinic/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          address: profile.address,
          city: profile.city,
          postcode: profile.postcode,
          phone: profile.phone,
          email: profile.email,
          notification_email: profile.notification_email,
          website: profile.website,
          description: profile.description,
          accepts_urgent: profile.accepts_urgent,
          featured_review: profile.featured_review,
          treatments: profile.treatments,
          languages: profile.languages,
          accessibility_features: profile.accessibility_features,
          key_selling_points: profile.key_selling_points,
          finance_provider_names: profile.finance_provider_names,
          opening_hours: profile.opening_hours,
          ideal_patient_tags: profile.ideal_patient_tags,
          exclusion_tags: profile.exclusion_tags,
          highlight_chips: profile.highlight_chips,
          images: profile.images,
          before_after_images: profile.before_after_images,
          show_treatment_prices: profile.show_treatment_prices,
          treatment_prices: profile.treatment_prices,
        }),
      })
      if (response.ok) {
        toast.success("Profile updated successfully")
      } else {
        const data = await response.json()
        toast.error(`Failed to save: ${data.error || "Unknown error"}`)
      }
    } catch {
      toast.error("Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  const addTag = (field: keyof ClinicProfile, tag: string) => {
    if (!profile) return
    const current = profile[field] as string[]
    if (!current.includes(tag)) {
      setProfile({ ...profile, [field]: [...current, tag] })
    }
  }

  const removeTag = (field: keyof ClinicProfile, tag: string) => {
    if (!profile) return
    const current = profile[field] as string[]
    setProfile({ ...profile, [field]: current.filter((t) => t !== tag) })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9F7AEA]" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No clinic profile found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          {/* Clinic thumbnail */}
          <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden flex-shrink-0">
            {profile.images?.[0] ? (
              <img src={profile.images[0] || "/placeholder.svg"} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
              {profile.verified && (
                <Badge className="bg-[#9F7AEA] text-white border-0 text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {profile.address}{profile.city ? `, ${profile.city}` : ""} {profile.postcode}
            </p>
            {profile.google_rating && (
              <div className="flex items-center gap-1.5 mt-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium">{profile.google_rating}</span>
                {profile.google_review_count && (
                  <span className="text-xs text-muted-foreground">({profile.google_review_count} reviews)</span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const identifier = profile?.slug || profile?.id
              if (identifier) {
                window.open(`/clinic/${identifier}?preview=true`, "_blank")
              }
            }}
            disabled={!profile?.id}
          >
            <Eye className="h-4 w-4 mr-1.5" />
            Preview Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProfile(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-[#9F7AEA] hover:bg-[#805AD5] text-white"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-1.5" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[420px_1fr] gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Map */}
              {profile.latitude && profile.longitude && (
                <div className="rounded-lg overflow-hidden mb-4 border">
                  <iframe
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${profile.latitude},${profile.longitude}&zoom=15`}
                    width="100%"
                    height="180"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}

              <InlineField
                label="Clinic Name"
                value={profile.name}
                icon={Building2}
                onChange={(val) => setProfile({ ...profile, name: val })}
              />
              <InlineField
                label="Address"
                value={`${profile.address}${profile.city ? `, ${profile.city}` : ""} ${profile.postcode}`}
                icon={MapPin}
                onChange={(val) => setProfile({ ...profile, address: val })}
              />
              <InlineField
                label="Phone"
                value={profile.phone}
                icon={Phone}
                onChange={(val) => setProfile({ ...profile, phone: val })}
                type="tel"
                verified={!!profile.phone}
              />
              <InlineField
                label="Website"
                value={profile.website}
                icon={Globe}
                onChange={(val) => setProfile({ ...profile, website: val })}
                type="url"
              />
              <InlineField
                label="Email"
                value={profile.email}
                icon={Mail}
                onChange={(val) => setProfile({ ...profile, email: val })}
                type="email"
                verified={!!profile.email}
              />
              <InlineField
                label="Notification Email"
                value={profile.notification_email}
                icon={Bell}
                onChange={(val) => setProfile({ ...profile, notification_email: val })}
                type="email"
              />
              <p className="text-xs text-muted-foreground mt-1 ml-8">Leads and messages will be sent here.</p>
            </CardContent>
          </Card>

          {/* Practice Hours */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Practice Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {DAYS.map((day) => {
                  const hours = profile.opening_hours[day.toLowerCase()] || {
                    open: "09:00",
                    close: "17:00",
                    closed: false,
                  }
                  return (
                    <div key={day} className="flex items-center gap-3 py-1.5">
                      <span className="w-20 text-sm font-medium">{day.slice(0, 3)}</span>
                      <Switch
                        checked={!hours.closed}
                        onCheckedChange={(checked) => {
                          setProfile({
                            ...profile,
                            opening_hours: {
                              ...profile.opening_hours,
                              [day.toLowerCase()]: { ...hours, closed: !checked },
                            },
                          })
                        }}
                        className="scale-75"
                      />
                      {!hours.closed ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="time"
                            value={hours.open}
                            onChange={(e) => {
                              setProfile({
                                ...profile,
                                opening_hours: {
                                  ...profile.opening_hours,
                                  [day.toLowerCase()]: { ...hours, open: e.target.value },
                                },
                              })
                            }}
                            className="h-7 text-xs w-24"
                          />
                          <span className="text-xs text-muted-foreground">-</span>
                          <Input
                            type="time"
                            value={hours.close}
                            onChange={(e) => {
                              setProfile({
                                ...profile,
                                opening_hours: {
                                  ...profile.opening_hours,
                                  [day.toLowerCase()]: { ...hours, close: e.target.value },
                                },
                              })
                            }}
                            className="h-7 text-xs w-24"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Closed</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Availability */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Emergency Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Accepts emergency patients</p>
                  <p className="text-xs text-muted-foreground">Patients in urgent need will be matched to your clinic</p>
                </div>
                <Switch
                  checked={profile.accepts_urgent}
                  onCheckedChange={(checked) => setProfile({ ...profile, accepts_urgent: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Languages */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Languages Spoken
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const isSelected = profile.languages.includes(lang)
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          removeTag("languages", lang)
                        } else {
                          addTag("languages", lang)
                        }
                      }}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                        isSelected
                          ? "bg-[#9F7AEA] text-white border-[#9F7AEA]"
                          : "bg-background border-border hover:border-[#9F7AEA]/50"
                      }`}
                    >
                      {lang}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Practice Photos */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Practice Photos</CardTitle>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    disabled={isUploadingGallery}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleGalleryUpload(e.target.files)
                      }
                      e.target.value = ""
                    }}
                  />
                  <span className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 border rounded-md transition-colors ${isUploadingGallery ? "opacity-60 cursor-wait" : "hover:bg-muted cursor-pointer"}`}>
                    {isUploadingGallery ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5" />
                    )}
                    {isUploadingGallery ? "Uploading..." : "Add Photos"}
                  </span>
                </label>
              </div>
            </CardHeader>
            <CardContent>
              {profile.images && profile.images.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {profile.images.map((img, i) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={img || "/placeholder.svg"} alt={`Practice photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(i)}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    disabled={isUploadingGallery}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleGalleryUpload(e.target.files)
                      }
                      e.target.value = ""
                    }}
                  />
                  <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg hover:border-[#9F7AEA]/50 transition-colors">
                    <div className="text-center">
                      <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload photos</p>
                      <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, or WEBP. Max 10MB each.</p>
                    </div>
                  </div>
                </label>
              )}
            </CardContent>
          </Card>

          {/* Before & After Gallery */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Before & After</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 bg-transparent"
                  onClick={addBeforeAfterPair}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Pair
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Show patients the results they can expect.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.before_after_images.length === 0 ? (
                <div
                  className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg hover:border-[#9F7AEA]/50 transition-colors cursor-pointer"
                  onClick={addBeforeAfterPair}
                >
                  <div className="text-center">
                    <ImagePlus className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm text-muted-foreground">Add your first before & after</p>
                  </div>
                </div>
              ) : (
                profile.before_after_images.map((pair, pairIndex) => (
                  <div key={pairIndex} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Input
                        value={pair.treatment}
                        onChange={(e) => {
                          const updated = [...profile.before_after_images]
                          updated[pairIndex] = { ...updated[pairIndex], treatment: e.target.value }
                          setProfile({ ...profile, before_after_images: updated })
                        }}
                        placeholder="Treatment type (e.g. Invisalign, Veneers)"
                        className="h-8 text-sm max-w-xs"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeBeforeAfterPair(pairIndex)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Before */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Before</p>
                        {pair.before_url ? (
                          <div className="relative group aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                            <img src={pair.before_url} alt="Before" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...profile.before_after_images]
                                updated[pairIndex] = { ...updated[pairIndex], before_url: "" }
                                setProfile({ ...profile, before_after_images: updated })
                              }}
                              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={isUploadingBeforeAfter !== null}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleBeforeAfterUpload(file, pairIndex, "before")
                                e.target.value = ""
                              }}
                            />
                            <div className="aspect-[4/3] rounded-lg border-2 border-dashed flex items-center justify-center hover:border-[#9F7AEA]/50 transition-colors">
                              {isUploadingBeforeAfter === `${pairIndex}-before` ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              ) : (
                                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </label>
                        )}
                      </div>
                      {/* After */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">After</p>
                        {pair.after_url ? (
                          <div className="relative group aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                            <img src={pair.after_url} alt="After" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...profile.before_after_images]
                                updated[pairIndex] = { ...updated[pairIndex], after_url: "" }
                                setProfile({ ...profile, before_after_images: updated })
                              }}
                              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={isUploadingBeforeAfter !== null}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleBeforeAfterUpload(file, pairIndex, "after")
                                e.target.value = ""
                              }}
                            />
                            <div className="aspect-[4/3] rounded-lg border-2 border-dashed flex items-center justify-center hover:border-[#9F7AEA]/50 transition-colors">
                              {isUploadingBeforeAfter === `${pairIndex}-after` ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              ) : (
                                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                    <Input
                      value={pair.description || ""}
                      onChange={(e) => {
                        const updated = [...profile.before_after_images]
                        updated[pairIndex] = { ...updated[pairIndex], description: e.target.value }
                        setProfile({ ...profile, before_after_images: updated })
                      }}
                      placeholder="Brief description (optional)"
                      className="h-8 text-sm"
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Why Choose Us */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Why Choose Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                2-4 sentences. Keep it clear and patient-friendly.
              </p>
              <Textarea
                rows={5}
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                placeholder="Tell patients what makes your clinic unique..."
                className="text-sm"
              />
            </CardContent>
          </Card>

          {/* Featured Review */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Featured Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Highlight a trusted patient review on your public profile.
              </p>
              <Textarea
                rows={3}
                value={profile.featured_review || ""}
                onChange={(e) => setProfile({ ...profile, featured_review: e.target.value })}
                placeholder="Paste your best patient review here..."
                className="text-sm"
              />
            </CardContent>
          </Card>

          {/* Treatments */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Treatments Offered</CardTitle>
            </CardHeader>
            <CardContent>
              <TagEditor
                tags={profile.treatments}
                onAdd={(tag) => addTag("treatments", tag)}
                onRemove={(tag) => removeTag("treatments", tag)}
                placeholder="Add treatment..."
              />
            </CardContent>
          </Card>

          {/* Treatment Pricing */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <PoundSterling className="h-4 w-4" />
                  Treatment Pricing
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {profile.show_treatment_prices ? "Visible on profile" : "Hidden from profile"}
                  </span>
                  <Switch
                    checked={profile.show_treatment_prices}
                    onCheckedChange={(checked) => setProfile({ ...profile, show_treatment_prices: checked })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Add your treatment prices. Only treatments with a price will appear on your public profile. Leave price blank to hide a treatment.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Initialise from defaults button */}
              {profile.treatment_prices.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                  onClick={() => setProfile({ ...profile, treatment_prices: DEFAULT_TREATMENT_CATEGORIES })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Load Default Treatment Categories
                </Button>
              )}

              {profile.treatment_prices.map((category, catIndex) => (
                <div key={catIndex} className="border rounded-lg overflow-hidden">
                  {/* Category header */}
                  <div className="flex items-center justify-between bg-muted/50 px-3 py-2">
                    <Input
                      value={category.category}
                      onChange={(e) => {
                        const updated = [...profile.treatment_prices]
                        updated[catIndex] = { ...updated[catIndex], category: e.target.value }
                        setProfile({ ...profile, treatment_prices: updated })
                      }}
                      className="h-7 text-sm font-semibold border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="Category name"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          const updated = [...profile.treatment_prices]
                          updated[catIndex] = {
                            ...updated[catIndex],
                            treatments: [...updated[catIndex].treatments, { name: "", price: "", description: "" }],
                          }
                          setProfile({ ...profile, treatment_prices: updated })
                        }}
                        title="Add treatment to this category"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const updated = profile.treatment_prices.filter((_, i) => i !== catIndex)
                          setProfile({ ...profile, treatment_prices: updated })
                        }}
                        title="Remove category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Treatments in category */}
                  <div className="divide-y divide-border/50">
                    {category.treatments.map((treatment, treatIndex) => (
                      <div key={treatIndex} className="px-3 py-2 flex items-start gap-2">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex gap-2">
                            <Input
                              value={treatment.name}
                              onChange={(e) => {
                                const updated = [...profile.treatment_prices]
                                const treatments = [...updated[catIndex].treatments]
                                treatments[treatIndex] = { ...treatments[treatIndex], name: e.target.value }
                                updated[catIndex] = { ...updated[catIndex], treatments }
                                setProfile({ ...profile, treatment_prices: updated })
                              }}
                              placeholder="Treatment name"
                              className="h-7 text-sm flex-1"
                            />
                            <div className="relative w-28">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">£</span>
                              <Input
                                value={treatment.price}
                                onChange={(e) => {
                                  const updated = [...profile.treatment_prices]
                                  const treatments = [...updated[catIndex].treatments]
                                  treatments[treatIndex] = { ...treatments[treatIndex], price: e.target.value }
                                  updated[catIndex] = { ...updated[catIndex], treatments }
                                  setProfile({ ...profile, treatment_prices: updated })
                                }}
                                placeholder="Price"
                                className="h-7 text-sm pl-5"
                              />
                            </div>
                          </div>
                          <Input
                            value={treatment.description}
                            onChange={(e) => {
                              const updated = [...profile.treatment_prices]
                              const treatments = [...updated[catIndex].treatments]
                              treatments[treatIndex] = { ...treatments[treatIndex], description: e.target.value }
                              updated[catIndex] = { ...updated[catIndex], treatments }
                              setProfile({ ...profile, treatment_prices: updated })
                            }}
                            placeholder="Brief description (optional)"
                            className="h-7 text-xs text-muted-foreground"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 mt-0.5 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={() => {
                            const updated = [...profile.treatment_prices]
                            const treatments = updated[catIndex].treatments.filter((_, i) => i !== treatIndex)
                            updated[catIndex] = { ...updated[catIndex], treatments }
                            setProfile({ ...profile, treatment_prices: updated })
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {category.treatments.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground italic">No treatments in this category</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Add category button */}
              {profile.treatment_prices.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                  onClick={() => {
                    setProfile({
                      ...profile,
                      treatment_prices: [
                        ...profile.treatment_prices,
                        { category: "", treatments: [{ name: "", price: "", description: "" }] },
                      ],
                    })
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Category
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Key Selling Points */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Star className="h-4 w-4" />
                Key Selling Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                What makes your clinic special? These are shown to matched patients.
              </p>
              <TagEditor
                tags={profile.key_selling_points}
                onAdd={(tag) => addTag("key_selling_points", tag)}
                onRemove={(tag) => removeTag("key_selling_points", tag)}
                placeholder="e.g., Same-day appointments, Free parking..."
              />
            </CardContent>
          </Card>

          {/* Accessibility */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Accessibility className="h-4 w-4" />
                Accessibility Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TagEditor
                tags={profile.accessibility_features}
                onAdd={(tag) => addTag("accessibility_features", tag)}
                onRemove={(tag) => removeTag("accessibility_features", tag)}
                placeholder="e.g., Wheelchair access, Step-free entry..."
              />
            </CardContent>
          </Card>

          {/* Finance Options */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Finance Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TagEditor
                tags={profile.finance_provider_names}
                onAdd={(tag) => addTag("finance_provider_names", tag)}
                onRemove={(tag) => removeTag("finance_provider_names", tag)}
                placeholder="Add finance provider..."
              />
            </CardContent>
          </Card>

          {/* Highlight Badges - Collapsible */}
          <Card>
            <CardHeader className="pb-2">
              <button
                type="button"
                onClick={() => toggleSection("highlights")}
                className="flex items-center justify-between w-full"
              >
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Highlight Badges
                </CardTitle>
                {expandedSections.highlights ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {!expandedSections.highlights && profile.highlight_chips.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {profile.highlight_chips.slice(0, 5).map((chip) => (
                    <Badge key={chip} variant="secondary" className="text-[10px]">
                      {getHighlightLabel(chip)}
                    </Badge>
                  ))}
                  {profile.highlight_chips.length > 5 && (
                    <Badge variant="secondary" className="text-[10px]">
                      +{profile.highlight_chips.length - 5} more
                    </Badge>
                  )}
                </div>
              )}
            </CardHeader>
            {expandedSections.highlights && (
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Select badges to display on your clinic card. These help patients see your key features at a glance.
                </p>
                {HIGHLIGHT_CATEGORIES.map((category) => (
                  <div key={category.id} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {category.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {category.options.map((option) => {
                        const isSelected = profile.highlight_chips.includes(option.value)
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setProfile({
                                  ...profile,
                                  highlight_chips: profile.highlight_chips.filter((h) => h !== option.value),
                                })
                              } else {
                                setProfile({
                                  ...profile,
                                  highlight_chips: [...profile.highlight_chips, option.value],
                                })
                              }
                            }}
                            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                              isSelected
                                ? "bg-[#9F7AEA] text-white border-[#9F7AEA]"
                                : "bg-background border-border hover:border-[#9F7AEA]/50"
                            }`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Matching Preferences - Collapsible */}
          <Card>
            <CardHeader className="pb-2">
              <button
                type="button"
                onClick={() => toggleSection("matching")}
                className="flex items-center justify-between w-full"
              >
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Matching Preferences
                </CardTitle>
                {expandedSections.matching ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {expandedSections.matching && (
              <CardContent className="space-y-6">
                {/* Ideal Patient Tags */}
                <div>
                  <p className="text-sm font-medium mb-1">Ideal Patient Tags</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Tags that describe your ideal patients - helps Pearlie match you with the right leads.
                  </p>
                  <TagEditor
                    tags={profile.ideal_patient_tags}
                    onAdd={(tag) => addTag("ideal_patient_tags", tag)}
                    onRemove={(tag) => removeTag("ideal_patient_tags", tag)}
                    placeholder="e.g., nervous patients, cosmetic focus..."
                    variant="default"
                  />
                </div>

                {/* Exclusion Tags */}
                <div>
                  <p className="text-sm font-medium mb-1">Exclusion Tags</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Tags for cases you would prefer not to receive.
                  </p>
                  <TagEditor
                    tags={profile.exclusion_tags}
                    onAdd={(tag) => addTag("exclusion_tags", tag)}
                    onRemove={(tag) => removeTag("exclusion_tags", tag)}
                    placeholder="e.g., emergency only, no NHS..."
                    variant="destructive"
                  />
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
