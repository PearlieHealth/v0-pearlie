"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react"

export function ResetDataButton() {
  const [open, setOpen] = useState(false)
  const [confirmStep, setConfirmStep] = useState(1)
  const [confirmText, setConfirmText] = useState("")
  const [isResetting, setIsResetting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleReset = async () => {
    if (confirmText !== "RESET-ALL-DATA") return

    setIsResetting(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/reset-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationCode: "RESET-ALL-DATA" }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: "All transactional data has been reset successfully." })
      } else {
        setResult({ success: false, message: data.error || "Failed to reset data" })
      }
    } catch (error) {
      setResult({ success: false, message: "Network error - please try again" })
    } finally {
      setIsResetting(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setConfirmStep(1)
    setConfirmText("")
    setResult(null)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Reset Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        {result ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Data Reset Complete
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Reset Failed
                  </>
                )}
              </AlertDialogTitle>
              <AlertDialogDescription>{result.message}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={handleClose}>
                {result.success ? "Done" : "Close"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : confirmStep === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Reset All Data?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>This will permanently delete all transactional data:</p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>All patient leads and submissions</li>
                  <li>All match results and sessions</li>
                  <li>All analytics events and tracking</li>
                  <li>All bookings and appointments</li>
                  <li>All lead statuses and outcomes</li>
                  <li>All email logs</li>
                </ul>
                <p className="font-medium text-foreground">
                  Clinic profiles, tags, users, and configurations will be preserved.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
              <Button 
                variant="destructive" 
                onClick={() => setConfirmStep(2)}
              >
                Continue
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Final Confirmation
              </AlertDialogTitle>
              <AlertDialogDescription>
                <p className="mb-4">
                  This action cannot be undone. Type <strong>RESET-ALL-DATA</strong> to confirm.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="confirm-input" className="sr-only">
                    Confirmation code
                  </Label>
                  <Input
                    id="confirm-input"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type RESET-ALL-DATA"
                    className="font-mono"
                    autoComplete="off"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleReset}
                disabled={confirmText !== "RESET-ALL-DATA" || isResetting}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset All Data"
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
