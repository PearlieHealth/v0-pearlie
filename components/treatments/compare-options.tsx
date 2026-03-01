import Link from "next/link"
import type { TreatmentCostContent } from "@/lib/data/treatment-cost-content"

interface CompareOptionsProps {
  costContent: TreatmentCostContent
}

export function CompareOptions({ costContent }: CompareOptionsProps) {
  const { comparison } = costContent

  return (
    <section className="py-10 sm:py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-foreground mb-6">
            {comparison.heading}
          </h2>

          {comparison.introParagraph && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {comparison.introParagraph}
            </p>
          )}

          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-foreground/10">
                  <th className="text-left py-3 pr-4 font-semibold text-foreground"></th>
                  {comparison.columnHeaders.map((header, i) => (
                    <th key={i} className="text-left py-3 pr-4 font-semibold text-foreground whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap">{row.factor}</td>
                    {row.values.map((value, j) => (
                      <td key={j} className="py-3 pr-4 text-muted-foreground">{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-6 space-y-2.5">
            {comparison.bullets.map((bullet, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
                <span className="text-primary mt-0.5 shrink-0">&#8226;</span>
                {bullet}
              </li>
            ))}
          </ul>

          {comparison.outroParagraph && (
            <p className="text-sm text-muted-foreground leading-relaxed mt-6">
              {comparison.outroParagraph}
            </p>
          )}

          {comparison.relatedLink && (
            <Link
              href={comparison.relatedLink.href}
              className="flex items-center gap-3 mt-6 p-4 rounded-xl border border-primary/20 bg-primary/5 hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">&rarr;</span>
              <span>
                <span className="font-heading font-bold text-foreground text-sm block">{comparison.relatedLink.label}</span>
                <span className="text-xs text-muted-foreground">{comparison.relatedLink.description}</span>
              </span>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
