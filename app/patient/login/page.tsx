"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Heart, Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function PatientLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams?.get("next")
  const [email, setEmail] = useState("")
  const [step, setStep] = useState<"email" | "otp">("email")
  const [leadId, setLeadId] = useState<string | null>(null)
  const [maskedEmail, setMaskedEmail] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  // Redirect if already logged in
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.replace(nextParam || "/patient/dashboard")
      } else {
        setCheckingAuth(false)
      }
    }
    checkAuth()
  }, [router])

  const handleSendOTP = async () => {
    if (!email || isSending || cooldown > 0) return
    setIsSending(true)
    setError("")

    try {
      const res = await fetch("/api/auth/patient-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next: nextParam || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code")
      }

      if (data.leadId) {
        setLeadId(data.leadId)
      }
      setMaskedEmail(data.email || email.replace(/(.{2})(.*)(@.*)/, "$1***$3"))
      setStep("otp")
      setCooldown(60)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code")
    } finally {
      setIsSending(false)
    }
  }

  const verifyOTPWithCode = async (otpString: string) => {
    if (otpString.length !== 6 || isLoading || !leadId) return
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/patient-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, otp: otpString }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.expired) {
          setOtp(["", "", "", "", "", ""])
          inputRefs.current[0]?.focus()
        }
        throw new Error(data.error || "Verification failed")
      }

      // Establish browser session
      if (data.tokenHash) {
        try {
          const supabase = createClient()
          await supabase.auth.verifyOtp({
            token_hash: data.tokenHash,
            type: "magiclink",
          })
        } catch (sessionError) {
          console.error("[Patient Login] Failed to establish browser session:", sessionError)
        }
      }

      setSuccess(true)
      setTimeout(() => router.replace(nextParam || "/patient/dashboard"), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError("")

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    if (newOtp.every((d) => d !== "")) {
      setTimeout(() => {
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
      verifyOTPWithCode(otp.join(""))
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("")
      setOtp(newOtp)
      inputRefs.current[5]?.focus()
      setTimeout(() => verifyOTPWithCode(pastedData), 100)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#ffffff] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0fbcb0]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ffffff] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-2.5 mb-6">
            <div className="rounded-full bg-[#0fbcb0] p-2">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-semibold text-xl text-[#0fbcb0]">Pearlie</span>
          </Link>
          <h1 className="text-2xl font-semibold text-[#222] mb-2">Welcome back</h1>
          <p className="text-[#222]/70">Sign in to view your matches and conversations.</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#222]">Signed in</h2>
            <p className="text-[#222]/70">Redirecting to your dashboard...</p>
          </div>
        ) : step === "email" ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium text-[#222]">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError("") }}
                placeholder="john@example.com"
                className="h-14 text-lg rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                onClick={handleSendOTP}
                disabled={!email || isSending}
                className="w-full h-14 text-lg font-semibold rounded-2xl bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0"
              >
                {isSending ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending code...</>
                ) : (
                  <><Mail className="w-5 h-5 mr-2" /> Send me a login code</>
                )}
              </Button>
            </div>

            <p className="text-center text-xs text-[#222]/40">
              We&apos;ll send a 6-digit code to your email. No password needed.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-[#222]/70 mb-6">
                Enter the 6-digit code sent to <strong>{maskedEmail}</strong>
              </p>
            </div>

            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
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
              <div className="flex items-center justify-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <Button
              onClick={() => verifyOTPWithCode(otp.join(""))}
              disabled={isLoading || otp.some((d) => !d)}
              className="w-full h-14 text-lg font-semibold rounded-2xl bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying...</>
              ) : (
                "Verify & Sign In"
              )}
            </Button>

            <div className="flex items-center justify-between">
              <button
                onClick={() => { setStep("email"); setOtp(["", "", "", "", "", ""]); setError("") }}
                className="text-sm text-[#222]/50 hover:text-[#222] transition-colors"
              >
                Use a different email
              </button>
              <button
                onClick={handleSendOTP}
                disabled={isSending || cooldown > 0}
                className="text-sm text-[#0fbcb0] hover:text-[#0da399] transition-colors disabled:opacity-50"
              >
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : isSending
                    ? "Sending..."
                    : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {/* Back to home */}
        <div className="text-center mt-8">
          <Link href="/" className="text-sm text-[#222]/50 hover:text-[#222] transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
