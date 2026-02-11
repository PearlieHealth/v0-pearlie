"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MapPin, Calendar, Clock, Phone, CheckCircle2, Loader2, ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { HOURLY_SLOTS } from "@/lib/constants"

interface Clinic {
  id: string
  name: string
  address: string
  postcode: string
  phone: string
  images?: string[]
  city?: string
}

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  treatment_interest: string
}

export default function BookingConfirmPage() {
  const searchParams = useSearchParams()
  const clinicId = searchParams.get("clinicId")
  const leadId = searchParams.get("leadId")
  const dateStr = searchParams.get("date")
  const time = searchParams.get("time")

  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parse the date
  const appointmentDate = dateStr ? new Date(dateStr) : null
  const timeLabel = HOURLY_SLOTS.find((s) => s.key === time)?.label || time

  useEffect(() => {
    async function fetchData() {
      if (!clinicId || !leadId || !dateStr || !time) {
        setError("Missing booking information. Please go back to your matches and select a time slot.")
        setLoading(false)
        return
      }

      try {
        // Fetch clinic and lead data
        const [clinicRes, leadRes] = await Promise.all([
          fetch(`/api/clinics/${clinicId}`),
          fetch(`/api/leads/${leadId}`),
        ])

        if (!clinicRes.ok || !leadRes.ok) {
          throw new Error("Failed to fetch booking details")
        }

        const clinicData = await clinicRes.json()
        const leadData = await leadRes.json()

        // Clinics API returns { clinic: {...} }, leads API returns data directly
        setClinic(clinicData.clinic || clinicData)
        setLead(leadData)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load booking details")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clinicId, leadId])

  const handleConfirmBooking = async () => {
    // Validate all required data is present
    if (!clinic?.id || !lead?.id || !dateStr || !time) {
      setError("Missing booking information. Please go back and select a time slot.")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/booking/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: clinic.id,
          leadId: lead.id,
          date: dateStr,
          time: time,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit booking request")
      }

      setConfirmed(true)
    } catch (err) {
      console.error("Error submitting booking:", err)
      setError(err instanceof Error ? err.message : "Failed to submit booking request")
    } finally {
      setSubmitting(false)
    }
  }

  // Format date for display
  const formattedDate = appointmentDate
    ? appointmentDate.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : ""

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading booking details...</span>
        </div>
      </div>
    )
  }

  if (error && !confirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="text-destructive mb-4">
            <span className="text-4xl">!</span>
          </div>
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button asChild>
            <Link href="/">Go back home</Link>
          </Button>
        </Card>
      </div>
    )
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-semibold mb-3">Appointment Request Sent!</h1>
          <p className="text-muted-foreground mb-6">
            Your appointment request has been sent to <strong>{clinic?.name}</strong>.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{timeLabel}</span>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">What happens next?</h3>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 text-left">
              <li>The clinic will review your request</li>
              <li>They will contact you within 24-48 hours to confirm</li>
              <li>Check your email and phone for their response</li>
            </ul>
          </div>

          <Button asChild className="w-full">
            <Link href="/">Back to Home</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-4">
          <Link href={`/match/${leadId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to results
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-10">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Book your appointment</h1>
          <p className="text-muted-foreground">We will keep your information safe and secure.</p>
        </div>

        {/* Clinic Card with Appointment Details */}
        <Card className="p-5 mb-4">
          <div className="flex gap-4">
            {clinic?.images?.[0] ? (
              <div className="w-20 h-20 rounded-full overflow-hidden bg-muted shrink-0 border-2 border-primary/20">
                <Image
                  src={clinic.images[0] || "/placeholder.svg"}
                  alt={clinic.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-muted shrink-0 flex items-center justify-center border-2 border-primary/20">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-col justify-center">
              <h3 className="font-bold text-lg text-foreground">{clinic?.name}</h3>
              <p className="text-muted-foreground text-sm">
                {clinic?.address}, {clinic?.city} {clinic?.postcode}
              </p>
              <p className="text-primary font-medium mt-1">
                {formattedDate} - {timeLabel}
              </p>
            </div>
          </div>
        </Card>

        {/* User Identity Card */}
        <Card className="p-5 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">
                {"You're continuing your booking as "}
                <span className="text-foreground font-semibold">{lead?.email}</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Confirm Button */}
        <Button
          onClick={handleConfirmBooking}
          disabled={submitting}
          size="lg"
          className="w-full h-14 text-lg font-semibold rounded-full"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sending request...
            </>
          ) : (
            "Confirm Booking"
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center mt-4">
          By confirming, your details will be sent to the clinic who will contact you to confirm your appointment.
        </p>

        
      </main>
    </div>
  )
}
