"use client"

import React from "react"
import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { clinicHref } from "@/lib/clinic-url"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, Loader2, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import Loading from "./loading"

export default function AcceptInvitePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invite, setInvite] = useState<{
    email: string
    clinic_name: string
    role: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  const router = useRouter()

  useEffect(() => {
    const verifyToken = async () => {
      const searchParams = new URLSearchParams(window.location.search)
      const token = searchParams.get("token")

      if (!token) {
        setError("Invalid or missing invitation token")
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/clinic/verify-invite?token=${token}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || "Invalid invitation")
          setIsLoading(false)
          return
        }

        setInvite(data.invite)
      } catch {
        setError("Failed to verify invitation")
      } finally {
        setIsLoading(false)
      }
    }

    verifyToken()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must be at least 8 characters with uppercase, lowercase, and a number")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const token = new URLSearchParams(window.location.search).get("token")
    const supabase = createBrowserClient()

    try {
      // 1. Call API to create auto-confirmed user and link to clinic
      const res = await fetch("/api/clinic/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token, 
          password,
          email: invite!.email 
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create account")
      }

      // 2. Sign in the user (user was created with auto-confirmed email)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite!.email,
        password,
      })

      if (signInError) {
        throw new Error("Account created but sign-in failed. Please go to login page.")
      }

      setSuccess(true)
      
      // Redirect to clinic dashboard
      setTimeout(() => {
        router.push(clinicHref("/clinic"))
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="rounded-full bg-black p-2">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-semibold text-xl">Pearlie</span>
          </Link>
          
          {error && !invite ? (
            <>
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
              <CardTitle>Invalid Invitation</CardTitle>
              <CardDescription>{error}</CardDescription>
            </>
          ) : success ? (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <CardTitle>Account Created!</CardTitle>
              <CardDescription>Redirecting to the clinic portal...</CardDescription>
            </>
          ) : (
            <>
              <CardTitle>Accept Invitation</CardTitle>
              <CardDescription>
                Create your account to manage <strong>{invite?.clinic_name}</strong>
              </CardDescription>
            </>
          )}
        </CardHeader>

        {invite && !success && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invite.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
