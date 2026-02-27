"use client"

import { Sparkles, Zap, ArrowRight, Clock, Shield, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DirectLeadPreQualifierProps {
  clinicName: string
  /** Called when user chooses the quick form path */
  onQuickForm: () => void
  /** Called when user chooses the full intake path */
  onFullIntake: () => void
}

export function DirectLeadPreQualifier({
  clinicName,
  onQuickForm,
  onFullIntake,
}: DirectLeadPreQualifierProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="text-center pt-2 pb-1">
        <h3 className="text-base font-semibold text-[#1a1a1a] leading-tight">
          How would you like to get started?
        </h3>
        <p className="text-xs text-[#888] mt-1">
          Choose the option that works best for you
        </p>
      </div>

      {/* Option A: Full intake — recommended, conversion-optimized */}
      <button
        type="button"
        onClick={onFullIntake}
        className="w-full text-left group relative rounded-xl border-2 border-[#0fbcb0] bg-gradient-to-br from-[#f0fdfb] to-white p-4 transition-all hover:shadow-md hover:border-[#0da399] active:scale-[0.98]"
      >
        <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-[#0fbcb0] text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
          Recommended
        </div>
        <div className="flex items-start gap-3 mt-1">
          <div className="w-9 h-9 rounded-lg bg-[#0fbcb0]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-4.5 h-4.5 text-[#0fbcb0]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-[#1a1a1a] mb-0.5">
              Get personalised matches
            </div>
            <p className="text-xs text-[#666] leading-relaxed">
              Answer a few questions and we&apos;ll match you with the best clinics for your needs.
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              <span className="flex items-center gap-1 text-[10px] text-[#0fbcb0] font-medium">
                <Star className="w-3 h-3" />
                Top clinic matches
              </span>
              <span className="flex items-center gap-1 text-[10px] text-[#888]">
                <Clock className="w-3 h-3" />
                ~2 min
              </span>
              <span className="flex items-center gap-1 text-[10px] text-[#888]">
                <Shield className="w-3 h-3" />
                Private & secure
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#0fbcb0] flex-shrink-0 mt-2 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>

      {/* Option B: Quick form — explore on my own */}
      <button
        type="button"
        onClick={onQuickForm}
        className="w-full text-left group rounded-xl border border-[#e5e5e5] bg-white p-4 transition-all hover:border-[#ccc] hover:shadow-sm active:scale-[0.98]"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#f5f5f5] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Zap className="w-4.5 h-4.5 text-[#666]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-[#1a1a1a] mb-0.5">
              Quick enquiry
            </div>
            <p className="text-xs text-[#666] leading-relaxed">
              Send your details directly to {clinicName} and start chatting right away.
            </p>
            <span className="flex items-center gap-1 text-[10px] text-[#888] mt-2">
              <Clock className="w-3 h-3" />
              ~30 sec
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-[#ccc] flex-shrink-0 mt-2 group-hover:translate-x-0.5 group-hover:text-[#999] transition-all" />
        </div>
      </button>
    </div>
  )
}
