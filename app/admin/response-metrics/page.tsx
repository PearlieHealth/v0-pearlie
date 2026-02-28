export const dynamic = "force-dynamic"

import { AdminNav } from "@/components/admin/admin-nav"
import { ResponseMetricsPanel } from "@/components/admin/response-metrics-panel"

export default function ResponseMetricsPage() {
  return (
    <div className="min-h-screen bg-[#faf6f0]">
      <AdminNav />
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Response Tracking</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track how quickly clinics respond to patient messages and identify slow responders.
          </p>
        </div>
        <ResponseMetricsPanel />
      </div>
    </div>
  )
}
