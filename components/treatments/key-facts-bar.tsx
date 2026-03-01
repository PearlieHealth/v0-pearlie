const trustSignals = [
  "GDC-registered clinics only",
  "Transparent pricing ranges",
  "Reviewed annually",
  "Compare before booking",
]

export function KeyFactsBar() {
  return (
    <section className="bg-white border-y border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {trustSignals.map((label) => (
              <span
                key={label}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-[#004443] bg-[#004443]/5 rounded-full border border-[#004443]/10"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
