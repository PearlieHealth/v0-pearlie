"use client"

import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

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

interface LeadsTableProps {
  leads: Lead[]
  onSelectLead: (lead: Lead) => void
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  NEW: { label: "New", variant: "default" },
  CONTACTED: { label: "Contacted", variant: "secondary" },
  BOOKED: { label: "Booked", variant: "outline" },
  COMPLETED: { label: "Completed", variant: "outline" },
  NOT_PROCEEDING: { label: "Not Proceeding", variant: "destructive" },
}

export function LeadsTable({ leads, onSelectLead }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No enquiries found in this category.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Contact</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const status = lead.outcome?.status || "NEW"
            const config = statusConfig[status] || statusConfig.NEW

            return (
              <TableRow
                key={lead.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelectLead(lead)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium">
                      {lead.first_name} {lead.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground md:hidden">
                      {lead.email}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="text-sm">
                    <p>{lead.email}</p>
                    <p className="text-muted-foreground">{lead.phone}</p>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {format(new Date(lead.created_at), "dd MMM yyyy")}
                </TableCell>
                <TableCell>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
