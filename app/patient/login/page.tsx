"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Heart, Loader2, Mail, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function PatientLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Redirect if already logged in
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.replace("/patient/dashboard")
      } else {
        setCheckingAuth(false)
      }
    }
    checkAuth()
  }, [router])

  const handleMagicLink = async () => {
    if (!email) return
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/send-login-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to send login link")
      }

      setMagicLinkSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send login link")
    } finally {
      setIsLoading(false)
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
            <div className="rounded-full bg-black p-2">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-semibold text-xl">Pearlie</span>
          </Link>
          <h1 className="text-2xl font-semibold text-[#222] mb-2">Welcome back</h1>
          <p className="text-[#222]/70">Sign in to view your matches and conversations.</p>
        </div>

        {magicLinkSent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#222]">Check your email</h2>
            <p className="text-[#222]/70">
              We sent a login link to <strong>{email}</strong>. Click the link to sign in.
            </p>
            <button
              onClick={() => setMagicLinkSent(false)}
              className="text-sm text-[#0fbcb0] hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Google sign-in */}
            <GoogleSignInButton
              redirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=/patient/dashboard`}
            />

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-[#222]/50 font-medium">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Magic link email */}
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium text-[#222]">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="h-14 text-lg rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                onClick={handleMagicLink}
                disabled={!email || isLoading}
                className="w-full h-14 text-lg font-semibold rounded-2xl bg-[#0fbcb0] hover:bg-[#0da399] text-white border-0"
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending...</>
                ) : (
                  <><Mail className="w-5 h-5 mr-2" /> Send me a login link</>
                )}
              </Button>
            </div>

            <p className="text-center text-xs text-[#222]/40">
              We will send a secure link to your email. No password needed.
            </p>
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
