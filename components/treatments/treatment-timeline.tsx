interface TreatmentTimelineProps {
  heading: string
  steps: {
    label: string
    description: string
    duration?: string
  }[]
  totalDuration: string
}

export function TreatmentTimeline({ heading, steps, totalDuration }: TreatmentTimelineProps) {
  return (
    <section className="py-10 sm:py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-foreground mb-8">
            {heading}
          </h2>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-primary/20" />

            <ol className="space-y-6">
              {steps.map((step, i) => (
                <li key={i} className="relative pl-10">
                  {/* Step number circle */}
                  <div className="absolute left-0 top-0.5 flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[#0d1019] text-white text-xs font-bold">
                    {i + 1}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                      <h3 className="text-base font-semibold text-foreground">
                        {step.label}
                      </h3>
                      {step.duration && (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium text-primary bg-primary/10 rounded-full">
                          {step.duration}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-8 text-sm font-medium text-foreground bg-[#0d1019]/5 rounded-lg px-4 py-3">
            {totalDuration}
          </p>
        </div>
      </div>
    </section>
  )
}
