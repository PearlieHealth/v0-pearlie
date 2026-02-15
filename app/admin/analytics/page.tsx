import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { PatientJourneyFunnel } from "@/components/admin/patient-journey-funnel"
import { RevenueOpportunityCard } from "@/components/admin/revenue-opportunity-card"
import { EnhancedLeadsTable } from "@/components/admin/enhanced-leads-table"
import { ClinicClicksTable } from "@/components/admin/clinic-clicks-table"
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
import { SelfTestButton } from "@/components/admin/self-test-button"
import { AnalyticsSelfCheckButton } from "@/components/admin/analytics-self-check-button"
import { LiveFlowTestButton } from "@/components/admin/live-flow-test-button"
import { QAStatusBanner } from "@/components/admin/qa-status-banner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { AdminNav } from "@/components/admin/admin-nav"
import { normalizeAnalyticsData } from "@/lib/analytics/normalize-analytics"
import { AdminCardErrorBoundary } from "@/components/admin/admin-card-error-boundary"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function MetricWithTooltip({
  label,
  tooltip,
  children,
}: { label: string; tooltip: string; children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <Tooltip>
          <TooltipTrigger>
            <HelpCircle className="w-3 h-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
        {children}
      </div>
    </TooltipProvider>
  )
}

export default async function AnalyticsDashboard() {
  const supabase = await createClient()

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
    const [leadsRes, matchesRes, eventsRes, clinicsRes, matchResultsRes] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("matches").select("*").order("created_at", { ascending: false }),
      supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(10000),
      supabase.from("clinics").select("id, name"),
      supabase.from("match_results").select("*"),
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
  }

  const analytics = normalizeAnalyticsData(rawData)

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <AdminNav currentPath="/admin/analytics" />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <QAStatusBanner />

        {/* Desktop header with test buttons */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-[#1a2332]">Analytics Dashboard</h1>
          <div className="flex items-center gap-2">
            <LiveFlowTestButton />
            <SelfTestButton />
            <AnalyticsSelfCheckButton />
          </div>
        </div>

        {/* Mobile header */}
        <div className="md:hidden mb-4">
          <h1 className="text-lg font-bold text-[#1a2332] mb-3">Analytics Dashboard</h1>
          <div className="flex flex-wrap gap-2">
            <LiveFlowTestButton />
            <SelfTestButton />
            <AnalyticsSelfCheckButton />
          </div>
        </div>

        {/* Executive Snapshot - wrapped in error boundary */}
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
          />
        </AdminCardErrorBoundary>

        <Tabs defaultValue="funnel" className="mt-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6 h-auto">
            <TabsTrigger value="funnel" className="text-xs md:text-sm py-2">
              Conversion Funnel
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs md:text-sm py-2">
              Patient Insights
            </TabsTrigger>
            <TabsTrigger value="clinics" className="text-xs md:text-sm py-2">
              Clinic Performance
            </TabsTrigger>
            <TabsTrigger value="leads" className="text-xs md:text-sm py-2">
              Leads Table
            </TabsTrigger>
          </TabsList>

          <TabsContent value="funnel">
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

              <AdminCardErrorBoundary cardName="Conversion Blockers">
                <Card className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold mb-4">Conversion Intelligence</h3>
                  <FormDropOffChart events={analytics.events} />
                </Card>
              </AdminCardErrorBoundary>
            </div>

            <div className="grid gap-4 md:gap-6 md:grid-cols-2 mt-4 md:mt-6">
              <AdminCardErrorBoundary cardName="Conversion Blockers Panel">
                <ConversionBlockersPanel events={analytics.events} />
              </AdminCardErrorBoundary>

              <AdminCardErrorBoundary cardName="Revenue Opportunity">
                <RevenueOpportunityCard
                  bookedTreatmentCounts={analytics.bookedTreatmentCounts}
                  totalPotentialMin={analytics.totalRevenuePotentialMin}
                  totalPotentialMax={analytics.totalRevenuePotentialMax}
                  bookedLeadsCount={analytics.bookedLeadsCount}
                />
              </AdminCardErrorBoundary>
            </div>

            <div className="mt-4 md:mt-6">
              <AdminCardErrorBoundary cardName="Advanced Insights">
                <AdvancedInsightsPreview />
              </AdminCardErrorBoundary>
            </div>
          </TabsContent>

          <TabsContent value="insights">
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
              <AdminCardErrorBoundary cardName="Preferred Times">
                <PreferredTimesCard leads={analytics.leads} />
              </AdminCardErrorBoundary>

              <AdminCardErrorBoundary cardName="Location Preference">
                <LocationPreferenceCard leads={analytics.leads} />
              </AdminCardErrorBoundary>
            </div>
          </TabsContent>

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
