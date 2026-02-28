"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, Edit, Copy, Archive, ArchiveRestore, ImageIcon, ExternalLink, RefreshCw, AlertTriangle, Wrench, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { ClinicEditorDrawer } from "./clinic-editor-drawer"
import { ClinicInviteButton } from "./clinic-invite-button"
import { useToast } from "@/hooks/use-toast"
import { ClinicImage } from "@/components/match/clinic-image"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Clinic {
  id: string
  name: string
  address: string
  postcode: string
  phone: string
  email?: string
  website?: string
  description: string
  treatments: string[]
  price_range: string
  rating: number
  review_count: number
  latitude?: number
  longitude?: number
  images?: string[]
  featured: boolean
  verified: boolean
  accepts_nhs: boolean
  wheelchair_accessible: boolean
  parking_available: boolean
  facilities?: string[]
  opening_hours?: any
  is_archived?: boolean
  archived_at?: string | null
  city?: string
  is_live?: boolean
  notification_email?: string
  languages?: string[]
  highlight_chips?: string[]
  gallery?: { url: string; tag?: "before" | "after" | "clinic" }[]
  google_place_id?: string
  google_rating?: number
  google_review_count?: number
  google_maps_url?: string
  tag_notes?: string
  available_days?: string[]
  available_hours?: string[]
  accepts_same_day?: boolean
  created_at: string
  updated_at: string
}

interface ClinicDirectoryManagerProps {
  clinics: Clinic[]
}

export function ClinicDirectoryManager({ clinics: initialClinics }: ClinicDirectoryManagerProps) {
  const [clinics, setClinics] = useState<Clinic[]>(initialClinics)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [clinicToArchive, setClinicToArchive] = useState<{ id: string; name: string; archive: boolean } | null>(null)
  const [clinicToDelete, setClinicToDelete] = useState<{ id: string; name: string } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<"archive" | "delete" | null>(null)
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [googlePhotoIssue, setGooglePhotoIssue] = useState<{ affectedClinics: number; clinics: Array<{ id: string; name: string; googleUrlCount: number }> } | null>(null)
  const [isFixingPhotos, setIsFixingPhotos] = useState(false)
  const { toast } = useToast()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch("/api/admin/clinics")
      if (response.ok) {
        const data = await response.json()
        setClinics(data)
        toast({
          title: "Data refreshed",
          description: "Clinic data has been updated.",
        })
      }
    } catch (error) {
      console.error("Error refreshing clinics:", error)
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: "Could not refresh clinic data.",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Check for clinics with Google Places URLs on mount
  const checkGooglePhotos = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/fix-google-photos")
      if (res.ok) {
        const data = await res.json()
        if (data.affectedClinics > 0) {
          setGooglePhotoIssue({ affectedClinics: data.affectedClinics, clinics: data.clinics })
        } else {
          setGooglePhotoIssue(null)
        }
      }
    } catch {
      // Silent — this is a background check
    }
  }, [])

  useEffect(() => {
    checkGooglePhotos()
  }, [checkGooglePhotos])

  const handleFixGooglePhotos = async () => {
    setIsFixingPhotos(true)
    try {
      const res = await fetch("/api/admin/fix-google-photos", { method: "POST" })
      if (!res.ok) throw new Error("Failed to fix photos")
      const data = await res.json()

      toast({
        title: "Photos fixed",
        description: `${data.totalFixed} photos re-uploaded to permanent storage. ${data.totalFailed > 0 ? `${data.totalFailed} could not be recovered.` : ""}`,
      })

      setGooglePhotoIssue(null)
      // Refresh clinic list to show updated photos
      handleRefresh()
    } catch (error) {
      console.error("Error fixing photos:", error)
      toast({
        variant: "destructive",
        title: "Fix failed",
        description: "Could not fix Google Photos. Please try again.",
      })
    } finally {
      setIsFixingPhotos(false)
    }
  }

  const activeClinics = clinics.filter((c) => !c.is_archived && c.verified)
  const unverifiedClinics = clinics.filter((c) => !c.is_archived && !c.verified)
  const archivedClinics = clinics.filter((c) => c.is_archived)

  const filterClinics = (clinicList: Clinic[]) => {
    return clinicList.filter(
      (clinic) =>
        (clinic.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (clinic.postcode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (clinic.treatments || []).some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }

  const handleCreate = () => {
    setIsCreating(true)
    setSelectedClinic(null)
    setIsDrawerOpen(true)
  }

  const handleEdit = (clinic: Clinic) => {
    setIsCreating(false)
    setSelectedClinic(clinic)
    setIsDrawerOpen(true)
  }

  const handleDuplicate = async (clinic: Clinic) => {
    try {
      const response = await fetch("/api/admin/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...clinic,
          id: undefined,
          name: `${clinic.name} (Copy)`,
          featured: false,
          is_archived: false,
        }),
      })

      if (response.ok) {
        const newClinic = await response.json()
        setClinics([newClinic, ...clinics])
      }
    } catch (error) {
      console.error("Error duplicating clinic:", error)
      alert("Failed to duplicate clinic")
    }
  }

  const handleSave = async (updatedClinic: Clinic) => {
    if (isCreating) {
      setClinics([updatedClinic, ...clinics])
      toast({
        title: "Clinic created",
        description: `${updatedClinic.name} has been added successfully.`,
      })
    } else {
      setClinics(clinics.map((c) => (c.id === updatedClinic.id ? updatedClinic : c)))
      toast({
        title: "Clinic updated",
        description: `${updatedClinic.name} has been updated successfully.`,
      })
    }
    setIsDrawerOpen(false)
  }

  const confirmArchive = (clinicId: string, shouldArchive: boolean) => {
    const clinic = clinics.find((c) => c.id === clinicId)
    if (clinic) {
      setClinicToArchive({ id: clinicId, name: clinic.name, archive: shouldArchive })
    }
  }

  const handleArchive = async () => {
    if (!clinicToArchive) return

    const { id, archive } = clinicToArchive
    const previousClinics = [...clinics]

    setClinics((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, is_archived: archive, archived_at: archive ? new Date().toISOString() : null } : c,
      ),
    )

    toast({
      title: archive ? "Clinic archived" : "Clinic restored",
      description: `${clinicToArchive.name} has been ${archive ? "archived" : "restored"}.`,
    })

    setClinicToArchive(null)

    fetch(`/api/admin/clinics/${id}/archive`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: archive }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to archive")
        return response.json()
      })
      .catch((error) => {
        console.error("Archive failed:", error)
        setClinics(previousClinics)
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to ${archive ? "archive" : "restore"} clinic. Please try again.`,
        })
      })
  }

  const handleDeleteClinic = async () => {
    if (!clinicToDelete) return
    const { id, name } = clinicToDelete
    setClinicToDelete(null)

    try {
      const res = await fetch(`/api/admin/clinics/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setClinics((prev) => prev.filter((c) => c.id !== id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      toast({ title: "Clinic deleted", description: `${name} has been permanently deleted.` })
    } catch {
      toast({ variant: "destructive", title: "Delete failed", description: `Could not delete ${name}.` })
    }
  }

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return
    setIsBulkProcessing(true)
    const ids = Array.from(selectedIds)
    let successCount = 0

    if (bulkAction === "archive") {
      for (const id of ids) {
        try {
          const res = await fetch(`/api/admin/clinics/${id}/archive`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isArchived: true }),
          })
          if (res.ok) {
            successCount++
            setClinics((prev) =>
              prev.map((c) =>
                c.id === id ? { ...c, is_archived: true, archived_at: new Date().toISOString() } : c,
              ),
            )
          }
        } catch {
          // continue with remaining
        }
      }
      toast({
        title: "Clinics archived",
        description: `${successCount} of ${ids.length} clinics archived.`,
      })
    } else if (bulkAction === "delete") {
      for (const id of ids) {
        try {
          const res = await fetch(`/api/admin/clinics/${id}`, { method: "DELETE" })
          if (res.ok) {
            successCount++
            setClinics((prev) => prev.filter((c) => c.id !== id))
          }
        } catch {
          // continue with remaining
        }
      }
      toast({
        title: "Clinics deleted",
        description: `${successCount} of ${ids.length} clinics permanently deleted.`,
      })
    }

    setSelectedIds(new Set())
    setBulkAction(null)
    setIsBulkProcessing(false)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = (clinicList: Clinic[]) => {
    const filtered = filterClinics(clinicList)
    const allSelected = filtered.every((c) => selectedIds.has(c.id))
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filtered.forEach((c) => next.delete(c.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filtered.forEach((c) => next.add(c.id))
        return next
      })
    }
  }

  const renderClinicTable = (clinicList: Clinic[], showArchiveButton: boolean) => {
    const filtered = filterClinics(clinicList)
    const allSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id))
    const someSelected = filtered.some((c) => selectedIds.has(c.id))

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={() => toggleSelectAll(clinicList)}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Clinic</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Treatments</TableHead>
              <TableHead>Photo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((clinic) => (
              <TableRow key={clinic.id} className={selectedIds.has(clinic.id) ? "bg-blue-50/50" : ""}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(clinic.id)}
                    onCheckedChange={() => toggleSelect(clinic.id)}
                    aria-label={`Select ${clinic.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {clinic.name}
                      {clinic.featured && (
                        <Badge variant="secondary" className="text-xs">
                          Featured
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{clinic.phone}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{clinic.postcode}</div>
                    <div className="text-muted-foreground">{(clinic.address || clinic.postcode || "").split(",")[0]}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {(clinic.treatments || []).slice(0, 2).map((treatment, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {treatment}
                      </Badge>
                    ))}
                    {(clinic.treatments || []).length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{(clinic.treatments || []).length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {clinic.images?.[0] ? (
                    <div className="relative w-16 h-10 rounded overflow-hidden bg-muted">
                      <ClinicImage
                        src={clinic.images[0]}
                        alt={clinic.name}
                        fill
                        className="object-cover"
                        fallbackClassName="w-full h-full bg-muted flex items-center justify-center"
                        sizes="64px"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                      <span>None</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {clinic.verified && (
                      <Badge variant="default" className="text-xs w-fit bg-green-600">
                        Verified
                      </Badge>
                    )}
                    {clinic.accepts_nhs && (
                      <Badge variant="secondary" className="text-xs w-fit">
                        NHS
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(clinic.updated_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
<Button
                      size="sm"
                      variant="ghost"
                      asChild
                      title="View Clinic Page"
                    >
                      <Link href={`/clinic/${clinic.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <ClinicInviteButton 
                      clinicId={clinic.id} 
                      clinicName={clinic.name}
                      existingEmail={clinic.email}
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(clinic)} title="Edit Clinic">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDuplicate(clinic)} title="Duplicate Clinic">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={
                        showArchiveButton
                          ? "text-orange-600 hover:text-orange-700"
                          : "text-green-600 hover:text-green-700"
                      }
                      onClick={() => confirmArchive(clinic.id, showArchiveButton)}
                      title={showArchiveButton ? "Archive Clinic" : "Restore Clinic"}
                    >
                      {showArchiveButton ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => setClinicToDelete({ id: clinic.id, name: clinic.name })}
                      title="Delete Clinic"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No clinics found. Try adjusting your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clinics by name, postcode, or treatment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className="gap-2 bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleCreate} className="gap-2 bg-[#004443] hover:bg-[#00332e]">
            <Plus className="h-4 w-4" />
            Add Clinic
          </Button>
        </div>
      </Card>

      {googlePhotoIssue && googlePhotoIssue.affectedClinics > 0 && (
        <Card className="p-4 border-orange-300 bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800">
                {googlePhotoIssue.affectedClinics} clinic{googlePhotoIssue.affectedClinics > 1 ? "s have" : " has"} photos stored as temporary Google URLs
              </p>
              <p className="text-sm text-orange-700 mt-1">
                These photos will eventually stop loading. Click below to re-upload them to permanent storage.
              </p>
              <ul className="text-xs text-orange-600 mt-2 space-y-0.5">
                {googlePhotoIssue.clinics.slice(0, 5).map((c) => (
                  <li key={c.id}>{c.name} ({c.googleUrlCount} photo{c.googleUrlCount > 1 ? "s" : ""})</li>
                ))}
                {googlePhotoIssue.clinics.length > 5 && (
                  <li>...and {googlePhotoIssue.clinics.length - 5} more</li>
                )}
              </ul>
            </div>
            <Button
              size="sm"
              onClick={handleFixGooglePhotos}
              disabled={isFixingPhotos}
              className="gap-2 bg-orange-600 hover:bg-orange-700 shrink-0"
            >
              <Wrench className={`h-4 w-4 ${isFixingPhotos ? "animate-spin" : ""}`} />
              {isFixingPhotos ? "Fixing..." : "Fix Photos"}
            </Button>
          </div>
        </Card>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Card className="p-3 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              {selectedIds.size} clinic{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-orange-700 border-orange-300 hover:bg-orange-50"
                onClick={() => setBulkAction("archive")}
              >
                <Archive className="h-3.5 w-3.5 mr-1.5" />
                Archive Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-50"
                onClick={() => setBulkAction("delete")}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete Selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="active">Verified ({activeClinics.length})</TabsTrigger>
          <TabsTrigger value="unverified">Unverified ({unverifiedClinics.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archivedClinics.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <Card>{renderClinicTable(activeClinics, true)}</Card>
        </TabsContent>

        <TabsContent value="unverified" className="mt-6">
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Unverified clinics</strong> are listed in the directory but don&apos;t appear in matched results. 
              They are shown at the end of search results without match percentages or personalised recommendations.
            </p>
          </div>
          <Card>{renderClinicTable(unverifiedClinics, true)}</Card>
        </TabsContent>

        <TabsContent value="archived" className="mt-6">
          <Card>{renderClinicTable(archivedClinics, false)}</Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!clinicToArchive} onOpenChange={() => setClinicToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{clinicToArchive?.archive ? "Archive" : "Restore"} Clinic</AlertDialogTitle>
            <AlertDialogDescription>
              {clinicToArchive?.archive
                ? `Are you sure you want to archive "${clinicToArchive?.name}"? This clinic will no longer appear in patient searches but can be restored later.`
                : `Are you sure you want to restore "${clinicToArchive?.name}"? This clinic will appear in patient searches again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className={
                clinicToArchive?.archive ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"
              }
            >
              {clinicToArchive?.archive ? "Archive" : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single delete confirmation */}
      <AlertDialog open={!!clinicToDelete} onOpenChange={() => setClinicToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clinic</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete &quot;{clinicToDelete?.name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClinic} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk action confirmation */}
      <AlertDialog open={!!bulkAction} onOpenChange={() => setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === "archive" ? "Archive" : "Delete"} {selectedIds.size} Clinic{selectedIds.size > 1 ? "s" : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "archive"
                ? `Are you sure you want to archive ${selectedIds.size} clinic${selectedIds.size > 1 ? "s" : ""}? They will no longer appear in patient searches but can be restored later.`
                : `Are you sure you want to permanently delete ${selectedIds.size} clinic${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkAction}
              disabled={isBulkProcessing}
              className={bulkAction === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}
            >
              {isBulkProcessing ? "Processing..." : bulkAction === "archive" ? "Archive All" : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ClinicEditorDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        clinic={selectedClinic as any}
        isCreating={isCreating}
        onSave={(clinic) => handleSave(clinic as Clinic)}
      />
    </div>
  )
}
