"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileNavMenu } from "@/components/mobile-nav-menu"
import { cn } from "@/lib/utils"

export function MainNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const isForClinics = pathname === "/for-clinics"
  const isForPatients = pathname === "/" || pathname === "/intake"

  const navLinks = [
    { href: "/our-mission", label: "Our Mission" },
    { href: "/about", label: "About" },
    { href: "/faq", label: "FAQ" },
    { href: "/admin", label: "Admin" },
  ]

  const handleToggle = (target: "patients" | "clinics") => {
    if (target === "patients") {
      router.push("/")
    } else {
      router.push("/for-clinics")
    }
  }

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled 
          ? "bg-white/90 backdrop-blur-md border-b border-border/50 shadow-sm" 
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[#907EFF] to-[#ED64A6] bg-clip-text text-transparent">Pearlie</span>
          </Link>

          {/* Toggle - For Patients / For Clinics */}
          <div className="hidden md:flex items-center">
            <div className="flex items-center bg-[#F5F3FF]/60 rounded-full p-1 border border-[#E8E4F0]">
              <button
                onClick={() => handleToggle("patients")}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
                  isForPatients
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                For Patients
              </button>
              <button
                onClick={() => handleToggle("clinics")}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
                  isForClinics
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                For Clinics
              </button>
            </div>
          </div>

          {/* Desktop Navigation - Center */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-all duration-200",
                  pathname === link.href
                    ? "text-primary"
                    : "text-foreground/70 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Button - Right */}
          <div className="hidden md:flex items-center">
            <Button
              size="lg"
              className="text-sm px-6 bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white rounded-full shadow-lg hover:shadow-xl transition-all border-0"
              asChild
            >
              <Link href="/intake">Find my clinic</Link>
            </Button>
          </div>

          {/* Mobile Navigation */}
          <MobileNavMenu />
        </div>
      </div>
    </header>
  )
}
