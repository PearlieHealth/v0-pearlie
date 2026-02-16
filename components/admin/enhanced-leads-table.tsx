"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Trash2, ChevronDown, ChevronRight, Mail, Phone, Download } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { safeArray, safeString } from "@/lib/analytics/safe"
import {
  TIMING_LABELS,
  COST_APPROACH_LABELS,
  LOCATION_PREFERENCE_LABELS,
  ANXIETY_LEVEL_LABELS,
  TIMING_OPTIONS,
  parseRawAnswers,
} from "@/lib/intake-form-config"

type Lead = {
  id?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  contact_value?: string
  contact_method?: string
  treatment_interest?: string
  postcode?: string
  city?: string
  location_preference?: string
  preferred_timing?: string
  budget_range?: string
  decision_values?: string[]
  conversion_blocker?: string
  blocker?: string
  anxiety_level?: string
  created_at?: string
  raw_answers?: Record<string, any>
  [key: string]: unknown
}

const timingLabels = TIMING_LABELS
const costApproachLabels = COST_APPROACH_LABELS
const locationLabels = LOCATION_PREFERENCE_LABELS
const anxietyLabels = ANXIETY_LEVEL_LABELS

export function EnhancedLeadsTable({ leads }: { leads?: Lead[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [treatmentFilter, setTreatmentFilter] = useState<string>("all")
  const [timingFilter, setTimingFilter] = useState<string>("all")
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const router = useRouter()

  const safeLeads = safeArray(leads)

  // Get unique treatments for filters
  const treatments = Array.from(new Set(safeLeads.map((l) => safeString(l.treatment_interest)).filter(Boolean)))

  const filteredLeads = safeLeads.filter((lead) => {
    const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
    const matchesSearch =
      safeString(lead.postcode).toLowerCase().includes(searchTerm.toLowerCase()) ||
      safeString(lead.treatment_interest).toLowerCase().includes(searchTerm.toLowerCase()) ||
      safeString(lead.email).toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTreatment = treatmentFilter === "all" || lead.treatment_interest?.includes(treatmentFilter)
    const matchesTiming = timingFilter === "all" || lead.preferred_timing === timingFilter || lead.raw_answers?.timing === timingFilter

    return matchesSearch && matchesTreatment && matchesTiming
  })

  const generateLeadId = (lead: Lead) => {
    const id = safeString(lead.id)
    return id ? `LEAD-${id.slice(0, 8).toUpperCase()}` : "LEAD-UNKNOWN"
  }

  const handleDeleteClick = (leadId: string) => {
    setDeletingId(leadId)
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingId) return

    try {
      const response = await fetch(`/api/admin/leads/${deletingId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete lead")
      }

      toast.success("Lead deleted successfully")
      router.refresh()
    } catch (error) {
      toast.error("Failed to delete lead")
    } finally {
      setShowDeleteDialog(false)
      setDeletingId(null)
    }
  }

  const getPatientName = (lead: Lead) => {
    const first = lead.first_name || ''
    const last = lead.last_name || ''
    if (first || last) return `${first} ${last}`.trim()
    return lead.contact_value || 'Anonymous'
  }

  const getTiming = (lead: Lead) => {
    const parsed = parseRawAnswers(lead.raw_answers)
    const timing = parsed?.timing || lead.preferred_timing
    return timing ? (TIMING_LABELS[timing] || timing) : '—'
  }

  const getCostApproach = (lead: Lead) => {
    const parsed = parseRawAnswers(lead.raw_answers)
    const cost = parsed?.costApproach || lead.budget_range
    return cost ? (COST_APPROACH_LABELS[cost] || cost) : '—'
  }

  const getLocation = (lead: Lead) => {
    const parsed = parseRawAnswers(lead.raw_answers)
    const loc = parsed?.locationPreference || lead.location_preference
    return loc ? (LOCATION_PREFERENCE_LABELS[loc] || loc) : '—'
  }

  const getAnxiety = (lead: Lead) => {
    const parsed = parseRawAnswers(lead.raw_answers)
    const anxiety = parsed?.anxietyLevel || lead.anxiety_level
    return anxiety ? (ANXIETY_LEVEL_LABELS[anxiety] || anxiety) : '—'
  }

  const getBlockers = (lead: Lead) => {
    const parsed = parseRawAnswers(lead.raw_answers)
    if (parsed?.blockerLabels && parsed.blockerLabels.length > 0) return parsed.blockerLabels
    const blocker = lead.conversion_blocker || lead.blocker
    return blocker ? [blocker] : []
  }

  const getValues = (lead: Lead) => {
    const parsed = parseRawAnswers(lead.raw_answers)
    return parsed?.decisionValues || lead.decision_values || []
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Patient Leads</CardTitle>
              <CardDescription>View and manage all patient form submissions from the new 11-question flow</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                window.open("/api/admin/export?type=leads", "_blank")
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search by name, email, treatment, or postcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={treatmentFilter} onValueChange={setTreatmentFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by treatment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Treatments</SelectItem>
                {treatments.map((treatment) => (
                  <SelectItem key={treatment} value={treatment}>
                    {treatment}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timingFilter} onValueChange={setTimingFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by timing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Timings</SelectItem>
                {TIMING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {searchTerm || treatmentFilter !== "all" || timingFilter !== "all"
                ? "No matching leads found"
                : "No leads yet"}
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Treatment</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Timing</TableHead>
                    <TableHead>Cost Approach</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <>
                      <TableRow key={safeString(lead.id) || Math.random()} className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={() => setExpandedRow(expandedRow === lead.id ? null : safeString(lead.id))}>
                          {expandedRow === lead.id ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{getPatientName(lead)}</span>
                            <span className="text-xs text-muted-foreground font-mono">{generateLeadId(lead)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(lead.treatment_interest?.split(', ') || []).slice(0, 2).map((t, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                            ))}
                            {(lead.treatment_interest?.split(', ') || []).length > 2 && (
                              <Badge variant="secondary" className="text-xs">+{(lead.treatment_interest?.split(', ') || []).length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{safeString(lead.postcode) || "N/A"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={lead.raw_answers?.timing === 'asap' ? 'default' : 'secondary'} className="text-xs">
                            {getTiming(lead)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-[150px] truncate" title={getCostApproach(lead)}>
                          {getCostApproach(lead)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {lead.created_at ? new Date(lead.created_at).toLocaleDateString("en-GB") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => lead.id && handleDeleteClick(lead.id)}
                            className="hover:text-destructive"
                            disabled={!lead.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedRow === lead.id && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30">
                            <div className="p-4 space-y-4">
                              {/* Contact Info */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="font-medium text-muted-foreground block mb-1">Email</span>
                                  <div className="flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-muted-foreground" />
                                    <span>{lead.email || "—"}</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="font-medium text-muted-foreground block mb-1">Phone</span>
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-muted-foreground" />
                                    <span>{lead.phone || "—"}</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="font-medium text-muted-foreground block mb-1">Location Preference</span>
                                  <span>{getLocation(lead)}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-muted-foreground block mb-1">Anxiety Level</span>
                                  <span>{getAnxiety(lead)}</span>
                                </div>
                              </div>

                              {/* Decision Values */}
                              {getValues(lead).length > 0 && (
                                <div>
                                  <span className="font-medium text-muted-foreground block mb-2">What Matters Most</span>
                                  <div className="flex flex-wrap gap-2">
                                    {getValues(lead).map((value, i) => (
                                      <Badge key={i} variant="outline">{value}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Conversion Blockers */}
                              {getBlockers(lead).length > 0 && (
                                <div>
                                  <span className="font-medium text-muted-foreground block mb-2">Concerns / Blockers</span>
                                  <div className="flex flex-wrap gap-2">
                                    {getBlockers(lead).map((blocker, i) => (
                                      <Badge key={i} variant="secondary">{blocker}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Budget Details */}
                              {lead.raw_answers?.strict_budget_amount && (
                                <div>
                                  <span className="font-medium text-muted-foreground block mb-1">Budget Amount</span>
                                  <span>£{lead.raw_answers.strict_budget_amount.toLocaleString()}</span>
                                  {lead.raw_answers.strict_budget_mode === 'discuss_with_clinic' && (
                                    <span className="text-muted-foreground ml-2">(wants to discuss with clinic)</span>
                                  )}
                                </div>
                              )}

                              {/* Timestamps */}
                              <div className="pt-2 border-t text-xs text-muted-foreground">
                                Submitted: {lead.created_at ? new Date(lead.created_at).toLocaleString("en-GB") : "—"}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this patient submission? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
