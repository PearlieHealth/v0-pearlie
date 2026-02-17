"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileNavMenu } from "@/components/mobile-nav-menu"
import { cn } from "@/lib/utils"

export function MainNav() {
  const pathname = usePathname()
  const router = useRouter()

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
    <header className="fixed top-5 left-4 right-4 md:left-8 md:right-8 z-50">
      <div className="relative overflow-hidden rounded-[3.4vw] bg-white/65 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.07),0_1.5px_6px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] px-4 sm:px-6 py-3">
        {/* Liquid glass specular highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-4 top-[1px] h-8 bg-gradient-to-b from-white/30 to-transparent rounded-t-[3.4vw]" />
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-full bg-[#0fbcb0] p-1.5">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#0fbcb0]">Pearlie</span>
          </Link>

          {/* Toggle - For Patients / For Clinics */}
          <div className="hidden md:flex items-center">
            <div className="flex items-center bg-white/30 backdrop-blur-md rounded-full p-1 border border-white/40">
              <button
                onClick={() => handleToggle("patients")}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
                  isForPatients
                    ? "bg-white/80 backdrop-blur-sm text-foreground shadow-[0_1px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.7)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/20",
                )}
              >
                For Patients
              </button>
              <button
                onClick={() => handleToggle("clinics")}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
                  isForClinics
                    ? "bg-white/80 backdrop-blur-sm text-foreground shadow-[0_1px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.7)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/20",
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
                    ? "text-[#0fbcb0]"
                    : "text-[#333] hover:text-[#0fbcb0]",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons - Right */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/patient/login"
              className="text-sm font-medium text-[#333] hover:text-[#0fbcb0] transition-colors"
            >
              My account
            </Link>
            <Button
              size="lg"
              className="text-sm px-6 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full shadow-[0_2px_8px_rgba(15,188,176,0.3),0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_16px_rgba(15,188,176,0.4),0_2px_6px_rgba(0,0,0,0.1)] transition-all border-0"
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
