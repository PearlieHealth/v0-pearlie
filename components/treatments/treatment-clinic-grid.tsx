import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TreatmentClinicCard, type ClinicData } from "./treatment-clinic-card"

interface TreatmentClinicGridProps {
  clinics: ClinicData[]
  treatmentName: string
  intakeTreatment: string
}

export function TreatmentClinicGrid({ clinics, treatmentName, intakeTreatment }: TreatmentClinicGridProps) {
  return (
    <section className="py-10 sm:py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-2">
            Clinics offering {treatmentName}
          </h2>
          <p className="text-muted-foreground mb-8">
            Verified, GDC-registered clinics matched to your treatment needs.
          </p>

          {clinics.length > 0 ? (
            <>
              <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6 sm:overflow-visible sm:pb-0">
                {clinics.map((clinic) => (
                  <div key={clinic.id} className="min-w-[280px] snap-start sm:min-w-0">
                    <TreatmentClinicCard clinic={clinic} intakeTreatment={intakeTreatment} />
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <Button
                  size="lg"
                  className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full px-8"
                  asChild
                >
                  <Link href={`/intake?treatment=${encodeURIComponent(intakeTreatment)}`}>
                    Get matched with more clinics
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-[var(--cream)] p-8 sm:p-12 text-center">
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Enter your postcode to see the closest available {treatmentName.toLowerCase()} clinics near you.
              </p>
              <Button
                size="lg"
                className="bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full px-8"
                asChild
              >
                <Link href={`/intake?treatment=${encodeURIComponent(intakeTreatment)}`}>
                  Get matched now
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
