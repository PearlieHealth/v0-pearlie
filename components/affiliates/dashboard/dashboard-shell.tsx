"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Heart,
  LayoutDashboard,
  MousePointerClick,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"
import type { Affiliate } from "@/lib/affiliates/types"

interface DashboardShellProps {
  children: React.ReactNode
  affiliate: Affiliate
  activePage: "overview" | "referrals" | "payouts" | "settings"
}

const navItems = [
  { key: "overview", href: "/affiliate/dashboard", label: "Overview", icon: LayoutDashboard },
  { key: "referrals", href: "/affiliate/dashboard/referrals", label: "Referrals", icon: MousePointerClick },
  { key: "payouts", href: "/affiliate/dashboard/payouts", label: "Payouts", icon: Wallet },
  { key: "settings", href: "/affiliate/dashboard/settings", label: "Settings", icon: Settings },
] as const

export function AffiliateDashboardShell({ children, affiliate, activePage }: DashboardShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/affiliate/login")
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#FFF8F0" }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0" style={{ backgroundColor: "#0D4F4F" }}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
            <Heart className="w-5 h-5 text-white fill-white" />
            <span className="text-lg font-heading font-bold text-white">Pearlie</span>
            <span className="text-xs font-medium text-white/50 ml-auto">Affiliate</span>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = activePage === item.key
              const Icon = item.icon
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                  style={isActive ? { borderLeft: "3px solid", borderImage: "linear-gradient(to bottom, #FF5C72, #00D4FF) 1" } : {}}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #FF5C72, #00D4FF)" }}
              >
                {affiliate.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{affiliate.name}</p>
                <p className="text-xs text-white/50 truncate">{affiliate.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2 rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: "#0D4F4F" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-white fill-white" />
            <span className="text-lg font-heading font-bold text-white">Pearlie</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white p-2"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="px-3 pb-4 space-y-1 border-t border-white/10">
            {navItems.map((item) => {
              const isActive = activePage === item.key
              const Icon = item.icon
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {item.label}
                </Link>
              )
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  )
}
