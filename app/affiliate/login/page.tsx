"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Heart, Loader2, Mail, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function AffiliateLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Check if user is an affiliate
        const res = await fetch("/api/affiliates/me")
        if (res.ok) {
          router.replace("/affiliate/dashboard")
          return
        }
      }
      setCheckingAuth(false)
    }
    checkAuth()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || isLoading) return
    setIsLoading(true)
    setError("")

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/affiliate/auth/callback`,
        },
      })

      if (authError) {
        throw authError
      }

      setSent(true)
    } catch (err: any) {
      setError(err.message || "Failed to send magic link. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F0" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#0D4F4F" }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FFF8F0" }}>
      {/* Header */}
      <header className="py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="w-5 h-5" style={{ color: "#0D4F4F", fill: "#0D4F4F" }} />
            <span className="text-lg font-heading font-bold" style={{ color: "#0D4F4F" }}>
              Pearlie
            </span>
          </Link>
          <Link
            href="/affiliates"
            className="text-sm font-medium transition-colors"
            style={{ color: "#0D4F4F" }}
          >
            Become an affiliate
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div
            className="bg-white rounded-2xl p-8 sm:p-10"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
          >
            {sent ? (
              <div className="text-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ backgroundColor: "rgba(0, 212, 255, 0.1)" }}
                >
                  <Mail className="w-7 h-7" style={{ color: "#00D4FF" }} />
                </div>
                <h2 className="text-xl font-heading font-bold mb-2" style={{ color: "#0D4F4F" }}>
                  Check your email
                </h2>
                <p className="text-sm mb-4" style={{ color: "#1A1A2E" }}>
                  We sent a magic link to <strong>{email}</strong>. Click the link in the email to sign in
                  to your affiliate dashboard.
                </p>
                <button
                  onClick={() => {
                    setSent(false)
                    setEmail("")
                  }}
                  className="text-sm font-medium"
                  style={{ color: "#00D4FF" }}
                >
                  Try a different email
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-heading font-bold mb-2" style={{ color: "#0D4F4F" }}>
                    Affiliate Login
                  </h2>
                  <p className="text-sm" style={{ color: "#1A1A2E" }}>
                    Sign in to your affiliate dashboard
                  </p>
                </div>

                {error && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm mb-5"
                    style={{
                      backgroundColor: "rgba(255, 92, 114, 0.08)",
                      color: "#FF5C72",
                    }}
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#0D4F4F" }}>
                      Email address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all border focus:ring-2"
                      style={{
                        backgroundColor: "#F0F0F5",
                        borderColor: "#F0F0F5",
                        color: "#1A1A2E",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white font-bold transition-all duration-200 hover:scale-[1.02] hover:shadow-xl disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #FF5C72 0%, #00D4FF 100%)" }}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Send Magic Link
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-sm mt-6" style={{ color: "#1A1A2E", opacity: 0.6 }}>
            Not an affiliate yet?{" "}
            <Link href="/affiliates" className="font-medium" style={{ color: "#00D4FF" }}>
              Apply here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
