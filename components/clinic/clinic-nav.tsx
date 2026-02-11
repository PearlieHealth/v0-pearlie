"use client"

import { useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2, LogOut, Menu, User } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface ClinicNavProps {
  clinicName: string
}

export function ClinicNav({ clinicName }: ClinicNavProps) {
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    window.location.href = "/clinic/login"
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/clinic" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold hidden sm:inline-block">Clinic Portal</span>
          </Link>
          <div className="hidden md:block text-sm text-muted-foreground">
            {clinicName}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/clinic" className="text-sm font-medium hover:text-primary transition-colors">
              Leads
            </Link>
            <Link href="/clinic/bookings" className="text-sm font-medium hover:text-primary transition-colors">
              Bookings
            </Link>
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild className="hidden md:flex">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="text-muted-foreground">
                {clinicName}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile nav */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <div className="flex flex-col h-full">
                <div className="py-4 border-b border-border">
                  <p className="font-semibold">{clinicName}</p>
                  <p className="text-sm text-muted-foreground">Clinic Portal</p>
                </div>

                <nav className="flex-1 py-4 space-y-1">
                  <Link
                    href="/clinic"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    Leads
                  </Link>
                  <Link
                    href="/clinic/bookings"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    Bookings
                  </Link>
                </nav>

                <div className="border-t border-border py-4">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 w-full text-left text-destructive hover:bg-muted rounded-md transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
