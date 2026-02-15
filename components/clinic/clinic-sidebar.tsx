"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  BarChart3,
  Building2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Heart,
  UserCog,
  MessageCircle,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

interface ClinicSidebarProps {
  clinicName: string
  clinicId: string
  userRole: "CLINIC_USER" | "CLINIC_ADMIN" | "CORPORATE_ADMIN"
  newLeadsCount?: number
}

const navItems = [
  {
    href: "/clinic",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["CLINIC_USER", "CLINIC_ADMIN", "CORPORATE_ADMIN"],
  },
  {
    href: "/clinic/appointments",
    label: "Appointments",
    icon: CalendarCheck,
    roles: ["CLINIC_USER", "CLINIC_ADMIN", "CORPORATE_ADMIN"],
    badge: true,
  },
  {
    href: "/clinic/insights",
    label: "Insights",
    icon: BarChart3,
    roles: ["CLINIC_USER", "CLINIC_ADMIN", "CORPORATE_ADMIN"],
  },
  {
    href: "/clinic/profile",
    label: "Clinic Profile",
    icon: Building2,
    roles: ["CLINIC_USER", "CLINIC_ADMIN", "CORPORATE_ADMIN"],
  },
  {
    href: "/clinic/providers",
    label: "Providers",
    icon: Users,
    roles: ["CLINIC_USER", "CLINIC_ADMIN", "CORPORATE_ADMIN"],
  },
  {
    href: "/clinic/team",
    label: "Team",
    icon: UserCog,
    roles: ["CLINIC_USER", "CLINIC_ADMIN", "CORPORATE_ADMIN"],
  },
  {
    href: "/clinic/settings",
    label: "Settings",
    icon: Settings,
    roles: ["CLINIC_USER", "CLINIC_ADMIN", "CORPORATE_ADMIN"],
  },
]

export function ClinicSidebar({ clinicName, clinicId, userRole, newLeadsCount = 0 }: ClinicSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const handleLogout = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    window.location.href = "/clinic/login"
  }

  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole))

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col h-screen bg-card border-r border-border transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center h-16 border-b border-border px-4",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <Link href="/clinic" className="flex items-center gap-2.5">
              <div className="rounded-full bg-[#E8E4F0] p-1.5">
                <Heart className="w-4 h-4 text-foreground fill-foreground" />
              </div>
              <span className="font-semibold text-lg">Pearlie</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/clinic">
              <div className="rounded-full bg-[#E8E4F0] p-1.5">
                <Heart className="w-4 h-4 text-foreground fill-foreground" />
              </div>
            </Link>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCollapsed(true)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Clinic Info */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-border">
            <p className="font-medium text-sm truncate">{clinicName}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {userRole.replace("_", " ").toLowerCase()}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/clinic" && pathname.startsWith(item.href))
            const Icon = item.icon

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActive
                    ? "bg-[#F5F0FF] text-[#7C3AED] font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && newLeadsCount > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {newLeadsCount}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-2">
                    {item.label}
                    {item.badge && newLeadsCount > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {newLeadsCount}
                      </Badge>
                    )}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return <div key={item.href}>{linkContent}</div>
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-2">
          {collapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-10"
                    onClick={() => setCollapsed(false)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand sidebar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-10 text-destructive hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
