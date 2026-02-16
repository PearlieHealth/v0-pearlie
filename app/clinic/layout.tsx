import type React from "react"
import type { Metadata } from "next"
import { ClinicShell } from "@/components/clinic/clinic-shell"

export const metadata: Metadata = {
  robots: "noindex, nofollow",
}

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  return <ClinicShell>{children}</ClinicShell>
}
