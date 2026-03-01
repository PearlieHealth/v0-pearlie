"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Heart, Search, ChevronDown, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileNavMenu } from "@/components/mobile-nav-menu"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { useLastMatchId } from "@/hooks/use-last-match"

interface MainNavProps {
  hideCta?: boolean
}

export function MainNav({ hideCta }: MainNavProps) {
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [hasScrolled, setHasScrolled] = useState(false)
  const lastMatchId = useLastMatchId()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
      setUserRole(session?.user?.user_metadata?.role || null)
    })
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > window.innerHeight * 0.85)
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const resourcesLinks = [
    { href: "/blog", label: "Blog" },
    { href: "/guides", label: "Guides" },
    { href: "/about", label: "About" },
    { href: "/for-clinics", label: "For Clinics" },
  ]

  return (
    <header className="fixed top-3 left-3 right-3 md:top-5 md:left-8 md:right-8 z-50">
      <div className="rounded-[6vw] md:rounded-[3.4vw] bg-[#111218]/80 backdrop-blur-[40px] backdrop-saturate-[1.4] border border-[#1f2133]/60 shadow-[0_4px_24px_rgba(0,0,0,0.25),0_1px_2px_rgba(0,0,0,0.15)] px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-full bg-primary p-1.5">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-2xl font-heading font-bold tracking-tight text-primary">Pearlie</span>
          </Link>

          {/* Desktop Navigation - Center */}
          <nav className="hidden md:flex items-center gap-1 font-heading">
            {/* Treatments - direct link */}
            <Link
              href="/treatments"
              className={cn(
                "px-4 py-2 text-sm font-medium transition-all duration-200",
                pathname === "/treatments"
                  ? "text-primary"
                  : "text-foreground/70 hover:text-primary",
              )}
            >
              Treatments
            </Link>

            {/* Resources dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1 px-4 py-2 text-sm font-medium transition-all duration-200",
                    resourcesLinks.some((link) => pathname === link.href)
                      ? "text-primary"
                      : "text-foreground/70 hover:text-primary",
                  )}
                >
                  Resources
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                {resourcesLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link
                      href={link.href}
                      className={cn(
                        "w-full cursor-pointer",
                        pathname === link.href && "text-primary",
                      )}
                    >
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Our Mission - direct link */}
            <Link
              href="/our-mission"
              className={cn(
                "px-4 py-2 text-sm font-medium transition-all duration-200",
                pathname === "/our-mission"
                  ? "text-primary"
                  : "text-foreground/70 hover:text-primary",
              )}
            >
              Our Mission
            </Link>

            {/* FAQ - direct link */}
            <Link
              href="/faq"
              className={cn(
                "px-4 py-2 text-sm font-medium transition-all duration-200",
                pathname === "/faq"
                  ? "text-primary"
                  : "text-foreground/70 hover:text-primary",
              )}
            >
              FAQ
            </Link>
          </nav>

          {/* CTA Buttons - Right */}
          <div className="hidden md:flex items-center gap-3 transition-all duration-500">
            {!hasScrolled && (
              <>
                <Link
                  href={isAuthenticated ? "/patient/dashboard" : "/patient/login"}
                  className="text-sm font-heading font-medium text-foreground/70 hover:text-primary transition-colors"
                >
                  My account
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-sm px-6 rounded-full font-normal transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] border-primary text-primary hover:bg-primary/10"
                  asChild
                >
                  <a href="https://portal.pearlie.org" target="_blank" rel="noopener noreferrer">
                    Clinic Portal
                  </a>
                </Button>
              </>
            )}
            {lastMatchId ? (
              <Button
                size="lg"
                className={cn(
                  "text-sm bg-primary hover:bg-[var(--primary-hover)] text-white rounded-full font-normal transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] border-0 shadow-[0_0_20px_rgba(15,188,176,0.25)]",
                  hasScrolled ? "px-12" : "px-6",
                )}
                asChild
              >
                <Link href={`/match/${lastMatchId}`}>
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Your matches
                </Link>
              </Button>
            ) : !hideCta ? (
              <Button
                size="lg"
                className={cn(
                  "text-sm bg-primary hover:bg-[var(--primary-hover)] text-white rounded-full font-normal transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] border-0 shadow-[0_0_20px_rgba(15,188,176,0.25)]",
                  hasScrolled ? "px-12" : "px-6",
                )}
                asChild
              >
                <Link href="/intake">Find my dentist</Link>
              </Button>
            ) : null}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-1">
            {lastMatchId ? (
              <Link
                href={`/match/${lastMatchId}`}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-white hover:bg-[var(--primary-hover)] transition-colors shadow-[0_0_15px_rgba(15,188,176,0.3)]"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="sr-only">Your matches</span>
              </Link>
            ) : !hideCta ? (
              <Link
                href="/intake"
                className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-white hover:bg-[var(--primary-hover)] transition-colors shadow-[0_0_15px_rgba(15,188,176,0.3)]"
              >
                <Search className="h-4 w-4" />
                <span className="sr-only">Find my clinic</span>
              </Link>
            ) : null}
            <MobileNavMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
