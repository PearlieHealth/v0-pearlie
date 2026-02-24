"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, UserPlus, Mail, MoreVertical, Shield, User, Building2 } from "lucide-react"
import Link from "next/link"
import { clinicHref } from "@/lib/clinic-url"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const demoTeamMembers = [
  { id: "1", name: "Dr. Sarah Johnson", email: "sarah@smiledental.co.uk", role: "CLINIC_ADMIN", status: "active", joinedAt: "2023-06-15" },
  { id: "2", name: "Dr. Michael Chen", email: "michael@smiledental.co.uk", role: "CLINIC_USER", status: "active", joinedAt: "2023-08-20" },
  { id: "3", name: "Emma Williams", email: "emma@smiledental.co.uk", role: "CLINIC_USER", status: "active", joinedAt: "2023-10-05" },
  { id: "4", name: "James Taylor", email: "james@smiledental.co.uk", role: "CLINIC_USER", status: "pending", joinedAt: null },
]

const roleIcons: Record<string, React.ReactNode> = {
  CORPORATE_ADMIN: <Building2 className="w-3 h-3" />,
  CLINIC_ADMIN: <Shield className="w-3 h-3" />,
  CLINIC_USER: <User className="w-3 h-3" />,
}

const roleLabels: Record<string, string> = {
  CORPORATE_ADMIN: "Corporate Admin",
  CLINIC_ADMIN: "Clinic Admin",
  CLINIC_USER: "Staff Member",
}

const roleColors: Record<string, string> = {
  CORPORATE_ADMIN: "bg-purple-100 text-purple-800",
  CLINIC_ADMIN: "bg-blue-100 text-blue-800",
  CLINIC_USER: "bg-gray-100 text-gray-800",
}

export default function DemoTeamPage() {
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("CLINIC_USER")

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* Demo Banner */}
      <div className="bg-blue-600 text-white px-4 py-2 text-center text-sm">
        <span className="font-medium">Demo Mode</span> - Changes will not be saved
        <Link href="/admin/clinic-users" className="ml-4 underline hover:no-underline">
          Back to Admin
        </Link>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href={clinicHref("/clinic/demo")}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Team</h1>
            <p className="text-muted-foreground">Manage your clinic team members</p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Invite Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Invite Team Member
              </CardTitle>
              <CardDescription>Send an invitation to join your clinic portal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="email" className="sr-only">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@clinic.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLINIC_USER">Staff Member</SelectItem>
                    <SelectItem value="CLINIC_ADMIN">Clinic Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="gap-2">
                  <Mail className="w-4 h-4" />
                  Send Invite
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members ({demoTeamMembers.length})</CardTitle>
              <CardDescription>People with access to this clinic portal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demoTeamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>
                          {member.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`${roleColors[member.role]} gap-1`}>
                        {roleIcons[member.role]}
                        {roleLabels[member.role]}
                      </Badge>
                      {member.status === "pending" && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          Pending
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Change Role</DropdownMenuItem>
                          {member.status === "pending" && (
                            <DropdownMenuItem>Resend Invite</DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-600">Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Role Descriptions */}
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Badge className={`${roleColors.CLINIC_ADMIN} gap-1 mt-0.5`}>
                    {roleIcons.CLINIC_ADMIN}
                    Clinic Admin
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Full access to all features including team management, settings, and billing.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className={`${roleColors.CLINIC_USER} gap-1 mt-0.5`}>
                    {roleIcons.CLINIC_USER}
                    Staff Member
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Can view and manage leads, but cannot change clinic settings or manage team.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
