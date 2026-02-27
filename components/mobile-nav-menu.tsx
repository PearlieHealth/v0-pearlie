"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, Heart, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

export function MobileNavMenu() {
  const [open, setOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
      setUserRole(session?.user?.user_metadata?.role || null)
    })
  }, [])

  const resourcesLinks = [
    { href: "/blog", label: "Blog" },
    { href: "/guides", label: "Guides" },
    { href: "/about", label: "About" },
    { href: "/for-clinics", label: "For Clinics" },
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 rounded-full hover:bg-black/[0.04]">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        hideCloseButton
        className="w-full max-w-[300px] sm:max-w-[350px] p-0 border-l border-border/50 bg-white"
      >
        {/* Header with logo and custom close button */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <div className="rounded-full bg-primary p-1.5">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-heading font-bold tracking-tight text-foreground">Pearlie</span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-white border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Close menu</span>
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex flex-col px-6 py-6 font-heading">
          <div className="space-y-1">
            <Link
              href="/treatments"
              className="flex items-center h-12 px-4 rounded-xl text-base font-medium text-muted-foreground hover:text-foreground hover:bg-white transition-colors"
              onClick={() => setOpen(false)}
            >
              Treatments
            </Link>

            {/* Resources - collapsible section */}
            <div>
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="flex items-center justify-between w-full h-12 px-4 rounded-xl text-base font-medium text-muted-foreground hover:text-foreground hover:bg-white transition-colors"
              >
                Resources
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    resourcesOpen && "rotate-180",
                  )}
                />
              </button>
              {resourcesOpen && (
                <div className="ml-4 border-l border-border/50 pl-2 space-y-1">
                  {resourcesLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center h-10 px-4 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/our-mission"
              className="flex items-center h-12 px-4 rounded-xl text-base font-medium text-muted-foreground hover:text-foreground hover:bg-white transition-colors"
              onClick={() => setOpen(false)}
            >
              Our Mission
            </Link>
            <Link
              href="/faq"
              className="flex items-center h-12 px-4 rounded-xl text-base font-medium text-muted-foreground hover:text-foreground hover:bg-white transition-colors"
              onClick={() => setOpen(false)}
            >
              FAQ
            </Link>
          </div>

          {/* Bottom buttons */}
          <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full text-base h-12 rounded-full border-[#0fbcb0] text-[#0fbcb0] hover:bg-[#0fbcb0]/10"
              asChild
            >
              <a href="https://portal.pearlie.org" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                Clinic Portal
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full text-base h-12 rounded-full"
              asChild
            >
              <Link href={isAuthenticated ? "/patient/dashboard" : "/patient/login"} onClick={() => setOpen(false)}>
                My account
              </Link>
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
