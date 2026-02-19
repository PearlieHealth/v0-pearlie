"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Upload, Plus, X, MapPin, Phone, Mail, Globe } from "lucide-react"
import Link from "next/link"
import { clinicHref } from "@/lib/clinic-url"

const demoClinic = {
  name: "Smile Dental Clinic",
  email: "hello@smiledental.co.uk",
  phone: "020 7123 4567",
  website: "https://smiledental.co.uk",
  address: "123 High Street",
  city: "London",
  postcode: "SW1A 1AA",
  description: "Award-winning dental practice providing exceptional care for over 20 years. Our team of specialists offers a full range of treatments in a modern, comfortable environment.",
  treatments: ["Dental Implants", "Invisalign", "Teeth Whitening", "Veneers", "Root Canal", "Dental Crowns", "Bridges", "Emergency Dental Care"],
  languages: ["English", "Spanish", "Polish", "Hindi"],
  accessibility: ["Wheelchair Access", "Ground Floor", "Disabled Parking"],
  openingHours: {
    monday: "9:00 AM - 6:00 PM",
    tuesday: "9:00 AM - 6:00 PM",
    wednesday: "9:00 AM - 8:00 PM",
    thursday: "9:00 AM - 6:00 PM",
    friday: "9:00 AM - 5:00 PM",
    saturday: "10:00 AM - 2:00 PM",
    sunday: "Closed",
  },
}

export default function DemoProfilePage() {
  const [clinic, setClinic] = useState(demoClinic)

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* Demo Banner */}
      <div className="bg-blue-600 text-white px-4 py-2 text-center text-sm">
        <span className="font-medium">Demo Mode</span> - Changes will not be saved
        <Link href="/admin/clinic-users" className="ml-4 underline hover:no-underline">
          Back to Admin
        </Link>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href={clinicHref("/clinic/demo")}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clinic Profile</h1>
            <p className="text-muted-foreground">Manage your clinic information</p>
          </div>
        </div>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="treatments">Treatments</TabsTrigger>
            <TabsTrigger value="hours">Hours</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          {/* Basic Info */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Your clinic's contact details and description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div>
                  <Label>Clinic Logo</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <Button variant="outline">Upload Logo</Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Clinic Name</Label>
                    <Input id="name" value={clinic.name} className="mt-1" readOnly />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={clinic.email} className="mt-1" readOnly />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={clinic.phone} className="mt-1" readOnly />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" value={clinic.website} className="mt-1" readOnly />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={clinic.address} className="mt-1" readOnly />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={clinic.city} className="mt-1" readOnly />
                  </div>
                  <div>
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input id="postcode" value={clinic.postcode} className="mt-1" readOnly />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={clinic.description}
                    className="mt-1 min-h-[100px]"
                    readOnly
                  />
                </div>

                <Button className="w-full md:w-auto">Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Treatments */}
          <TabsContent value="treatments">
            <Card>
              <CardHeader>
                <CardTitle>Treatments & Services</CardTitle>
                <CardDescription>What services do you offer?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {clinic.treatments.map((treatment) => (
                    <Badge key={treatment} variant="secondary" className="text-sm py-1.5 px-3">
                      {treatment}
                      <X className="w-3 h-3 ml-2 cursor-pointer" />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Add a treatment..." className="flex-1" />
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hours */}
          <TabsContent value="hours">
            <Card>
              <CardHeader>
                <CardTitle>Opening Hours</CardTitle>
                <CardDescription>When is your clinic open?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(clinic.openingHours).map(([day, hours]) => (
                    <div key={day} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="font-medium capitalize">{day}</span>
                      <span className={hours === "Closed" ? "text-muted-foreground" : ""}>{hours}</span>
                    </div>
                  ))}
                </div>
                <Button className="mt-4">Edit Hours</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features */}
          <TabsContent value="features">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Languages Spoken</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {clinic.languages.map((lang) => (
                      <Badge key={lang} variant="outline" className="text-sm py-1.5 px-3">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Accessibility Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {clinic.accessibility.map((feature) => (
                      <Badge key={feature} variant="outline" className="text-sm py-1.5 px-3">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
