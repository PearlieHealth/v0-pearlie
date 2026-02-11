"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Mail, Copy, Check, Loader2, UserPlus } from "lucide-react"

interface ClinicInviteButtonProps {
  clinicId: string
  clinicName: string
  existingEmail?: string
}

export function ClinicInviteButton({ clinicId, clinicName, existingEmail }: ClinicInviteButtonProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(existingEmail || "")
  const [role, setRole] = useState<"CLINIC_ADMIN" | "CLINIC_USER">("CLINIC_ADMIN")
  const [isLoading, setIsLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleInvite = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter an email address for the clinic admin.",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/clinic/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_id: clinicId,
          clinic_name: clinicName,
          primary_contact_email: email,
          role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create invite")
      }

      setInviteUrl(data.invite_url)
      toast({
        title: "Invite created",
        description: `Invite link generated for ${email}. Share it with the clinic owner.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create invite",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (inviteUrl) {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      })
    }
  }

  const handleClose = () => {
    setOpen(false)
    setInviteUrl(null)
    setCopied(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Invite Clinic Admin">
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Clinic Admin</DialogTitle>
          <DialogDescription>
            Create a login for <strong>{clinicName}</strong>. The clinic will receive a unique invite link to set up their account.
          </DialogDescription>
        </DialogHeader>

        {!inviteUrl ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Clinic Admin Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLINIC_ADMIN">Clinic Admin (Full access)</SelectItem>
                  <SelectItem value="CLINIC_USER">Clinic User (View only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4">
              <Label className="text-xs text-muted-foreground mb-2 block">Invite Link</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs break-all">{inviteUrl}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="shrink-0 bg-transparent"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this link with the clinic owner. The link expires in 7 days.
            </p>
          </div>
        )}

        <DialogFooter>
          {!inviteUrl ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Create Invite
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
