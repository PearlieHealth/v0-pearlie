"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react"

interface OTPVerificationProps {
  leadId: string
  email: string
  onVerified: () => void
  onBack?: () => void
}

export function OTPVerification({ leadId, email, onVerified, onBack }: OTPVerificationProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [maskedEmail, setMaskedEmail] = useState("")
  const [cooldown, setCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  // Auto-send OTP on mount
  useEffect(() => {
    sendOTP()
  }, [])

  const sendOTP = async () => {
    if (isSending || cooldown > 0) return

    setIsSending(true)
    setError(null)

    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, email }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.alreadyVerified) {
          setSuccess(true)
          onVerified()
          return
        }
        throw new Error(data.error || "Failed to send verification code")
      }

      setCodeSent(true)
      setMaskedEmail(data.email)
      setCooldown(60) // 60 second cooldown

      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code")
    } finally {
      setIsSending(false)
    }
  }

  const verifyOTPWithCode = async (otpString: string) => {
    if (otpString.length !== 6 || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, otp: otpString }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.expired) {
          setOtp(["", "", "", "", "", ""])
          inputRefs.current[0]?.focus()
        }
        throw new Error(data.error || "Verification failed")
      }

      setSuccess(true)
      setTimeout(() => onVerified(), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed")
    } finally {
      setIsLoading(false)
    }
  }

  const verifyOTP = async () => {
    const otpString = otp.join("")
    verifyOTPWithCode(otpString)
  }

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError(null)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    if (newOtp.every((d) => d !== "")) {
      setTimeout(() => {
        // Use the newOtp directly since state may not have updated yet
        const otpString = newOtp.join("")
        if (otpString.length === 6) {
          verifyOTPWithCode(otpString)
        }
      }, 50)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === "Enter" && otp.every((d) => d)) {
      verifyOTP()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("")
      setOtp(newOtp)
      inputRefs.current[5]?.focus()
      // Use the pasted data directly instead of relying on state
      setTimeout(() => verifyOTPWithCode(pastedData), 100)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Email Verified</h2>
        <p className="text-muted-foreground">Loading your matched clinics...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 max-w-md mx-auto">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Mail className="w-7 h-7 text-primary" />
      </div>

      <h2 className="text-2xl font-semibold text-foreground mb-2 text-center">Verify your email</h2>

      <p className="text-muted-foreground text-center mb-8">
        {codeSent ? `We've sent a 6-digit code to ${maskedEmail}` : "Sending verification code..."}
      </p>

      {isSending && !codeSent && (
        <div className="flex items-center gap-2 text-muted-foreground mb-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Sending code...</span>
        </div>
      )}

      {codeSent && (
        <>
          <div className="flex gap-2 mb-6" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-xl font-semibold"
                disabled={isLoading}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm mb-4">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <Button onClick={verifyOTP} disabled={isLoading || otp.some((d) => !d)} className="w-full mb-4">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Email"
            )}
          </Button>

          <button
            onClick={sendOTP}
            disabled={isSending || cooldown > 0}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {cooldown > 0
              ? `Resend code in ${cooldown}s`
              : isSending
                ? "Sending..."
                : "Didn't receive the code? Resend"}
          </button>
        </>
      )}

      {onBack && (
        <button onClick={onBack} className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Go back
        </button>
      )}
    </div>
  )
}
