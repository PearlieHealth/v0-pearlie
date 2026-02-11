"use client"

import { useState, useEffect } from "react"
import { AdminNav } from "@/components/admin/admin-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Loader2,
  RefreshCw,
  User,
} from "lucide-react"

interface WaitlistEntry {
  id: string
  clinic_name: string
  owner_name: string
  email: string
  phone: string | null
  postcodes: string[]
  treatments_offered: string[]
  capacity: string | null
  preferred_start_date: string | null
  additional_info: string | null
  status: "pending" | "approved" | "rejected"
  admin_notes: string | null
  created_at: string
  approved_at: string | null
  rejected_at: string | null
}

export default function ClinicWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null)
  const [actionDialog, setActionDialog] = useState<"approve" | "reject" | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [processing, setProcessing] = useState(false)

  const fetchEntries = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/clinic-waitlist")
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
      }
    } catch (error) {
      console.error("Failed to fetch waitlist:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [])

  const handleAction = async (action: "approve" | "reject") => {
    if (!selectedEntry) return
    setProcessing(true)

    try {
      const response = await fetch("/api/admin/clinic-waitlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedEntry.id,
          action,
          adminNotes,
        }),
      })

      if (response.ok) {
        await fetchEntries()
        setActionDialog(null)
        setSelectedEntry(null)
        setAdminNotes("")
      }
    } catch (error) {
      console.error("Failed to update waitlist entry:", error)
    } finally {
      setProcessing(false)
    }
  }

  const pendingEntries = entries.filter((e) => e.status === "pending")
  const approvedEntries = entries.filter((e) => e.status === "approved")
  const rejectedEntries = entries.filter((e) => e.status === "rejected")

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const getCapacityLabel = (capacity: string | null) => {
    switch (capacity) {
      case "limited":
        return "Limited capacity"
      case "moderate":
        return "Moderate capacity"
      case "full":
        return "Full capacity"
      default:
        return "Not specified"
    }
  }

  const getStartDateLabel = (startDate: string | null) => {
    switch (startDate) {
      case "immediately":
        return "Immediately"
      case "next_month":
        return "Next month"
      case "next_quarter":
        return "Next quarter"
      case "unsure":
        return "Not sure yet"
      default:
        return "Not specified"
    }
  }

  const EntryCard = ({ entry }: { entry: WaitlistEntry }) => (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg">{entry.clinic_name}</h3>
              <Badge
                variant={entry.status === "pending" ? "outline" : entry.status === "approved" ? "default" : "secondary"}
              >
                {entry.status}
              </Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {entry.owner_name}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <a href={`mailto:${entry.email}`} className="hover:underline">
                  {entry.email}
                </a>
              </div>
              {entry.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {entry.phone}
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {entry.postcodes.join(", ")}
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {getCapacityLabel(entry.capacity)}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {getStartDateLabel(entry.preferred_start_date)}
              </div>
            </div>

            {entry.treatments_offered.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {entry.treatments_offered.map((treatment) => (
                  <Badge key={treatment} variant="secondary" className="text-xs">
                    {treatment}
                  </Badge>
                ))}
              </div>
            )}

            {entry.additional_info && (
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{entry.additional_info}</p>
            )}

            {entry.admin_notes && (
              <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">{entry.admin_notes}</p>
            )}

            <p className="text-xs text-muted-foreground">Submitted {formatDate(entry.created_at)}</p>
          </div>

          {entry.status === "pending" && (
            <div className="flex gap-2 lg:flex-col">
              <Button
                size="sm"
                onClick={() => {
                  setSelectedEntry(entry)
                  setAdminNotes(entry.admin_notes || "")
                  setActionDialog("approve")
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedEntry(entry)
                  setAdminNotes(entry.admin_notes || "")
                  setActionDialog("reject")
                }}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Clinic Waitlist</h1>
            <p className="text-muted-foreground">Manage clinic applications for early access</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchEntries} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList className="mb-6">
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                Pending ({pendingEntries.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Approved ({approvedEntries.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2">
                <XCircle className="w-4 h-4" />
                Rejected ({rejectedEntries.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {pendingEntries.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">No pending applications</CardContent>
                </Card>
              ) : (
                pendingEntries.map((entry) => <EntryCard key={entry.id} entry={entry} />)
              )}
            </TabsContent>

            <TabsContent value="approved">
              {approvedEntries.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No approved applications yet
                  </CardContent>
                </Card>
              ) : (
                approvedEntries.map((entry) => <EntryCard key={entry.id} entry={entry} />)
              )}
            </TabsContent>

            <TabsContent value="rejected">
              {rejectedEntries.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No rejected applications
                  </CardContent>
                </Card>
              ) : (
                rejectedEntries.map((entry) => <EntryCard key={entry.id} entry={entry} />)
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Action Dialog */}
        <Dialog open={actionDialog !== null} onOpenChange={() => setActionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{actionDialog === "approve" ? "Approve Application" : "Reject Application"}</DialogTitle>
              <DialogDescription>
                {actionDialog === "approve"
                  ? `Approve ${selectedEntry?.clinic_name} to join the Pearlie network?`
                  : `Reject the application from ${selectedEntry?.clinic_name}?`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (optional)</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={
                    actionDialog === "approve"
                      ? "e.g., Great fit for anxious patients, follow up about sedation services"
                      : "e.g., Outside service area, follow up in 3 months"
                  }
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog(null)} disabled={processing}>
                Cancel
              </Button>
              <Button
                variant={actionDialog === "approve" ? "default" : "destructive"}
                onClick={() => handleAction(actionDialog!)}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : actionDialog === "approve" ? (
                  "Approve"
                ) : (
                  "Reject"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
