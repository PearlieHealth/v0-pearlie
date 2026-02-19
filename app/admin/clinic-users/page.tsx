"use client"

import React from "react"

import { useEffect, useState } from "react"
import { AdminNav } from "@/components/admin/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Trash2, UserPlus, RefreshCw, Eye } from "lucide-react"
import Link from "next/link"

interface Clinic {
  id: string
  name: string
}

interface ClinicUser {
  user_id: string
  clinic_id: string
  role: string
  created_at: string
  email?: string
  clinic_name?: string
}

export default function ClinicUsersPage() {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [clinicUsers, setClinicUsers] = useState<ClinicUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [selectedClinicId, setSelectedClinicId] = useState("")

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch clinics
      const clinicsRes = await fetch("/api/admin/clinics")
      if (!clinicsRes.ok) {
        throw new Error(`Failed to fetch clinics: ${clinicsRes.status}`)
      }
      const clinicsData = await clinicsRes.json()
      setClinics(clinicsData.clinics || [])

      // Fetch clinic users
      const usersRes = await fetch("/api/admin/clinic-users")
      if (!usersRes.ok) {
        throw new Error(`Failed to fetch clinic users: ${usersRes.status}`)
      }
      const usersData = await usersRes.json()
      setClinicUsers(usersData.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsCreating(true)

    try {
      const res = await fetch("/api/admin/clinic-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          clinicId: selectedClinicId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create user")
      }

      setSuccess(`User ${newEmail} created and linked to clinic successfully!`)
      setNewEmail("")
      setNewPassword("")
      setSelectedClinicId("")
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user")
    }

    setIsCreating(false)
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this clinic user?")) return

    try {
      const res = await fetch(`/api/admin/clinic-users?userId=${userId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete user")
      }

      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Clinic Portal Users</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage user accounts for the clinic portal
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Create User Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Create Clinic User
              </CardTitle>
              <CardDescription>
                Create a new user account and link it to a clinic
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="clinic@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinic">Clinic</Label>
                  <Select value={selectedClinicId} onValueChange={setSelectedClinicId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a clinic" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinics.map((clinic) => (
                        <SelectItem key={clinic.id} value={clinic.id}>
                          {clinic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm">
                    {success}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isCreating || !selectedClinicId}>
                  {isCreating ? "Creating..." : "Create User"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing Users */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Existing Users</CardTitle>
                  <CardDescription>
                    {clinicUsers.length} clinic user(s) configured
                  </CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={fetchData}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : clinicUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No clinic users created yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Clinic</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clinicUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">
                          {user.email || user.user_id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{user.clinic_name || user.clinic_id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.user_id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Demo Preview Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-teal-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Preview Clinic Portal
              </CardTitle>
              <CardDescription>
                View the clinic dashboard in demo mode without logging in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                See what clinic owners experience when they log into their portal. The demo shows sample data for leads, analytics, and settings.
              </p>
              <div className="space-y-2">
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link href="/clinic/demo">
                    <Eye className="w-4 h-4 mr-2" />
                    View Demo Dashboard
                  </Link>
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  No login required
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
