import { TreatmentClinicCard, type ClinicData } from "./treatment-clinic-card"

interface TreatmentClinicGridProps {
  clinics: ClinicData[]
  treatmentName: string
  heading?: string
  subheading?: string
}

export function TreatmentClinicGrid({ clinics, treatmentName, heading, subheading }: TreatmentClinicGridProps) {
  if (clinics.length === 0) return null

  return (
    <section className="py-10 sm:py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] mb-2">
            {heading || `Clinics offering ${treatmentName}`}
          </h2>
          <p className="text-muted-foreground mb-8">
            {subheading || "Verified, GDC registered clinics matched to your treatment needs."}
          </p>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
            {clinics.map((clinic) => (
              <div key={clinic.id} className="min-w-[240px] max-w-[280px] snap-start shrink-0">
                <TreatmentClinicCard clinic={clinic} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
