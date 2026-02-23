"use client"

import { useState } from "react"
import { CheckCircle, Loader2 } from "lucide-react"

export function AffiliateSignupForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    tiktok_handle: "",
    instagram_handle: "",
    youtube_handle: "",
    motivation: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/affiliates/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.")
        return
      }

      setSubmitted(true)
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <section className="py-20 sm:py-28" style={{ backgroundColor: "#FFF8F0" }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mx-auto text-center">
            <div
              className="bg-white rounded-2xl p-10"
              style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: "rgba(0, 214, 143, 0.1)" }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: "#00D68F" }} />
              </div>
              <h3
                className="text-2xl font-heading font-bold mb-3"
                style={{ color: "#0D4F4F" }}
              >
                Application Received!
              </h3>
              <p style={{ color: "#1A1A2E" }}>
                Thanks for applying to the Pearlie affiliate programme. We&apos;ll review your application and get
                back to you within 48 hours.
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 sm:py-28" style={{ backgroundColor: "#FFF8F0" }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl font-heading font-extrabold mb-4"
            style={{ color: "#0D4F4F" }}
          >
            Apply to Become an Affiliate
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "#1A1A2E" }}>
            Takes less than 2 minutes. We&apos;ll review your application within 48 hours.
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-8 sm:p-10 space-y-5"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
          >
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: "rgba(255, 92, 114, 0.08)",
                  color: "#FF5C72",
                }}
              >
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#0D4F4F" }}>
                Full Name <span style={{ color: "#FF5C72" }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all border focus:ring-2"
                style={{
                  backgroundColor: "#F0F0F5",
                  borderColor: "#F0F0F5",
                  color: "#1A1A2E",
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#0D4F4F" }}>
                Email <span style={{ color: "#FF5C72" }}>*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all border focus:ring-2"
                style={{
                  backgroundColor: "#F0F0F5",
                  borderColor: "#F0F0F5",
                  color: "#1A1A2E",
                }}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#0D4F4F" }}>
                Phone <span className="text-xs" style={{ color: "#1A1A2E", opacity: 0.5 }}>(optional)</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+44 7XXX XXXXXX"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all border focus:ring-2"
                style={{
                  backgroundColor: "#F0F0F5",
                  borderColor: "#F0F0F5",
                  color: "#1A1A2E",
                }}
              />
            </div>

            {/* Social handles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#0D4F4F" }}>
                  TikTok
                </label>
                <input
                  type="text"
                  value={formData.tiktok_handle}
                  onChange={(e) => setFormData({ ...formData, tiktok_handle: e.target.value })}
                  placeholder="@handle"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all border focus:ring-2"
                  style={{
                    backgroundColor: "#F0F0F5",
                    borderColor: "#F0F0F5",
                    color: "#1A1A2E",
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#0D4F4F" }}>
                  Instagram
                </label>
                <input
                  type="text"
                  value={formData.instagram_handle}
                  onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                  placeholder="@handle"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all border focus:ring-2"
                  style={{
                    backgroundColor: "#F0F0F5",
                    borderColor: "#F0F0F5",
                    color: "#1A1A2E",
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#0D4F4F" }}>
                  YouTube
                </label>
                <input
                  type="text"
                  value={formData.youtube_handle}
                  onChange={(e) => setFormData({ ...formData, youtube_handle: e.target.value })}
                  placeholder="@channel"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all border focus:ring-2"
                  style={{
                    backgroundColor: "#F0F0F5",
                    borderColor: "#F0F0F5",
                    color: "#1A1A2E",
                  }}
                />
              </div>
            </div>

            {/* Motivation */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#0D4F4F" }}>
                Why do you want to promote Pearlie?{" "}
                <span className="text-xs" style={{ color: "#1A1A2E", opacity: 0.5 }}>(optional)</span>
              </label>
              <textarea
                value={formData.motivation}
                onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                placeholder="Tell us a bit about your audience and how you'd promote Pearlie..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all border focus:ring-2 resize-none"
                style={{
                  backgroundColor: "#F0F0F5",
                  borderColor: "#F0F0F5",
                  color: "#1A1A2E",
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white font-bold text-base transition-all duration-200 hover:scale-[1.02] hover:shadow-xl disabled:opacity-60 disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg, #FF5C72 0%, #00D4FF 100%)" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Apply Now"
              )}
            </button>

            <p className="text-center text-xs" style={{ color: "#1A1A2E", opacity: 0.5 }}>
              By applying, you agree to our affiliate programme terms. We&apos;ll never share your details with
              third parties.
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
