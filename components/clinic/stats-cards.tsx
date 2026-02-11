"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, Calendar, CheckCircle } from "lucide-react"

interface StatsCardsProps {
  stats: {
    total: number
    new: number
    inProgress: number
    booked: number
    closed: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Leads",
      value: stats.total,
      icon: Users,
      description: "All time from Pearlie",
    },
    {
      title: "New",
      value: stats.new,
      icon: UserCheck,
      description: "Awaiting contact",
      highlight: stats.new > 0,
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: Calendar,
      description: "Being contacted",
    },
    {
      title: "Booked",
      value: stats.booked,
      icon: CheckCircle,
      description: "Appointments confirmed",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className={card.highlight ? "border-primary/50 bg-primary/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.highlight ? "text-primary" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.highlight ? "text-primary" : ""}`}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
