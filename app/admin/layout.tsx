import type React from "react"
import type { Metadata } from "next"
import { AdminAuthProvider } from "@/components/admin/admin-auth-provider"

export const metadata: Metadata = {
  robots: "noindex, nofollow",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>
}
