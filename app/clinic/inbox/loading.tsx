import { Skeleton } from "@/components/ui/skeleton"

export default function InboxLoading() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Inbox</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    </div>
  )
}
