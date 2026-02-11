"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trash2, BadgeCheck, Info, X } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { TREATMENT_OPTIONS, DAYS_OF_WEEK, HOURLY_SLOTS, TIME_SLOT_OPTIONS } from "@/lib/constants"
import { PhotoUploader } from "@/components/admin/clinic-photo-uploader"
import { GoogleClinicSearch } from "@/components/admin/google-clinic-search"
import { ClinicFilterChecklist } from "@/components/admin/clinic-filter-checklist"
import { ClinicAITagsPanel } from "@/components/admin/clinic-ai-tags-panel"
import { HIGHLIGHT_CATEGORIES, getHighlightLabel } from "@/lib/clinic-highlights-config"
import { TestEmailButton } from "@/components/admin/test-email-button"
import { Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface GalleryItem {
  url: string
  tag?: "before" | "after" | "clinic"
}

interface Clinic {
  id?: string
  name: string
  city: string
  address: string
  postcode: string
  phone: string
  email?: string
  notification_email?: string
  website?: string
  description: string
  treatments: string[]
  languages?: string[]
  price_range: string
  opening_hours: string
  is_archived: boolean
  is_live?: boolean
  verified?: boolean
  latitude?: number
  longitude?: number
  images?: string[]
  gallery?: GalleryItem[]
  google_place_id?: string
  google_rating?: number
  google_review_count?: number
  google_maps_url?: string
  tag_notes?: string
  available_days?: string[]
  available_hours?: string[]
  accepts_same_day?: boolean
}

// Common languages for dental clinics
const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Polish",
  "Romanian",
  "Arabic",
  "Hindi",
  "Urdu",
  "Bengali",
  "Punjabi",
  "Gujarati",
  "Tamil",
  "Mandarin",
  "Cantonese",
  "Japanese",
  "Korean",
  "Russian",
  "Turkish",
  "Greek",
  "Dutch",
]

interface ClinicEditorDrawerProps {
  open: boolean
  onClose: () => void
  clinic: Clinic | null
  onSave: (clinic: Clinic) => void
}

export function ClinicEditorDrawer({ open, onClose, clinic, onSave }: ClinicEditorDrawerProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<Partial<Clinic>>({
    name: "",
    city: "",
    postcode: "",
    address: "",
    phone: "",
    email: "",
    notification_email: "",
    website: "",
    description: "",
    treatments: [],
    languages: ["English"],
    highlight_chips: [],
    price_range: "",
    opening_hours: "",
    is_archived: false,
    verified: false,
    images: [],
    latitude: undefined,
    longitude: undefined,
    gallery: [],
    tag_notes: "",
    available_days: ["mon", "tue", "wed", "thu", "fri"], // Weekdays by default
    available_hours: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"], // All hours by default
    accepts_same_day: false, // Default to not accepting same-day
  })

  const [mainPhotoUrl, setMainPhotoUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null)
  const [manuallyEdited, setManuallyEdited] = useState<Set<string>>(new Set())
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [fetchingHours, setFetchingHours] = useState(false)
  const [openingHoursData, setOpeningHoursData] = useState<Record<string, string> | null>(null)

  // Initialize form data when drawer opens with a clinic
  useEffect(() => {
    if (!open) return // Don't do anything when drawer is closed
    
    const initializeForm = async () => {
      if (clinic?.id) {
        // Editing existing clinic - fetch fresh data from API
        try {
          const response = await fetch(`/api/admin/clinics/${clinic.id}`)
          if (response.ok) {
            const freshClinic = await response.json()
setFormData({
            name: freshClinic.name || "",
            city: freshClinic.city || "",
            postcode: freshClinic.postcode || "",
            address: freshClinic.address || "",
            phone: freshClinic.phone || "",
            email: freshClinic.email || "",
            notification_email: freshClinic.notification_email || "",
            website: freshClinic.website || "",
            description: freshClinic.description || "",
            treatments: freshClinic.treatments || [],
            languages: freshClinic.languages || ["English"],
            highlight_chips: freshClinic.highlight_chips || [],
              price_range: freshClinic.price_range || "",
              opening_hours: freshClinic.opening_hours || "",
              is_archived: freshClinic.is_archived || false,
              verified: freshClinic.verified || false,
              images: freshClinic.images || [],
              latitude: freshClinic.latitude,
              longitude: freshClinic.longitude,
gallery: freshClinic.gallery || [],
  tag_notes: freshClinic.tag_notes || "",
  available_days: freshClinic.available_days || ["mon", "tue", "wed", "thu", "fri"],
  available_hours: freshClinic.available_hours || ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
  accepts_same_day: freshClinic.accepts_same_day ?? false,
  })
setGooglePlaceId(freshClinic.google_place_id || null)
setMainPhotoUrl(freshClinic.images?.[0] || "")
setOpeningHoursData(freshClinic.opening_hours && typeof freshClinic.opening_hours === 'object' ? freshClinic.opening_hours : null)
fetchClinicFilters(clinic.id)
          }
        } catch (error) {
          console.error("Error fetching fresh clinic data:", error)
          // Fallback to passed clinic data
          setFormData({
            name: clinic.name || "",
            city: clinic.city || "",
            postcode: clinic.postcode || "",
            address: clinic.address || "",
            phone: clinic.phone || "",
            email: clinic.email || "",
            notification_email: clinic.notification_email || "",
            website: clinic.website || "",
            description: clinic.description || "",
            treatments: clinic.treatments || [],
            languages: clinic.languages || ["English"],
            highlight_chips: clinic.highlight_chips || [],
            price_range: clinic.price_range || "",
            opening_hours: clinic.opening_hours || "",
            is_archived: clinic.is_archived || false,
            verified: clinic.verified || false,
            images: clinic.images || [],
            latitude: clinic.latitude,
            longitude: clinic.longitude,
gallery: clinic.gallery || [],
  tag_notes: clinic.tag_notes || "",
  available_days: clinic.available_days || ["mon", "tue", "wed", "thu", "fri"],
  available_hours: clinic.available_hours || ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
  accepts_same_day: clinic.accepts_same_day ?? false,
  })
  setMainPhotoUrl(clinic.images?.[0] || "")
  setOpeningHoursData(clinic.opening_hours && typeof clinic.opening_hours === 'object' ? clinic.opening_hours as Record<string, string> : null)
  fetchClinicFilters(clinic.id)
}
} else {
// Creating new clinic - reset form with all treatments preselected
        setFormData({
          name: "",
          city: "",
          postcode: "",
          address: "",
          phone: "",
          email: "",
          notification_email: "",
          website: "",
          description: "",
          treatments: [...TREATMENT_OPTIONS], // Preselect all - deselect ones they don't offer
          languages: ["English"],
          highlight_chips: [],
          price_range: "",
          opening_hours: "",
          is_archived: false,
          verified: false,
          images: [],
latitude: undefined,
  longitude: undefined,
  gallery: [],
  tag_notes: "",
  available_days: ["mon", "tue", "wed", "thu", "fri"], // Weekdays by default
  available_hours: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"], // All hours
  accepts_same_day: false, // Default to not accepting same-day
  })
  setMainPhotoUrl("")
  setGooglePlaceId(null)
  setSelectedFilters([])
setOpeningHoursData(null)
}
    }
    
    initializeForm()
  }, [open, clinic?.id]) // Only re-run when open state or clinic ID changes

  const fetchClinicFilters = async (clinicId: string) => {
    try {
      const response = await fetch(`/api/admin/clinic-filters?clinicId=${clinicId}`)
      if (!response.ok) throw new Error("Failed to fetch clinic filters")
      const data = await response.json()
      setSelectedFilters(data.filterKeys || [])
      if (data.lastSavedAt) {
        setLastSavedAt(data.lastSavedAt)
      }
      console.log("[v0] Loaded filters for clinic", clinicId, ":", data.filterKeys)
    } catch (error) {
      console.error("[v0] Error fetching clinic filters:", error)
      setSelectedFilters([])
    }
  }

  const handleAddGalleryPhoto = (url: string) => {
    const newItem: GalleryItem = { url }
    setFormData({
      ...formData,
      gallery: [...(formData.gallery || []), newItem],
    })
    toast({
      title: "Added",
      description: "Gallery photo uploaded successfully",
    })
  }

  const handleRemoveGalleryItem = (index: number) => {
    const newGallery = (formData.gallery || []).filter((_, i) => i !== index)
    setFormData({ ...formData, gallery: newGallery })
  }

  const handleUpdateTag = (index: number, tag: "before" | "after" | "clinic" | undefined) => {
    const newGallery = [...(formData.gallery || [])]
    newGallery[index] = { ...newGallery[index], tag }
    setFormData({ ...formData, gallery: newGallery })
  }

  const handleTreatmentToggle = (treatment: string) => {
    const current = formData.treatments || []
    if (current.includes(treatment)) {
      setFormData({ ...formData, treatments: current.filter((t) => t !== treatment) })
    } else {
      setFormData({ ...formData, treatments: [...current, treatment] })
    }
  }

  const handleHighlightToggle = (highlightValue: string) => {
    const current = formData.highlight_chips || []
    if (current.includes(highlightValue)) {
      setFormData({ ...formData, highlight_chips: current.filter((h) => h !== highlightValue) })
    } else {
      setFormData({ ...formData, highlight_chips: [...current, highlightValue] })
    }
  }

  const handleGoogleClinicSelect = (googleClinic: any) => {
    setFormData({
      ...formData,
      name: googleClinic.name,
      address: googleClinic.address,
      postcode: googleClinic.postcode,
      phone: googleClinic.phone,
      email: formData.email || "",
      website: googleClinic.website,
      latitude: googleClinic.latitude,
      longitude: googleClinic.longitude,
      rating: googleClinic.rating,
      review_count: googleClinic.reviewCount,
      description: formData.description || `Dental practice located at ${googleClinic.address}`,
    })

    if (googleClinic.photoUrl && !mainPhotoUrl) {
      setMainPhotoUrl(googleClinic.photoUrl)
    }

    setGooglePlaceId(googleClinic.placeId)
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
    setManuallyEdited(new Set(manuallyEdited).add(field))
  }

  const handleMainPhotoChange = async (newUrl: string) => {
    const previousUrl = mainPhotoUrl
    setMainPhotoUrl(newUrl)

    if (clinic?.id) {
      onSave({
        ...clinic,
        ...formData,
        images: newUrl ? [newUrl] : [],
      } as Clinic)

      toast({
        title: "Photo updated",
        description: "Main photo saved successfully",
      })

      fetch(`/api/admin/clinics/${clinic.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: newUrl ? [newUrl] : [] }),
      }).catch((error) => {
        console.error("Failed to save photo:", error)
        setMainPhotoUrl(previousUrl)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save photo. Please try again.",
        })
      })
    } else {
      setMainPhotoUrl(newUrl)
    }
  }

  const fetchOpeningHoursFromGoogle = async () => {
    if (!clinic?.id) {
      toast({
        title: "Save clinic first",
        description: "Please save the clinic before fetching opening hours from Google.",
        variant: "destructive",
      })
      return
    }

    setFetchingHours(true)
    try {
      const address = `${formData.name}, ${formData.address}, ${formData.postcode}`
      const response = await fetch(`/api/admin/clinics/${clinic.id}/opening-hours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          placeId: googlePlaceId,
          address 
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch opening hours")
      }

      setOpeningHoursData(data.opening_hours)
      toast({
        title: "Opening hours fetched",
        description: "Opening hours have been updated from Google Places.",
      })
    } catch (error) {
      console.error("Error fetching opening hours:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch opening hours from Google",
        variant: "destructive",
      })
    } finally {
      setFetchingHours(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const { gallery, google_place_id, google_rating, google_review_count, google_maps_url, ...restFormData } =
        formData

      const payload = {
        ...restFormData,
        images: mainPhotoUrl ? [mainPhotoUrl] : [],
      }

      const url = clinic?.id ? `/api/admin/clinics/${clinic.id}` : "/api/admin/clinics"
      const method = clinic?.id ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to save clinic")

      const savedClinic = await response.json()

      const filterResponse = await fetch("/api/admin/clinic-filters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinicId: savedClinic.id,
          filterKeys: selectedFilters,
        }),
      })

      const filterData = await filterResponse.json()
      if (filterData.savedAt) {
        setLastSavedAt(filterData.savedAt)
      }

      toast({
        title: "Success",
        description: "Clinic saved successfully",
      })

      onSave(savedClinic)
      onClose()
    } catch (error) {
      console.error("Error saving clinic:", error)
      toast({
        title: "Error",
        description: "Failed to save clinic. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col">
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 md:px-7 py-6 md:py-7">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight mb-2">{clinic ? "Edit Clinic" : "Add New Clinic"}</h2>
            <p className="text-sm text-muted-foreground">
              {clinic ? "Update clinic information and photos." : "Add a new clinic to the directory."}
            </p>
          </div>

          {/* Sections with consistent vertical rhythm */}
          <div className="space-y-8">
            {/* Google Search - Available for both create and edit */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                {clinic ? "Update from Google Places" : "Search Google Places"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {clinic 
                  ? "Search to update clinic details from Google Places data"
                  : "Search for an existing clinic to auto-fill details"
                }
              </p>
              <GoogleClinicSearch onSelect={handleGoogleClinicSelect} />
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm text-foreground">
                    Clinic Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    placeholder="Central London Dental"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm text-foreground">
                    City *
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleFieldChange("city", e.target.value)}
                    placeholder="London"
                    className="h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm text-foreground">
                      Phone *
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleFieldChange("phone", e.target.value)}
                      placeholder="020 7123 4567"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm text-foreground">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => handleFieldChange("email", e.target.value)}
                      placeholder="info@clinic.co.uk"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notification_email" className="text-sm text-foreground">
                    Lead Notification Email
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Internal email for Book/Call lead alerts. If empty, uses the public email above.
                  </p>
                  <Input
                    id="notification_email"
                    type="email"
                    value={formData.notification_email || ""}
                    onChange={(e) => handleFieldChange("notification_email", e.target.value)}
                    placeholder="leads@clinic.co.uk"
                    className="h-10"
                  />
                  {(formData.notification_email || formData.email) && (
                    <div className="pt-2">
                      <TestEmailButton clinicName={formData.name} />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm text-foreground">
                    Address *
                  </Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleFieldChange("address", e.target.value)}
                    placeholder="123 High Street, Westminster"
                    className="h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postcode" className="text-sm text-foreground">
                      Postcode *
                    </Label>
                    <Input
                      id="postcode"
                      value={formData.postcode}
                      onChange={(e) => handleFieldChange("postcode", e.target.value)}
                      placeholder="W1A 1AA"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-sm text-foreground">
                      Website
                    </Label>
                    <Input
                      id="website"
                      value={formData.website || ""}
                      onChange={(e) => handleFieldChange("website", e.target.value)}
                      placeholder="https://clinic.co.uk"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm text-foreground">
                    Description *
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    placeholder="Modern dental practice in central London..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>

{/* Treatments */}
  <div className="pt-6 border-t border-border/50 space-y-4">
  <h3 className="text-sm font-semibold text-foreground">Treatments Offered *</h3>
  <div className="flex flex-wrap gap-2">
  {TREATMENT_OPTIONS.map((treatment) => (
  <Badge
  key={treatment}
  variant={formData.treatments?.includes(treatment) ? "default" : "outline"}
  className="cursor-pointer hover:bg-foreground hover:text-background transition-colors"
  onClick={() => handleTreatmentToggle(treatment)}
  >
  {treatment}
  </Badge>
  ))}
  </div>
  </div>

{/* Languages Spoken */}
  <div className="pt-6 border-t border-border/50 space-y-4">
    <h3 className="text-sm font-semibold text-foreground">Languages Spoken</h3>
    <p className="text-xs text-muted-foreground">Select all languages that staff can speak with patients.</p>
    <div className="flex flex-wrap gap-2">
      {LANGUAGE_OPTIONS.map((language) => (
        <Badge
          key={language}
          variant={formData.languages?.includes(language) ? "default" : "outline"}
          className="cursor-pointer hover:bg-foreground hover:text-background transition-colors"
          onClick={() => {
            const current = formData.languages || []
            if (current.includes(language)) {
              setFormData({ ...formData, languages: current.filter((l) => l !== language) })
            } else {
              setFormData({ ...formData, languages: [...current, language] })
            }
          }}
        >
          {language}
        </Badge>
      ))}
    </div>
  </div>

  {/* Appointment Availability */}
  <div className="pt-6 border-t border-border/50 space-y-5">
  <div className="space-y-1">
    <h3 className="text-sm font-semibold text-foreground">Appointment Availability</h3>
    <p className="text-xs text-muted-foreground">
      Select which days and times this clinic accepts appointments. This affects matching scores.
    </p>
  </div>
  
  {/* Days of Week */}
  <div className="space-y-2">
    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Days Open</Label>
    <div className="flex flex-wrap gap-2">
      {DAYS_OF_WEEK.map((day) => (
        <Badge
          key={day.key}
          variant={formData.available_days?.includes(day.key) ? "default" : "outline"}
          className="cursor-pointer hover:bg-foreground hover:text-background transition-colors px-3 py-1"
          onClick={() => {
            const current = formData.available_days || []
            const updated = current.includes(day.key)
              ? current.filter((d) => d !== day.key)
              : [...current, day.key]
            setFormData({ ...formData, available_days: updated })
          }}
        >
          {day.label}
        </Badge>
      ))}
    </div>
  </div>
  
  {/* Hourly Time Slots */}
  <div className="space-y-2">
    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Available Hours</Label>
    <div className="flex flex-wrap gap-2">
      {HOURLY_SLOTS.map((slot) => (
        <Badge
          key={slot.key}
          variant={formData.available_hours?.includes(slot.key) ? "default" : "outline"}
          className="cursor-pointer hover:bg-foreground hover:text-background transition-colors px-3 py-1"
          onClick={() => {
            const current = formData.available_hours || []
            const updated = current.includes(slot.key)
              ? current.filter((h) => h !== slot.key)
              : [...current, slot.key]
            setFormData({ ...formData, available_hours: updated })
          }}
        >
          {slot.label}
        </Badge>
      ))}
    </div>
  </div>
  
  {/* Same-day appointments toggle */}
  <div className="flex items-center gap-3 pt-2">
    <Switch
      id="accepts_same_day"
      checked={formData.accepts_same_day ?? false}
      onCheckedChange={(checked) => setFormData({ ...formData, accepts_same_day: checked })}
    />
    <Label htmlFor="accepts_same_day" className="text-sm cursor-pointer">
      Can accept same-day appointments
    </Label>
  </div>
  </div>
  
  {/* Clinic Filter Checklist Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Clinic Tags / Matching Style</label>
                <p className="text-sm text-muted-foreground">
                  Select the operational characteristics that describe this clinic. These help match patients to the
                  right clinics.
                </p>
              </div>
              <ClinicFilterChecklist
                clinicId={clinic?.id}
                selectedFilters={selectedFilters}
                onFiltersChange={setSelectedFilters}
              />
              {/* Add last saved indicator in the filters section */}
              {lastSavedAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <Clock className="h-3 w-3" />
                  <span>Last saved: {new Date(lastSavedAt).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* AI-Extracted Tags Panel */}
            {clinic?.id && (
              <div className="space-y-4 pt-4 border-t">
                <ClinicAITagsPanel
                  clinicId={clinic.id}
                  clinicWebsite={formData.website || null}
                  onTagsUpdated={() => {
                    // Refresh filters when tags are updated
                    if (clinic?.id) {
                      fetchClinicFilters(clinic.id)
                    }
                  }}
                />
              </div>
            )}

            {/* Matching Status */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Matching Status</label>
                <Card className="p-4 bg-muted/50">
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Active clinics</strong> (not archived) automatically appear in patient matching results.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      For best matching quality, ensure this clinic has at least 6 matching tags above.
                    </p>
                    {selectedFilters.length < 6 && (
                      <p className="text-sm text-amber-600 font-medium">
                        This clinic has only {selectedFilters.length} tag{selectedFilters.length !== 1 ? "s" : ""}. Add
                        more tags for better matching.
                      </p>
                    )}
                    {selectedFilters.length >= 6 && (
                      <p className="text-sm text-green-600 font-medium">
                        This clinic is ready for matching with {selectedFilters.length} tags.
                      </p>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {/* Tag Notes Field */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <label htmlFor="tag_notes" className="text-sm font-medium">
                  Tag Notes (Internal)
                </label>
                <p className="text-sm text-muted-foreground">
                  Internal notes about the clinic's characteristics, tags, or matching considerations. Not shown to
                  patients.
                </p>
                <Textarea
                  id="tag_notes"
                  placeholder="e.g., Confirmed excellent with anxious patients, runs late sometimes, specialises in complex implant cases..."
                  value={formData.tag_notes || ""}
                  onChange={(e) => setFormData({ ...formData, tag_notes: e.target.value })}
                  rows={4}
                />
              </div>
            </div>

            {/* Photos */}
            <div className="pt-6 border-t border-border/50 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Clinic Photos</h3>

              <div className="space-y-5">
                <PhotoUploader
                  value={mainPhotoUrl}
                  onChange={handleMainPhotoChange}
                  label="Main Card Photo (Required)"
                  maxSizeMB={5}
                  type="main"
                />

                <div className="space-y-3 pt-4 border-t border-border/60">
                  <div className="space-y-1">
                    <Label className="text-sm text-foreground">Gallery Photos (Optional)</Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Upload additional photos for the clinic gallery. You can tag them as before/after or clinic
                      photos.
                    </p>
                  </div>

                  <PhotoUploader
                    value=""
                    onChange={handleAddGalleryPhoto}
                    label="Upload Gallery Photo"
                    maxSizeMB={10}
                    type="gallery"
                  />

                  {(formData.gallery || []).length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {(formData.gallery || []).map((item, index) => (
                        <Card key={index} className="overflow-hidden">
                          <div className="relative aspect-video">
                            <Image
                              src={item.url || "/placeholder.svg"}
                              alt={`Gallery ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="p-3 space-y-2">
                            <Select
                              value={item.tag || "none"}
                              onValueChange={(value) =>
                                handleUpdateTag(index, value === "none" ? undefined : (value as any))
                              }
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Tag" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No tag</SelectItem>
                                <SelectItem value="before">Before</SelectItem>
                                <SelectItem value="after">After</SelectItem>
                                <SelectItem value="clinic">Clinic</SelectItem>
                              </SelectContent>
                            </Select>

                            <Button
                              size="sm"
                              variant="destructive"
                              className="w-full h-8"
                              onClick={() => handleRemoveGalleryItem(index)}
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Highlight Chips - Display badges for match results */}
            <div className="pt-6 border-t border-border/50 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Highlight Badges</h3>
                <p className="text-xs text-muted-foreground">
                  Select badges to display on match results. These help differentiate clinics but don't affect matching scores.
                </p>
              </div>

              {/* Selected highlights preview */}
              {(formData.highlight_chips || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-3 bg-muted/50 rounded-lg">
                  {(formData.highlight_chips || []).map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full"
                    >
                      {getHighlightLabel(chip)}
                      <button
                        type="button"
                        onClick={() => handleHighlightToggle(chip)}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Highlight categories */}
              <div className="space-y-4">
                {HIGHLIGHT_CATEGORIES.map((category) => (
                  <div key={category.id} className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {category.label}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {category.options.map((option) => {
                        const isSelected = (formData.highlight_chips || []).includes(option.value)
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleHighlightToggle(option.value)}
                            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:border-primary/50 hover:bg-muted"
                            }`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing & Rating */}
            <div className="pt-6 border-t border-border/50 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Pricing & Rating</h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_range" className="text-sm text-foreground">
                    Price Range
                  </Label>
                  <Select
                    value={formData.price_range}
                    onValueChange={(value) => setFormData({ ...formData, price_range: value })}
                  >
                    <SelectTrigger id="price_range" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget (£)</SelectItem>
                      <SelectItem value="mid">Mid-range (££)</SelectItem>
                      <SelectItem value="premium">Premium (£££)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

<div className="space-y-2">
<div className="flex items-center justify-between">
<Label className="text-sm text-foreground flex items-center gap-2">
<Clock className="w-4 h-4" />
Opening Hours
</Label>
{clinic?.id && (
<Button
type="button"
variant="outline"
size="sm"
onClick={fetchOpeningHoursFromGoogle}
disabled={fetchingHours}
className="h-7 text-xs bg-transparent"
>
{fetchingHours ? "Fetching..." : "Fetch from Google"}
</Button>
)}
</div>

{openingHoursData && Object.keys(openingHoursData).length > 0 ? (
<Card className="p-4 bg-muted/30">
<div className="space-y-1.5 text-sm">
{Object.entries(openingHoursData).map(([day, hours]) => (
<div key={day} className="flex justify-between">
<span className="text-muted-foreground capitalize">{day}</span>
<span className="font-medium">{hours || "Closed"}</span>
</div>
))}
</div>
</Card>
) : (
<p className="text-xs text-muted-foreground">
{clinic?.id 
? "Click 'Fetch from Google' to automatically pull opening hours for this clinic."
: "Save the clinic first, then you can fetch opening hours from Google."}
</p>
)}
</div>
</div>
</div>

{/* Location */}
            <div className="pt-6 border-t border-border/50 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Location (Optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude" className="text-sm text-foreground">
                    Latitude
                  </Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: Number.parseFloat(e.target.value) || undefined })
                    }
                    placeholder="51.5074"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude" className="text-sm text-foreground">
                    Longitude
                  </Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: Number.parseFloat(e.target.value) || undefined })
                    }
                    placeholder="-0.1278"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Settings & Features */}
<div className="pt-6 border-t border-border/50 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Settings & Features</h3>
              
              <div className="space-y-1">
                {/* Verified Clinic Toggle */}
                <TooltipProvider>
                  <div className="w-full flex items-center justify-between py-3 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className={`h-4 w-4 ${formData.verified ? "text-green-600" : "text-muted-foreground"}`} />
                      <Label htmlFor="verified" className="text-sm text-foreground cursor-pointer">
                        Verified Clinic
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[280px]">
                          <p className="text-sm">
                            Verified clinics are partners with confirmed details and matching tags. 
                            They appear first in patient match results. Non-verified clinics only 
                            appear under "Load more" as directory listings.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="verified"
                      checked={formData.verified}
                      onCheckedChange={(checked) => setFormData({ ...formData, verified: checked })}
                    />
                  </div>
                </TooltipProvider>
                
                {/* Show warning if verified but not enough tags */}
                {formData.verified && selectedFilters.length < 3 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-800">
                      Verified clinics need at least 3 matching tags to appear in results. 
                      Currently: {selectedFilters.length} tags.
                    </p>
                  </div>
                )}
                
                <button
                  onClick={() => setFormData({ ...formData, is_archived: !formData.is_archived })}
                  className="w-full flex items-center justify-between py-3 border-b border-border/60 cursor-pointer"
                >
                  <Label htmlFor="is_archived" className="text-sm text-foreground cursor-pointer">
                    Archived
                  </Label>
                  <Switch
                    id="is_archived"
                    checked={formData.is_archived}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_archived: checked })}
                    onClick={(e) => e.stopPropagation()}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="border-t border-border px-6 md:px-7 py-4 bg-background">
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 h-11 bg-transparent" disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1 h-11" disabled={saving}>
              {saving ? "Saving..." : clinic ? "Save Changes" : "Create Clinic"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
