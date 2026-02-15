import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Unsubscribed",
  robots: "noindex, nofollow",
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          You&apos;ve been unsubscribed
        </h1>
        <p className="text-gray-600 mb-6">
          You will no longer receive these email notifications from Pearlie.
          If this was a mistake, you can re-subscribe by contacting us.
        </p>
        <a
          href="/"
          className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Return to Pearlie
        </a>
      </div>
    </div>
  )
}
