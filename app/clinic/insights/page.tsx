"use client"

import { useEffect, useState, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  TrendingDown,
  Users,
  CalendarCheck,
  Target,
  PoundSterling,
} from "lucide-react"
import { parseRawAnswers } from "@/lib/intake-form-config"
import { getTreatmentValue } from "@/lib/analytics/treatment-values"
import { SCHEMA_VERSION } from "@/lib/intake-form-config"
import { PatientIntentBreakdownCard } from "@/components/admin/patient-intent-breakdown-card"
import { MatchReasonsCard } from "@/components/admin/match-reasons-card"
import { AdminCardErrorBoundary } from "@/components/admin/admin-card-error-boundary"

interface InsightData {
  totalLeads: number
  bookingsConfirmed: number
  bookingsPending: number
  bookingsDeclined: number
  conversionRate: number
  revenueMin: number
  revenueMax: number
  treatmentBreakdown: { name: string; value: number }[]
  statusBreakdown: { name: string; value: number }[]
  weeklyTrend: { week: string; leads: number; booked: number }[]
  monthlyComparison: { month: string; leads: number; booked: number; rate: number }[]
  funnel: {
    views: number
    clicks: number
    bookClicks: number
    bookings: number
  }
  // Full data for admin components
  leads: any[]
  currentFormLeads: any[]
  matchResults: any[]
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"]

export default function InsightsPage() {
  const [data, setData] = useState<InsightData | null>(null)
  const [timeRange, setTimeRange] = useState("30d")
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const supabase = createBrowserClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Get clinic ID
    let clinicId: string | null = null

    const { data: portalUser } = await supabase
      .from("clinic_portal_users")
      .select("clinic_ids")
      .eq("email", session.user.email)
      .single()

    if (portalUser?.clinic_ids?.[0]) {
      clinicId = portalUser.clinic_ids[0]
    } else {
      const { data: clinicUser } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", session.user.id)
        .single()

      clinicId = clinicUser?.clinic_id || null
    }

    if (!clinicId) {
      setIsLoading(false)
      return
    }

    // Calculate date range
    const now = new Date()
    let startDate: Date
    if (timeRange === "7d") startDate = subDays(now, 7)
    else if (timeRange === "30d") startDate = subDays(now, 30)
    else if (timeRange === "90d") startDate = subDays(now, 90)
    else startDate = subMonths(now, 12)

    // Fetch all data in parallel — expanded to get full lead records + match reasons
    const [matchResultsRes, statusesRes, eventsRes] = await Promise.all([
      supabase
        .from("match_results")
        .select("*, leads(*)")
        .eq("clinic_id", clinicId)
        .gte("created_at", startDate.toISOString()),
      supabase
        .from("lead_clinic_status")
        .select("*")
        .eq("clinic_id", clinicId),
      supabase
        .from("analytics_events")
        .select("*")
        .eq("clinic_id", clinicId)
        .gte("created_at", startDate.toISOString())
        .limit(5000),
    ])

    const matchResults = matchResultsRes.data || []
    const statuses = statusesRes.data || []
    const analyticsEvents = eventsRes.data || []

    if (matchResults.length === 0) {
      setData({
        totalLeads: 0,
        bookingsConfirmed: 0,
        bookingsPending: 0,
        bookingsDeclined: 0,
        conversionRate: 0,
        revenueMin: 0,
        revenueMax: 0,
        treatmentBreakdown: [],
        statusBreakdown: [],
        weeklyTrend: [],
        monthlyComparison: [],
        funnel: { views: 0, clicks: 0, bookClicks: 0, bookings: 0 },
        leads: [],
        currentFormLeads: [],
        matchResults: [],
      })
      setIsLoading(false)
      return
    }

    // Extract full lead records from the join
    const leads = matchResults
      .map((mr: any) => mr.leads)
      .filter(Boolean)

    // Filter to current form version for patient insight components
    const currentFormLeads = leads.filter(
      (lead: any) => lead?.schema_version >= SCHEMA_VERSION
    )

    // Match results without the nested leads (for MatchReasonsCard)
    const matchResultsClean = matchResults.map(({ leads: _, ...rest }: any) => rest)

    const statusMap = new Map(statuses.map((s: any) => [s.lead_id, s]))
    const leadIds = matchResults.map((mr: any) => mr.lead_id)

    // Funnel from analytics events
    const funnelViews = analyticsEvents.filter((e: any) => e.event_name === "clinic_card_viewed").length
    const funnelClicks = analyticsEvents.filter((e: any) => e.event_name === "clinic_opened").length
    const funnelBookClicks = analyticsEvents.filter((e: any) => e.event_name === "book_clicked").length

    // Booking stats from leads — only count bookings for THIS clinic
    let bookingsConfirmed = 0
    let bookingsPending = 0
    let bookingsDeclined = 0
    leads.forEach((lead: any) => {
      // Only count if the booking is for this clinic (or no clinic specified)
      if (lead?.booking_clinic_id && lead.booking_clinic_id !== clinicId) return
      if (lead?.booking_status === "confirmed") bookingsConfirmed++
      else if (lead?.booking_status === "pending" || lead?.booking_status === "requested") bookingsPending++
      else if (lead?.booking_status === "declined") bookingsDeclined++
    })

    // Revenue opportunity from leads who clicked book for this clinic
    const bookedLeadIds = new Set(
      analyticsEvents
        .filter((e: any) => e.event_name === "book_clicked")
        .map((e: any) => e.lead_id)
        .filter(Boolean)
    )
    let revenueMin = 0
    let revenueMax = 0
    leads.forEach((lead: any) => {
      if (!bookedLeadIds.has(lead?.id)) return
      const parsed = parseRawAnswers(lead?.raw_answers)
      const treatments = parsed?.treatments || []
      treatments.forEach((t: string) => {
        if (t) {
          const value = getTreatmentValue(t)
          revenueMin += value.minPence
          revenueMax += value.maxPence
        }
      })
    })
    revenueMin = revenueMin / 100 // pence to pounds
    revenueMax = revenueMax / 100

    // Also count from lead_clinic_status BOOKED_CONFIRMED as a fallback
    const statusBooked = statuses.filter((s: any) => s.status === "BOOKED_CONFIRMED").length
    const totalBooked = Math.max(bookingsConfirmed, statusBooked)

    const totalLeads = matchResults.length
    const conversionRate = totalLeads > 0 ? Math.round((totalBooked / totalLeads) * 100) : 0

    // Treatment breakdown using parseRawAnswers for accuracy
    const treatmentCounts: Record<string, number> = {}
    leads.forEach((lead: any) => {
      const parsed = parseRawAnswers(lead?.raw_answers)
      const treatments = parsed?.treatments || []
      if (treatments.length > 0) {
        treatments.forEach((t: string) => {
          if (t) treatmentCounts[t] = (treatmentCounts[t] || 0) + 1
        })
      } else {
        // Fallback for leads without parsed treatments
        const treatment = (lead?.raw_answers?.treatment as string) || "Other"
        treatmentCounts[treatment] = (treatmentCounts[treatment] || 0) + 1
      }
    })
    const treatmentBreakdown = Object.entries(treatmentCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)

    // Status breakdown
    const statusCounts: Record<string, number> = {
      NEW: 0,
      CONTACTED: 0,
      IN_PROGRESS: 0,
      BOOKED_CONFIRMED: 0,
      NOT_SUITABLE: 0,
      NO_RESPONSE: 0,
      CLOSED: 0,
    }
    matchResults.forEach((mr: any) => {
      const status = statusMap.get(mr.lead_id)?.status || "NEW"
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })
    const statusBreakdown = Object.entries(statusCounts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({
        name: name.replace("_", " "),
        value,
      }))

    // Weekly trend (last 8 weeks)
    const weeklyData: Record<string, { leads: number; booked: number }> = {}
    for (let i = 7; i >= 0; i--) {
      const weekStart = subDays(now, i * 7 + 6)
      const weekKey = format(weekStart, "MMM d")
      weeklyData[weekKey] = { leads: 0, booked: 0 }
    }

    matchResults.forEach((mr: any) => {
      const weekStart = subDays(new Date(mr.created_at), new Date(mr.created_at).getDay())
      const weekKey = format(weekStart, "MMM d")
      if (weeklyData[weekKey]) {
        weeklyData[weekKey].leads++
        if (statusMap.get(mr.lead_id)?.status === "BOOKED_CONFIRMED") {
          weeklyData[weekKey].booked++
        }
      }
    })

    const weeklyTrend = Object.entries(weeklyData).map(([week, data]) => ({
      week,
      ...data,
    }))

    // Monthly comparison (last 6 months)
    const monthlyData: { month: string; leads: number; booked: number; rate: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const monthStart = startOfMonth(monthDate)
      const monthEnd = endOfMonth(monthDate)
      const monthKey = format(monthDate, "MMM")

      const monthLeads = matchResults.filter((mr: any) => {
        const date = new Date(mr.created_at)
        return date >= monthStart && date <= monthEnd
      })

      const monthBooked = monthLeads.filter(
        (ml: any) => statusMap.get(ml.lead_id)?.status === "BOOKED_CONFIRMED"
      ).length

      monthlyData.push({
        month: monthKey,
        leads: monthLeads.length,
        booked: monthBooked,
        rate: monthLeads.length > 0 ? Math.round((monthBooked / monthLeads.length) * 100) : 0,
      })
    }

    setData({
      totalLeads,
      bookingsConfirmed,
      bookingsPending,
      bookingsDeclined,
      conversionRate,
      revenueMin,
      revenueMax,
      treatmentBreakdown,
      statusBreakdown,
      weeklyTrend,
      monthlyComparison: monthlyData,
      funnel: {
        views: funnelViews,
        clicks: funnelClicks,
        bookClicks: funnelBookClicks,
        bookings: totalBooked,
      },
      leads,
      currentFormLeads,
      matchResults: matchResultsClean,
    })

    setIsLoading(false)
  }, [timeRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
          <p className="text-muted-foreground">Analytics and performance metrics</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="12m">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Conversion Funnel
          </CardTitle>
          <CardDescription>Patient journey from viewing your clinic to booking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-stretch gap-0">
            {/* Views */}
            <div className="flex-1 relative">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-l-lg md:rounded-l-xl p-6 text-center h-full flex flex-col justify-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {data?.funnel.views || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Views</div>
                <div className="text-xs text-muted-foreground">Clinic card shown</div>
              </div>
              <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 bg-background rounded-full p-1 border">
                <TrendingDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
              </div>
            </div>

            {/* Clicks */}
            <div className="flex-1 relative">
              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-6 text-center h-full flex flex-col justify-center">
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {data?.funnel.clicks || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Clicks</div>
                <div className="text-xs text-muted-foreground">Opened clinic page</div>
                {(data?.funnel.views || 0) > 0 && (
                  <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-2">
                    {((data?.funnel.clicks || 0) / (data?.funnel.views || 1) * 100).toFixed(1)}% CTR
                  </div>
                )}
              </div>
              <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 bg-background rounded-full p-1 border">
                <TrendingDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
              </div>
            </div>

            {/* Book Clicks */}
            <div className="flex-1 relative">
              <div className="bg-amber-50 dark:bg-amber-950/30 p-6 text-center h-full flex flex-col justify-center">
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {data?.funnel.bookClicks || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Book Clicks</div>
                <div className="text-xs text-muted-foreground">Clicked book button</div>
                {(data?.funnel.clicks || 0) > 0 && (
                  <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-2">
                    {((data?.funnel.bookClicks || 0) / (data?.funnel.clicks || 1) * 100).toFixed(1)}% intent
                  </div>
                )}
              </div>
              <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 bg-background rounded-full p-1 border">
                <TrendingDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
              </div>
            </div>

            {/* Bookings */}
            <div className="flex-1">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-r-lg md:rounded-r-xl p-6 text-center h-full flex flex-col justify-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {data?.funnel.bookings || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Bookings</div>
                <div className="text-xs text-muted-foreground">Confirmed appointments</div>
                {(data?.funnel.bookClicks || 0) > 0 && (
                  <div className="text-xs font-medium text-green-600 dark:text-green-400 mt-2">
                    {((data?.funnel.bookings || 0) / (data?.funnel.bookClicks || 1) * 100).toFixed(1)}% converted
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Overall conversion */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall conversion (views to bookings)</span>
            <span className="font-semibold">
              {(data?.funnel.views || 0) > 0
                ? ((data?.funnel.bookings || 0) / (data?.funnel.views || 1) * 100).toFixed(2)
                : "0.00"}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Leads
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Patients matched to your clinic
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bookings
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.bookingsConfirmed || 0}</div>
            <div className="flex gap-3 text-xs mt-1">
              {(data?.bookingsPending || 0) > 0 && (
                <span className="text-amber-600">{data?.bookingsPending} pending</span>
              )}
              {(data?.bookingsDeclined || 0) > 0 && (
                <span className="text-red-500">{data?.bookingsDeclined} declined</span>
              )}
              {(data?.bookingsConfirmed || 0) === 0 && (data?.bookingsPending || 0) === 0 && (data?.bookingsDeclined || 0) === 0 && (
                <span className="text-muted-foreground">No booking activity yet</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversion Rate
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Leads to confirmed bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue Opportunity
            </CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data?.revenueMin || 0) > 0
                ? `£${Math.round(data!.revenueMin).toLocaleString()}`
                : "—"}
            </div>
            {(data?.revenueMax || 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Up to £{Math.round(data!.revenueMax).toLocaleString()}
              </p>
            )}
            {(data?.revenueMin || 0) === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                From patients who clicked book
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts & Insights */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="intent">Patient Insights</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Lead & Booking Trends</CardTitle>
              <CardDescription>Lead volume and conversions by week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.weeklyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="leads" name="Leads" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="booked" name="Booked" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Treatments Requested</CardTitle>
                <CardDescription>Most popular treatment interests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.treatmentBreakdown || []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {(data?.treatmentBreakdown || []).map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead Status Distribution</CardTitle>
                <CardDescription>Current status of all leads</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.statusBreakdown || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 12 }}
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="intent" className="space-y-4">
          {/* Patient Intent Breakdown — uses the same component as admin for consistency */}
          <AdminCardErrorBoundary cardName="Patient Intent Breakdown">
            <PatientIntentBreakdownCard leads={data?.currentFormLeads || []} />
          </AdminCardErrorBoundary>

          {/* Match Reasons — why patients are being matched to this clinic */}
          <AdminCardErrorBoundary cardName="Match Reasons">
            <MatchReasonsCard matchResults={data?.matchResults || []} />
          </AdminCardErrorBoundary>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
              <CardDescription>Leads, bookings, and conversion rate by month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.monthlyComparison || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="leads"
                      name="Leads"
                      stroke="#3B82F6"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="booked"
                      name="Booked"
                      stroke="#10B981"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="rate"
                      name="Conversion %"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
