"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Search, Download, Phone, Mail, Calendar, Filter } from "lucide-react"
import Link from "next/link"
import { clinicHref } from "@/lib/clinic-url"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"

const demoLeads = [
  { id: "1", name: "Sarah Johnson", email: "sarah.j@email.com", phone: "07700 900123", treatment: "Dental Implants", status: "new", created_at: "2024-01-15T10:30:00Z", source: "Pearlie Match" },
  { id: "2", name: "Michael Chen", email: "m.chen@email.com", phone: "07700 900456", treatment: "Invisalign", status: "contacted", created_at: "2024-01-14T14:20:00Z", source: "Pearlie Match" },
  { id: "3", name: "Emma Williams", email: "emma.w@email.com", phone: "07700 900789", treatment: "Teeth Whitening", status: "booked", created_at: "2024-01-13T09:15:00Z", source: "Pearlie Match" },
  { id: "4", name: "James Taylor", email: "j.taylor@email.com", phone: "07700 900321", treatment: "Root Canal", status: "completed", created_at: "2024-01-12T16:45:00Z", source: "Pearlie Match" },
  { id: "5", name: "Olivia Brown", email: "olivia.b@email.com", phone: "07700 900654", treatment: "Veneers", status: "new", created_at: "2024-01-11T11:00:00Z", source: "Pearlie Match" },
  { id: "6", name: "William Davis", email: "w.davis@email.com", phone: "07700 900987", treatment: "Dental Checkup", status: "contacted", created_at: "2024-01-10T13:30:00Z", source: "Pearlie Match" },
  { id: "7", name: "Sophie Miller", email: "sophie.m@email.com", phone: "07700 900147", treatment: "Crowns", status: "no_response", created_at: "2024-01-09T15:20:00Z", source: "Pearlie Match" },
  { id: "8", name: "Alexander Wilson", email: "a.wilson@email.com", phone: "07700 900258", treatment: "Dental Implants", status: "booked", created_at: "2024-01-08T10:00:00Z", source: "Pearlie Match" },
]

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  booked: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  no_response: "bg-red-100 text-red-800",
}

const statusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  booked: "Booked",
  completed: "Completed",
  no_response: "No Response",
}

export default function DemoLeadsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const searchParams = useSearchParams()

  const filteredLeads = demoLeads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.treatment.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <Suspense fallback={<Loading />}>
      <div className="min-h-screen bg-[#f8f7f4]">
        {/* Demo Banner */}
        <div className="bg-blue-600 text-white px-4 py-2 text-center text-sm">
          <span className="font-medium">Demo Mode</span> - This is sample data for preview purposes
          <Link href="/admin/clinic-users" className="ml-4 underline hover:no-underline">
            Back to Admin
          </Link>
        </div>

        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" asChild>
              <Link href={clinicHref("/clinic/demo")}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Leads</h1>
              <p className="text-muted-foreground">Manage and track your patient leads</p>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads by name, email, or treatment..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="no_response">No Response</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Total", count: 8, color: "bg-gray-100" },
              { label: "New", count: 2, color: "bg-blue-100" },
              { label: "Contacted", count: 2, color: "bg-yellow-100" },
              { label: "Booked", count: 2, color: "bg-green-100" },
              { label: "No Response", count: 1, color: "bg-red-100" },
            ].map((stat) => (
              <Card key={stat.label} className={stat.color}>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{stat.count}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Leads Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Leads ({filteredLeads.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Treatment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-sm text-muted-foreground">{lead.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{lead.treatment}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[lead.status]}>
                          {statusLabels[lead.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(lead.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" title="Call">
                            <Phone className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Email">
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Schedule">
                            <Calendar className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </Suspense>
  )
}
