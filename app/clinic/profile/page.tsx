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
} from "lucide-react"
import { toast } from "sonner"
import { HIGHLIGHT_CATEGORIES, getHighlightLabel } from "@/lib/clinic-highlights-config"

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
  images?: string[]
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    highlights: false,
    matching: false,
  })

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
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

          {/* Availability & Emergency */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Availability & Emergency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="border-t border-border/50 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Weekend availability</p>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const satOpen = profile.opening_hours?.saturday && !profile.opening_hours.saturday.closed
                        const sunOpen = profile.opening_hours?.sunday && !profile.opening_hours.sunday.closed
                        if (satOpen && sunOpen) return "Open Saturday & Sunday — set via Practice Hours above"
                        if (satOpen) return "Open Saturday — set via Practice Hours above"
                        if (sunOpen) return "Open Sunday — set via Practice Hours above"
                        return "Not available — toggle Saturday or Sunday open in Practice Hours above"
                      })()}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-5 flex-shrink-0 ${
                      (profile.opening_hours?.saturday && !profile.opening_hours.saturday.closed) ||
                      (profile.opening_hours?.sunday && !profile.opening_hours.sunday.closed)
                        ? "border-green-300 text-green-700 bg-green-50"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {(profile.opening_hours?.saturday && !profile.opening_hours.saturday.closed) ||
                    (profile.opening_hours?.sunday && !profile.opening_hours.sunday.closed)
                      ? "ACTIVE"
                      : "OFF"}
                  </Badge>
                </div>
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
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 bg-transparent">
                  <ImagePlus className="h-3.5 w-3.5" />
                  Add Photos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {profile.images && profile.images.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {profile.images.map((img, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={img || "/placeholder.svg"} alt={`Practice photo ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No photos yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Add photos to attract more patients</p>
                  </div>
                </div>
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
