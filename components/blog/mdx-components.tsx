import type { MDXComponents } from "mdx/types"
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ClinicMatchCta } from "@/components/blog/clinic-match-cta"

/**
 * Recursively extract plain text from React children.
 * Handles strings, numbers, arrays, and React elements with nested children.
 * This fixes the heading ID bug where bold/links/code in headings produced empty IDs.
 */
function extractTextFromChildren(children: ReactNode): string {
  if (typeof children === "string") return children
  if (typeof children === "number") return String(children)
  if (children == null || typeof children === "boolean") return ""

  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join("")
  }

  // React element — recurse into its children prop
  if (typeof children === "object" && "props" in children) {
    return extractTextFromChildren(
      (children as { props: { children?: ReactNode } }).props.children
    )
  }

  return ""
}

function textToId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function createInlineCallout(ctaLabel: string, ctaHref: string) {
  return function InlineCallout({ children }: { children: ReactNode }) {
    return (
      <div className="my-8 rounded-2xl bg-[var(--cream)] border border-border/50 p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 text-base leading-relaxed">{children}</div>
          <Button
            size="lg"
            className="shrink-0 bg-primary hover:bg-[var(--primary-hover)] text-white rounded-full"
            asChild
          >
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>
      </div>
    )
  }
}

function CostTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  return (
    <div className="my-8 relative rounded-xl border border-border shadow-sm">
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 sm:hidden rounded-r-xl" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-[#0d1019] text-white">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-3 sm:px-4 py-3 sm:py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${
                    i === 0 ? "sticky left-0 z-[2] bg-[#0d1019]" : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={`border-t border-border/30 hover:bg-[#0fbcb014] transition-colors ${
                  ri % 2 === 1 ? "bg-secondary/50" : ""
                }`}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={
                      ci === 0
                        ? `px-3 sm:px-4 py-3 sm:py-3.5 font-medium text-foreground whitespace-nowrap sm:whitespace-normal sticky left-0 z-[1] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] ${
                            ri % 2 === 1 ? "bg-secondary" : "bg-background"
                          }`
                        : "px-3 sm:px-4 py-3 sm:py-3.5 text-muted-foreground whitespace-nowrap sm:whitespace-normal"
                    }
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface MDXComponentsConfig {
  treatmentName?: string
  intakeTreatment?: string
}

export function useMDXComponents(config?: MDXComponentsConfig): MDXComponents {
  const ctaLabel = config?.treatmentName
    ? `Find my ${config.treatmentName.toLowerCase()} clinic`
    : "Find my clinic"
  const ctaHref = config?.intakeTreatment
    ? `/intake?treatment=${encodeURIComponent(config.intakeTreatment)}`
    : "/intake"

  return {
    h2: ({ children, ...props }) => {
      const text = extractTextFromChildren(children)
      const id = textToId(text)
      return (
        <h2
          id={id}
          className="mt-12 mb-4 text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-foreground scroll-mt-24"
          {...props}
        >
          {children}
        </h2>
      )
    },
    h3: ({ children, ...props }) => {
      const text = extractTextFromChildren(children)
      const id = textToId(text)
      return (
        <h3
          id={id}
          className="mt-8 mb-3 text-xl sm:text-2xl font-heading font-semibold tracking-[-0.01em] text-foreground scroll-mt-24"
          {...props}
        >
          {children}
        </h3>
      )
    },
    p: ({ children, ...props }) => (
      <p className="mb-5 text-base leading-[1.8] text-muted-foreground" {...props}>
        {children}
      </p>
    ),
    a: ({ href, children, ...props }) => {
      const isExternal = href?.startsWith("http")
      if (isExternal) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-[var(--primary-hover)] transition-colors"
            {...props}
          >
            {children}
          </a>
        )
      }
      return (
        <Link
          href={href || "#"}
          className="text-primary underline underline-offset-2 hover:text-[var(--primary-hover)] transition-colors"
          {...props}
        >
          {children}
        </Link>
      )
    },
    ul: ({ children, ...props }) => (
      <ul className="mb-5 ml-6 list-disc space-y-2 text-muted-foreground" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="mb-5 ml-6 list-decimal space-y-2 text-muted-foreground" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="text-base leading-[1.8]" {...props}>
        {children}
      </li>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="my-6 border-l-4 border-primary pl-6 italic text-muted-foreground"
        {...props}
      >
        {children}
      </blockquote>
    ),
    strong: ({ children, ...props }) => (
      <strong className="font-semibold text-foreground" {...props}>
        {children}
      </strong>
    ),
    hr: () => <hr className="my-10 border-border/50" />,
    img: ({ src, alt, ...props }) => (
      <figure className="my-8">
        <Image
          src={src || ""}
          alt={alt || ""}
          width={800}
          height={450}
          className="rounded-xl border border-border/50"
          {...props}
        />
        {alt && (
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">
            {alt}
          </figcaption>
        )}
      </figure>
    ),
    table: ({ children, ...props }) => (
      <div className="my-8 relative rounded-xl border border-border shadow-sm">
        {/* Scroll hint gradient on mobile */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 sm:hidden rounded-r-xl" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" {...props}>
            {children}
          </table>
        </div>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className="bg-[#0d1019] text-white" {...props}>
        {children}
      </thead>
    ),
    th: ({ children, ...props }) => (
      <th className="px-3 sm:px-4 py-3 sm:py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap first:sticky first:left-0 first:z-[2] first:bg-[#0d1019]" {...props}>
        {children}
      </th>
    ),
    tr: ({ children, ...props }) => (
      <tr className="group border-t border-border/50 even:bg-secondary/50 hover:bg-[#0fbcb014] transition-colors" {...props}>
        {children}
      </tr>
    ),
    td: ({ children, ...props }) => (
      <td className="px-3 sm:px-4 py-3 sm:py-3.5 text-muted-foreground border-t border-border/30 whitespace-nowrap sm:whitespace-normal first:sticky first:left-0 first:z-[1] first:bg-background group-even:first:bg-secondary first:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] first:font-medium first:text-foreground [&>strong]:text-foreground [&>strong]:font-bold" {...props}>
        {children}
      </td>
    ),
    code: ({ children, ...props }) => (
      <code
        className="rounded bg-[var(--cream)] px-1.5 py-0.5 text-sm font-mono text-foreground"
        {...props}
      >
        {children}
      </code>
    ),
    pre: ({ children, ...props }) => (
      <pre
        className="my-6 overflow-x-auto rounded-xl bg-[#0d1019] p-4 text-sm text-white"
        {...props}
      >
        {children}
      </pre>
    ),
    // Custom components available in MDX
    InlineCallout: createInlineCallout(ctaLabel, ctaHref),
    CostTable,
    ClinicMatchCta,
  }
}
