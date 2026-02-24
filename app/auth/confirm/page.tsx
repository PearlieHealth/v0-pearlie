"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { clinicHref } from "@/lib/clinic-url"
import { Loader2 } from "lucide-react"

export default function AuthConfirmPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createBrowserClient()
      
      // Get the hash from the URL (Supabase puts tokens in the hash fragment)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")
      const type = hashParams.get("type")
      const errorParam = hashParams.get("error")
      const errorDescription = hashParams.get("error_description")

      if (errorParam) {
        setError(errorDescription || errorParam)
        setTimeout(() => {
          router.push(`${clinicHref("/clinic/login")}?error=${encodeURIComponent(errorDescription || errorParam)}`)
        }, 2000)
        return
      }

      if (accessToken && refreshToken) {
        // Set the session with the tokens from the URL
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (sessionError) {
          setError(sessionError.message)
          setTimeout(() => {
            router.push(`${clinicHref("/clinic/login")}?error=session_failed`)
          }, 2000)
          return
        }

        // Redirect based on the type of auth action
        if (type === "recovery") {
          router.push(clinicHref("/clinic/reset-password"))
        } else if (type === "signup") {
          router.push(clinicHref("/clinic"))
        } else {
          router.push(clinicHref("/clinic"))
        }
      } else {
        // No tokens found, might be a code-based flow
        const code = new URLSearchParams(window.location.search).get("code")
        if (code) {
          // Let the server handle the code exchange
          router.push(`/auth/callback?code=${code}`)
        } else {
          setError("Invalid authentication link")
          setTimeout(() => {
            router.push(`${clinicHref("/clinic/login")}?error=invalid_link`)
          }, 2000)
        }
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-destructive font-medium">{error}</p>
            <p className="mt-2 text-muted-foreground text-sm">Redirecting to login...</p>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Verifying your email...</p>
          </>
        )}
      </div>
    </div>
  )
}
