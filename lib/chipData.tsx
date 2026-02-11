import {
  Accessibility,
  Car,
  Train,
  CreditCard,
  Percent,
  Banknote,
  Heart,
  Pill,
  Headphones,
  Clock,
  Calendar,
  Globe,
  Zap,
  Scan,
  Box,
  Sparkles,
  Stethoscope,
  Smile,
} from "lucide-react"
import type { ReactNode } from "react"

interface ChipData {
  label: string
  icon: ReactNode
}

const iconClass = "w-4 h-4 text-muted-foreground"

export function getChipData(chip: string): ChipData {
  const chipMap: Record<string, ChipData> = {
    wheelchair_access: {
      label: "Wheelchair Access",
      icon: <Accessibility className={iconClass} />,
    },
    parking_onsite: {
      label: "On-site Parking",
      icon: <Car className={iconClass} />,
    },
    parking_nearby: {
      label: "Parking Nearby",
      icon: <Car className={iconClass} />,
    },
    public_transport: {
      label: "Near Transport",
      icon: <Train className={iconClass} />,
    },
    finance_0_percent: {
      label: "0% Finance",
      icon: <Percent className={iconClass} />,
    },
    finance_available: {
      label: "Finance Available",
      icon: <CreditCard className={iconClass} />,
    },
    payment_plans: {
      label: "Payment Plans",
      icon: <Banknote className={iconClass} />,
    },
    nhs_available: {
      label: "NHS Available",
      icon: <Heart className={iconClass} />,
    },
    sedation_available: {
      label: "Sedation",
      icon: <Pill className={iconClass} />,
    },
    noise_cancelling: {
      label: "Noise Cancelling",
      icon: <Headphones className={iconClass} />,
    },
    evening_appointments: {
      label: "Evenings",
      icon: <Clock className={iconClass} />,
    },
    weekend_appointments: {
      label: "Weekends",
      icon: <Calendar className={iconClass} />,
    },
    online_booking: {
      label: "Online Booking",
      icon: <Globe className={iconClass} />,
    },
    same_day_emergency: {
      label: "Same Day",
      icon: <Zap className={iconClass} />,
    },
    digital_xrays: {
      label: "Digital X-rays",
      icon: <Scan className={iconClass} />,
    },
    "3d_imaging": {
      label: "3D Imaging",
      icon: <Box className={iconClass} />,
    },
    laser_dentistry: {
      label: "Laser Dentistry",
      icon: <Sparkles className={iconClass} />,
    },
    orthodontist_onsite: {
      label: "Orthodontist",
      icon: <Stethoscope className={iconClass} />,
    },
    implant_specialist: {
      label: "Implant Specialist",
      icon: <Stethoscope className={iconClass} />,
    },
    cosmetic_focus: {
      label: "Cosmetic Focus",
      icon: <Smile className={iconClass} />,
    },
  }

  if (chipMap[chip]) {
    return chipMap[chip]
  }

  // Fallback for unknown chips
  return {
    label: chip.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    icon: <Sparkles className={iconClass} />,
  }
}
