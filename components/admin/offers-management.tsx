"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Tag } from "lucide-react"
import { useRouter } from "next/navigation"

interface Offer {
  id: string
  clinic_id: string
  title: string
  subtitle?: string
  indicative_price?: string
  saving_text?: string
  valid_until?: string
  active: boolean
  priority: number
  created_at: string
}

interface Clinic {
  id: string
  name: string
}

interface OffersManagementProps {
  offers: Offer[]
  clinics: Clinic[]
}

export function OffersManagement({ offers: initialOffers, clinics }: OffersManagementProps) {
  const router = useRouter()
  const [offers, setOffers] = useState(initialOffers)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    clinic_id: "",
    title: "",
    subtitle: "",
    indicative_price: "",
    saving_text: "",
    valid_until: "",
    active: true,
    priority: 1,
  })

  const handleAddOffer = () => {
    setEditingOffer(null)
    setFormData({
      clinic_id: "",
      title: "",
      subtitle: "",
      indicative_price: "",
      saving_text: "",
      valid_until: "",
      active: true,
      priority: 1,
    })
    setIsDialogOpen(true)
  }

  const handleEditOffer = (offer: Offer) => {
    setEditingOffer(offer)
    setFormData({
      clinic_id: offer.clinic_id,
      title: offer.title,
      subtitle: offer.subtitle || "",
      indicative_price: offer.indicative_price || "",
      saving_text: offer.saving_text || "",
      valid_until: offer.valid_until || "",
      active: offer.active,
      priority: offer.priority,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = editingOffer ? `/api/admin/offers/${editingOffer.id}` : "/api/admin/offers"
      const method = editingOffer ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to save offer")

      setIsDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Error saving offer:", error)
      alert("Failed to save offer. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return

    try {
      const response = await fetch(`/api/admin/offers/${offerId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete offer")

      setOffers(offers.filter((o) => o.id !== offerId))
      router.refresh()
    } catch (error) {
      console.error("Error deleting offer:", error)
      alert("Failed to delete offer. Please try again.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Manage Offers</CardTitle>
            <CardDescription>Add and edit limited-time clinic offers</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddOffer}>
                <Plus className="w-4 h-4 mr-2" />
                Add Offer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingOffer ? "Edit Offer" : "Add New Offer"}</DialogTitle>
                <DialogDescription>
                  {editingOffer ? "Update the offer details" : "Create a new limited-time offer"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clinic_id">Clinic *</Label>
                  <Select
                    value={formData.clinic_id}
                    onValueChange={(value) => setFormData({ ...formData, clinic_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a clinic" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinics.map((clinic) => (
                        <SelectItem key={clinic.id} value={clinic.id}>
                          {clinic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Teeth Whitening"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="e.g., In-chair whitening"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="indicative_price">Price</Label>
                    <Input
                      id="indicative_price"
                      value={formData.indicative_price}
                      onChange={(e) => setFormData({ ...formData, indicative_price: e.target.value })}
                      placeholder="e.g., From £199"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="saving_text">Saving Text</Label>
                    <Input
                      id="saving_text"
                      value={formData.saving_text}
                      onChange={(e) => setFormData({ ...formData, saving_text: e.target.value })}
                      placeholder="e.g., Save £50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valid_until">Valid Until</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: Number.parseInt(e.target.value) })}
                      min="1"
                      max="100"
                    />
                    <p className="text-xs text-muted-foreground">Higher numbers appear first</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded border-input"
                  />
                  <Label htmlFor="active" className="cursor-pointer">
                    Active (visible on website)
                  </Label>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : editingOffer ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {offers.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No offers yet. Add your first offer to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => {
              const clinic = clinics.find((c) => c.id === offer.clinic_id)
              return (
                <div key={offer.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{offer.title}</h3>
                        <Badge variant={offer.active ? "default" : "secondary"}>
                          {offer.active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">Priority: {offer.priority}</Badge>
                      </div>
                      {offer.subtitle && <p className="text-sm text-muted-foreground mb-2">{offer.subtitle}</p>}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium">{clinic?.name || "Unknown Clinic"}</span>
                        {offer.indicative_price && (
                          <span className="text-muted-foreground">{offer.indicative_price}</span>
                        )}
                        {offer.saving_text && <span className="text-green-600">{offer.saving_text}</span>}
                      </div>
                      {offer.valid_until && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Valid until: {new Date(offer.valid_until).toLocaleDateString("en-GB")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => handleEditOffer(offer)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteOffer(offer.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
