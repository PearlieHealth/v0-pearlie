import Link from "next/link"
import { Button } from "@/components/ui/button"

export function ClinicMatchCta() {
  return (
    <div className="my-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center not-prose">
      <p className="text-base font-heading font-semibold text-foreground mb-2">
        Looking for the right clinic?
      </p>
      <p className="text-sm text-muted-foreground mb-4">
        Pearlie matches you with verified dentists based on your needs — free and independent.
      </p>
      <Button
        size="default"
        className="bg-primary hover:bg-[var(--primary-hover)] text-white rounded-full px-6 border-0"
        asChild
      >
        <Link href="/intake">Get matched</Link>
      </Button>
    </div>
  )
}
