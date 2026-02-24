"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Heart, Home, Link2, Banknote, Settings, LogOut, Menu, X } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/affiliate/dashboard", label: "Overview", icon: Home },
  { href: "/affiliate/referrals", label: "Referrals", icon: Link2 },
  { href: "/affiliate/payouts", label: "Payouts", icon: Banknote },
  { href: "/affiliate/settings", label: "Settings", icon: Settings },
]

export function AffiliateSidebar({ affiliateName }: { affiliateName?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/affiliate/login")
  }

  const isActive = (href: string) => pathname === href

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-6 pb-4">
        <Link href="/affiliates" className="flex items-center gap-2">
          <div className="rounded-full bg-[#0D9B8A] p-1.5">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#0D9B8A]">Pearlie</span>
        </Link>
        <p className="text-[10px] uppercase tracking-[0.1em] text-[#6B6B80] mt-2">Affiliate Dashboard</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "text-white bg-white/[0.04]"
                  : "text-[#8B8BA3] hover:text-white hover:bg-white/[0.02]"
              )}
            >
              {active && (
                <div
                  className="w-[3px] h-5 rounded-full absolute left-0"
                  style={{ background: "linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%)" }}
                />
              )}
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom user info */}
      <div className="p-4 border-t border-white/[0.06]">
        {affiliateName && (
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-sm font-bold text-[#8B8BA3]">
              {affiliateName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-white truncate">{affiliateName}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm text-[#8B8BA3] hover:text-white transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-[#0A0A0F] border-r border-white/[0.06] fixed h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0F] border-t border-white/[0.06] z-50 px-2 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-xs transition-all",
                active ? "text-white" : "text-[#6B6B80]"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
