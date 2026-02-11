"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, XCircle, Loader2, AlertCircle, Calendar, Clock, User, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { HOURLY_SLOTS } from "@/lib/constants"
import Link from "next/link"

interface LeadInfo {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  bookingDate: string
  bookingTime: string
}

interface ClinicInfo {
  id: string
  name: string
}

export default function ClinicResponsePage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const action = searchParams.get("action") // "confirm" or "decline"

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lead, setLead] = useState<LeadInfo | null>(null)
  const [clinic, setClinic] = useState<ClinicInfo | null>(null)
  const [declineReason, setDeclineReason] = useState("")
  const [showDeclineForm, setShowDeclineForm] = useState(action === "decline")

  // Validate params
  useEffect(() => {
    if (!token) {
      setError("Invalid booking link. Please use the link from your email.")
    }
  }, [token])

  const handleResponse = async (responseAction: "confirm" | "decline") => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/booking/clinic-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: responseAction,
          declineReason: responseAction === "decline" ? declineReason : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update booking status")
      }

      setLead(data.lead)
      setClinic(data.clinic)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const formatTime = (timeKey: string) => {
    return HOURLY_SLOTS.find((s) => s.key === timeKey)?.label || timeKey
  }

  // Error state
  if (error && !success) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button variant="outline" asChild className="bg-transparent">
            <Link href="/">Return to Pearlie</Link>
          </Button>
        </Card>
      </div>
    )
  }

  // Success state
  if (success) {
    const isConfirmed = action === "confirm" || (!showDeclineForm && success)

    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-8">
          <div className="text-center mb-6">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isConfirmed ? "bg-green-100" : "bg-orange-100"
              }`}
            >
              {isConfirmed ? (
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              ) : (
                <XCircle className="w-10 h-10 text-orange-600" />
              )}
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {isConfirmed ? "Booking Confirmed!" : "Booking Declined"}
            </h1>
            <p className="text-muted-foreground">
              {isConfirmed
                ? "The booking status has been updated. Please contact the patient to confirm the details."
                : "The booking has been declined. Please contact the patient if needed."}
            </p>
          </div>

          {lead && (
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Patient Details
              </h3>
              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {lead.firstName} {lead.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                    {lead.email}
                  </a>
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                )}
                {lead.bookingDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDate(lead.bookingDate)}</span>
                  </div>
                )}
                {lead.bookingTime && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{formatTime(lead.bookingTime)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Thank you for using Pearlie to connect with patients.
            </p>
            <Button variant="outline" asChild className="bg-transparent">
              <Link href="/">Visit Pearlie</Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Decline form
  if (showDeclineForm) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Decline Booking Request</h1>
            <p className="text-muted-foreground text-sm">
              Please let us know why you're declining this booking (optional)
            </p>
          </div>

          <div className="space-y-4">
            <Textarea
              placeholder="e.g., Fully booked, patient outside service area, treatment not offered..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => setShowDeclineForm(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleResponse("decline")}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Decline Booking"
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Default: Confirm page
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Confirm Patient Booking</h1>
          <p className="text-muted-foreground text-sm">
            Click below to confirm this appointment. The patient will be notified.
          </p>
        </div>

        <div className="space-y-3">
          <Button className="w-full h-12 text-base" onClick={() => handleResponse("confirm")} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Confirm Booking
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={() => setShowDeclineForm(true)}
            disabled={loading}
          >
            Unable to accommodate? Decline instead
          </Button>
        </div>
      </Card>
    </div>
  )
}
