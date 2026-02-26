import type { MDXComponents } from "mdx/types"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

function InlineCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-8 rounded-2xl bg-[var(--cream)] border border-border/50 p-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-base leading-relaxed">{children}</div>
        <Button
          size="lg"
          className="shrink-0 bg-[#0fbcb0] hover:bg-[#0da399] text-white rounded-full"
          asChild
        >
          <Link href="/intake">Find my clinic</Link>
        </Button>
      </div>
    </div>
  )
}

function CostTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  return (
    <div className="my-8 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--cream)]">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left font-semibold text-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border/50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-muted-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function useMDXComponents(): MDXComponents {
  return {
    h2: ({ children, ...props }) => {
      const text = typeof children === "string" ? children : ""
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
      return (
        <h2
          id={id}
          className="mt-12 mb-4 text-2xl sm:text-3xl font-heading font-bold tracking-[-0.02em] text-[#004443] scroll-mt-24"
          {...props}
        >
          {children}
        </h2>
      )
    },
    h3: ({ children, ...props }) => {
      const text = typeof children === "string" ? children : ""
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
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
            className="text-[#0fbcb0] underline underline-offset-2 hover:text-[#0da399] transition-colors"
            {...props}
          >
            {children}
          </a>
        )
      }
      return (
        <Link
          href={href || "#"}
          className="text-[#0fbcb0] underline underline-offset-2 hover:text-[#0da399] transition-colors"
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
        className="my-6 border-l-4 border-[#0fbcb0] pl-6 italic text-muted-foreground"
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
      <div className="my-8 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className="bg-[var(--cream)]" {...props}>
        {children}
      </thead>
    ),
    th: ({ children, ...props }) => (
      <th className="px-4 py-3 text-left font-semibold text-foreground" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="px-4 py-3 text-muted-foreground border-t border-border/50" {...props}>
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
        className="my-6 overflow-x-auto rounded-xl bg-[#004443] p-4 text-sm text-white"
        {...props}
      >
        {children}
      </pre>
    ),
    // Custom components available in MDX
    InlineCallout,
    CostTable,
  }
}
