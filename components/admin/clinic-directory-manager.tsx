"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, Edit, Copy, Archive, ArchiveRestore, ImageIcon, ExternalLink, RefreshCw, AlertTriangle, Wrench, Trash2, Star, Clock, Mail, Filter, FileText } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

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
  treatment_prices?: { category: string; treatments: { name: string; price: string; description: string }[] }[]
  show_treatment_prices?: boolean
  created_at: string
  updated_at: string
}

interface BulkProgressResult {
  clinicId: string
  clinicName: string
  status: string
  error?: string
  googleRating?: number
  googleReviewCount?: number
}

interface ClinicDirectoryManagerProps {
  clinics: Clinic[]
}

type FilterKey = "no_email" | "no_google" | "no_hours" | "no_photos" | "no_treatments" | "no_description" | "no_prices"

const FILTER_LABELS: Record<FilterKey, string> = {
  no_email: "No Email",
  no_google: "No Google Link",
  no_hours: "No Opening Hours",
  no_photos: "No Photos",
  no_treatments: "No Treatments",
  no_prices: "No Treatment Prices",
  no_description: "No / Generic Description",
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
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState("active")
  // Bulk Google link / fetch hours
  const [bulkGoogleProgress, setBulkGoogleProgress] = useState<{
    open: boolean
    type: "google-link" | "fetch-hours" | "fetch-reviews" | "generate-descriptions"
    total: number
    processed: number
    results: BulkProgressResult[]
    done: boolean
  } | null>(null)
  const { toast } = useToast()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch("/api/admin/clinics")
      if (response.ok) {
        const data = await response.json()
        setClinics(data.clinics || data)
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

  const matchesFilter = (clinic: Clinic): boolean => {
    if (activeFilters.size === 0) return true
    for (const filter of activeFilters) {
      switch (filter) {
        case "no_email":
          if (!clinic.email && !clinic.notification_email) return true
          break
        case "no_google":
          if (!clinic.google_place_id) return true
          break
        case "no_hours":
          if (!clinic.opening_hours || Object.keys(clinic.opening_hours).length === 0) return true
          break
        case "no_photos":
          if (!clinic.images || clinic.images.length === 0) return true
          break
        case "no_treatments":
          if (!clinic.treatments || clinic.treatments.length === 0) return true
          break
        case "no_prices": {
          const hasPrices = clinic.treatment_prices?.some((cat) =>
            cat.treatments?.some((t) => t.price && t.price.trim() !== "")
          )
          if (!hasPrices) return true
          break
        }
        case "no_description":
          if (!clinic.description || clinic.description.trim().length < 10 || clinic.description.startsWith("Dental practice located at")) return true
          break
      }
    }
    return activeFilters.size === 0
  }

  const filterClinics = (clinicList: Clinic[]) => {
    return clinicList.filter((clinic) => {
      const matchesSearch =
        (clinic.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (clinic.postcode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (clinic.treatments || []).some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesActiveFilter = matchesFilter(clinic)

      return matchesSearch && matchesActiveFilter
    })
  }

  const toggleFilter = (filter: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(filter)) next.delete(filter)
      else next.add(filter)
      return next
    })
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

  const handleBulkGoogleLink = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setBulkGoogleProgress({
      open: true,
      type: "google-link",
      total: ids.length,
      processed: 0,
      results: [],
      done: false,
    })

    try {
      const res = await fetch("/api/admin/clinics/bulk-google-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicIds: ids }),
      })

      if (!res.ok) throw new Error("Bulk link failed")
      const data = await res.json()

      // Update local state with new Google data
      for (const result of data.results) {
        if (result.status === "linked") {
          setClinics((prev) =>
            prev.map((c) =>
              c.id === result.clinicId
                ? {
                    ...c,
                    google_place_id: "linked",
                    google_rating: result.googleRating,
                    google_review_count: result.googleReviewCount,
                  }
                : c,
            ),
          )
        }
      }

      setBulkGoogleProgress((prev) =>
        prev
          ? {
              ...prev,
              processed: data.summary.total,
              results: data.results,
              done: true,
            }
          : null,
      )

      const { linked, alreadyLinked, notFound, failed } = data.summary
      toast({
        title: "Bulk Google link complete",
        description: `Linked: ${linked}, Already linked: ${alreadyLinked}, Not found: ${notFound}, Failed: ${failed}`,
      })
    } catch (error) {
      console.error("Bulk Google link error:", error)
      setBulkGoogleProgress((prev) => (prev ? { ...prev, done: true } : null))
      toast({
        variant: "destructive",
        title: "Bulk link failed",
        description: "Could not complete bulk Google linking.",
      })
    }
  }

  const handleBulkFetchHours = async (overrideIds?: string[]) => {
    const ids = overrideIds || Array.from(selectedIds)
    if (ids.length === 0) return

    setBulkGoogleProgress({
      open: true,
      type: "fetch-hours",
      total: ids.length,
      processed: 0,
      results: [],
      done: false,
    })

    try {
      const res = await fetch("/api/admin/clinics/bulk-fetch-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicIds: ids }),
      })

      if (!res.ok) throw new Error("Bulk fetch hours failed")
      const data = await res.json()

      // Update local state
      for (const result of data.results) {
        if (result.status === "updated") {
          setClinics((prev) =>
            prev.map((c) =>
              c.id === result.clinicId ? { ...c, opening_hours: { updated: true } } : c,
            ),
          )
        }
      }

      setBulkGoogleProgress((prev) =>
        prev
          ? {
              ...prev,
              processed: data.summary.total,
              results: data.results,
              done: true,
            }
          : null,
      )

      const { updated, noPlaceId, noHoursFound, failed } = data.summary
      toast({
        title: "Bulk fetch hours complete",
        description: `Updated: ${updated}, No Google link: ${noPlaceId}, No hours found: ${noHoursFound}, Failed: ${failed}`,
      })
    } catch (error) {
      console.error("Bulk fetch hours error:", error)
      setBulkGoogleProgress((prev) => (prev ? { ...prev, done: true } : null))
      toast({
        variant: "destructive",
        title: "Bulk fetch failed",
        description: "Could not complete bulk hours fetch.",
      })
    }
  }

  const handleFetchHoursForAll = () => {
    const currentList =
      activeTab === "active" ? activeClinics :
      activeTab === "unverified" ? unverifiedClinics :
      archivedClinics
    const visible = filterClinics(currentList)
    if (visible.length === 0) {
      toast({ variant: "destructive", title: "No clinics", description: "No clinics visible to fetch hours for." })
      return
    }
    handleBulkFetchHours(visible.map((c) => c.id))
  }

  const handleBulkFetchReviews = async (overrideIds?: string[]) => {
    const ids = overrideIds || Array.from(selectedIds)
    if (ids.length === 0) return

    setBulkGoogleProgress({
      open: true,
      type: "fetch-reviews",
      total: ids.length,
      processed: 0,
      results: [],
      done: false,
    })

    try {
      const res = await fetch("/api/admin/clinics/bulk-fetch-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicIds: ids }),
      })

      if (!res.ok) throw new Error("Bulk fetch reviews failed")
      const data = await res.json()

      // Update local state
      for (const result of data.results) {
        if (result.status === "updated") {
          setClinics((prev) =>
            prev.map((c) =>
              c.id === result.clinicId
                ? {
                    ...c,
                    google_rating: result.googleRating,
                    google_review_count: result.googleReviewCount,
                  }
                : c,
            ),
          )
        }
      }

      setBulkGoogleProgress((prev) =>
        prev
          ? {
              ...prev,
              processed: data.summary.total,
              results: data.results,
              done: true,
            }
          : null,
      )

      const { updated, noPlaceId, noReviewsFound, failed } = data.summary
      toast({
        title: "Bulk fetch reviews complete",
        description: `Updated: ${updated}, No Google link: ${noPlaceId}, No reviews found: ${noReviewsFound}, Failed: ${failed}`,
      })
    } catch (error) {
      console.error("Bulk fetch reviews error:", error)
      setBulkGoogleProgress((prev) => (prev ? { ...prev, done: true } : null))
      toast({
        variant: "destructive",
        title: "Bulk fetch failed",
        description: "Could not complete bulk reviews fetch.",
      })
    }
  }

  const handleFetchReviewsForAll = () => {
    const currentList =
      activeTab === "active" ? activeClinics :
      activeTab === "unverified" ? unverifiedClinics :
      archivedClinics
    const visible = filterClinics(currentList)
    if (visible.length === 0) {
      toast({ variant: "destructive", title: "No clinics", description: "No clinics visible to fetch reviews for." })
      return
    }
    handleBulkFetchReviews(visible.map((c) => c.id))
  }

  const handleBulkGenerateDescriptions = async (overrideIds?: string[]) => {
    const ids = overrideIds || Array.from(selectedIds)
    if (ids.length === 0) return

    setBulkGoogleProgress({
      open: true,
      type: "generate-descriptions",
      total: ids.length,
      processed: 0,
      results: [],
      done: false,
    })

    const results: BulkProgressResult[] = []

    for (let i = 0; i < ids.length; i++) {
      try {
        const res = await fetch("/api/admin/clinics/bulk-generate-descriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clinicId: ids[i] }),
        })

        const data = await res.json()

        if (data.status === "updated" || data.status === "generated") {
          // Update local state with new description
          setClinics((prev) =>
            prev.map((c) =>
              c.id === data.clinicId
                ? { ...c, description: data.description }
                : c,
            ),
          )
        }

        results.push({
          clinicId: data.clinicId || ids[i],
          clinicName: data.clinicName || "Unknown",
          status: data.status || "failed",
          error: data.error,
        })
      } catch (err) {
        results.push({
          clinicId: ids[i],
          clinicName: "Unknown",
          status: "failed",
          error: err instanceof Error ? err.message : "Network error",
        })
      }

      setBulkGoogleProgress((prev) =>
        prev
          ? { ...prev, processed: i + 1, results: [...results] }
          : null,
      )
    }

    setBulkGoogleProgress((prev) =>
      prev ? { ...prev, done: true, results } : null,
    )

    const extracted = results.filter((r) => r.status === "updated").length
    const generated = results.filter((r) => r.status === "generated").length
    const skipped = results.filter((r) => r.status === "skipped").length
    const failed = results.filter((r) => r.status === "failed").length
    toast({
      title: "Bulk description update complete",
      description: `Extracted: ${extracted}, AI fallback: ${generated}, Skipped: ${skipped}, Failed: ${failed}`,
    })
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "linked":
      case "updated":
        return <span className="text-green-600">&#10003;</span>
      case "generated":
        return <span className="text-blue-600">&#10003;</span>
      case "already_linked":
      case "already_has_hours":
        return <span className="text-blue-600">&#8212;</span>
      case "not_found":
      case "no_place_id":
      case "no_hours_found":
      case "no_reviews_found":
      case "skipped":
        return <span className="text-amber-600">&#9888;</span>
      case "failed":
        return <span className="text-red-600">&#10007;</span>
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "linked":
        return "Linked"
      case "updated":
        return "Extracted from website"
      case "generated":
        return "AI fallback"
      case "skipped":
        return "Skipped"
      case "already_linked":
        return "Already linked"
      case "already_has_hours":
        return "Already has hours"
      case "not_found":
        return "Not found on Google"
      case "no_place_id":
        return "No Google link"
      case "no_hours_found":
        return "No hours on Google"
      case "no_reviews_found":
        return "No reviews on Google"
      case "failed":
        return "Failed"
      default:
        return status
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
              <TableHead>Google</TableHead>
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
                    {!clinic.email && !clinic.notification_email && (
                      <div className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
                        <Mail className="h-3 w-3" />
                        No email
                      </div>
                    )}
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
                    {clinic.google_place_id ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium">
                          {clinic.google_rating?.toFixed(1) || "?"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({clinic.google_review_count || 0})
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not linked</span>
                    )}
                    {clinic.opening_hours && Object.keys(clinic.opening_hours).length > 0 ? (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <Clock className="h-3 w-3" />
                        Hours set
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        No hours
                      </div>
                    )}
                  </div>
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
                      <Link href={`/clinic/${clinic.id}?admin_preview=true`} target="_blank">
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
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No clinics found. Try adjusting your search or filters.
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
        <div className="flex flex-col gap-4">
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
              onClick={() => setShowFilters(!showFilters)}
              className={`gap-2 bg-transparent ${activeFilters.size > 0 ? "border-blue-400 text-blue-700" : ""}`}
            >
              <Filter className="h-4 w-4" />
              Filters{activeFilters.size > 0 ? ` (${activeFilters.size})` : ""}
            </Button>
            <Button
              variant="outline"
              onClick={handleFetchHoursForAll}
              disabled={!!bulkGoogleProgress}
              className="gap-2 bg-transparent text-teal-700 border-teal-300 hover:bg-teal-50"
            >
              <Clock className="h-4 w-4" />
              Fetch All Hours
            </Button>
            <Button
              variant="outline"
              onClick={handleFetchReviewsForAll}
              disabled={!!bulkGoogleProgress}
              className="gap-2 bg-transparent text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              <Star className="h-4 w-4" />
              Fetch All Reviews
            </Button>
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

          {/* Filter toggles */}
          {showFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant={activeFilters.has(key) ? "default" : "outline"}
                  onClick={() => toggleFilter(key)}
                  className={`text-xs h-7 ${
                    activeFilters.has(key)
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-transparent"
                  }`}
                >
                  {FILTER_LABELS[key]}
                </Button>
              ))}
              {activeFilters.size > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveFilters(new Set())}
                  className="text-xs h-7 text-muted-foreground"
                >
                  Clear all
                </Button>
              )}
            </div>
          )}
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-blue-800">
              {selectedIds.size} clinic{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
                onClick={handleBulkGoogleLink}
              >
                <Star className="h-3.5 w-3.5 mr-1.5" />
                Link Google Reviews
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-teal-700 border-teal-300 hover:bg-teal-50"
                onClick={handleBulkFetchHours}
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Fetch Opening Hours
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                onClick={() => handleBulkFetchReviews()}
              >
                <Star className="h-3.5 w-3.5 mr-1.5" />
                Fetch Reviews
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-purple-700 border-purple-300 hover:bg-purple-50"
                onClick={() => handleBulkGenerateDescriptions()}
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Update Descriptions
              </Button>
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

      <Tabs defaultValue="active" className="w-full" onValueChange={setActiveTab}>
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

      {/* Bulk Google progress dialog */}
      <Dialog
        open={!!bulkGoogleProgress?.open}
        onOpenChange={(open) => {
          if (!open && bulkGoogleProgress?.done) {
            setBulkGoogleProgress(null)
            handleRefresh()
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {bulkGoogleProgress?.type === "google-link"
                ? "Linking Google Reviews"
                : bulkGoogleProgress?.type === "fetch-reviews"
                  ? "Fetching Google Reviews"
                  : bulkGoogleProgress?.type === "generate-descriptions"
                    ? "Generating Clinic Descriptions"
                    : "Fetching Opening Hours"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!bulkGoogleProgress?.done && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Processing {bulkGoogleProgress?.processed || 0} of {bulkGoogleProgress?.total} clinic{(bulkGoogleProgress?.total || 0) > 1 ? "s" : ""}...
                </div>
                <Progress value={bulkGoogleProgress?.total ? ((bulkGoogleProgress.processed || 0) / bulkGoogleProgress.total) * 100 : 0} className="h-2" />
              </div>
            )}

            {bulkGoogleProgress?.done && bulkGoogleProgress.results.length > 0 && (
              <div className="space-y-2">
                <Progress value={100} className="h-2" />
                <p className="text-sm font-medium text-green-700">
                  Complete — {bulkGoogleProgress.results.length} clinic{bulkGoogleProgress.results.length > 1 ? "s" : ""} processed
                </p>
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {bulkGoogleProgress.results.map((r) => (
                    <div key={r.clinicId} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="truncate mr-2">{r.clinicName}</span>
                      <span className="flex items-center gap-1.5 shrink-0 text-xs">
                        {getStatusIcon(r.status)}
                        {getStatusLabel(r.status)}
                        {r.googleRating != null && (
                          <span className="text-muted-foreground ml-1">
                            ({r.googleRating?.toFixed(1)} / {r.googleReviewCount} reviews)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bulkGoogleProgress?.done && (
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setBulkGoogleProgress(null)
                    handleRefresh()
                  }}
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
