"use client"

import { useEffect, useState, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { UserPlus, MoreHorizontal, Mail, Shield, Clock, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface TeamMember {
  id: string
  email: string
  role: string
  last_login_at: string | null
  created_at: string
}

interface PendingInvite {
  id: string
  email: string
  role: string
  expires_at: string
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  CLINIC_USER: "Team Member",
  CLINIC_ADMIN: "Admin",
  CORPORATE_ADMIN: "Corporate Admin",
}

const ROLE_COLORS: Record<string, string> = {
  CLINIC_USER: "bg-gray-100 text-gray-800",
  CLINIC_ADMIN: "bg-blue-100 text-blue-800",
  CORPORATE_ADMIN: "bg-purple-100 text-purple-800",
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("CLINIC_USER")
  const [isInviting, setIsInviting] = useState(false)

  const fetchData = useCallback(async () => {
    const supabase = createBrowserClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Get current user's role and clinic
    const { data: portalUser } = await supabase
      .from("clinic_portal_users")
      .select("*")
      .eq("email", session.user.email)
      .single()

    if (portalUser) {
      setCurrentUserRole(portalUser.role)
      if (portalUser.clinic_ids?.[0]) {
        setClinicId(portalUser.clinic_ids[0])

        // Fetch team members for this clinic
        const { data: teamMembers } = await supabase
          .from("clinic_portal_users")
          .select("*")
          .contains("clinic_ids", [portalUser.clinic_ids[0]])

        setMembers(teamMembers || [])

        // Fetch pending invites
        const { data: pendingInvites } = await supabase
          .from("clinic_invites")
          .select("*")
          .eq("clinic_id", portalUser.clinic_ids[0])
          .is("accepted_at", null)
          .gt("expires_at", new Date().toISOString())

        setInvites(pendingInvites || [])
      }
    } else {
      // Fallback to legacy table
      const { data: clinicUser } = await supabase
        .from("clinic_users")
        .select("clinic_id, role")
        .eq("user_id", session.user.id)
        .single()

      if (clinicUser) {
        setClinicId(clinicUser.clinic_id)
        setCurrentUserRole(clinicUser.role === "clinic_manager" ? "CLINIC_ADMIN" : "CLINIC_USER")
      }
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !clinicId) return

    setIsInviting(true)
    const supabase = createBrowserClient()

    // Generate invite token
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiry

    const { error } = await supabase.from("clinic_invites").insert({
      email: inviteEmail.toLowerCase(),
      role: inviteRole,
      clinic_id: clinicId,
      token,
      expires_at: expiresAt.toISOString(),
    })

    setIsInviting(false)

    if (error) {
      toast.error("Failed to send invite")
    } else {
      toast.success(`Invite sent to ${inviteEmail}`)
      setInviteDialogOpen(false)
      setInviteEmail("")
      setInviteRole("CLINIC_USER")
      fetchData() // Refresh
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    const supabase = createBrowserClient()

    const { error } = await supabase
      .from("clinic_invites")
      .delete()
      .eq("id", inviteId)

    if (error) {
      toast.error("Failed to revoke invite")
    } else {
      toast.success("Invite revoked")
      fetchData()
    }
  }

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user.email === memberEmail) {
      toast.error("You cannot remove yourself")
      return
    }

    const { error } = await supabase
      .from("clinic_portal_users")
      .delete()
      .eq("id", memberId)

    if (error) {
      toast.error("Failed to remove team member")
    } else {
      toast.success("Team member removed")
      fetchData()
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const supabase = createBrowserClient()

    const { error } = await supabase
      .from("clinic_portal_users")
      .update({ role: newRole })
      .eq("id", memberId)

    if (error) {
      toast.error("Failed to update role")
    } else {
      toast.success("Role updated")
      fetchData()
    }
  }

  const canManageTeam = currentUserRole === "CLINIC_ADMIN" || currentUserRole === "CORPORATE_ADMIN"

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
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">Manage your clinic's portal users</p>
        </div>
        {canManageTeam && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your clinic's portal
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@clinic.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLINIC_USER">
                        Team Member - Can view and update leads
                      </SelectItem>
                      <SelectItem value="CLINIC_ADMIN">
                        Admin - Full access including settings
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setInviteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
                  {isInviting ? "Sending..." : "Send Invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>{members.length} members with access</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Joined</TableHead>
                {canManageTeam && <TableHead className="w-10"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {member.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={ROLE_COLORS[member.role]}>
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.last_login_at ? (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(member.last_login_at), "MMM d, yyyy")}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(member.created_at), "MMM d, yyyy")}
                    </span>
                  </TableCell>
                  {canManageTeam && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              handleRoleChange(
                                member.id,
                                member.role === "CLINIC_ADMIN" ? "CLINIC_USER" : "CLINIC_ADMIN"
                              )
                            }
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            {member.role === "CLINIC_ADMIN"
                              ? "Demote to Member"
                              : "Promote to Admin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleRemoveMember(member.id, member.email)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {canManageTeam && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invites
            </CardTitle>
            <CardDescription>{invites.length} invites awaiting response</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {invite.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[invite.role]}>
                        {ROLE_LABELS[invite.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(invite.expires_at), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeInvite(invite.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <Badge className={ROLE_COLORS.CLINIC_USER}>Team Member</Badge>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>View matched leads</li>
                <li>Update lead status</li>
                <li>Add notes and mark bookings</li>
                <li>View dashboard</li>
              </ul>
            </div>
            <div className="rounded-lg border p-4">
              <Badge className={ROLE_COLORS.CLINIC_ADMIN}>Admin</Badge>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>All Team Member permissions</li>
                <li>Manage team members</li>
                <li>Edit clinic profile</li>
                <li>Configure integrations & settings</li>
                <li>View insights & analytics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
