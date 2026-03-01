"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  ArrowLeft,
  BarChart3,
  Building2,
  FlaskConical,
  Menu,
  Tags,
  ClipboardList,
  CheckSquare,
  LogOut,
  Users,
  Settings,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Upload,
} from "lucide-react"
import { AdminLogoutButton } from "./admin-auth-provider"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavItem {
  href: string
  label: string
  shortLabel?: string
  icon: any
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Insights",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Clinics",
    items: [
      { href: "/admin/clinics", label: "Clinic Directory", shortLabel: "Clinics", icon: Building2 },
      { href: "/admin/bulk-import", label: "Bulk Import", shortLabel: "Import", icon: Upload },
      { href: "/admin/clinic-waitlist", label: "Waitlist", icon: ClipboardList },
      { href: "/admin/clinic-users", label: "Clinic Users", shortLabel: "Users", icon: Users },
    ],
  },
  {
    label: "Matching",
    items: [
      { href: "/admin/test-match", label: "Test Match", icon: FlaskConical },
      { href: "/admin/tag-hygiene", label: "Match Readiness", shortLabel: "Readiness", icon: Tags },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/pilot-checklist", label: "Pilot Checklist", shortLabel: "Pilot", icon: CheckSquare },
      { href: "/admin/chat-history", label: "Chat History", shortLabel: "Chats", icon: MessageSquare },
      { href: "/admin/email-logs", label: "Email Logs", shortLabel: "Emails", icon: Mail },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
]

// Flat list of all items for convenience
const allNavItems = navGroups.flatMap((g) => g.items)

// Primary items shown directly in the desktop nav bar
const primaryItems = allNavItems.slice(0, 5)
// Overflow items shown in a "More" dropdown
const overflowItems = allNavItems.slice(5)

export function AdminNav(_props?: { currentPath?: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")
  const overflowHasActive = overflowItems.some((item) => isActive(item.href))

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-3 lg:gap-6 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-lg font-semibold tracking-tight hidden sm:block">Pearlie</span>
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {primaryItems.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                      active
                        ? "bg-[#0d1019] text-white shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.shortLabel || item.label}
                  </Link>
                )
              })}

              {/* More dropdown for overflow items */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                      overflowHasActive
                        ? "bg-[#0d1019] text-white shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    More
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {overflowItems.map((item, idx) => {
                    const active = isActive(item.href)
                    const Icon = item.icon
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2 w-full",
                            active && "font-semibold",
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            {/* Tablet navigation (md but not lg) — show fewer items */}
            <nav className="hidden md:flex lg:hidden items-center gap-1">
              {primaryItems.slice(0, 3).map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all",
                      active
                        ? "bg-[#0d1019] text-white shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.shortLabel || item.label}
                  </Link>
                )
              })}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all",
                      allNavItems.slice(3).some((item) => isActive(item.href))
                        ? "bg-[#0d1019] text-white shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    More
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {allNavItems.slice(3).map((item) => {
                    const active = isActive(item.href)
                    const Icon = item.icon
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2 w-full",
                            active && "font-semibold",
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <AdminLogoutButton />
          </div>

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-secondary p-0" hideCloseButton>
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <span className="text-lg font-semibold text-foreground">Pearlie Admin</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(false)}
                    className="h-8 w-8 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
                  >
                    <span className="text-lg">&times;</span>
                    <span className="sr-only">Close menu</span>
                  </Button>
                </div>
                <nav className="flex-1 overflow-y-auto py-2">
                  {navGroups.map((group, groupIdx) => (
                    <div key={group.label}>
                      {groupIdx > 0 && <div className="mx-4 my-2 border-t border-border" />}
                      <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {group.label}
                      </p>
                      {group.items.map((item) => {
                        const active = isActive(item.href)
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                              active
                                ? "bg-[#0d1019] text-white shadow-sm"
                                : "text-muted-foreground hover:bg-card hover:text-foreground",
                            )}
                          >
                            <Icon className="w-4.5 h-4.5" />
                            {item.label}
                          </Link>
                        )
                      })}
                    </div>
                  ))}
                </nav>
                <div className="p-4 border-t border-border space-y-3">
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
