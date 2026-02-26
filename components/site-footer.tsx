"use client"

import Link from "next/link"
import { Heart } from "lucide-react"
import { CookieSettingsButton } from "@/components/cookie-settings-button"

const platformLinks = [
  { label: "Home", href: "/" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "For Clinics", href: "/for-clinics" },
  { label: "Our Mission", href: "/our-mission" },
  { label: "FAQ", href: "/faq" },
]

const treatmentLinks = [
  { label: "All Treatments", href: "/treatments" },
  { label: "Invisalign", href: "/treatments/invisalign" },
  { label: "Dental Implants", href: "/treatments/dental-implants" },
  { label: "Teeth Whitening", href: "/treatments/teeth-whitening" },
  { label: "Composite Bonding", href: "/treatments/composite-bonding" },
  { label: "Veneers", href: "/treatments/veneers" },
  { label: "Emergency Dentist", href: "/treatments/emergency-dental" },
]

const findDentistLinks = [
  { label: "Dentist Near Me", href: "/find/dentist-near-me" },
  { label: "Central London", href: "/find/central-london" },
  { label: "South London", href: "/find/south-london" },
  { label: "North London", href: "/find/north-london" },
  { label: "West London", href: "/find/west-london" },
  { label: "East London", href: "/find/east-london" },
  { label: "All London areas", href: "/find" },
]

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Use", href: "/terms" },
]

export function SiteFooter() {
  return (
    <footer className="bg-[#004443] text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="max-w-7xl mx-auto">
          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 md:gap-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-[#0fbcb0] fill-[#0fbcb0]" />
                <span className="text-lg font-heading font-bold text-white">Pearlie</span>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">
                Founded in London. UK-founded and operated dental matching platform — helping you find the right clinic, on your terms.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2.5">
                {platformLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Treatments */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Treatments</h4>
              <ul className="space-y-2.5">
                {treatmentLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Find a Dentist */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Find a Dentist</h4>
              <ul className="space-y-2.5">
                {findDentistLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <CookieSettingsButton variant="footer" />
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="mailto:hello@pearlie.org"
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    hello@pearlie.org
                  </a>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    About Us
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 mt-10 pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-white/40">
                &copy; {new Date().getFullYear()} Pearlie. All rights reserved.
              </p>
              <p className="text-xs text-white/40 text-center sm:text-right max-w-md">
                Pearlie is an independent matching service. We do not provide dental treatment or medical advice.
                <br />
                Pearlie Ltd — Company No. 16234337
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
