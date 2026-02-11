"use client"

import React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for login page
      if (pathname === "/admin/login") {
        setIsChecking(false)
        return
      }

      try {
        const response = await fetch("/api/admin/auth")
        const data = await response.json()

        if (data.authenticated) {
          setIsAuthenticated(true)
        } else {
          // Use router.push first, then fallback to window.location
          router.push("/admin/login")
          setTimeout(() => {
            window.location.href = "/admin/login"
          }, 500)
          return
        }
      } catch (error) {
        router.push("/admin/login")
        setTimeout(() => {
          window.location.href = "/admin/login"
        }, 500)
        return
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [pathname, router])

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // If on login page, show content regardless of auth state
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  // If not authenticated, show nothing (will redirect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}

export function AdminLogoutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await fetch("/api/admin/auth", { method: "DELETE" })
      router.push("/admin/login")
      router.refresh()
    } catch (error) {
      console.error("Logout failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {isLoading ? "Logging out..." : "Logout"}
    </button>
  )
}
