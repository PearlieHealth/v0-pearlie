import Link from "next/link"
import { Button } from "@/components/ui/button"

export function ClinicMatchCta() {
  return (
    <div className="my-8 rounded-2xl bg-[#0fbcb0]/5 border border-[#0fbcb0]/20 p-6 text-center not-prose">
      <p className="text-base font-heading font-semibold text-[#004443] mb-2">
        Looking for the right clinic?
      </p>
      <p className="text-sm text-muted-foreground mb-4">
        Pearlie matches you with verified dentists based on your needs — free and independent.
      </p>
      <Button
        size="default"
        className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full px-6 border-0"
        asChild
      >
        <Link href="/intake">Get matched</Link>
      </Button>
    </div>
  )
}
