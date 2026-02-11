"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Trash2 } from "lucide-react"
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
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type Lead = {
  id: string
  contact_value: string
  contact_method: string
  treatment_interest: string
  postcode: string
  preferred_timing: string
  budget_range: string
  created_at: string
  [key: string]: any
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const router = useRouter()

  const filteredLeads = leads.filter(
    (lead) =>
      lead.contact_value?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.treatment_interest?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.postcode?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDeleteClick = (leadId: string) => {
    console.log("[v0] Delete button clicked for lead:", leadId)
    setDeletingId(leadId)
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    console.log("[v0] Confirm delete called for lead:", deletingId)
    if (!deletingId) return

    try {
      console.log("[v0] Sending DELETE request to /api/admin/leads/" + deletingId)
      const response = await fetch(`/api/admin/leads/${deletingId}`, {
        method: "DELETE",
      })

      console.log("[v0] DELETE response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] DELETE failed:", errorData)
        throw new Error("Failed to delete lead")
      }

      toast.success("Lead deleted successfully")
      console.log("[v0] Lead deleted successfully, refreshing...")
      router.refresh()
    } catch (error) {
      console.error("[v0] Error deleting lead:", error)
      toast.error("Failed to delete lead")
    } finally {
      setShowDeleteDialog(false)
      setDeletingId(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Patient Form Submissions</CardTitle>
          <CardDescription>All patient intake form submissions with details</CardDescription>
          <div className="pt-4">
            <Input
              placeholder="Search by patient name, treatment, or postcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {searchTerm ? "No matching leads found" : "No leads yet"}
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Treatment Interest</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.contact_value || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{lead.contact_method}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{lead.treatment_interest || "N/A"}</TableCell>
                      <TableCell>{lead.postcode || "N/A"}</TableCell>
                      <TableCell>{lead.budget_range || "N/A"}</TableCell>
                      <TableCell>{new Date(lead.created_at).toLocaleString("en-GB")}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(lead.id)}
                          className="hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
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
