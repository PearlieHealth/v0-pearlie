import { HomepageJsonLd } from "@/components/homepage-jsonld"

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <HomepageJsonLd />
      {children}
    </>
  )
}
