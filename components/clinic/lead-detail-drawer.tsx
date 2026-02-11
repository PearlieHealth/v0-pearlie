"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { createBrowserClient } from "@/lib/supabase/client"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Mail, Phone, Calendar, FileText, User } from "lucide-react"
import { toast } from "sonner"

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  created_at: string
  raw_answers: Record<string, unknown>
  outcome?: {
    status: string
    contacted_at: string | null
    booked_at: string | null
    internal_notes: string | null
  }
}

interface LeadDetailDrawerProps {
  lead: Lead | null
  clinicId: string
  onClose: () => void
  onUpdate: () => void
}

const STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "BOOKED", label: "Booked" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NOT_PROCEEDING", label: "Not Proceeding" },
]

const NOT_PROCEEDING_REASONS = [
  "Changed mind",
  "Chose different clinic",
  "Too expensive",
  "Not ready yet",
  "Unable to contact",
  "Other",
]

export function LeadDetailDrawer({ lead, clinicId, onClose, onUpdate }: LeadDetailDrawerProps) {
  const [status, setStatus] = useState("NEW")
  const [notes, setNotes] = useState("")
  const [notProceedingReason, setNotProceedingReason] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (lead) {
      setStatus(lead.outcome?.status || "NEW")
      setNotes(lead.outcome?.internal_notes || "")
    }
  }, [lead])

  if (!lead) return null

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createBrowserClient()

    const outcomeData: Record<string, unknown> = {
      lead_id: lead.id,
      clinic_id: clinicId,
      status,
      internal_notes: notes,
      updated_at: new Date().toISOString(),
    }

    if (status === "CONTACTED" && !lead.outcome?.contacted_at) {
      outcomeData.contacted_at = new Date().toISOString()
    }
    if (status === "BOOKED" && !lead.outcome?.booked_at) {
      outcomeData.booked_at = new Date().toISOString()
    }
    if (status === "NOT_PROCEEDING") {
      outcomeData.not_proceeding_reason = notProceedingReason
    }

    const { error } = await supabase
      .from("lead_outcomes")
      .upsert(outcomeData, { onConflict: "lead_id,clinic_id" })

    if (error) {
      toast.error("Failed to save changes")
    } else {
      toast.success("Lead updated successfully")
      onUpdate()
      onClose()
    }

    setIsSaving(false)
  }

  const treatment = (lead.raw_answers?.treatment as string) || "Not specified"
  const postcode = (lead.raw_answers?.postcode as string) || "Not specified"

  return (
    <Sheet open={!!lead} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {lead.first_name} {lead.last_name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>
            <div className="space-y-2">
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{lead.email}</span>
              </a>
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{lead.phone}</span>
              </a>
            </div>
          </div>

          <Separator />

          {/* Enquiry Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Enquiry Details</h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Treatment Interest</p>
                  <p className="text-sm font-medium">{treatment}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Enquiry Date</p>
                  <p className="text-sm font-medium">
                    {format(new Date(lead.created_at), "dd MMMM yyyy 'at' HH:mm")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-4 w-4 text-muted-foreground flex items-center justify-center text-xs">📍</div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium">{postcode}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status Update */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Update Status</h3>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {status === "NOT_PROCEEDING" && (
              <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={notProceedingReason} onValueChange={setNotProceedingReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOT_PROCEEDING_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Textarea
                placeholder="Add notes about this patient..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Timeline */}
          {lead.outcome && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Timeline</h3>
                <div className="space-y-2 text-sm">
                  {lead.outcome.contacted_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contacted</span>
                      <span>{format(new Date(lead.outcome.contacted_at), "dd MMM yyyy")}</span>
                    </div>
                  )}
                  {lead.outcome.booked_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Booked</span>
                      <span>{format(new Date(lead.outcome.booked_at), "dd MMM yyyy")}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
