"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, BarChart3, Building2, FlaskConical, Menu, Tags, ClipboardList, CheckSquare, LogOut, Users, Settings } from "lucide-react"
import { AdminLogoutButton } from "./admin-auth-provider"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export function AdminNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const navItems = [
    {
      href: "/admin/analytics",
      label: "Analytics",
      icon: BarChart3,
    },
    {
      href: "/admin/clinics",
      label: "Clinic Directory",
      icon: Building2,
    },
    {
      href: "/admin/test-match",
      label: "Test Match",
      icon: FlaskConical,
    },
    {
      href: "/admin/tag-hygiene",
      label: "Match Readiness",
      icon: Tags,
    },
    {
      href: "/admin/clinic-waitlist",
      label: "Waitlist",
      icon: ClipboardList,
    },
    {
      href: "/admin/pilot-checklist",
      label: "Pilot Checklist",
      icon: CheckSquare,
    },
    {
      href: "/admin/clinic-users",
      label: "Clinic Users",
      icon: Users,
    },
    {
      href: "/admin/settings",
      label: "Settings",
      icon: Settings,
    },
  ]

  return (
    <header className="border-b border-border bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4 lg:gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <div className="text-xl md:text-2xl font-semibold tracking-tight hidden sm:block">Pearlie Admin</div>
            </Link>
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-[#1a2332] text-white shadow-sm"
                        : "text-muted-foreground hover:bg-[#f8f7f4] hover:text-foreground",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <AdminLogoutButton />
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-[#fafaf9] p-0" hideCloseButton>
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <span className="text-lg font-semibold text-[#1a2332]">Pearlie Admin</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(false)}
                    className="h-8 w-8 rounded-full bg-white border border-border hover:bg-[#f0efeb] transition-colors"
                  >
                    <span className="text-lg">×</span>
                    <span className="sr-only">Close menu</span>
                  </Button>
                </div>
                <nav className="flex flex-col gap-2 p-4">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all",
                          isActive
                            ? "bg-[#1a2332] text-white shadow-sm"
                            : "text-muted-foreground hover:bg-white hover:text-foreground",
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>
                <div className="mt-auto p-4 border-t border-border space-y-3">
                  <Link
                    href="/"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Pearlie
                  </Link>
                  <div className="flex items-center gap-2 text-sm">
                    <LogOut className="w-4 h-4 text-muted-foreground" />
                    <AdminLogoutButton />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
