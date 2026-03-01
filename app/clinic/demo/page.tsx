"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { clinicHref } from "@/lib/clinic-url"
import {
  Users,
  CalendarCheck,
  TrendingUp,
  Clock,
  ChevronRight,
  ArrowUpRight,
  ArrowLeft,
  Eye,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Building2,
  UserCog,
  Settings,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"

// Demo data
const demoStats = {
  totalLeads: 147,
  newLeads: 12,
  bookedLeads: 89,
  conversionRate: 60.5,
  avgResponseTime: 2.4,
  leadsThisWeek: 18,
  leadsLastWeek: 14,
  weeklyChange: 28.6,
}

const demoChartData = [
  { date: "Mon", leads: 4, booked: 2 },
  { date: "Tue", leads: 6, booked: 4 },
  { date: "Wed", leads: 3, booked: 2 },
  { date: "Thu", leads: 8, booked: 5 },
  { date: "Fri", leads: 5, booked: 3 },
  { date: "Sat", leads: 2, booked: 1 },
  { date: "Sun", leads: 1, booked: 1 },
]

const demoLeads = [
  {
    id: "1",
    first_name: "Sarah",
    last_name: "Johnson",
    email: "sarah.j@email.com",
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: { status: "new", updated_at: new Date().toISOString() },
    treatment: "Dental Implants",
  },
  {
    id: "2",
    first_name: "Michael",
    last_name: "Chen",
    email: "m.chen@email.com",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    status: { status: "contacted", updated_at: new Date().toISOString() },
    treatment: "Teeth Whitening",
  },
  {
    id: "3",
    first_name: "Emma",
    last_name: "Williams",
    email: "emma.w@email.com",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    status: { status: "booked", updated_at: new Date().toISOString() },
    treatment: "Invisalign",
  },
  {
    id: "4",
    first_name: "James",
    last_name: "Brown",
    email: "j.brown@email.com",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: { status: "consultation_done", updated_at: new Date().toISOString() },
    treatment: "Veneers",
  },
]

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  booked: "bg-green-100 text-green-800",
  consultation_done: "bg-purple-100 text-purple-800",
  converted: "bg-emerald-100 text-emerald-800",
  lost: "bg-gray-100 text-gray-800",
}

function formatTimeAgo(date: string) {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export default function DemoDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Banner */}
      <div className="bg-blue-600 text-white px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <span className="font-medium">Demo Mode</span>
            <span className="text-blue-200">- Viewing sample clinic dashboard data</span>
          </div>
          <Button variant="outline" size="sm" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600" asChild>
            <Link href="/admin/clinic-users">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Link>
          </Button>
        </div>
      </div>

      {/* Sidebar placeholder */}
      <div className="flex">
        <aside className="w-64 min-h-[calc(100vh-52px)] bg-card border-r p-4 hidden lg:block">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <span className="font-semibold">Pearlie Clinic Portal</span>
          </div>
          <nav className="space-y-1">
            {[
              { name: "Dashboard", href: clinicHref("/clinic/demo"), active: true },
              { name: "Leads", href: clinicHref("/clinic/demo/leads"), active: false },
              { name: "Insights", href: clinicHref("/clinic/demo/insights"), active: false },
              { name: "Profile", href: clinicHref("/clinic/demo/profile"), active: false },
              { name: "Team", href: clinicHref("/clinic/demo/team"), active: false },
              { name: "Settings", href: clinicHref("/clinic/demo/settings"), active: false },
            ].map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-sm ${
                  item.active
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500">Welcome back, Demo Clinic</p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Leads
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{demoStats.totalLeads}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-green-600 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      {demoStats.weeklyChange}% from last week
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    New This Week
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{demoStats.leadsThisWeek}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {demoStats.leadsLastWeek} last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Booked
                  </CardTitle>
                  <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{demoStats.bookedLeads}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {demoStats.conversionRate}% conversion rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Response
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{demoStats.avgResponseTime}h</div>
                  <p className="text-xs text-muted-foreground mt-1">Time to first contact</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Leads Over Time</CardTitle>
                  <CardDescription>Daily lead volume for the past week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={demoChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="leads"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: "#3b82f6" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bookings</CardTitle>
                  <CardDescription>Confirmed appointments this week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={demoChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="booked" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Leads */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Leads</CardTitle>
                  <CardDescription>Latest patient inquiries</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {demoLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {lead.first_name[0]}
                            {lead.last_name[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {lead.first_name} {lead.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{lead.treatment}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={statusColors[lead.status?.status || "new"]}>
                          {lead.status?.status?.replace("_", " ") || "New"}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatTimeAgo(lead.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
