interface QuickFactsProps {
  areaName: string
  clinicCount: number
}

export function QuickFacts({ areaName, clinicCount }: QuickFactsProps) {
  return (
    <section className="py-10 sm:py-14 bg-white border-t border-border/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg sm:text-xl font-heading font-bold tracking-[-0.02em] mb-4 text-[#004443]">
            Quick facts: Dentists in {areaName}
          </h2>
          <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed space-y-3">
            <p>
              Pearlie currently lists {clinicCount} verified, GDC-registered dental {clinicCount === 1 ? "clinic" : "clinics"} in
              and around {areaName}. Every practice is independently checked against the General Dental Council register before
              appearing on the platform. London has over 4,500 registered dental practices, and more than 70% of patients in the
              city now choose private dental care due to long NHS waiting times.
            </p>
            <p>
              A standard private dental check-up in {areaName} typically costs between £60 and £150. More specialist treatments
              such as Invisalign (from £2,500), dental implants (from £2,000 per implant), and porcelain veneers (from £500 per
              tooth) vary by clinic and complexity. Pearlie shows indicative pricing for each clinic so you can compare costs
              before making contact.
            </p>
            <p>
              Clinics listed on Pearlie in {areaName} do not pay to appear higher in results — matching is based on your treatment
              needs, location, budget, and preferences. The service is completely free for patients, with no sign-up fees, hidden
              costs, or obligation to book.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
