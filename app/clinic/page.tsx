"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow, format, subDays } from "date-fns"
import {
  Users,
  CalendarCheck,
  TrendingUp,
  Clock,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  MessageCircle,
  Star,
  Building2,
  Zap,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import Link from "next/link"

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  created_at: string
  raw_answers: Record<string, unknown>
  status?: {
    status: string
    updated_at: string
  }
}

interface DashboardStats {
  totalLeads: number
  newLeads: number
  bookedLeads: number
  conversionRate: number
  leadsThisWeek: number
  leadsLastWeek: number
  weeklyChange: number
}

interface ChartData {
  date: string
  leads: number
  booked: number
}

interface ClinicInfo {
  name: string
  verified: boolean
  google_rating: number | null
  google_review_count: number | null
}

export default function ClinicDashboardPage() {
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    try {
      // Fetch clinic profile info via API
      const profileRes = await fetch("/api/clinic/profile")
      if (!profileRes.ok) {
        setIsLoading(false)
        return
      }
      const { clinic } = await profileRes.json()
      setClinicInfo({
        name: clinic.name,
        verified: clinic.verified,
        google_rating: clinic.google_rating,
        google_review_count: clinic.google_review_count,
      })

      const clinicId = clinic.id
      const supabase = createBrowserClient()

      // Fetch match results for this clinic
      const { data: matchResults } = await supabase
        .from("match_results")
        .select(`
          lead_id,
          created_at,
          leads(id, first_name, last_name, email, created_at, raw_answers)
        `)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })

      if (!matchResults) {
        setIsLoading(false)
        return
      }

      const leadIds = matchResults.map((mr) => mr.lead_id)

      // Fetch statuses
      const { data: statuses } = await supabase
        .from("lead_clinic_status")
        .select("*")
        .eq("clinic_id", clinicId)
        .in("lead_id", leadIds.length > 0 ? leadIds : ["none"])

      const statusMap = new Map(
        statuses?.map((s) => [s.lead_id, s]) || []
      )

      // Build leads with status
      const allLeads = matchResults
        .filter((mr) => mr.leads)
        .map((mr) => ({
          ...(mr.leads as unknown as Lead),
          status: statusMap.get(mr.lead_id),
        }))

      // Recent leads (last 5)
      setRecentLeads(allLeads.slice(0, 5))

      // Calculate stats
      const now = new Date()
      const weekAgo = subDays(now, 7)
      const twoWeeksAgo = subDays(now, 14)

      const leadsThisWeek = allLeads.filter(
        (l) => new Date(l.created_at) >= weekAgo
      ).length

      const leadsLastWeek = allLeads.filter(
        (l) =>
          new Date(l.created_at) >= twoWeeksAgo &&
          new Date(l.created_at) < weekAgo
      ).length

      const newLeads = allLeads.filter(
        (l) => !l.status || l.status.status === "NEW"
      ).length

      const bookedLeads = allLeads.filter(
        (l) => l.status?.status === "BOOKED_CONFIRMED"
      ).length

      const conversionRate =
        allLeads.length > 0
          ? Math.round((bookedLeads / allLeads.length) * 100)
          : 0

      const weeklyChange =
        leadsLastWeek > 0
          ? Math.round(
              ((leadsThisWeek - leadsLastWeek) / leadsLastWeek) * 100
            )
          : leadsThisWeek > 0
            ? 100
            : 0

      setStats({
        totalLeads: allLeads.length,
        newLeads,
        bookedLeads,
        conversionRate,
        leadsThisWeek,
        leadsLastWeek,
        weeklyChange,
      })

      // Build chart data for last 14 days
      const chartDataMap = new Map<
        string,
        { leads: number; booked: number }
      >()
      for (let i = 13; i >= 0; i--) {
        const date = format(subDays(now, i), "MMM d")
        chartDataMap.set(date, { leads: 0, booked: 0 })
      }

      for (const lead of allLeads) {
        const date = format(new Date(lead.created_at), "MMM d")
        if (chartDataMap.has(date)) {
          const data = chartDataMap.get(date)!
          data.leads++
          if (lead.status?.status === "BOOKED_CONFIRMED") {
            data.booked++
          }
        }
      }

      setChartData(
        Array.from(chartDataMap.entries()).map(([date, data]) => ({
          date,
          ...data,
        }))
      )
    } catch (error) {
      console.error("Dashboard fetch error:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9F7AEA]" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      {/* Welcome Header with Performance Widget */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{clinicInfo?.name ? `, ${clinicInfo.name}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Here is an overview of your clinic on Pearlie
          </p>
        </div>

        {/* Performance Mini Widget */}
        <div className="hidden lg:flex items-center gap-3 bg-card border rounded-xl p-3">
          <div className="text-center px-3 border-r">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Leads</p>
            <p className="text-xl font-bold">{stats?.totalLeads || 0}</p>
          </div>
          <div className="text-center px-3 border-r">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Booked</p>
            <p className="text-xl font-bold text-green-600">{stats?.bookedLeads || 0}</p>
          </div>
          <div className="text-center px-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Rate</p>
            <p className="text-xl font-bold text-[#9F7AEA]">{stats?.conversionRate || 0}%</p>
          </div>
          {clinicInfo?.google_rating && (
            <div className="text-center px-3 border-l">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Rating</p>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-xl font-bold">{clinicInfo.google_rating}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Leads
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-[#F5F0FF] flex items-center justify-center">
              <Users className="h-4 w-4 text-[#9F7AEA]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLeads || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {(stats?.weeklyChange || 0) >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600 mr-0.5" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-0.5" />
              )}
              <span
                className={
                  stats?.weeklyChange && stats.weeklyChange >= 0
                    ? "text-green-600"
                    : "text-red-500"
                }
              >
                {Math.abs(stats?.weeklyChange || 0)}%
              </span>
              <span className="ml-1">vs last week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New Leads
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Zap className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.newLeads || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting contact</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Booked
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
              <CalendarCheck className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.bookedLeads || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Confirmed appointments</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversion
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-[#F5F0FF] flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-[#9F7AEA]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">Lead to booking</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Lead Volume Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lead Activity</CardTitle>
            <CardDescription>Leads received over the last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="leads" fill="#9F7AEA" radius={[4, 4, 0, 0]} name="Leads" />
                  <Bar dataKey="booked" fill="#48BB78" radius={[4, 4, 0, 0]} name="Booked" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/clinic/leads">
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">View Leads</p>
                    <p className="text-xs text-muted-foreground">
                      {stats?.newLeads || 0} new leads waiting
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
              <Link href="/clinic/inbox">
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Inbox</p>
                    <p className="text-xs text-muted-foreground">Check messages</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
              <Link href="/clinic/profile">
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="h-9 w-9 rounded-lg bg-[#F5F0FF] flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-[#9F7AEA]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Edit Profile</p>
                    <p className="text-xs text-muted-foreground">Update your clinic info</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* This Week Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Leads received</span>
                  <span className="text-sm font-semibold">{stats?.leadsThisWeek || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last week</span>
                  <span className="text-sm font-semibold">{stats?.leadsLastWeek || 0}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Change</span>
                  <span
                    className={`text-sm font-semibold ${
                      (stats?.weeklyChange || 0) >= 0
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {(stats?.weeklyChange || 0) >= 0 ? "+" : ""}
                    {stats?.weeklyChange || 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base">Recent Leads</CardTitle>
            <CardDescription>Latest patient enquiries matched to your clinic</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs bg-transparent"
            onClick={() => router.push("/clinic/leads")}
          >
            View all
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No leads yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                When patients are matched to your clinic, they will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => {
                const status = lead.status?.status || "NEW"
                const treatment =
                  (lead.raw_answers?.treatment as string) || "Dental treatment"

                return (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/clinic/leads/${lead.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        router.push(`/clinic/leads/${lead.id}`)
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium">
                          {lead.first_name?.[0]}
                          {lead.last_name?.[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {lead.first_name} {lead.last_name}
                          </p>
                          <Badge
                            variant={status === "NEW" ? "default" : "secondary"}
                            className={`text-[10px] h-5 ${
                              status === "NEW"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : status === "BOOKED_CONFIRMED"
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : ""
                            }`}
                          >
                            {status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {treatment}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                      {formatDistanceToNow(new Date(lead.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
