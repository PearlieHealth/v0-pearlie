"use client"

import React from "react"

import { useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface BookingDialogProps {
  leadId: string
  clinicId: string
  patientName: string
  onClose: () => void
  onSuccess: () => void
}

const BOOKING_METHODS = [
  { value: "CALL", label: "Phone Call" },
  { value: "ONLINE_FORM", label: "Online Form" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
  { value: "PMS_INTEGRATION", label: "PMS Integration" },
  { value: "WALKIN", label: "Walk-in" },
]

export function BookingDialog({ leadId, clinicId, patientName, onClose, onSuccess }: BookingDialogProps) {
  const [appointmentDate, setAppointmentDate] = useState("")
  const [appointmentTime, setAppointmentTime] = useState("")
  const [bookingMethod, setBookingMethod] = useState("")
  const [expectedValue, setExpectedValue] = useState("")
  const [bookingReference, setBookingReference] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!appointmentDate || !appointmentTime || !bookingMethod) {
      setError("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setError("You must be logged in")
        return
      }

      const appointmentDatetime = new Date(`${appointmentDate}T${appointmentTime}`)

      const { error: insertError } = await supabase
        .from("bookings")
        .insert({
          lead_id: leadId,
          clinic_id: clinicId,
          appointment_datetime: appointmentDatetime.toISOString(),
          booking_method: bookingMethod,
          expected_value_gbp: expectedValue ? parseFloat(expectedValue) : null,
          booking_reference: bookingReference || null,
          confirmed_by: session.user.id,
        })

      if (insertError) {
        if (insertError.code === "23505") {
          setError("A booking already exists for this lead")
        } else {
          setError(insertError.message)
        }
        return
      }

      onSuccess()
    } catch (err) {
      setError("Failed to create booking")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Booking</DialogTitle>
          <DialogDescription>
            Record a confirmed appointment for {patientName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Appointment Date *</Label>
              <Input
                id="date"
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Booking Method *</Label>
            <Select value={bookingMethod} onValueChange={setBookingMethod} required>
              <SelectTrigger>
                <SelectValue placeholder="How was this booked?" />
              </SelectTrigger>
              <SelectContent>
                {BOOKING_METHODS.map(method => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Expected Value (GBP)</Label>
            <Input
              id="value"
              type="number"
              placeholder="e.g. 2500"
              value={expectedValue}
              onChange={(e) => setExpectedValue(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Booking Reference</Label>
            <Input
              id="reference"
              placeholder="Optional reference number"
              value={bookingReference}
              onChange={(e) => setBookingReference(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
