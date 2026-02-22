"use client"

import { Card } from "@/components/ui/card"
import { Lock, TrendingUp, Target, Clock, MapPin, BarChart3, RefreshCcw, Brain } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function AdvancedInsightsPreview(_props?: {
  formCompletionRate?: string
  clinicClickRate?: string
  bookingRate?: string
  avgClinicsViewed?: number
  pctBookFromFirst?: number
}) {
  const proFeatures = [
    {
      icon: Target,
      title: "Clinic Performance vs Platform Average",
      description: "Compare individual clinic conversion rates against network benchmarks",
    },
    {
      icon: TrendingUp,
      title: "Revenue Realised vs Opportunity Gap",
      description: "Track actual bookings against potential revenue from all leads",
    },
    {
      icon: Brain,
      title: "Patient Hesitation Index",
      description: "AI-derived score measuring decision friction and objection patterns",
    },
    {
      icon: Clock,
      title: "Time-to-Decision Analytics",
      description: "Average time from match to booking across treatments and clinics",
    },
    {
      icon: BarChart3,
      title: "Treatment Demand Trends",
      description: "Monthly and quarterly patterns in treatment interest by geography",
    },
    {
      icon: MapPin,
      title: "Geographic Demand Heatmap",
      description: "Postcode-level patient demand visualisation with demographic overlays",
    },
    {
      icon: RefreshCcw,
      title: "Repeat Exposure Before Booking",
      description: "How many sessions patients need before committing to consultation",
    },
    {
      icon: Brain,
      title: "Drop-off Reason Clustering",
      description: "ML-powered categorisation of abandonment patterns and triggers",
    },
  ]

  return (
    <Card className="p-4 md:p-8 bg-gradient-to-br from-[#faf3e6] to-white border-2 border-[#e5e4df]">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <h3 className="text-lg md:text-xl font-bold text-[#004443]">Advanced Insights</h3>
            <Badge variant="secondary" className="bg-[#004443] text-white hover:bg-[#0a5c54]">
              <Lock className="h-3 w-3 mr-1" />
              Pearlie Pro
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Designed for clinics serious about growth, efficiency, and predictability
          </p>
        </div>
        <Button variant="default" className="w-full md:w-auto bg-[#004443] hover:bg-[#0a5c54]">
          Request Access
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {proFeatures.map((feature) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.title}
              className="p-3 md:p-4 bg-white/50 backdrop-blur-sm border border-[#e5e4df] rounded-lg relative overflow-hidden"
            >
              <div className="absolute top-2 right-2">
                <Lock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground/30" />
              </div>
              <div className="flex items-start gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 bg-[#faf3e6] rounded-md flex-shrink-0">
                  <Icon className="h-4 w-4 md:h-5 md:w-5 text-[#004443]" />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="font-semibold text-xs md:text-sm text-[#004443] mb-1 break-words">{feature.title}</h4>
                  <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
