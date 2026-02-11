"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Users, Calendar, Target } from "lucide-react"
import Link from "next/link"
import { Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const weeklyData = [
  { week: "Week 1", leads: 12, bookings: 5 },
  { week: "Week 2", leads: 18, bookings: 8 },
  { week: "Week 3", leads: 15, bookings: 6 },
  { week: "Week 4", leads: 22, bookings: 11 },
]

const treatmentData = [
  { name: "Dental Implants", value: 35, color: "#3b82f6" },
  { name: "Invisalign", value: 25, color: "#10b981" },
  { name: "Teeth Whitening", value: 20, color: "#f59e0b" },
  { name: "Veneers", value: 12, color: "#8b5cf6" },
  { name: "Other", value: 8, color: "#6b7280" },
]

const monthlyTrend = [
  { month: "Aug", leads: 45, conversions: 18 },
  { month: "Sep", leads: 52, conversions: 22 },
  { month: "Oct", leads: 48, conversions: 19 },
  { month: "Nov", leads: 61, conversions: 28 },
  { month: "Dec", leads: 58, conversions: 25 },
  { month: "Jan", leads: 67, conversions: 32 },
]

export default function DemoInsightsPage() {
  return (
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
            <Link href="/clinic/demo">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Insights</h1>
            <p className="text-muted-foreground">Analytics and performance metrics</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">47.8%</p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">+5.2% vs last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                  <p className="text-2xl font-bold">2.4h</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">-18min vs last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Patients</p>
                  <p className="text-2xl font-bold">156</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">+23 this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bookings This Month</p>
                  <p className="text-2xl font-bold">32</p>
                </div>
                <div className="p-2 bg-amber-100 rounded-full">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">+8 vs last month</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Lead & Conversion Trend</CardTitle>
              <CardDescription>6-month overview</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} name="Leads" />
                  <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} name="Conversions" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Treatment Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Treatment Interest</CardTitle>
              <CardDescription>What patients are looking for</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={treatmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {treatmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Performance</CardTitle>
            <CardDescription>Leads vs Bookings this month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="leads" fill="#3b82f6" name="Leads" radius={[4, 4, 0, 0]} />
                <Bar dataKey="bookings" fill="#10b981" name="Bookings" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
