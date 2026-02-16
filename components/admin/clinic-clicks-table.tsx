"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { safeArray, safeString } from "@/lib/analytics/safe"

interface ClinicClicksTableProps {
  events?: Array<{
    id?: string
    lead_id?: string
    clinic_id?: string
    event_name?: string
    created_at?: string
    [key: string]: unknown
  }>
  clinicMap?: Map<string, string>
}

export function ClinicClicksTable({ events, clinicMap }: ClinicClicksTableProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const safeEvents = safeArray<{ id?: string; lead_id?: string; clinic_id?: string; event_name?: string; created_at?: string; [key: string]: unknown }>(events)
  const safeClinicMap = clinicMap instanceof Map ? clinicMap : new Map<string, string>()

  // Transform events into click data
  const clinicClicks = safeEvents.map((event) => ({
    id: safeString(event.id),
    leadId: safeString(event.lead_id),
    clinicId: safeString(event.clinic_id),
    clinicName: safeClinicMap.get(safeString(event.clinic_id)) || "Unknown Clinic",
    eventType: safeString(event.event_name),
    createdAt: safeString(event.created_at),
  }))

  const filteredClicks = clinicClicks.filter(
    (click) =>
      click.leadId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      click.clinicName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clinic Clicks Tracker</CardTitle>
        <CardDescription>Track which patients clicked on which clinics</CardDescription>
        <div className="pt-4">
          <Input
            placeholder="Search by lead ID or clinic name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredClicks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {searchTerm ? "No matching clinic clicks found" : "No clinic clicks yet"}
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead ID</TableHead>
                  <TableHead>Clinic Clicked</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Event Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClicks.map((click) => (
                  <TableRow key={click.id || `${click.leadId}-${click.clinicId}-${click.createdAt}`}>
                    <TableCell className="font-mono text-sm">
                      {click.leadId ? `LEAD-${click.leadId.slice(0, 8).toUpperCase()}` : "—"}
                    </TableCell>
                    <TableCell>{click.clinicName}</TableCell>
                    <TableCell>{click.createdAt ? new Date(click.createdAt).toLocaleString("en-GB") : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{click.eventType || "click"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
