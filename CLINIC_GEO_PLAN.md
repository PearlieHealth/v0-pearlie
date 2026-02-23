# Clinic Pages GEO Plan — Make Every Clinic Page a Citable Answer

## The Problem (3 layers)

### 1. `noindex` blocks all clinic pages
`app/clinic/layout.tsx` line 6 sets `robots: "noindex, nofollow"` on **every** route under `/clinic/` — including the public patient-facing profiles at `/clinic/[clinicId]`.

This is correct for dashboard routes (`/clinic/leads`, `/clinic/inbox`, etc.) but catastrophic for public clinic profiles. Google, ChatGPT, Perplexity, and all AI crawlers are told to ignore these pages.

### 2. All clinic content is client-rendered
`app/clinic/[clinicId]/page.tsx` is `"use client"`. The `ClinicProfileContent` component fetches data via `fetch('/api/clinics/${clinicId}')` on the client side. Crawlers see an empty spinner, not clinic content.

### 3. No metadata or structured data
- No `generateMetadata` → no dynamic `<title>` or `<meta description>`
- No JSON-LD schema → no DentalClinic/LocalBusiness structured data
- No canonical URLs → potential duplicate content (UUID vs slug)
- No Open Graph → poor link previews when shared

## Why this matters for GEO

If someone asks ChatGPT "best dentist for Invisalign near Marylebone", the AI needs to:
1. **Find** Pearlie's clinic pages (currently blocked by `noindex`)
2. **Extract** clinic name, location, services (currently invisible — client-rendered)
3. **Cite** a passage about the clinic (currently no citable content in HTML)

With SSR + schema + FAQs, each clinic page becomes a unique, citable answer for **location + treatment** queries. With 20+ clinics, that's 20+ pages the AI can cite — a significant content footprint.

---

## Implementation Plan

### Phase 1: Fix `noindex` (quick, high-impact)

**File: `app/clinic/[clinicId]/layout.tsx`** (NEW)

Create a child layout that overrides the parent's `noindex` with `index, follow` for public clinic profiles. Next.js child metadata overrides parent metadata for leaf fields like `robots`.

```tsx
import type { Metadata } from "next"

export const metadata: Metadata = {
  robots: "index, follow",
}

export default function ClinicProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

This immediately unblocks all clinic profile pages for Google and AI crawlers, without touching the dashboard routes.

**Risk:** Low. Only affects `/clinic/[clinicId]` route. Dashboard routes keep `noindex`.

---

### Phase 2: Convert to Server-Side Rendering

**Goal:** Crawlers see real HTML content (clinic name, address, treatments, description) instead of a loading spinner.

#### Step 2a: Create server-side clinic data fetcher

**File: `lib/clinic-data.ts`** (NEW)

Extract the data fetching logic from `app/api/clinics/[clinicId]/route.ts` into a reusable server-side function. The API route already fetches public clinic fields using `createAdminClient()` — we reuse that same query.

```ts
import { createAdminClient } from "@/lib/supabase/admin"

export async function getClinicByIdOrSlug(clinicIdOrSlug: string) {
  const supabase = createAdminClient()
  const isUUID = /^[0-9a-f]{8}-...$/i.test(clinicIdOrSlug)

  const { data: clinic } = isUUID
    ? await supabase.from("clinics").select(PUBLIC_CLINIC_FIELDS).eq("id", clinicIdOrSlug).single()
    : await supabase.from("clinics").select(PUBLIC_CLINIC_FIELDS).eq("slug", clinicIdOrSlug).single()

  // Merge Google fields, languages, filter archived/non-live
  // (same logic as existing API route)

  return clinic
}
```

#### Step 2b: Convert page to server component with `generateMetadata`

**File: `app/clinic/[clinicId]/page.tsx`** (REWRITE)

Remove `"use client"`. Make it a server component that:
1. Fetches clinic data server-side
2. Exports `generateMetadata` for dynamic title/description/canonical/OG
3. Renders SEO-critical content in the HTML (h1, address, description, treatments)
4. Renders interactive parts via a client component (`ClinicProfileClient`)

```tsx
// NO "use client" — this is a server component
import { getClinicByIdOrSlug } from "@/lib/clinic-data"
import { ClinicProfileClient } from "@/components/clinic/profile/clinic-profile-client"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// Dynamic metadata for each clinic
export async function generateMetadata({ params }): Promise<Metadata> {
  const clinic = await getClinicByIdOrSlug(params.clinicId)
  if (!clinic) return {}

  const title = `${clinic.name} — ${clinic.city || "London"} | Pearlie`
  const description = clinic.description?.slice(0, 155)
    || `${clinic.name} in ${clinic.address}. Treatments: ${clinic.treatments.slice(0, 4).join(", ")}. Verified on Pearlie.`

  return {
    title,
    description,
    alternates: {
      canonical: `https://pearlie.co.uk/clinic/${clinic.slug || clinic.id}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: clinic.images?.[0] ? [{ url: clinic.images[0] }] : [],
    },
  }
}

export default async function ClinicDetailPage({ params }) {
  const clinic = await getClinicByIdOrSlug(params.clinicId)
  if (!clinic || clinic.is_archived) return notFound()

  return (
    <>
      {/* JSON-LD — rendered server-side, visible to crawlers */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(clinicSchema) }} />

      {/* SEO-critical content — server-rendered HTML */}
      <div className="sr-only" aria-hidden="false">
        <h1>{clinic.name}</h1>
        <p>{clinic.address}, {clinic.postcode}, {clinic.city}</p>
        <p>{clinic.description}</p>
        <ul>{clinic.treatments.map(t => <li key={t}>{t}</li>)}</ul>
      </div>

      {/* Interactive clinic profile — client component */}
      <ClinicProfileClient clinic={clinic} />
    </>
  )
}
```

**Key architectural point:** The `sr-only` div gives crawlers real content. The `ClinicProfileClient` handles all interactivity (tabs, chat, booking, TikTok tracking). In Next.js, server components CAN pass data to client components via props — the data is serialized at the server/client boundary.

#### Step 2c: Refactor `ClinicProfileContent` to accept props

**File: `components/clinic/profile/clinic-profile-client.tsx`** (NEW, renamed from clinic-profile-content)

The existing `ClinicProfileContent` fetches data client-side. The new `ClinicProfileClient`:
- Accepts `clinic` as a prop (already fetched server-side)
- Removes the `useEffect` that calls `/api/clinics/${clinicId}`
- Keeps all interactive logic (chat, booking, TikTok, localStorage, tabs)
- Still fetches match data, providers, and lead data client-side (these are user-specific)

```tsx
"use client"

interface ClinicProfileClientProps {
  clinic: Clinic  // Passed from server component
}

export function ClinicProfileClient({ clinic: initialClinic }: ClinicProfileClientProps) {
  const [clinic] = useState(initialClinic)  // or just use the prop directly
  // ... rest of interactive logic (match, lead, booking, chat, etc.)
}
```

**What stays client-side:**
- Match data (`/api/matches/${matchId}`) — user-specific
- Lead data — user-specific
- Provider data — fetched separately, not critical for SEO
- Chat/booking/date picker — fully interactive
- TikTok tracking — client-only
- Tab navigation — client-only

---

### Phase 3: Add DentalClinic JSON-LD Schema

**In the server component** (`page.tsx`), generate and render JSON-LD:

```json
{
  "@context": "https://schema.org",
  "@type": "Dentist",
  "name": "London Smile Clinic",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Harley Street",
    "addressLocality": "London",
    "postalCode": "W1G 7JX",
    "addressCountry": "GB"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 51.5194,
    "longitude": -0.1487
  },
  "url": "https://pearlie.co.uk/clinic/london-smile-clinic",
  "telephone": "+44...",
  "openingHoursSpecification": [...],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "124"
  },
  "medicalSpecialty": ["Invisalign", "Dental Implants", ...],
  "availableService": [
    { "@type": "MedicalProcedure", "name": "Invisalign" },
    ...
  ],
  "isAcceptingNewPatients": true,
  "parentOrganization": {
    "@type": "Organization",
    "name": "Pearlie",
    "url": "https://pearlie.co.uk"
  }
}
```

Also add **FAQPage** schema from the existing FAQ data in `overview-tab.tsx` (already has 5-6 dynamic FAQs per clinic).

---

### Phase 4: Canonical URLs + Slug Redirect

Currently, clinics can be accessed by UUID or slug. The client-side code already does a `router.replace` for UUID→slug, but crawlers won't execute JavaScript.

**In the server component**, do a proper server-side redirect:

```tsx
import { redirect } from "next/navigation"

// If accessed by UUID but clinic has a slug, redirect server-side
if (clinic.slug && isUUID) {
  redirect(`/clinic/${clinic.slug}`)
}
```

This ensures:
- Only one URL is indexed per clinic (the slug version)
- Canonical URL in metadata matches the slug URL
- No duplicate content issues

---

## File Change Summary

| File | Action | Purpose |
|------|--------|---------|
| `app/clinic/[clinicId]/layout.tsx` | **NEW** | Override `noindex` → `index, follow` |
| `lib/clinic-data.ts` | **NEW** | Server-side clinic data fetcher |
| `app/clinic/[clinicId]/page.tsx` | **REWRITE** | Server component + `generateMetadata` + JSON-LD |
| `components/clinic/profile/clinic-profile-client.tsx` | **NEW** | Renamed/refactored from `clinic-profile-content.tsx` |
| `components/clinic/profile/clinic-profile-content.tsx` | **MODIFY** | Accept clinic as prop, remove client-side fetch |
| `app/api/clinics/[clinicId]/route.ts` | **KEEP** | Still needed for client-side match/lead flows |

## What does NOT change

- **Patient matching flow** — entirely separate (`/intake`, `/match`)
- **Dashboard routes** — still `noindex`, still wrapped in `ClinicShell` with auth
- **Chat/booking** — stays fully client-side interactive
- **ClinicShell** — no changes needed (already passes children through for public pages)
- **API routes** — still needed for match context, provider data, client-side features

## Risk Assessment

- **Phase 1** (noindex fix): **Very low risk**. Child layout metadata overrides parent. Only affects `/clinic/[clinicId]`.
- **Phase 2** (SSR refactor): **Medium risk**. Core refactor of how clinic pages render. Needs testing for:
  - Match context flow (patient arrives via `/clinic/slug?matchId=xxx`)
  - Preview mode (clinic staff previewing their own page)
  - Direct access (no match context)
  - Mobile chat/booking flows
  - UUID → slug redirect
- **Phase 3** (Schema): **Very low risk**. Adding data, not changing behavior.
- **Phase 4** (Canonical redirect): **Low risk**. Standard Next.js redirect.

## Suggested Sequence

1. Phase 1 first — instant unblock, zero risk
2. Phase 3 can be done independently (just add schema to existing client page via a useEffect or head tag)
3. Phases 2 + 4 together — the SSR refactor naturally includes canonical redirects

## Questions for Dr Muskaj before implementation

None — this is a technical refactor. No copy changes needed. All content already exists in the database.
