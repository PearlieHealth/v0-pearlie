interface QuickFactsProps {
  areaName: string
  clinicCount: number
  /** Area-specific quick facts paragraph from the location config */
  content?: string
}

export function QuickFacts({ areaName, clinicCount, content }: QuickFactsProps) {
  return (
    <section className="py-10 sm:py-14 bg-white border-t border-border/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg sm:text-xl font-heading font-bold tracking-[-0.02em] mb-4 text-[#004443]">
            Quick facts: Dentists in {areaName}
          </h2>
          <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed space-y-3">
            {content && <p>{content}</p>}
            <p>
              Pearlie currently lists {clinicCount} verified, GDC-registered dental {clinicCount === 1 ? "clinic" : "clinics"} in
              and around {areaName}. Every practice is independently checked against the General Dental Council register before
              appearing on the platform. Clinics do not pay to appear higher in results — matching is based on your treatment needs,
              location, and preferences. The service is completely free for patients.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
