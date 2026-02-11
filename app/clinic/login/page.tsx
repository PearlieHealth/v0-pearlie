"use client"

import React from "react"
import { Suspense } from "react"
import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Building2 } from "lucide-react"
import Loading from "./loading"

export default function ClinicLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const searchParams = useSearchParams()
  const router = useRouter()

  const errorFromUrl = searchParams.get("error")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const supabase = createBrowserClient()

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        setIsLoading(false)
        return
      }

      if (data.session) {
        // Check if user is linked to a clinic
        const { data: clinicUser } = await supabase
          .from("clinic_users")
          .select("clinic_id")
          .eq("user_id", data.session.user.id)
          .single()

        if (!clinicUser) {
          setError("Your account is not linked to any clinic. Please contact support.")
          await supabase.auth.signOut()
          setIsLoading(false)
          return
        }

        // Login successful - use full page reload to ensure cookies are sent
        window.location.href = "/clinic"
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Suspense fallback={<Loading />}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Clinic Portal</CardTitle>
            <CardDescription>Sign in to access your clinic dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            {(error || errorFromUrl) && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error || (errorFromUrl === "no_clinic" ? "Your account is not linked to any clinic." : "An error occurred")}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="clinic@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => window.location.href = "/clinic/forgot-password"}
                  >
                    Forgot password?
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Have an invite link?{" "}
                <Button
                  variant="link"
                  className="px-0 text-primary"
                  onClick={() => {
                    const token = prompt("Enter your invite token:")
                    if (token) window.location.href = `/clinic/accept-invite?token=${token}`
                  }}
                >
                  Set up your account
                </Button>
              </p>
              <p className="text-sm text-muted-foreground">
                Need access? Contact your Pearlie representative.
              </p>
            </div>
          </CardContent>
        </Card>
      </Suspense>
    </div>
  )
}
