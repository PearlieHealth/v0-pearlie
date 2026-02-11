"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, X, Search, Loader2, MapPin, ExternalLink } from "lucide-react"
import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

type Clinic = {
  id: string
  name: string
  address: string
  postcode: string
  phone: string
  email: string
  website: string
  description: string
  verified: boolean
  accepts_nhs: boolean
  price_range: string
  treatments: string[]
  facilities: string[]
  wheelchair_accessible: boolean
  parking_available: boolean
  latitude?: number
  longitude?: number
  images?: string[]
  opening_hours?: Record<string, string>
  [key: string]: any
}

type PlaceSuggestion = {
  placeId: string
  primaryText: string
  secondaryText: string
}

type PlaceDetails = {
  name: string
  address: string
  phone: string
  website: string
  location: { lat: number; lng: number } | null
  openingHours: Record<string, string>
  rating: number | null
  photos: { url: string; attribution: string }[]
}

export function ClinicManagement({ clinics }: { clinics: Clinic[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  // Google Places autocomplete state
  const [placeSearchQuery, setPlaceSearchQuery] = useState("")
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isFetchingDetails, setIsFetchingDetails] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const sessionTokenRef = useRef<string | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Photo state
  const [placePhotos, setPlacePhotos] = useState<{ url: string; attribution: string }[]>([])
  const [lastDeletedPhoto, setLastDeletedPhoto] = useState<{ photo: { url: string; attribution: string }; index: number } | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    postcode: "",
    city: "",
    phone: "",
    email: "",
    website: "",
    description: "",
    verified: false,
    accepts_nhs: false,
    price_range: "",
    wheelchair_accessible: false,
    parking_available: false,
    latitude: "",
    longitude: "",
    images: [] as string[],
    opening_hours: {} as Record<string, string>,
  })

  const [newImageUrl, setNewImageUrl] = useState("")

  const filteredClinics = clinics.filter(
    (clinic) =>
      clinic.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.postcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.address?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Generate session token on search input focus
  const generateSessionToken = useCallback(() => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = crypto.randomUUID()
    }
    return sessionTokenRef.current
  }, [])

  // Clear session token
  const clearSessionToken = useCallback(() => {
    sessionTokenRef.current = null
  }, [])

  // Debounced search for places
  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 3) {
      setPlaceSuggestions([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch("/api/places/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          sessionToken: generateSessionToken(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to search places")
      }

      const data = await response.json()
      setPlaceSuggestions(data.suggestions || [])
      setShowSuggestions(true)
    } catch (error) {
      console.error("Places search error:", error)
      toast({
        title: "Search failed",
        description: "Could not search for clinics. Please try again.",
        variant: "destructive",
      })
      setPlaceSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }, [generateSessionToken, toast])

  // Handle search input change with debounce
  const handlePlaceSearchChange = useCallback((value: string) => {
    setPlaceSearchQuery(value)
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      searchPlaces(value)
    }, 300)
  }, [searchPlaces])

  // Fetch place details when a suggestion is selected
  const handleSelectSuggestion = useCallback(async (suggestion: PlaceSuggestion) => {
    setShowSuggestions(false)
    setPlaceSearchQuery(suggestion.primaryText)
    setIsFetchingDetails(true)

    try {
      const response = await fetch("/api/places/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: suggestion.placeId,
          sessionToken: sessionTokenRef.current,
          maxPhotos: 5,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch clinic details")
      }

      const details: PlaceDetails = await response.json()

      // Parse address to extract postcode and city
      let postcode = ""
      let city = ""
      if (details.address) {
        // UK postcode pattern
        const postcodeMatch = details.address.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}/i)
        if (postcodeMatch) {
          postcode = postcodeMatch[0].toUpperCase()
        }
        // Try to extract city (usually before postcode in UK addresses)
        const addressParts = details.address.split(",").map(p => p.trim())
        if (addressParts.length >= 2) {
          // City is often second-to-last or third-to-last part
          const cityCandidate = addressParts[addressParts.length - 2]
          if (cityCandidate && !cityCandidate.match(/[A-Z]{1,2}[0-9]/i)) {
            city = cityCandidate
          }
        }
      }

      // Slice photos to max 3
      const limitedPhotos = (details.photos || []).slice(0, 3)

      // Generate new description based on new clinic data
      const newDescription = details.address 
        ? `Dental practice located at ${details.address}` 
        : ""

      // Update form data with fetched details - replace all fields, don't keep old values
      setFormData(prev => ({
        ...prev,
        name: details.name || "",
        address: details.address || "",
        postcode: postcode || "",
        city: city || "",
        phone: details.phone || "",
        website: details.website || "",
        description: newDescription,
        latitude: details.location?.lat?.toString() || "",
        longitude: details.location?.lng?.toString() || "",
        opening_hours: details.openingHours || {},
        images: limitedPhotos.map(p => p.url),
        // Also reset these fields for new clinics
        rating: details.rating || undefined,
        review_count: details.reviewCount || undefined,
      }))

      // Set photos for grid display (max 3)
      setPlacePhotos(limitedPhotos)
      setLastDeletedPhoto(null)

      // Clear session token after successful selection
      clearSessionToken()

      toast({
        title: "Clinic details loaded",
        description: "Form has been auto-filled. You can edit any field before saving.",
      })
    } catch (error) {
      console.error("Error fetching place details:", error)
      toast({
        title: "Failed to load details",
        description: "Could not fetch clinic details. Please enter manually.",
        variant: "destructive",
      })
    } finally {
      setIsFetchingDetails(false)
    }
  }, [clearSessionToken, toast])

  // Handle dialog close - clear session token
  const handleDialogChange = useCallback((open: boolean) => {
    setIsAddDialogOpen(open)
    if (!open) {
      clearSessionToken()
      setPlaceSearchQuery("")
      setPlaceSuggestions([])
      setPlacePhotos([])
      setLastDeletedPhoto(null)
    }
  }, [clearSessionToken])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      postcode: "",
      city: "",
      phone: "",
      email: "",
      website: "",
      description: "",
      verified: false,
      accepts_nhs: false,
      price_range: "",
      wheelchair_accessible: false,
      parking_available: false,
      latitude: "",
      longitude: "",
      images: [],
      opening_hours: {},
    })
    setNewImageUrl("")
    setEditingClinic(null)
    setPlaceSearchQuery("")
    setPlaceSuggestions([])
    setPlacePhotos([])
    setLastDeletedPhoto(null)
    clearSessionToken()
  }

  const handleEdit = (clinic: Clinic) => {
    setEditingClinic(clinic)
    setFormData({
      name: clinic.name || "",
      address: clinic.address || "",
      postcode: clinic.postcode || "",
      city: "",
      phone: clinic.phone || "",
      email: clinic.email || "",
      website: clinic.website || "",
      description: clinic.description || "",
      verified: clinic.verified || false,
      accepts_nhs: clinic.accepts_nhs || false,
      price_range: clinic.price_range || "",
      wheelchair_accessible: clinic.wheelchair_accessible || false,
      parking_available: clinic.parking_available || false,
      latitude: clinic.latitude?.toString() || "",
      longitude: clinic.longitude?.toString() || "",
      images: clinic.images || [],
      opening_hours: clinic.opening_hours || {},
    })
    setPlacePhotos(clinic.images?.map(url => ({ url, attribution: "" })) || [])
  }

  const addImage = () => {
    if (newImageUrl.trim()) {
      setFormData({ ...formData, images: [...formData.images, newImageUrl.trim()] })
      setNewImageUrl("")
    }
  }

  const removeImage = (index: number) => {
    const deletedPhoto = placePhotos[index]
    const deletedUrl = formData.images[index]
    
    // Store deleted photo for undo
    if (deletedPhoto) {
      setLastDeletedPhoto({ photo: deletedPhoto, index })
    }
    
    // Remove from both arrays
    const newImages = formData.images.filter((_, i) => i !== index)
    const newPhotos = placePhotos.filter((_, i) => i !== index)
    
    setFormData({ ...formData, images: newImages })
    setPlacePhotos(newPhotos)
    
    // Show undo toast
    toast({
      title: "Photo removed",
      description: "The photo has been removed from the clinic.",
      action: deletedPhoto ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Restore photo at original position
            const restoredImages = [...newImages]
            const restoredPhotos = [...newPhotos]
            restoredImages.splice(index, 0, deletedUrl)
            restoredPhotos.splice(index, 0, deletedPhoto)
            setFormData(prev => ({ ...prev, images: restoredImages }))
            setPlacePhotos(restoredPhotos)
            setLastDeletedPhoto(null)
            toast({ title: "Photo restored" })
          }}
        >
          Undo
        </Button>
      ) : undefined,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = editingClinic ? `/api/admin/clinics/${editingClinic.id}` : "/api/admin/clinics"
      const method = editingClinic ? "PUT" : "POST"

      const submitData = {
        ...formData,
        latitude: formData.latitude ? Number.parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? Number.parseFloat(formData.longitude) : null,
        images: formData.images,
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) throw new Error("Failed to save clinic")

      handleDialogChange(false)
      resetForm()
      router.refresh()
      
      toast({
        title: editingClinic ? "Clinic updated" : "Clinic added",
        description: `${formData.name} has been saved successfully.`,
      })
    } catch (error) {
      console.error("Error saving clinic:", error)
      toast({
        title: "Failed to save clinic",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (clinicId: string) => {
    if (!confirm("Are you sure you want to delete this clinic?")) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/clinics/${clinicId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete clinic")

      router.refresh()
      toast({
        title: "Clinic deleted",
        description: "The clinic has been removed.",
      })
    } catch (error) {
      console.error("Error deleting clinic:", error)
      toast({
        title: "Failed to delete clinic",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Clinic Management</CardTitle>
            <CardDescription>Add, edit, or remove dental clinics from your database</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Clinic
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingClinic ? "Edit Clinic" : "Add New Clinic"}</DialogTitle>
                <DialogDescription>
                  {editingClinic ? "Update the clinic information below" : "Search for a clinic or enter details manually"}
                </DialogDescription>
              </DialogHeader>

              {/* Google Places Search */}
              {!editingClinic && (
                <div className="space-y-2 pb-4 border-b">
                  <Label htmlFor="placeSearch">Search for Clinic</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      id="placeSearch"
                      placeholder="Search dental clinics by name or address..."
                      value={placeSearchQuery}
                      onChange={(e) => handlePlaceSearchChange(e.target.value)}
                      onFocus={generateSessionToken}
                      className="pl-10 pr-10"
                      autoComplete="off"
                    />
                    {(isSearching || isFetchingDetails) && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Suggestions Dropdown */}
                  {showSuggestions && placeSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full max-w-[calc(100%-3rem)] mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {placeSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.placeId}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-muted flex items-start gap-3 border-b last:border-b-0"
                          onClick={() => handleSelectSuggestion(suggestion)}
                        >
                          <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div>
                            <div className="font-medium text-sm">{suggestion.primaryText}</div>
                            <div className="text-xs text-muted-foreground">{suggestion.secondaryText}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {showSuggestions && placeSearchQuery.length >= 3 && placeSuggestions.length === 0 && !isSearching && (
                    <p className="text-sm text-muted-foreground">No clinics found. Try a different search or enter details manually.</p>
                  )}
                </div>
              )}

              {/* Photo Grid */}
              {placePhotos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Clinic Photos ({placePhotos.length}/3)</Label>
                    <span className="text-xs text-muted-foreground">Click X to remove a photo</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {placePhotos.map((photo, index) => (
                      <div key={photo.url} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                          <img
                            src={photo.url || "/placeholder.svg"}
                            alt={`Clinic photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                          onClick={() => removeImage(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        {photo.attribution && (
                          <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate" dangerouslySetInnerHTML={{ __html: photo.attribution }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Clinic Name *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode *</Label>
                    <Input
                      id="postcode"
                      required
                      value={formData.postcode}
                      onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      placeholder="51.5074"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      placeholder="-0.1278"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </div>
                </div>

                {/* Opening Hours Display */}
                {Object.keys(formData.opening_hours).length > 0 && (
                  <div className="space-y-2">
                    <Label>Opening Hours</Label>
                    <div className="grid grid-cols-2 gap-2 text-sm bg-muted p-3 rounded-md">
                      {Object.entries(formData.opening_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between">
                          <span className="font-medium">{day}:</span>
                          <span className="text-muted-foreground">{hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Additional Images</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter image URL"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addImage())}
                    />
                    <Button type="button" onClick={addImage} size="sm">
                      Add
                    </Button>
                  </div>
                  {formData.images.length > 0 && (
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {formData.images.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url || "/placeholder.svg"}
                            alt={`Preview ${index + 1}`}
                            className="w-full aspect-square object-cover rounded"
                          />
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon"
                            className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_range">Price Range</Label>
                  <Input
                    id="price_range"
                    placeholder="e.g., ££-£££"
                    value={formData.price_range}
                    onChange={(e) => setFormData({ ...formData, price_range: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verified"
                      checked={formData.verified}
                      onCheckedChange={(checked) => setFormData({ ...formData, verified: checked as boolean })}
                    />
                    <Label htmlFor="verified" className="cursor-pointer">
                      Verified Clinic
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="accepts_nhs"
                      checked={formData.accepts_nhs}
                      onCheckedChange={(checked) => setFormData({ ...formData, accepts_nhs: checked as boolean })}
                    />
                    <Label htmlFor="accepts_nhs" className="cursor-pointer">
                      Accepts NHS
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="wheelchair_accessible"
                      checked={formData.wheelchair_accessible}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, wheelchair_accessible: checked as boolean })
                      }
                    />
                    <Label htmlFor="wheelchair_accessible" className="cursor-pointer">
                      Wheelchair Accessible
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="parking_available"
                      checked={formData.parking_available}
                      onCheckedChange={(checked) => setFormData({ ...formData, parking_available: checked as boolean })}
                    />
                    <Label htmlFor="parking_available" className="cursor-pointer">
                      Parking Available
                    </Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || isFetchingDetails}>
                    {isSubmitting ? "Saving..." : editingClinic ? "Update Clinic" : "Add Clinic"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="pt-4">
          <Input
            placeholder="Search by clinic name, postcode, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredClinics.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {searchTerm ? "No matching clinics found" : "No clinics yet"}
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clinic Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClinics.map((clinic) => (
                  <TableRow key={clinic.id}>
                    <TableCell className="font-medium">{clinic.name}</TableCell>
                    <TableCell>
                      {clinic.address}
                      <br />
                      <span className="text-sm text-muted-foreground">{clinic.postcode}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{clinic.phone}</div>
                      <div className="text-sm text-muted-foreground">{clinic.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {clinic.verified && <Badge variant="default">Verified</Badge>}
                        {clinic.accepts_nhs && <Badge variant="secondary">NHS</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/clinic/${clinic.id}`, '_blank')}
                          title="View Clinic Page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handleEdit(clinic)
                            setIsAddDialogOpen(true)
                          }}
                          title="Edit Clinic"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(clinic.id)}
                          disabled={isSubmitting}
                          title="Delete Clinic"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
