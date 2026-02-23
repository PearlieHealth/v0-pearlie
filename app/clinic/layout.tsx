import type React from "react"
import { ClinicShell } from "@/components/clinic/clinic-shell"

// No blanket noindex — public clinic profile pages need to be indexed.
// Dashboard pages are already protected by auth middleware + robots.txt.

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  return <ClinicShell>{children}</ClinicShell>
}
