import {
  Shield,
  MessageCircle,
  Star,
  CheckCircle2,
  Sparkles,
} from "lucide-react"

const trustItems = [
  {
    icon: Shield,
    title: "Verified & Compliant",
    description:
      "All clinics are verified and must hold active professional registration and regulatory compliance.",
  },
  {
    icon: MessageCircle,
    title: "Interviewed by Pearlie",
    description:
      "We conduct a comprehensive review with the dentist and their staff to understand how the practice operates and delivers care.",
  },
  {
    icon: Star,
    title: "Consistent Patient Feedback",
    description:
      "We prioritise clinics with strong, consistent patient reviews and clear evidence of patient satisfaction.",
  },
  {
    icon: CheckCircle2,
    title: "Transparent & Clear Communication",
    description:
      "Clinics must provide clear treatment information, honest communication, and upfront guidance on care options.",
  },
  {
    icon: Sparkles,
    title: "Match-Based Recommendations",
    description:
      "We recommend clinics based on your needs, preferences, urgency, and availability — not just who is closest.",
  },
]

export function TrustBox() {
  return (
    <div className="rounded-2xl bg-[#004443] p-5 shadow-lg">
      <h3 className="text-[15px] font-bold text-white leading-snug mb-1.5">
        Not seeing every dentist near you? Here&apos;s why.
      </h3>
      <p className="text-xs text-white/70 leading-relaxed mb-4">
        We carefully select and recommend clinics that meet our standards for
        quality, transparency, and patient care.
      </p>

      <div className="space-y-3.5">
        {trustItems.map((item) => (
          <div key={item.title} className="flex gap-2.5">
            <div className="flex-shrink-0 mt-0.5">
              <item.icon className="w-4 h-4 text-[#0fbcb0]" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">
                {item.title}
              </p>
              <p className="text-xs text-white/60 leading-relaxed mt-0.5">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3.5 border-t border-white/10">
        <p className="text-xs text-white/50 leading-relaxed italic">
          We prioritise quality and fit over quantity — so you can feel confident
          in your choice.
        </p>
      </div>
    </div>
  )
}
