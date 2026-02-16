import type React from "react"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { PatientJourneyFunnel } from "@/components/admin/patient-journey-funnel"
import { RevenueOpportunityCard } from "@/components/admin/revenue-opportunity-card"
import { EnhancedLeadsTable } from "@/components/admin/enhanced-leads-table"
import { ClinicPerformanceTable } from "@/components/admin/clinic-performance-table"
import { FormDropOffChart } from "@/components/admin/form-drop-off-chart"
import { ConversionBlockersPanel } from "@/components/admin/conversion-blockers-panel"
import { OutcomePrioritiesCard } from "@/components/admin/outcome-priorities-card"
import { MatchReasonsCard } from "@/components/admin/match-reasons-card"
import { PatientIntentBreakdownCard } from "@/components/admin/patient-intent-breakdown-card"
import { ExecutiveSnapshot } from "@/components/admin/executive-snapshot"
import { AdvancedInsightsPreview } from "@/components/admin/advanced-insights-preview"
import { BlockerAnalysisCard } from "@/components/admin/blocker-analysis-card"
import { FlowSplitCard } from "@/components/admin/flow-split-card"
import { PreferredTimesCard } from "@/components/admin/preferred-times-card"
import { LocationPreferenceCard } from "@/components/admin/location-preference-card"
import { PostcodeDemandCard } from "@/components/admin/postcode-demand-card"
import { FinanceInsightsCard } from "@/components/admin/finance-insights-card"
import { TreatmentBenchmarksCard } from "@/components/admin/treatment-benchmarks-card"
import { BookingOutcomesCard } from "@/components/admin/booking-outcomes-card"
import { CrossSegmentCard } from "@/components/admin/cross-segment-card"
import { DateRangeSelector } from "@/components/admin/date-range-selector"
import { SelfTestButton } from "@/components/admin/self-test-button"
import { AnalyticsSelfCheckButton } from "@/components/admin/analytics-self-check-button"
import { LiveFlowTestButton } from "@/components/admin/live-flow-test-button"
import { QAStatusBanner } from "@/components/admin/qa-status-banner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { AdminNav } from "@/components/admin/admin-nav"
import { normalizeAnalyticsData } from "@/lib/analytics/normalize-analytics"
import { AdminCardErrorBoundary } from "@/components/admin/admin-card-error-boundary"

export default async function AnalyticsDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ days?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const daysParam = params?.days

  // Compute date cutoff from search params
  let dateFrom: string | null = null
  let prevDateFrom: string | null = null
  let prevDateTo: string | null = null
  const days = daysParam && ["7", "30", "90"].includes(daysParam) ? Number(daysParam) : null

  if (days) {
    const now = new Date()
    const from = new Date(now)
    from.setDate(from.getDate() - days)
    dateFrom = from.toISOString()

    // Previous period: same duration before dateFrom
    const prevFrom = new Date(from)
    prevFrom.setDate(prevFrom.getDate() - days)
    prevDateFrom = prevFrom.toISOString()
    prevDateTo = dateFrom
  }

  let fetchError: string | null = null
  let rawData: {
    leads: any[] | null
    matches: any[] | null
    events: any[] | null
    clinics: any[] | null
    matchResults: any[] | null
  } = {
    leads: null,
    matches: null,
    events: null,
    clinics: null,
    matchResults: null,
  }

  try {
    // Build queries with optional date filtering
    let leadsQuery = supabase.from("leads").select("*").order("created_at", { ascending: false })
    let matchesQuery = supabase.from("matches").select("*").order("created_at", { ascending: false })
    let eventsQuery = supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(10000)
    const clinicsQuery = supabase.from("clinics").select("id, name")
    let matchResultsQuery = supabase.from("match_results").select("*")

    if (dateFrom) {
      leadsQuery = leadsQuery.gte("created_at", dateFrom)
      matchesQuery = matchesQuery.gte("created_at", dateFrom)
      eventsQuery = eventsQuery.gte("created_at", dateFrom)
      matchResultsQuery = matchResultsQuery.gte("created_at", dateFrom)
    }

    const [leadsRes, matchesRes, eventsRes, clinicsRes, matchResultsRes] = await Promise.all([
      leadsQuery,
      matchesQuery,
      eventsQuery,
      clinicsQuery,
      matchResultsQuery,
    ])

    rawData = {
      leads: leadsRes.data,
      matches: matchesRes.data,
      events: eventsRes.data,
      clinics: clinicsRes.data,
      matchResults: matchResultsRes.data,
    }
  } catch (error) {
    console.error("[Analytics] Database fetch error:", error)
    fetchError = "Failed to load analytics data. Please refresh the page."
  }

  const analytics = normalizeAnalyticsData(rawData)

  // Fetch previous period data for delta comparison (only when a date range is active)
  let prevAnalytics: typeof analytics | null = null
  if (prevDateFrom && prevDateTo) {
    try {
      const [prevLeads, prevMatches, prevEvents, prevMatchResults] = await Promise.all([
        supabase.from("leads").select("*").gte("created_at", prevDateFrom).lt("created_at", prevDateTo),
        supabase.from("matches").select("*").gte("created_at", prevDateFrom).lt("created_at", prevDateTo),
        supabase.from("analytics_events").select("*").gte("created_at", prevDateFrom).lt("created_at", prevDateTo).limit(10000),
        supabase.from("match_results").select("*").gte("created_at", prevDateFrom).lt("created_at", prevDateTo),
      ])
      prevAnalytics = normalizeAnalyticsData({
        leads: prevLeads.data,
        matches: prevMatches.data,
        events: prevEvents.data,
        clinics: rawData.clinics, // clinics don't change between periods
        matchResults: prevMatchResults.data,
      })
    } catch (error) {
      console.error("[Analytics] Previous period fetch error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <AdminNav />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <QAStatusBanner />

        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
            {fetchError}
          </div>
        )}

        {/* Desktop header with test buttons */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-[#1a2332]">Analytics Dashboard</h1>
            <Suspense>
              <DateRangeSelector />
            </Suspense>
          </div>
          <div className="flex items-center gap-2">
            <LiveFlowTestButton />
            <SelfTestButton />
            <AnalyticsSelfCheckButton />
          </div>
        </div>

        {/* Mobile header */}
        <div className="md:hidden mb-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-[#1a2332]">Analytics Dashboard</h1>
            <Suspense>
              <DateRangeSelector />
            </Suspense>
          </div>
          <div className="flex flex-wrap gap-2">
            <LiveFlowTestButton />
            <SelfTestButton />
            <AnalyticsSelfCheckButton />
          </div>
        </div>

        {/* Executive Snapshot */}
        <AdminCardErrorBoundary cardName="Executive Snapshot">
          <ExecutiveSnapshot
            totalLeads={analytics.leads.length}
            matchesShown={analytics.funnel.matchesShown}
            clinicClicks={analytics.funnel.clinicClicks}
            bookingClicks={analytics.funnel.bookedConsults}
            bookingsConfirmed={analytics.bookingsConfirmed}
            bookingsPending={analytics.bookingsPending}
            bookingsDeclined={analytics.bookingsDeclined}
            revenueMin={analytics.totalRevenuePotentialMin}
            avgClinicsViewed={analytics.avgClinicsViewed}
            prevPeriod={prevAnalytics ? {
              totalLeads: prevAnalytics.leads.length,
              matchesShown: prevAnalytics.funnel.matchesShown,
              bookingClicks: prevAnalytics.funnel.bookedConsults,
              bookingsConfirmed: prevAnalytics.bookingsConfirmed,
              revenueMin: prevAnalytics.totalRevenuePotentialMin,
            } : undefined}
          />
        </AdminCardErrorBoundary>

        {/* ================================================================
            TAB LAYOUT
            1. Overview       — Core business metrics (funnel, bookings, treatment conversion, revenue)
            2. Patient Insights — Psychology & preferences (intent, blockers, finance, cross-segment)
            3. Clinics        — Per-clinic performance + postcode demand
            4. Engagement     — Form analytics + conversion blockers
            5. Leads          — Raw data table
            ================================================================ */}
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="flex w-full mb-6 h-auto overflow-x-auto">
            <TabsTrigger value="overview" className="text-xs md:text-sm py-2 flex-1 min-w-0">
              Overview
            </TabsTrigger>
            <TabsTrigger value="psychology" className="text-xs md:text-sm py-2 flex-1 min-w-0">
              Patient Insights
            </TabsTrigger>
            <TabsTrigger value="clinics" className="text-xs md:text-sm py-2 flex-1 min-w-0">
              Clinics
            </TabsTrigger>
            <TabsTrigger value="engagement" className="text-xs md:text-sm py-2 flex-1 min-w-0">
              Engagement
            </TabsTrigger>
            <TabsTrigger value="leads" className="text-xs md:text-sm py-2 flex-1 min-w-0">
              Leads
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview">
            <div className="grid gap-4 md:gap-6 md:grid-cols-2">
              <AdminCardErrorBoundary cardName="Patient Journey Funnel">
                <PatientJourneyFunnel
                  leadsSubmitted={analytics.funnel.leadsSubmitted}
                  matchesShown={analytics.funnel.matchesShown}
                  clinicClicks={analytics.funnel.clinicClicks}
                  bookedConsults={analytics.funnel.bookedConsults}
                  bookingsConfirmed={analytics.bookingsConfirmed}
                />
              </AdminCardErrorBoundary>

              <AdminCardErrorBoundary cardName="Booking Outcomes">
                <BookingOutcomesCard
                  leads={analytics.leads}
                  clinicMap={analytics.clinicMap}
                />
              </AdminCardErrorBoundary>
            </div>

            <div className="mt-4 md:mt-6">
              <AdminCardErrorBoundary cardName="Treatment Benchmarks">
                <TreatmentBenchmarksCard
                  leads={analytics.leads}
                  events={analytics.events}
                />
              </AdminCardErrorBoundary>
            </div>

            <div className="mt-4 md:mt-6">
              <AdminCardErrorBoundary cardName="Revenue Opportunity">
                <RevenueOpportunityCard
                  bookedTreatmentCounts={analytics.bookedTreatmentCounts}
                  totalPotentialMin={analytics.totalRevenuePotentialMin}
                  totalPotentialMax={analytics.totalRevenuePotentialMax}
                  bookedLeadsCount={analytics.bookedLeadsCount}
                />
              </AdminCardErrorBoundary>
            </div>
          </TabsContent>

          {/* TAB 2: PATIENT INSIGHTS */}
          <TabsContent value="psychology">
            <div className="grid gap-4 md:gap-6 md:grid-cols-2">
              <AdminCardErrorBoundary cardName="Outcome Priorities">
                <OutcomePrioritiesCard leads={analytics.leads} />
              </AdminCardErrorBoundary>

              <AdminCardErrorBoundary cardName="Match Reasons">
                <MatchReasonsCard matchResults={analytics.matchResults} />
              </AdminCardErrorBoundary>
            </div>

            <div className="mt-4 md:mt-6">
              <AdminCardErrorBoundary cardName="Patient Intent Breakdown">
                <PatientIntentBreakdownCard leads={analytics.leads} />
              </AdminCardErrorBoundary>
            </div>

            <div className="grid gap-4 md:gap-6 md:grid-cols-2 mt-4 md:mt-6">
              <AdminCardErrorBoundary cardName="Blocker Analysis">
                <BlockerAnalysisCard leads={analytics.leads} />
              </AdminCardErrorBoundary>

              <AdminCardErrorBoundary cardName="Flow Split">
                <FlowSplitCard leads={analytics.leads} />
              </AdminCardErrorBoundary>
            </div>

            <div className="grid gap-4 md:gap-6 md:grid-cols-2 mt-4 md:mt-6">
              <AdminCardErrorBoundary cardName="Finance Insights">
                <FinanceInsightsCard leads={analytics.leads} />
              </AdminCardErrorBoundary>

              <AdminCardErrorBoundary cardName="Location Preference">
                <LocationPreferenceCard leads={analytics.leads} />
              </AdminCardErrorBoundary>
            </div>

            <div className="grid gap-4 md:gap-6 md:grid-cols-2 mt-4 md:mt-6">
              <AdminCardErrorBoundary cardName="Preferred Times">
                <PreferredTimesCard leads={analytics.leads} />
              </AdminCardErrorBoundary>
            </div>

            <div className="mt-4 md:mt-6">
              <AdminCardErrorBoundary cardName="Cross-Segment Intelligence">
                <CrossSegmentCard leads={analytics.leads} />
              </AdminCardErrorBoundary>
            </div>
          </TabsContent>

          {/* TAB 3: CLINIC PERFORMANCE */}
          <TabsContent value="clinics">
            <AdminCardErrorBoundary cardName="Clinic Performance">
              <ClinicPerformanceTable
                events={analytics.events}
                clinicMap={analytics.clinicMap}
                leads={analytics.leads}
                matchResults={analytics.matchResults}
              />
            </AdminCardErrorBoundary>

            <div className="mt-4 md:mt-6">
              <AdminCardErrorBoundary cardName="Postcode Demand">
                <PostcodeDemandCard leads={analytics.leads} />
              </AdminCardErrorBoundary>
            </div>
          </TabsContent>

          {/* TAB 4: ENGAGEMENT & CONVERSION */}
          <TabsContent value="engagement">
            <div className="grid gap-4 md:gap-6 md:grid-cols-2">
              <AdminCardErrorBoundary cardName="Form Drop-Off">
                <Card className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold mb-4">Form Drop-Off Analysis</h3>
                  <FormDropOffChart events={analytics.events} />
                </Card>
              </AdminCardErrorBoundary>

              <AdminCardErrorBoundary cardName="Conversion Blockers">
                <ConversionBlockersPanel events={analytics.events} />
              </AdminCardErrorBoundary>
            </div>

            <div className="mt-4 md:mt-6">
              <AdminCardErrorBoundary cardName="Advanced Insights">
                <AdvancedInsightsPreview />
              </AdminCardErrorBoundary>
            </div>
          </TabsContent>

          {/* TAB 5: LEADS TABLE */}
          <TabsContent value="leads">
            <AdminCardErrorBoundary cardName="Leads Table">
              <EnhancedLeadsTable leads={analytics.leads} />
            </AdminCardErrorBoundary>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
