import { BreadcrumbSchema } from "@/components/breadcrumb-schema"

export default function IntakeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://pearlie.org" },
        { name: "Find Your Match", url: "https://pearlie.org/intake" },
      ]} />
      {children}
    </>
  )
}
