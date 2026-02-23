"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    question: "How much do I earn per referral?",
    answer:
      "You earn a fixed commission for every confirmed dental booking made through your referral link. The exact amount is set when your application is approved and depends on the type of partnership. We'll confirm your rate upfront — no surprises.",
  },
  {
    question: "When do I get paid?",
    answer:
      "Payouts are processed monthly. Once a booking is confirmed by the clinic, your commission is logged and included in the next payout cycle. Payments are made via bank transfer or PayPal.",
  },
  {
    question: "How do I track my referrals?",
    answer:
      "You'll get access to a personal affiliate dashboard where you can see your clicks, conversions, earnings, and payout history in real-time. You can also build custom referral links with UTM tracking to see which content performs best.",
  },
  {
    question: "What's the cookie window?",
    answer:
      "We use a 30-day cookie window. That means if someone clicks your link today but doesn't book until 3 weeks later, you still get credited for the referral. Last-click attribution applies — if someone clicks a different affiliate link later, the most recent click gets the credit.",
  },
  {
    question: "Who can become an affiliate?",
    answer:
      "TikTok creators, Instagram influencers, YouTube creators, health & wellness bloggers, dental professionals, and anyone with an audience interested in dental care. We review all applications to ensure a good fit.",
  },
  {
    question: "Do I need to be a dental professional?",
    answer:
      "Not at all! You don't need any dental qualifications. Pearlie handles the matching and clinic vetting. You just share your link and let us take care of the rest.",
  },
  {
    question: "Can I promote Pearlie on multiple platforms?",
    answer:
      "Absolutely. You can share your link on TikTok, Instagram, YouTube, your blog, email newsletters, or anywhere your audience is. Our link builder lets you create separate tracked links for each platform so you can see what's working.",
  },
]

export function AffiliateFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-20 sm:py-28" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl font-heading font-extrabold mb-4"
            style={{ color: "#0D4F4F" }}
          >
            Frequently Asked Questions
          </h2>
        </div>

        <div className="max-w-2xl mx-auto space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div
                key={index}
                className="rounded-2xl overflow-hidden transition-all duration-200"
                style={{
                  backgroundColor: "#FFF8F0",
                  border: "1px solid #F0F0F5",
                }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors"
                >
                  <span className="font-heading font-bold pr-4" style={{ color: "#0D4F4F" }}>
                    {faq.question}
                  </span>
                  <ChevronDown
                    className="w-5 h-5 flex-shrink-0 transition-transform duration-200"
                    style={{
                      color: "#0D4F4F",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5">
                    <p className="leading-relaxed text-sm" style={{ color: "#1A1A2E" }}>
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
