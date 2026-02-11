"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Check if this is a redirect error (Next.js throws these internally)
  const isRedirectError = 
    error.message === "NEXT_REDIRECT" || 
    error.message?.includes("Redirect") ||
    error.message?.includes("NEXT_NOT_FOUND") ||
    error.digest?.includes("NEXT_REDIRECT") ||
    error.digest?.includes("NEXT_NOT_FOUND")

  useEffect(() => {
    // Skip logging for Next.js internal redirect/not-found errors
    if (isRedirectError) {
      return
    }
    // Log error to console (Sentry would capture this automatically when added)
    console.error("[Pearlie Error]", error)
  }, [error, isRedirectError])
  
  // Don't show error UI for redirect errors - they're expected behavior
  if (isRedirectError) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground">
            We encountered an unexpected error. Please try again or return to the homepage.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
          <Button asChild variant="outline" className="gap-2 bg-transparent">
            <Link href="/">
              <Home className="w-4 h-4" />
              Go home
            </Link>
          </Button>
        </div>

        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
