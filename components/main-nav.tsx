"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Heart, Search, ChevronDown } from "lucide-react"
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

interface MainNavProps {
  hideCta?: boolean
}

export function MainNav({ hideCta }: MainNavProps) {
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [hasScrolled, setHasScrolled] = useState(false)

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
    { href: "/for-clinics", label: "For Clinics" },
  ]

  const aboutLinks = [
    { href: "/about", label: "About" },
    { href: "/faq", label: "FAQ" },
  ]

  return (
    <header className="fixed top-3 left-3 right-3 md:top-5 md:left-8 md:right-8 z-50">
      <div className="rounded-[6vw] md:rounded-[3.4vw] bg-white/70 backdrop-blur-[40px] backdrop-saturate-[1.4] border border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-full bg-[#0fbcb0] p-1.5">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-2xl font-heading font-bold tracking-tight text-[#0fbcb0]">Pearlie</span>
          </Link>

          {/* Desktop Navigation - Center */}
          <nav className="hidden md:flex items-center gap-1 font-heading">
            {/* Treatments - direct link */}
            <Link
              href="/treatments"
              className={cn(
                "px-4 py-2 text-sm font-medium transition-all duration-200",
                pathname === "/treatments"
                  ? "text-[#0fbcb0]"
                  : "text-[#333] hover:text-[#0fbcb0]",
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
                      ? "text-[#0fbcb0]"
                      : "text-[#333] hover:text-[#0fbcb0]",
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
                        pathname === link.href && "text-[#0fbcb0]",
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
                  ? "text-[#0fbcb0]"
                  : "text-[#333] hover:text-[#0fbcb0]",
              )}
            >
              Our Mission
            </Link>

            {/* About dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1 px-4 py-2 text-sm font-medium transition-all duration-200",
                    aboutLinks.some((link) => pathname === link.href)
                      ? "text-[#0fbcb0]"
                      : "text-[#333] hover:text-[#0fbcb0]",
                  )}
                >
                  About
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                {aboutLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link
                      href={link.href}
                      className={cn(
                        "w-full cursor-pointer",
                        pathname === link.href && "text-[#0fbcb0]",
                      )}
                    >
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* CTA Buttons - Right */}
          <div className="hidden md:flex items-center gap-3 transition-all duration-500">
            {!hasScrolled && (
              <>
                <Link
                  href={isAuthenticated ? "/patient/dashboard" : "/patient/login"}
                  className="text-sm font-heading font-medium text-[#333] hover:text-[#0fbcb0] transition-colors"
                >
                  My account
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-sm px-6 rounded-full font-normal transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] border-[#0fbcb0] text-[#0fbcb0] hover:bg-[#0fbcb0]/10"
                  asChild
                >
                  <a href="https://portal.pearlie.org" target="_blank" rel="noopener noreferrer">
                    Clinic Portal
                  </a>
                </Button>
              </>
            )}
            {!hideCta && (
              <Button
                size="lg"
                className={cn(
                  "text-sm bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full font-normal transition-all duration-700 ease-[cubic-bezier(0.66,0,0.1,1)] border-0",
                  hasScrolled ? "px-12" : "px-6",
                )}
                asChild
              >
                <Link href="/intake">Find my clinic</Link>
              </Button>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-1">
            {!hideCta && (
              <Link
                href="/intake"
                className="flex items-center justify-center h-10 w-10 rounded-full bg-[#0fbcb0] text-white hover:bg-[#0da399] transition-colors"
              >
                <Search className="h-4 w-4" />
                <span className="sr-only">Find my clinic</span>
              </Link>
            )}
            <MobileNavMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
