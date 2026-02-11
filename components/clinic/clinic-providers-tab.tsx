"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
  Award,
  ImagePlus,
  X,
  ChevronUp,
  ChevronDown,
  Save,
  UserRound,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

interface EducationEntry {
  degree: string
  institution: string
}

interface CertificationEntry {
  name: string
  date?: string
}

interface Provider {
  id: string
  clinic_id: string
  name: string
  photo_url: string | null
  bio: string | null
  education: EducationEntry[]
  certifications: CertificationEntry[]
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export function ClinicProvidersTab() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Provider>>({})

  const fetchProviders = useCallback(async () => {
    try {
      const response = await fetch("/api/clinic/providers")
      if (!response.ok) return
      const { providers } = await response.json()
      setProviders(providers || [])
    } catch {
      toast.error("Failed to load providers")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  const handleAddProvider = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/clinic/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Provider" }),
      })
      if (response.ok) {
        const { provider } = await response.json()
        setProviders((prev) => [...prev, provider])
        setEditingId(provider.id)
        setEditForm(provider)
        toast.success("Provider added")
      } else {
        toast.error("Failed to add provider")
      }
    } catch {
      toast.error("Failed to add provider")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    if (!editingId || !editForm) return
    setIsSaving(true)
    try {
      const response = await fetch("/api/clinic/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          name: editForm.name,
          photo_url: editForm.photo_url,
          bio: editForm.bio,
          education: editForm.education,
          certifications: editForm.certifications,
          is_active: editForm.is_active,
        }),
      })
      if (response.ok) {
        const { provider } = await response.json()
        setProviders((prev) => prev.map((p) => (p.id === provider.id ? provider : p)))
        setEditingId(null)
        setEditForm({})
        toast.success("Provider updated")
      } else {
        toast.error("Failed to update provider")
      }
    } catch {
      toast.error("Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this provider?")) return
    try {
      const response = await fetch(`/api/clinic/providers?id=${id}`, { method: "DELETE" })
      if (response.ok) {
        setProviders((prev) => prev.filter((p) => p.id !== id))
        if (editingId === id) {
          setEditingId(null)
          setEditForm({})
        }
        toast.success("Provider removed")
      } else {
        toast.error("Failed to remove provider")
      }
    } catch {
      toast.error("Failed to remove provider")
    }
  }

  const handlePhotoUpload = async (file: File) => {
    // Client-side validation
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload a JPEG, PNG, or WEBP image.")
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB for provider photos
    if (file.size > maxSize) {
      toast.error(`Photo is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`)
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "provider")

      const response = await fetch("/api/clinics/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok && data.url) {
        setEditForm((prev) => ({ ...prev, photo_url: data.url }))
        toast.success("Photo uploaded successfully")
      } else {
        toast.error(data.error || "Failed to upload photo. Please try again.")
      }
    } catch {
      toast.error("Upload failed. Please check your connection and try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const startEditing = (provider: Provider) => {
    setEditingId(provider.id)
    setEditForm({
      ...provider,
      education: provider.education || [],
      certifications: provider.certifications || [],
    })
  }

  const addEducation = () => {
    setEditForm((prev) => ({
      ...prev,
      education: [...(prev.education || []), { degree: "", institution: "" }],
    }))
  }

  const removeEducation = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      education: (prev.education || []).filter((_, i) => i !== index),
    }))
  }

  const updateEducation = (index: number, field: keyof EducationEntry, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      education: (prev.education || []).map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    }))
  }

  const addCertification = () => {
    setEditForm((prev) => ({
      ...prev,
      certifications: [...(prev.certifications || []), { name: "", date: "" }],
    }))
  }

  const removeCertification = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      certifications: (prev.certifications || []).filter((_, i) => i !== index),
    }))
  }

  const updateCertification = (index: number, field: keyof CertificationEntry, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      certifications: (prev.certifications || []).map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      ),
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Providers</h2>
          <p className="text-sm text-muted-foreground">
            Add your dentists and specialists. These will appear on your public profile.
          </p>
        </div>
        <Button onClick={handleAddProvider} disabled={isSaving} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {/* Empty state */}
      {providers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <UserRound className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-1">No providers yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              Add your dentists and specialists so patients can learn about your team before booking.
            </p>
            <Button onClick={handleAddProvider} disabled={isSaving} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Your First Provider
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Provider cards */}
      {providers.map((provider) => {
        const isEditing = editingId === provider.id

        return (
          <Card key={provider.id} className={!provider.is_active ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="h-12 w-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
                    {provider.photo_url ? (
                      <img
                        src={provider.photo_url || "/placeholder.svg"}
                        alt={provider.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <UserRound className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                    {!provider.is_active && (
                      <span className="text-xs text-muted-foreground">Hidden from public profile</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 bg-transparent"
                        onClick={() => startEditing(provider)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit Profile
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(provider.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs bg-transparent"
                        onClick={() => {
                          setEditingId(null)
                          setEditForm({})
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>

            {isEditing && (
              <CardContent className="space-y-6 border-t pt-6">
                {/* Basic Info */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Name</Label>
                    <Input
                      value={editForm.name || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Dr. Sarah Jones"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Visible on Profile</Label>
                    <div className="flex items-center gap-2 pt-1">
                      <Switch
                        checked={editForm.is_active ?? true}
                        onCheckedChange={(checked) =>
                          setEditForm((prev) => ({ ...prev, is_active: checked }))
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {editForm.is_active ? "Shown to patients" : "Hidden"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Photo */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Photo</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-full bg-muted overflow-hidden flex-shrink-0 border-2 border-dashed border-muted-foreground/30">
                      {editForm.photo_url ? (
                        <img
                          src={editForm.photo_url || "/placeholder.svg"}
                          alt="Provider"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <UserRound className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handlePhotoUpload(file)
                            // Reset the input so the same file can be re-selected
                            e.target.value = ""
                          }}
                        />
                        <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border rounded-md transition-colors ${isUploading ? "opacity-60 cursor-wait" : "hover:bg-muted cursor-pointer"}`}>
                          {isUploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ImagePlus className="h-3.5 w-3.5" />
                          )}
                          {isUploading ? "Uploading..." : editForm.photo_url ? "Change Photo" : "Upload Photo"}
                        </span>
                      </label>
                      <p className="text-xs text-muted-foreground">JPEG, PNG, or WEBP. Max 5MB.</p>
                      {editForm.photo_url && (
                        <button
                          type="button"
                          className="block text-xs text-destructive hover:underline"
                          onClick={() => setEditForm((prev) => ({ ...prev, photo_url: null }))}
                        >
                          Remove photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Biography</Label>
                  <Textarea
                    rows={4}
                    value={editForm.bio || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell patients about this provider's experience, specialisations, and approach..."
                    className="text-sm"
                  />
                </div>

                {/* Education */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4" />
                      Education
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 bg-transparent"
                      onClick={addEducation}
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                  {(editForm.education || []).length === 0 && (
                    <p className="text-xs text-muted-foreground">No education entries yet.</p>
                  )}
                  {(editForm.education || []).map((edu, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1 grid sm:grid-cols-2 gap-2">
                        <Input
                          value={edu.degree}
                          onChange={(e) => updateEducation(i, "degree", e.target.value)}
                          placeholder="Degree (e.g. BDS, DDS)"
                          className="text-sm h-9"
                        />
                        <Input
                          value={edu.institution}
                          onChange={(e) => updateEducation(i, "institution", e.target.value)}
                          placeholder="Institution"
                          className="text-sm h-9"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => removeEducation(i)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Certifications */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Award className="h-4 w-4" />
                      Certifications
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 bg-transparent"
                      onClick={addCertification}
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                  {(editForm.certifications || []).length === 0 && (
                    <p className="text-xs text-muted-foreground">No certifications yet.</p>
                  )}
                  {(editForm.certifications || []).map((cert, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1 grid sm:grid-cols-2 gap-2">
                        <Input
                          value={cert.name}
                          onChange={(e) => updateCertification(i, "name", e.target.value)}
                          placeholder="Certification name"
                          className="text-sm h-9"
                        />
                        <Input
                          value={cert.date || ""}
                          onChange={(e) => updateCertification(i, "date", e.target.value)}
                          placeholder="Date (e.g. Jan 2020)"
                          className="text-sm h-9"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => removeCertification(i)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}

            {/* Read-only preview when not editing */}
            {!isEditing && (provider.bio || (provider.education && provider.education.length > 0) || (provider.certifications && provider.certifications.length > 0)) && (
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground space-y-2">
                  {provider.bio && (
                    <p className="line-clamp-2">{provider.bio}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {(provider.education || []).map((edu, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                        <GraduationCap className="h-3 w-3" />
                        {edu.degree}{edu.institution ? ` - ${edu.institution}` : ""}
                      </span>
                    ))}
                    {(provider.certifications || []).map((cert, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
                        <Award className="h-3 w-3" />
                        {cert.name}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
