"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HelpCircle, Heart, Wallet, ShieldCheck, Target } from "lucide-react"

export function WhyTheseClinicsModal() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="text-xs text-muted-foreground h-auto p-0">
          <HelpCircle className="w-3 h-3 mr-1" />
          Why these clinics?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How we match you with clinics</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            We match you with clinics based on what you told us matters most to you. Here's how:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">What you value most</p>
                <p className="text-xs text-muted-foreground">
                  Whether you prioritize clear explanations, a calm environment, or specialist experience
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">How you prefer to discuss cost</p>
                <p className="text-xs text-muted-foreground">
                  Some prefer upfront pricing, others want to explore options first
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Your support needs</p>
                <p className="text-xs text-muted-foreground">
                  If you feel anxious about dental visits, we find clinics experienced with nervous patients
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Treatment expertise</p>
                <p className="text-xs text-muted-foreground">
                  We only show clinics that offer the specific treatment you're looking for
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground border-t pt-4">
            Distance is never a matching factor — we show location separately so you can decide what's practical for
            you.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
