import { ShieldCheck, BadgeCheck, Heart, Star } from "lucide-react"

/**
 * TrustBadgeStrip — Horizontal strip of verification & trust badges.
 *
 * Two variants:
 *   "light" — cream background, dark text (for light page sections)
 *   "dark"  — transparent on dark-teal sections, white text
 *
 * Inline mode skips the section wrapper and renders badges only,
 * for embedding inside existing sections.
 */
interface TrustBadgeStripProps {
  variant?: "light" | "dark"
  inline?: boolean
}

const badges = [
  {
    icon: ShieldCheck,
    label: "GDC Registered",
    sublabel: "All clinics verified",
  },
  {
    icon: BadgeCheck,
    label: "Pearlie Verified",
    sublabel: "Quality reviewed",
  },
  {
    icon: Heart,
    label: "Satisfaction Guarantee",
    sublabel: "Or your next visit free",
  },
  {
    icon: Star,
    label: "4.8 Avg Rating",
    sublabel: "500+ practices",
  },
]

export function TrustBadgeStrip({ variant = "light", inline = false }: TrustBadgeStripProps) {
  const isDark = variant === "dark"

  const content = (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-8 md:gap-x-10">
      {badges.map((badge) => (
        <div key={badge.label} className="flex items-center gap-2.5">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
              isDark
                ? "bg-[#0fbcb0]/20"
                : "bg-[#0fbcb0]/10"
            }`}
          >
            <badge.icon
              className={`w-4 h-4 ${
                isDark ? "text-[#0fbcb0]" : "text-[#0fbcb0]"
              }`}
            />
          </div>
          <div className="min-w-0">
            <p
              className={`text-xs font-semibold leading-tight ${
                isDark ? "text-white" : "text-foreground"
              }`}
            >
              {badge.label}
            </p>
            <p
              className={`text-[10px] leading-tight ${
                isDark ? "text-white/50" : "text-muted-foreground"
              }`}
            >
              {badge.sublabel}
            </p>
          </div>
        </div>
      ))}
    </div>
  )

  if (inline) return content

  return (
    <div
      className={`py-4 border-y ${
        isDark
          ? "border-white/10 bg-white/[0.03]"
          : "border-border/40 bg-[var(--cream)]"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {content}
      </div>
    </div>
  )
}
