"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { safeArray } from "@/lib/analytics/safe"
import { getTreatmentValue } from "@/lib/analytics/treatment-values"
import { TrendingUp, TrendingDown, Minus, Building2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

interface ClinicPerformanceTableProps {
  events?: any[]
  clinicMap?: Map<string, string>
  leads?: any[]
  matchResults?: any[]
}

interface ClinicMetrics {
  clinicId: string
  clinicName: string
  totalLeads: number
  matchesShown: number
  clinicClicks: number
  bookClicks: number
  bookingsConfirmed: number
  bookingsPending: number
  conversionRate: number
  confirmationRate: number
  revenueMin: number
  revenueMax: number
}

type SortField = "totalLeads" | "matchesShown" | "clinicClicks" | "bookClicks" | "bookingsConfirmed" | "conversionRate" | "confirmationRate" | "revenueMin"
type SortDirection = "asc" | "desc"

export function ClinicPerformanceTable({ events, clinicMap, leads, matchResults }: ClinicPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>("conversionRate")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const safeEvents = safeArray<{ id?: string; event_name?: string; clinic_id?: string; lead_id?: string; session_id?: string; [key: string]: unknown }>(events)
  const safeLeads = safeArray<{ id?: string; booking_clinic_id?: string; booking_status?: string; treatments?: string[]; [key: string]: unknown }>(leads)
  const safeMatchResults = safeArray<{ clinic_id?: string; lead_id?: string; [key: string]: unknown }>(matchResults)
  const safeClinicMap = clinicMap instanceof Map ? clinicMap : new Map<string, string>()

  // Get all unique clinic IDs from events and match results
  const allClinicIds = new Set<string>()
  safeEvents.forEach(e => {
    if (e?.clinic_id) allClinicIds.add(e.clinic_id)
  })
  safeMatchResults.forEach(mr => {
    if (mr?.clinic_id) allClinicIds.add(mr.clinic_id)
  })

  // Calculate metrics per clinic
  const clinicMetrics: ClinicMetrics[] = Array.from(allClinicIds).map(clinicId => {
    // Matches shown for this clinic (from match_results)
    const clinicMatchResults = safeMatchResults.filter(mr => mr?.clinic_id === clinicId)
    const matchesShown = clinicMatchResults.length

    // Get unique leads that were shown this clinic
    const leadsShownClinic = new Set(clinicMatchResults.map(mr => mr?.lead_id).filter(Boolean))
    const totalLeads = leadsShownClinic.size

    // Clinic clicks (clinic_opened events for this clinic)
    const clinicOpenEvents = safeEvents.filter(e => 
      e?.event_name === "clinic_opened" && e?.clinic_id === clinicId
    )
    const uniqueClinicClicks = new Set(
      clinicOpenEvents.map(e => `${e?.lead_id}-${e?.clinic_id}`).filter(Boolean)
    ).size

    // Book clicks for this clinic
    const bookEvents = safeEvents.filter(e => 
      e?.event_name === "book_clicked" && e?.clinic_id === clinicId
    )
    const uniqueBookClicks = new Set(
      bookEvents.map(e => `${e?.lead_id}-${e?.clinic_id}`).filter(Boolean)
    ).size

    // Get bookings confirmed/pending for this clinic from leads table
    const clinicLeads = safeLeads.filter(l => l?.booking_clinic_id === clinicId)
    const bookingsConfirmed = clinicLeads.filter(l => l?.booking_status === "confirmed").length
    const bookingsPending = clinicLeads.filter(l => l?.booking_status === "pending").length
    const bookingsDeclined = clinicLeads.filter(l => l?.booking_status === "declined").length

    // Conversion rate: book_clicks / total_leads shown this clinic
    const conversionRate = totalLeads > 0 ? (uniqueBookClicks / totalLeads) * 100 : 0
    
    // Confirmation rate: confirmed / total booking requests
    const confirmationRate = uniqueBookClicks > 0 ? (bookingsConfirmed / uniqueBookClicks) * 100 : 0

    // Revenue from booked leads for this clinic
    const bookedLeadIds = new Set(bookEvents.map(e => e?.lead_id).filter(Boolean))
    let revenueMin = 0
    let revenueMax = 0

    safeLeads.forEach(lead => {
      if (!bookedLeadIds.has(lead?.id)) return
      const treatments = Array.isArray(lead?.treatments) ? lead.treatments : []
      treatments.forEach((t: string) => {
        if (t) {
          const value = getTreatmentValue(t)
          revenueMin += value.minPence
          revenueMax += value.maxPence
        }
      })
    })

    return {
      clinicId,
      clinicName: safeClinicMap.get(clinicId) || "Unknown Clinic",
      totalLeads,
      matchesShown,
      clinicClicks: uniqueClinicClicks,
      bookClicks: uniqueBookClicks,
      bookingsConfirmed,
      bookingsPending,
      conversionRate,
      confirmationRate,
      revenueMin: revenueMin / 100,
      revenueMax: revenueMax / 100,
    }
  })

  // Filter to only show clinics with leads, then sort
  const filteredMetrics = clinicMetrics.filter(m => m.totalLeads > 0)
  
  const sortedMetrics = [...filteredMetrics].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    const multiplier = sortDirection === "desc" ? -1 : 1
    return (aValue - bValue) * multiplier
  })

  // Calculate platform averages
  const platformTotals = filteredMetrics.reduce((acc, clinic) => ({
    totalLeads: acc.totalLeads + clinic.totalLeads,
    matchesShown: acc.matchesShown + clinic.matchesShown,
    clinicClicks: acc.clinicClicks + clinic.clinicClicks,
    bookClicks: acc.bookClicks + clinic.bookClicks,
    bookingsConfirmed: acc.bookingsConfirmed + clinic.bookingsConfirmed,
    bookingsPending: acc.bookingsPending + clinic.bookingsPending,
    revenueMin: acc.revenueMin + clinic.revenueMin,
    revenueMax: acc.revenueMax + clinic.revenueMax,
  }), { totalLeads: 0, matchesShown: 0, clinicClicks: 0, bookClicks: 0, bookingsConfirmed: 0, bookingsPending: 0, revenueMin: 0, revenueMax: 0 })

  const platformAvgConversion = platformTotals.totalLeads > 0 
    ? (platformTotals.bookClicks / platformTotals.totalLeads) * 100 
    : 0

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getConversionBadge = (rate: number) => {
    if (rate >= platformAvgConversion + 5) {
      return (
        <Badge className="bg-green-100 text-green-800 gap-1">
          <TrendingUp className="h-3 w-3" />
          Above Avg
        </Badge>
      )
    } else if (rate <= platformAvgConversion - 5) {
      return (
        <Badge className="bg-red-100 text-red-800 gap-1">
          <TrendingDown className="h-3 w-3" />
          Below Avg
        </Badge>
      )
    }
    return (
      <Badge className="bg-gray-100 text-gray-800 gap-1">
        <Minus className="h-3 w-3" />
        Average
      </Badge>
    )
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "desc" ? "asc" : "desc")
    } else {
      // New field, default to descending (highest first)
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="text-right cursor-pointer hover:bg-muted/80 transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-end gap-1">
        {children}
        {sortField === field ? (
          sortDirection === "desc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </div>
    </TableHead>
  )

  return (
    <div className="space-y-6">
      {/* Platform Summary Card */}
      <Card className="bg-gradient-to-r from-[#1a2332] to-[#2d3b4f] text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Platform Performance Summary
          </CardTitle>
          <CardDescription className="text-white/70">
            Aggregated metrics across all clinics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide">Total Leads</p>
              <p className="text-2xl font-bold">{platformTotals.totalLeads}</p>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide">Matches Shown</p>
              <p className="text-2xl font-bold">{platformTotals.matchesShown}</p>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide">Clinic Clicks</p>
              <p className="text-2xl font-bold">{platformTotals.clinicClicks}</p>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide">Booking Requests</p>
              <p className="text-2xl font-bold">{platformTotals.bookClicks}</p>
              {platformTotals.bookingsPending > 0 && (
                <p className="text-xs text-amber-400">{platformTotals.bookingsPending} pending</p>
              )}
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide">Confirmed</p>
              <p className="text-2xl font-bold text-green-400">{platformTotals.bookingsConfirmed}</p>
              <p className="text-xs text-white/60">
                {platformTotals.bookClicks > 0 
                  ? `${((platformTotals.bookingsConfirmed / platformTotals.bookClicks) * 100).toFixed(0)}% rate`
                  : "—"
                }
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide">Revenue Opportunity</p>
              <p className="text-lg font-bold">{formatCurrency(platformTotals.revenueMin)} — {formatCurrency(platformTotals.revenueMax)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Clinic Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clinic Performance Rankings</CardTitle>
          <CardDescription>
            Click any column header to sort by that metric
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedMetrics.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No clinic performance data available yet
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Clinic</TableHead>
                    <SortableHeader field="totalLeads">Total Leads</SortableHeader>
                    <SortableHeader field="matchesShown">Matches</SortableHeader>
                    <SortableHeader field="clinicClicks">Clicks</SortableHeader>
                    <SortableHeader field="bookClicks">Requests</SortableHeader>
                    <SortableHeader field="bookingsConfirmed">Confirmed</SortableHeader>
                    <SortableHeader field="confirmationRate">Confirm Rate</SortableHeader>
                    <SortableHeader field="revenueMin">Revenue (Min — Max)</SortableHeader>
                    <TableHead>vs Platform</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMetrics.map((clinic, index) => (
                    <TableRow key={clinic.clinicId}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {clinic.clinicName}
                      </TableCell>
                      <TableCell className="text-right">{clinic.totalLeads}</TableCell>
                      <TableCell className="text-right">{clinic.matchesShown}</TableCell>
                      <TableCell className="text-right">{clinic.clinicClicks}</TableCell>
                      <TableCell className="text-right">{clinic.bookClicks}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-medium text-green-600">{clinic.bookingsConfirmed}</span>
                          {clinic.bookingsPending > 0 && (
                            <span className="text-xs text-muted-foreground">({clinic.bookingsPending} pending)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress 
                            value={clinic.confirmationRate} 
                            className="w-16 h-2"
                          />
                          <span className="font-medium w-12 text-right">
                            {clinic.confirmationRate.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {clinic.revenueMin > 0 ? (
                          <span>{formatCurrency(clinic.revenueMin)} — {formatCurrency(clinic.revenueMax)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getConversionBadge(clinic.conversionRate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
