"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Heart, ArrowRight, Mail } from "lucide-react"
import Link from "next/link"

export default function AffiliateLoginPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/affiliate/dashboard`,
      },
    })

    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/affiliates" className="inline-flex items-center gap-2 mb-6">
            <div className="rounded-full bg-[#0D9B8A] p-1.5">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#0D9B8A]">Pearlie</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Affiliate Dashboard</h1>
          <p className="text-[#8B8BA3] text-sm">Sign in with your email to access your dashboard</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] backdrop-blur-[20px] p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-[#25F4EE]/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-[#25F4EE]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Check your email</h3>
              <p className="text-[#8B8BA3] text-sm">
                We sent a magic link to <strong className="text-white">{email}</strong>. Click the link to sign in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <label className="block text-sm text-[#8B8BA3] mb-1.5">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#1C1C2E] border border-white/[0.08] rounded-[14px] px-4 py-3.5 text-white placeholder:text-[#6B6B80] focus:outline-none focus:border-[#FE2C55]/40 focus:ring-1 focus:ring-[#FE2C55]/20 transition-all"
                />
              </div>
              {error && <p className="text-[#FE2C55] text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-[14px] font-bold text-white text-sm transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%)",
                  boxShadow: "0 0 20px rgba(254,44,85,0.3)",
                }}
              >
                {loading ? "Sending..." : "Send Magic Link"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[#6B6B80] text-sm mt-6">
          Not an affiliate yet?{" "}
          <Link href="/affiliates" className="text-[#25F4EE] hover:underline">
            Apply here
          </Link>
        </p>
      </div>
    </div>
  )
}
