import { HeroPostcodeCta } from "@/components/treatments/hero-postcode-cta"
import type { TreatmentMeta } from "@/lib/content/treatments"

interface TreatmentHeroProps {
  treatment: TreatmentMeta
  costIntentH1?: string
  heroSubheading?: string
  ctaButtonText?: string
}

export function TreatmentHero({ treatment, costIntentH1, heroSubheading, ctaButtonText }: TreatmentHeroProps) {

  return (
    <div className="pt-28 pb-10 sm:pt-32 sm:pb-14 bg-[#0d1019]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/20 rounded-full">
              {treatment.category}
            </span>
            <span className="inline-block px-3 py-1 text-xs font-semibold text-white bg-white/10 rounded-full">
              {treatment.priceRange}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-[-0.03em] text-white mb-4 text-balance">
            {costIntentH1 || treatment.title}
          </h1>

          <p data-speakable="description" className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-8">
            {heroSubheading || treatment.description}
          </p>

          <div className="max-w-lg mx-auto [&_p]:text-white/60 [&_input]:bg-white/10 [&_input]:border-white/20 [&_input]:text-white [&_input]:placeholder:text-white/40 [&_input]:focus-visible:ring-primary [&_input]:focus-visible:border-primary [&_.text-destructive]:text-red-300 [&_form]:mx-auto">
            <HeroPostcodeCta
              treatmentName={treatment.treatmentName}
              intakeTreatment={treatment.intakeTreatment}
              ctaButtonText={ctaButtonText}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
