"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarIcon, Check, X, Clock, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { HOURLY_SLOTS } from "@/lib/constants"

interface AppointmentActionCardProps {
  leadId: string
  clinicId: string
  bookingStatus: string | null
  bookingDate: string | null
  bookingTime: string | null
  bookingDeclineReason: string | null
  bookingCancelReason: string | null
  bookingConfirmedAt: string | null
  bookingDeclinedAt: string | null
  bookingCancelledAt: string | null
  bookingRescheduledAt: string | null
  onUpdate: () => void
}

type ActiveAction = "confirm" | "reschedule" | "decline" | "cancel" | null

export function AppointmentActionCard({
  leadId,
  clinicId,
  bookingStatus,
  bookingDate,
  bookingTime,
  bookingDeclineReason,
  bookingCancelReason,
  bookingConfirmedAt,
  bookingDeclinedAt,
  bookingCancelledAt,
  bookingRescheduledAt,
  onUpdate,
}: AppointmentActionCardProps) {
  const [activeAction, setActiveAction] = useState<ActiveAction>(null)
  const [newDate, setNewDate] = useState<Date | undefined>(undefined)
  const [newTime, setNewTime] = useState("")
  const [reason, setReason] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!bookingStatus || bookingStatus === "completed" || bookingStatus === "expired") {
    // Show read-only history for terminal states
    if (bookingStatus === "completed") {
      return (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-medium">Appointment Completed</h3>
          </div>
          {bookingDate && (
            <p className="text-sm text-muted-foreground">
              {formatBookingDate(bookingDate)}{bookingTime && <> at {formatBookingTime(bookingTime)}</>}
            </p>
          )}
        </div>
      )
    }
    if (bookingStatus === "expired") {
      return (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Request Expired</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Patient can submit a new request.
          </p>
        </div>
      )
    }
    return null
  }

  const handleAction = async (action: "confirm" | "reschedule" | "decline" | "cancel") => {
    setIsSubmitting(true)

    const body: Record<string, string> = { leadId, action }
    if (action === "confirm") {
      // Clinic always provides time; optionally overrides date
      if (newDate) body.newDate = format(newDate, "yyyy-MM-dd")
      body.newTime = newTime
    }
    if (action === "reschedule") {
      if (!newDate || !newTime) {
        toast.error("Please select a date and time")
        setIsSubmitting(false)
        return
      }
      body.newDate = format(newDate, "yyyy-MM-dd")
      body.newTime = newTime
      if (message.trim()) body.message = message.trim()
    }
    if (action === "decline" || action === "cancel") {
      if (reason.trim()) body.reason = reason.trim()
    }

    try {
      const res = await fetch("/api/booking/clinic-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update appointment")
      }

      const actionLabels: Record<string, string> = {
        confirm: "Appointment confirmed",
        reschedule: "Appointment rescheduled",
        decline: "Request declined",
        cancel: "Appointment cancelled",
      }
      toast.success(actionLabels[action] || "Updated")
      setActiveAction(null)
      setReason("")
      setMessage("")
      setNewDate(undefined)
      setNewTime("")
      onUpdate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Pending / requested
  if (bookingStatus === "pending") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-amber-900">Appointment Request</h3>
        </div>

        {bookingDate && (
          <div className="text-sm text-amber-800">
            <span className="font-medium">Requested date:</span>{" "}
            {formatBookingDate(bookingDate)}
          </div>
        )}

        {activeAction === null && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setActiveAction("confirm")}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveAction("decline")}
              disabled={isSubmitting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Decline
            </Button>
          </div>
        )}

        {activeAction === "confirm" && (
          <ConfirmForm
            bookingDate={bookingDate}
            newDate={newDate}
            setNewDate={setNewDate}
            newTime={newTime}
            setNewTime={setNewTime}
            isSubmitting={isSubmitting}
            onConfirm={() => handleAction("confirm")}
            onCancel={() => { setActiveAction(null); setNewDate(undefined); setNewTime("") }}
          />
        )}

        {activeAction === "decline" && (
          <ReasonForm
            label="Reason for declining (optional)"
            reason={reason}
            setReason={setReason}
            isSubmitting={isSubmitting}
            submitLabel="Decline Request"
            submitVariant="destructive"
            onSubmit={() => handleAction("decline")}
            onCancel={() => { setActiveAction(null); setReason("") }}
          />
        )}
      </div>
    )
  }

  // Confirmed
  if (bookingStatus === "confirmed") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <h3 className="text-sm font-semibold text-green-900">Confirmed Appointment</h3>
        </div>

        {bookingDate && (
          <div className="text-sm text-green-800">
            <span className="font-medium">Date:</span>{" "}
            {formatBookingDate(bookingDate)}{bookingTime && <> at {formatBookingTime(bookingTime)}</>}
          </div>
        )}

        {bookingRescheduledAt && (
          <p className="text-xs text-muted-foreground">
            Last rescheduled: {format(new Date(bookingRescheduledAt), "dd MMM yyyy")}
          </p>
        )}

        {activeAction === null && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveAction("reschedule")}
              disabled={isSubmitting}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Reschedule
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveAction("cancel")}
              disabled={isSubmitting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
          </div>
        )}

        {activeAction === "reschedule" && (
          <RescheduleForm
            newDate={newDate}
            setNewDate={setNewDate}
            newTime={newTime}
            setNewTime={setNewTime}
            message={message}
            setMessage={setMessage}
            isSubmitting={isSubmitting}
            onSubmit={() => handleAction("reschedule")}
            onCancel={() => { setActiveAction(null); setNewDate(undefined); setNewTime(""); setMessage("") }}
          />
        )}

        {activeAction === "cancel" && (
          <ReasonForm
            label="Reason for cancellation (sent to patient)"
            reason={reason}
            setReason={setReason}
            isSubmitting={isSubmitting}
            submitLabel="Cancel Appointment"
            submitVariant="destructive"
            onSubmit={() => handleAction("cancel")}
            onCancel={() => { setActiveAction(null); setReason("") }}
          />
        )}
      </div>
    )
  }

  // Declined
  if (bookingStatus === "declined") {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <X className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-medium">Request Declined</h3>
        </div>
        {bookingDeclineReason && (
          <p className="text-sm text-muted-foreground">Reason: {bookingDeclineReason}</p>
        )}
        {bookingDeclinedAt && (
          <p className="text-xs text-muted-foreground">
            {format(new Date(bookingDeclinedAt), "dd MMM yyyy 'at' HH:mm")}
          </p>
        )}

        {activeAction === null && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveAction("reschedule")}
              disabled={isSubmitting}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Reschedule
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setIsSubmitting(true)
                try {
                  const res = await fetch("/api/clinic/leads/bulk-status", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      leadIds: [leadId],
                      clinicId,
                      status: "CLOSED",
                    }),
                  })
                  if (res.ok) {
                    toast.success("Lead closed")
                    onUpdate()
                  }
                } catch {
                  toast.error("Failed to close lead")
                } finally {
                  setIsSubmitting(false)
                }
              }}
              disabled={isSubmitting}
              className="text-muted-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {isSubmitting ? "Closing..." : "Close lead"}
            </Button>
          </div>
        )}

        {activeAction === "reschedule" && (
          <RescheduleForm
            newDate={newDate}
            setNewDate={setNewDate}
            newTime={newTime}
            setNewTime={setNewTime}
            message={message}
            setMessage={setMessage}
            isSubmitting={isSubmitting}
            onSubmit={() => handleAction("reschedule")}
            onCancel={() => { setActiveAction(null); setNewDate(undefined); setNewTime(""); setMessage("") }}
          />
        )}
      </div>
    )
  }

  // Cancelled
  if (bookingStatus === "cancelled") {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <X className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Appointment Cancelled</h3>
        </div>
        {bookingCancelReason && (
          <p className="text-sm text-muted-foreground">Reason: {bookingCancelReason}</p>
        )}
        {bookingCancelledAt && (
          <p className="text-xs text-muted-foreground">
            {format(new Date(bookingCancelledAt), "dd MMM yyyy 'at' HH:mm")}
          </p>
        )}

        {activeAction === null && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveAction("reschedule")}
              disabled={isSubmitting}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Reschedule
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setIsSubmitting(true)
                try {
                  const res = await fetch("/api/clinic/leads/bulk-status", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      leadIds: [leadId],
                      clinicId,
                      status: "CLOSED",
                    }),
                  })
                  if (res.ok) {
                    toast.success("Lead closed")
                    onUpdate()
                  }
                } catch {
                  toast.error("Failed to close lead")
                } finally {
                  setIsSubmitting(false)
                }
              }}
              disabled={isSubmitting}
              className="text-muted-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {isSubmitting ? "Closing..." : "Close lead"}
            </Button>
          </div>
        )}

        {activeAction === "reschedule" && (
          <RescheduleForm
            newDate={newDate}
            setNewDate={setNewDate}
            newTime={newTime}
            setNewTime={setNewTime}
            message={message}
            setMessage={setMessage}
            isSubmitting={isSubmitting}
            onSubmit={() => handleAction("reschedule")}
            onCancel={() => { setActiveAction(null); setNewDate(undefined); setNewTime(""); setMessage("") }}
          />
        )}
      </div>
    )
  }

  return null
}

// ---- Sub-components ----

function ConfirmForm({
  bookingDate,
  newDate,
  setNewDate,
  newTime,
  setNewTime,
  isSubmitting,
  onConfirm,
  onCancel,
}: {
  bookingDate: string | null
  newDate: Date | undefined
  setNewDate: (d: Date | undefined) => void
  newTime: string
  setNewTime: (t: string) => void
  isSubmitting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const [changingDate, setChangingDate] = useState(false)

  const displayDate = newDate
    ? format(newDate, "EEE, d MMM yyyy")
    : bookingDate
    ? formatBookingDate(bookingDate)
    : null
  const displayTime = newTime
    ? (HOURLY_SLOTS.find((s) => s.key === newTime)?.label || newTime)
    : null

  return (
    <div className="space-y-3 pt-1">
      <div className="text-sm text-amber-800">
        <span className="font-medium">Confirming for:</span> {displayDate}{displayTime && <> at {displayTime}</>}
      </div>

      {/* Time selection — clinic must set time */}
      <div className="space-y-3 rounded-md border border-amber-200 bg-card/60 p-3">
        <p className="text-xs text-muted-foreground">Select the appointment time agreed with the patient:</p>
        <div className="space-y-2">
          <Label className="text-xs">Time</Label>
          <Select value={newTime} onValueChange={setNewTime}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              {HOURLY_SLOTS.map((slot) => (
                <SelectItem key={slot.key} value={slot.key}>
                  {slot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Optional date override */}
        {!changingDate ? (
          <button
            type="button"
            onClick={() => setChangingDate(true)}
            className="text-xs text-primary hover:underline"
          >
            Need to change the date too?
          </button>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="text-xs">New date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {newDate ? format(newDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newDate}
                    onSelect={setNewDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <button
              type="button"
              onClick={() => { setChangingDate(false); setNewDate(undefined) }}
              className="text-xs text-muted-foreground hover:underline"
            >
              Use originally requested date instead
            </button>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isSubmitting || !newTime || (changingDate && !newDate)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isSubmitting ? "Confirming..." : "Confirm Appointment"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Back
        </Button>
      </div>
    </div>
  )
}

function RescheduleForm({
  newDate,
  setNewDate,
  newTime,
  setNewTime,
  message,
  setMessage,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  newDate: Date | undefined
  setNewDate: (d: Date | undefined) => void
  newTime: string
  setNewTime: (t: string) => void
  message: string
  setMessage: (m: string) => void
  isSubmitting: boolean
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-3 pt-1">
      <div className="space-y-2">
        <Label className="text-xs">New date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {newDate ? format(newDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={newDate}
              onSelect={setNewDate}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">New time</Label>
        <Select value={newTime} onValueChange={setNewTime}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select time" />
          </SelectTrigger>
          <SelectContent>
            {HOURLY_SLOTS.map((slot) => (
              <SelectItem key={slot.key} value={slot.key}>
                {slot.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Message to patient (optional)</Label>
        <Textarea
          placeholder="e.g. We have availability at this time instead..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={onSubmit} disabled={isSubmitting || !newDate || !newTime}>
          {isSubmitting ? "Saving..." : "Confirm Reschedule"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Back
        </Button>
      </div>
    </div>
  )
}

function ReasonForm({
  label,
  reason,
  setReason,
  isSubmitting,
  submitLabel,
  submitVariant,
  onSubmit,
  onCancel,
}: {
  label: string
  reason: string
  setReason: (r: string) => void
  isSubmitting: boolean
  submitLabel: string
  submitVariant: "destructive" | "default"
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-3 pt-1">
      <div className="space-y-2">
        <Label className="text-xs">{label}</Label>
        <Textarea
          placeholder="Let the patient know why..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant={submitVariant} onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Back
        </Button>
      </div>
    </div>
  )
}

// ---- Helpers ----

function formatBookingDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function formatBookingTime(timeStr: string | null): string {
  if (!timeStr) return "—"
  const slot = HOURLY_SLOTS.find((s) => s.key === timeStr)
  return slot?.label || timeStr
}
