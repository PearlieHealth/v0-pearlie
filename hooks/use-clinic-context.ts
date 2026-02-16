"use client"

import { useEffect, useState, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"

export interface ClinicContext {
  clinicId: string | null
  clinicIds: string[] // For users with access to multiple clinics
  clinicName: string | null
  userRole: "CLINIC_ADMIN" | "CLINIC_USER" | "CORPORATE_ADMIN" | null
  corporateId: string | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to get the current user's clinic context
 * Ensures proper data isolation - users can only access their assigned clinics
 */
export function useClinicContext(): ClinicContext {
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [clinicIds, setClinicIds] = useState<string[]>([])
  const [clinicName, setClinicName] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<ClinicContext["userRole"]>(null)
  const [corporateId, setCorporateId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContext = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError("Not authenticated")
        setIsLoading(false)
        return
      }

      // First check clinic_portal_users (newer table)
      const { data: portalUser } = await supabase
        .from("clinic_portal_users")
        .select("clinic_ids, role, corporate_id")
        .eq("email", session.user.email)
        .single()

      if (portalUser) {
        setClinicIds(portalUser.clinic_ids || [])
        setClinicId(portalUser.clinic_ids?.[0] || null)
        setUserRole(portalUser.role as ClinicContext["userRole"])
        setCorporateId(portalUser.corporate_id || null)

        // Get clinic name for the primary clinic
        if (portalUser.clinic_ids?.[0]) {
          const { data: clinic } = await supabase
            .from("clinics")
            .select("name")
            .eq("id", portalUser.clinic_ids[0])
            .single()

          setClinicName(clinic?.name || null)
        }
      } else {
        // Fallback to legacy clinic_users table
        const { data: clinicUser } = await supabase
          .from("clinic_users")
          .select("clinic_id, role, clinics(name)")
          .eq("user_id", session.user.id)
          .single()

        if (clinicUser) {
          setClinicId(clinicUser.clinic_id)
          setClinicIds([clinicUser.clinic_id])
          setUserRole(
            clinicUser.role === "clinic_manager" ? "CLINIC_ADMIN" : "CLINIC_USER"
          )
          setClinicName((clinicUser.clinics as unknown as { name: string })?.name || null)
        } else {
          setError("User not assigned to any clinic")
        }
      }
    } catch (err) {
      console.error("[v0] Error fetching clinic context:", err)
      setError("Failed to load clinic data")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContext()
  }, [fetchContext])

  return {
    clinicId,
    clinicIds,
    clinicName,
    userRole,
    corporateId,
    isLoading,
    error,
    refetch: fetchContext,
  }
}

/**
 * Utility to check if user has access to a specific clinic
 */
export function useHasClinicAccess(targetClinicId: string): {
  hasAccess: boolean
  isLoading: boolean
} {
  const { clinicIds, isLoading } = useClinicContext()

  return {
    hasAccess: clinicIds.includes(targetClinicId),
    isLoading,
  }
}
