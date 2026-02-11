"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Loader2, AlertCircle, Building2, MapPin, Star } from "lucide-react"
import { GooglePlacesInput } from "@/components/google-places-input"

const TREATMENTS = [
  "General Dentistry",
  "Cosmetic Dentistry", 
  "Implants",
  "Invisalign",
  "Braces",
  "Veneers",
  "Whitening",
  "Composite Bonding",
  "Crowns",
  "Bridges",
  "Dentures",
  "Root Canal",
  "Sedation Dentistry",
  "Emergency Care",
]

const FACILITIES = [
  "Wheelchair Access",
  "Free Parking",
  "Evening Appointments",
  "Weekend Appointments",
  "Same-Day Appointments",
  "Payment Plans",
  "0% Finance",
  "NHS Patients Accepted",
]

const CAPACITY_OPTIONS = [
  { value: "limited", label: "Limited - A few patients per month" },
  { value: "moderate", label: "Moderate - Steady flow welcome" },
  { value: "full", label: "Full capacity - Ready for many referrals" },
]

const START_DATE_OPTIONS = [
  { value: "immediately", label: "Immediately" },
  { value: "next_month", label: "Next month" },
  { value: "next_quarter", label: "Next quarter" },
  { value: "unsure", label: "Not sure yet" },
]

interface PlaceData {
  placeId: string
  name: string
  address: string
  city: string
  postcode: string
  lat: number
  lng: number
  phone?: string
  website?: string
  rating?: number
  reviewCount?: number
}

export function ClinicWaitlistForm() {
  const [formData, setFormData] = useState({
    clinicName: "",
    ownerName: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    postcode: "",
    postcodes: "",
    treatmentsOffered: [] as string[],
    facilities: [] as string[],
    capacity: "",
    preferredStartDate: "",
    additionalInfo: "",
    // Google Places data
    googlePlaceId: "",
    latitude: 0,
    longitude: 0,
    googleRating: 0,
    googleReviewCount: 0,
  })
  const [placeSelected, setPlaceSelected] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error" | "exists">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleTreatmentToggle = (treatment: string) => {
    setFormData((prev) => ({
      ...prev,
      treatmentsOffered: prev.treatmentsOffered.includes(treatment)
        ? prev.treatmentsOffered.filter((t) => t !== treatment)
        : [...prev.treatmentsOffered, treatment],
    }))
  }

  const handleFacilityToggle = (facility: string) => {
    setFormData((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter((f) => f !== facility)
        : [...prev.facilities, facility],
    }))
  }

  const handlePlaceSelect = (place: PlaceData) => {
    setFormData((prev) => ({
      ...prev,
      clinicName: place.name,
      address: place.address,
      city: place.city,
      postcode: place.postcode,
      postcodes: place.postcode ? place.postcode.split(" ")[0] : prev.postcodes,
      phone: place.phone || prev.phone,
      website: place.website || prev.website,
      googlePlaceId: place.placeId,
      latitude: place.lat,
      longitude: place.lng,
      googleRating: place.rating || 0,
      googleReviewCount: place.reviewCount || 0,
    }))
    setPlaceSelected(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage("")

    try {
      const postcodeArray = formData.postcodes
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)

      if (postcodeArray.length === 0 && !formData.postcode) {
        setErrorMessage("Please enter at least one postcode")
        setIsSubmitting(false)
        return
      }

      const response = await fetch("/api/clinic-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicName: formData.clinicName,
          ownerName: formData.ownerName,
          email: formData.email,
          phone: formData.phone,
          website: formData.website,
          address: formData.address,
          city: formData.city,
          postcode: formData.postcode,
          postcodes: postcodeArray.length > 0 ? postcodeArray : [formData.postcode.split(" ")[0]],
          treatmentsOffered: formData.treatmentsOffered,
          facilities: formData.facilities,
          capacity: formData.capacity,
          preferredStartDate: formData.preferredStartDate,
          additionalInfo: formData.additionalInfo,
          googlePlaceId: formData.googlePlaceId,
          latitude: formData.latitude,
          longitude: formData.longitude,
          googleRating: formData.googleRating,
          googleReviewCount: formData.googleReviewCount,
        }),
      })

      const data = await response.json()

      if (data.alreadyExists) {
        setSubmitStatus("exists")
        setErrorMessage("This email is already on our waitlist. We'll be in touch soon!")
      } else if (!response.ok) {
        setSubmitStatus("error")
        setErrorMessage(data.error || "Something went wrong")
      } else {
        setSubmitStatus("success")
      }
    } catch {
      setSubmitStatus("error")
      setErrorMessage("Failed to submit application. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitStatus === "success") {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <div>
              <h3 className="text-xl font-semibold text-green-900">Application Received!</h3>
              <p className="text-green-700 mt-2">
                Thank you for your interest in joining Pearlie. We&apos;ll review your application and be in touch
                within 2-3 business days.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join the Pearlie Network</CardTitle>
        <CardDescription>
          Tell us about your practice and we&apos;ll be in touch to discuss how we can work together.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Google Places Search */}
          <div className="space-y-2">
            <Label>Find Your Clinic</Label>
            <GooglePlacesInput
              value={formData.clinicName}
              onChange={(value) => setFormData({ ...formData, clinicName: value })}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Start typing your clinic name..."
            />
            <p className="text-xs text-muted-foreground">
              Search for your clinic to auto-fill details, or enter manually below
            </p>
          </div>

          {/* Auto-filled Place Info */}
          {placeSelected && formData.googlePlaceId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900">{formData.clinicName}</p>
                  <p className="text-sm text-green-700 flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {formData.address}
                  </p>
                  {formData.googleRating > 0 && (
                    <p className="text-sm text-green-700 flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {formData.googleRating} ({formData.googleReviewCount} reviews)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manual Clinic Name (if not using Google Places) */}
          {!placeSelected && (
            <div className="space-y-2">
              <Label htmlFor="clinicNameManual">Clinic Name *</Label>
              <Input
                id="clinicNameManual"
                value={formData.clinicName}
                onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                placeholder="e.g., Smile Dental Practice"
                required
              />
            </div>
          )}

          {/* Contact Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ownerName">Your Name *</Label>
              <Input
                id="ownerName"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                placeholder="e.g., Dr. Sarah Johnson"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@clinic.co.uk"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone {placeSelected ? "(auto-filled)" : "*"}</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="020 1234 5678"
                required={!placeSelected}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.yourclinic.co.uk"
              />
            </div>
          </div>

          {/* Address Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Full Address {placeSelected ? "(auto-filled)" : "*"}</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 High Street"
                required={!placeSelected}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City {placeSelected ? "(auto-filled)" : "*"}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="London"
                  required={!placeSelected}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode {placeSelected ? "(auto-filled)" : "*"}</Label>
                <Input
                  id="postcode"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  placeholder="SW1A 1AA"
                  required={!placeSelected}
                />
              </div>
            </div>
          </div>

          {/* Coverage Area */}
          <div className="space-y-2">
            <Label htmlFor="postcodes">Additional Postcodes You Serve</Label>
            <Input
              id="postcodes"
              value={formData.postcodes}
              onChange={(e) => setFormData({ ...formData, postcodes: e.target.value })}
              placeholder="e.g., SW1, SW3, W1, EC1 (comma separated)"
            />
            <p className="text-sm text-muted-foreground">
              Enter additional postcode areas you serve beyond your main location
            </p>
          </div>

          {/* Treatments */}
          <div className="space-y-3">
            <Label>Treatments Offered</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TREATMENTS.map((treatment) => (
                <div key={treatment} className="flex items-center space-x-2">
                  <Checkbox
                    id={treatment}
                    checked={formData.treatmentsOffered.includes(treatment)}
                    onCheckedChange={() => handleTreatmentToggle(treatment)}
                  />
                  <label htmlFor={treatment} className="text-sm font-medium leading-none cursor-pointer">
                    {treatment}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Facilities & Features */}
          <div className="space-y-3">
            <Label>Facilities & Features</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {FACILITIES.map((facility) => (
                <div key={facility} className="flex items-center space-x-2">
                  <Checkbox
                    id={facility}
                    checked={formData.facilities.includes(facility)}
                    onCheckedChange={() => handleFacilityToggle(facility)}
                  />
                  <label htmlFor={facility} className="text-sm font-medium leading-none cursor-pointer">
                    {facility}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Capacity & Start Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="capacity">Current Capacity</Label>
              <Select
                value={formData.capacity}
                onValueChange={(value) => setFormData({ ...formData, capacity: value })}
              >
                <SelectTrigger id="capacity">
                  <SelectValue placeholder="Select capacity" />
                </SelectTrigger>
                <SelectContent>
                  {CAPACITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">When would you like to start?</Label>
              <Select
                value={formData.preferredStartDate}
                onValueChange={(value) => setFormData({ ...formData, preferredStartDate: value })}
              >
                <SelectTrigger id="startDate">
                  <SelectValue placeholder="Select timing" />
                </SelectTrigger>
                <SelectContent>
                  {START_DATE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-2">
            <Label htmlFor="additionalInfo">Anything else you&apos;d like us to know?</Label>
            <Textarea
              id="additionalInfo"
              value={formData.additionalInfo}
              onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
              placeholder="Tell us about your practice, specialties, or any questions..."
              rows={3}
            />
          </div>

          {/* Error Message */}
          {(submitStatus === "error" || submitStatus === "exists") && errorMessage && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-md">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By submitting, you agree to be contacted about joining the Pearlie network. We&apos;ll never share your
            information with third parties.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
