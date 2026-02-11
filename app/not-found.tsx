import { Button } from "@/components/ui/button"
import { Home, Search } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <p className="text-7xl font-bold text-muted-foreground/30">404</p>
          <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
          <p className="text-muted-foreground">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been moved or no longer exists.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default" className="gap-2">
            <Link href="/">
              <Home className="w-4 h-4" />
              Go home
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 bg-transparent">
            <Link href="/intake">
              <Search className="w-4 h-4" />
              Find a clinic
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
