"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { clinicHref } from "@/lib/clinic-url"

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
  unrepliedCount?: number
  unreadMessagesCount?: number
  /** Called after a nav link is clicked (used to close mobile sheet) */
  onNavigate?: () => void
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
    href: "/clinic/settings",
    label: "Settings",
    icon: Settings,
    roles: ["CLINIC_USER", "CLINIC_ADMIN", "CORPORATE_ADMIN"],
  },
]

export function ClinicSidebar({ clinicName, clinicId, userRole, newLeadsCount = 0, unrepliedCount = 0, unreadMessagesCount = 0, onNavigate }: ClinicSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  // When onNavigate is provided we're inside a mobile Sheet — never collapse
  const isMobile = !!onNavigate
  const isCollapsed = collapsed && !isMobile

  const handleLogout = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    window.location.href = clinicHref("/clinic/login")
  }

  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole))

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col h-full min-h-0 bg-card border-r border-border transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center h-14 border-b border-border px-4",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && (
            <Link href={clinicHref("/clinic")} className="flex items-center gap-2.5" onClick={onNavigate}>
              <div className="rounded-full bg-[#faf3e6] p-1.5">
                <Heart className="w-4 h-4 text-foreground fill-foreground" />
              </div>
              <span className="font-semibold text-lg">Pearlie</span>
            </Link>
          )}
          {isCollapsed && (
            <Link href={clinicHref("/clinic")}>
              <div className="rounded-full bg-[#faf3e6] p-1.5">
                <Heart className="w-4 h-4 text-foreground fill-foreground" />
              </div>
            </Link>
          )}
          {!isCollapsed && !isMobile && (
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
        {!isCollapsed && (
          <div className="px-4 py-3 border-b border-border">
            <p className="font-medium text-sm truncate">{clinicName}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {userRole.replace("_", " ").toLowerCase()}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className={cn("flex-1 py-3 px-2 space-y-0.5 overflow-y-auto", isMobile && "py-4 space-y-1")}>
          {filteredNavItems.map((item) => {
            const resolvedHref = clinicHref(item.href)
            const isActive = pathname === item.href || pathname === resolvedHref ||
              (item.href !== "/clinic" && (pathname.startsWith(item.href) || pathname.startsWith(resolvedHref)))
            const Icon = item.icon

            const combinedCount = unrepliedCount + unreadMessagesCount
            const showRedDot = item.badge && combinedCount > 0

            const linkContent = (
              <Link
                href={resolvedHref}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 rounded-lg transition-colors",
                  isMobile ? "py-3 text-base" : "py-2.5",
                  isActive
                    ? "bg-[#faf3e6] text-[#0fbcb0] font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <div className="relative flex-shrink-0">
                  <Icon className={cn("h-5 w-5", isMobile && "h-5 w-5")} />
                  {showRedDot && isCollapsed && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {combinedCount > 9 ? "9+" : combinedCount}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {showRedDot && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                        {combinedCount > 99 ? "99+" : combinedCount}
                      </span>
                    )}
                    {item.badge && !showRedDot && newLeadsCount > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {newLeadsCount}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            )

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-2">
                    {item.label}
                    {item.badge && combinedCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                        {combinedCount}
                      </span>
                    )}
                    {item.badge && combinedCount === 0 && newLeadsCount > 0 && (
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
        <div className={cn("border-t border-border p-2", isMobile && "p-3")}>
          {isCollapsed ? (
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
              className={cn(
                "w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10",
                isMobile && "h-12 text-base"
              )}
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
