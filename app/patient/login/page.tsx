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
  const rawNext = searchParams?.get("next")
  // Only allow internal paths to prevent open redirect attacks
  const nextParam = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null
  const [email, setEmail] = useState("")
  const [step, setStep] = useState<"email" | "otp" | "no-account">("email")
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

  // Redirect if already logged in (but not if they're a clinic user)
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Clinic users should not be auto-redirected to patient dashboard
        if (user.user_metadata?.role === "clinic") {
          setCheckingAuth(false)
          return
        }
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
        setMaskedEmail(data.email || email.replace(/(.{2})(.*)(@.*)/, "$1***$3"))
        setStep("otp")
        setCooldown(60)
        setTimeout(() => inputRefs.current[0]?.focus(), 100)
      } else {
        setStep("no-account")
      }
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

      // Establish browser session — strict: fail if token missing or invalid
      if (!data.tokenHash) {
        throw new Error("Login succeeded but session token was not generated. Please try again.")
      }

      const supabase = createClient()
      const { error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: "magiclink",
      })

      if (sessionError) {
        console.error("[Patient Login] verifyOtp error:", sessionError)
        throw new Error(sessionError.message || "Failed to establish browser session")
      }

      // Confirm session is actually set before redirecting (critical for mobile
      // browsers where cookie persistence can be delayed)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("Session could not be confirmed. Please try again.")
      }

      setSuccess(true)
      // Poll for cookie persistence before redirecting (faster than fixed delay).
      // Mobile browsers can be slow to flush cookies after verifyOtp.
      const dest = nextParam || "/patient/dashboard"
      const pollStart = Date.now()
      const pollInterval = setInterval(async () => {
        try {
          const { data: { user: polledUser } } = await supabase.auth.getUser()
          if (polledUser || Date.now() - pollStart > 3000) {
            clearInterval(pollInterval)
            router.replace(dest)
          }
        } catch {
          // On error, fallback: redirect after timeout
          if (Date.now() - pollStart > 3000) {
            clearInterval(pollInterval)
            router.replace(dest)
          }
        }
      }, 200)
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
          <h1 className="text-2xl font-semibold text-[#3d3838] mb-2">Welcome back</h1>
          <p className="text-[#3d3838]/70">Sign in to view your clinic matches and conversations. No password needed.</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#3d3838]">Signed in</h2>
            <p className="text-[#3d3838]/70">Redirecting to your dashboard...</p>
          </div>
        ) : step === "no-account" ? (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#0fbcb0]/10 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-[#0fbcb0]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#3d3838] mb-2">No account found</h2>
              <p className="text-[#3d3838]/70">
                We couldn&apos;t find an account with that email. Complete our quick intake form to get matched with a clinic and create your account.
              </p>
            </div>
            <Button
              className="w-full h-14 text-lg font-semibold rounded-2xl bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0"
              asChild
            >
              <Link href="/intake">Find my clinic</Link>
            </Button>
            <button
              onClick={() => { setStep("email"); setError("") }}
              className="text-sm text-[#3d3838]/50 hover:text-[#3d3838] transition-colors"
            >
              Try a different email
            </button>
          </div>
        ) : step === "email" ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium text-[#3d3838]">
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

            <p className="text-center text-xs text-[#3d3838]/40">
              We&apos;ll send a 6-digit code to your email. No password needed.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-[#3d3838]/70 mb-6">
                Enter the 6-digit code sent to <strong>{maskedEmail}</strong>
              </p>
            </div>

            <div className="flex gap-1.5 sm:gap-2 justify-center" onPaste={handlePaste}>
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
                  className="w-11 h-14 sm:w-12 text-center text-xl font-semibold"
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
                className="text-sm text-[#3d3838]/50 hover:text-[#3d3838] transition-colors"
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
          <Link href="/" className="text-sm text-[#3d3838]/50 hover:text-[#3d3838] transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
