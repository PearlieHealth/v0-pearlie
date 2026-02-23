"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Menu,
  Heart,
  LayoutDashboard,
  Users,
  CalendarCheck,
  BarChart3,
  Building2,
  Settings,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createBrowserClient } from "@/lib/supabase/client"
import { clinicHref } from "@/lib/clinic-url"
import { useRouter } from "next/navigation"

const navItems = [
  { href: "/clinic", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clinic/appointments", label: "Appointments", icon: CalendarCheck },
  { href: "/clinic/insights", label: "Insights", icon: BarChart3 },
  { href: "/clinic/profile", label: "Clinic Profile", icon: Building2 },
  { href: "/clinic/providers", label: "Providers", icon: Users },
  { href: "/clinic/settings", label: "Settings", icon: Settings },
]

interface ClinicMobileNavProps {
  clinicName: string
}

export function ClinicMobileNav({ clinicName }: ClinicMobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push(clinicHref("/clinic/login"))
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b">
            <Link href={clinicHref("/clinic")} className="flex items-center gap-2" onClick={() => setOpen(false)}>
              <div className="rounded-full bg-black p-1.5">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-semibold">Pearlie</span>
            </Link>
            <p className="text-sm text-muted-foreground mt-1 truncate">{clinicName}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const resolvedHref = clinicHref(item.href)
              const isActive = pathname === item.href || pathname === resolvedHref ||
                (item.href !== "/clinic" && (pathname.startsWith(item.href) || pathname.startsWith(resolvedHref)))

              return (
                <Link
                  key={item.href}
                  href={resolvedHref}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
