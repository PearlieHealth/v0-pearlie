# SEO: Make clinic profile pages server-rendered with metadata

## Problem

The `/clinic/[clinicId]` page is currently **invisible to Google**. When Googlebot visits a clinic page, it sees an empty loading spinner because all the data is fetched client-side in the browser. Google needs to see the actual clinic name, description, and details in the initial HTML response from the server.

## Why this happens — "use client" explained simply

Think of Next.js pages like a restaurant:

- **Server Component** (default) = The kitchen prepares your meal and brings it to you ready to eat. Google (the health inspector) can walk in and see exactly what's on the plate.
- **"use client"** = The kitchen sends you raw ingredients and a recipe. Your browser (you) has to cook it yourself. Google walks in, sees raw ingredients, and leaves confused.

Right now, `app/clinic/[clinicId]/page.tsx` has `"use client"` at the top. This means:
1. The server sends an empty page with a spinner
2. The browser runs JavaScript to fetch clinic data from Supabase
3. The browser renders the page with that data

**Google never sees step 2 or 3** — it only sees the spinner.

### Why we can't just remove "use client"

`generateMetadata` is a **server-only** function. It runs on the server before the page is sent to the browser. It sets the `<title>`, `<meta description>`, and Open Graph tags in the HTML `<head>`.

The problem: the 900-line `ClinicProfileContent` component uses browser-only features:
- `useState`, `useEffect` (React hooks for interactivity)
- `useRouter`, `useParams`, `useSearchParams` (browser URL access)
- Event handlers, chat widgets, date pickers

These **cannot run on the server**. So we need to **split** the page:

```
page.tsx (SERVER) — fetches data, sets metadata, renders HTML
  └── ClinicProfileContent (CLIENT) — handles clicks, chat, tabs, etc.
```

The server component fetches the clinic data and passes it as props to the client component. Best of both worlds.

## Implementation Plan

### Step 1: Create a server-side clinic data fetcher
**File:** `lib/clinics/queries.ts`

```ts
// New function using Supabase server client
export async function getClinicById(clinicId: string) {
  const supabase = createServerClient()
  const { data } = await supabase
    .from("clinics")
    .select("id, name, slug, description, city, postcode, address, images, rating, review_count, ...")
    .eq("id", clinicId)
    .single()
  return data
}
```

### Step 2: Convert page.tsx to a Server Component with generateMetadata
**File:** `app/clinic/[clinicId]/page.tsx`

Remove `"use client"`. Add:

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const clinic = await getClinicById(params.clinicId)
  if (!clinic) return { title: "Clinic Not Found" }

  return {
    title: `${clinic.name} — Dentist in ${clinic.city} | Pearlie`,
    description: clinic.description || `Book an appointment at ${clinic.name}...`,
    openGraph: {
      title: clinic.name,
      description: ...,
      images: clinic.images?.[0] ? [{ url: clinic.images[0] }] : [],
    },
  }
}
```

The server fetches clinic data and passes it as a prop:
```tsx
export default async function ClinicDetailPage({ params }) {
  const clinic = await getClinicById(params.clinicId)
  if (!clinic) notFound()

  return (
    <>
      <ClinicJsonLd clinic={clinic} />
      <ClinicProfileContent clinic={clinic} />
    </>
  )
}
```

### Step 3: Refactor ClinicProfileContent to accept server data as props
**File:** `components/clinic/profile/clinic-profile-content.tsx`

This is the biggest piece. Currently the component:
1. Reads `clinicId` from `useParams()`
2. Fetches clinic data in a `useEffect`
3. Sets loading state while fetching

**Change to:**
1. Accept `clinic` as a prop (already fetched by server)
2. Remove the initial data fetch `useEffect`
3. Remove the loading state for initial render (data arrives instantly)
4. Keep all interactive features (chat, tabs, date picker, etc.) as-is

The component keeps `"use client"` — that's fine. It just no longer needs to fetch its own data.

### Step 4: Add LocalBusiness JSON-LD schema
**New file:** `components/clinic/profile/clinic-jsonld.tsx`

```tsx
// Server component — outputs structured data for Google
export function ClinicJsonLd({ clinic }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: clinic.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: clinic.address,
      addressLocality: clinic.city,
      postalCode: clinic.postcode,
    },
    aggregateRating: clinic.rating
      ? {
          "@type": "AggregateRating",
          ratingValue: clinic.rating,
          reviewCount: clinic.review_count,
        }
      : undefined,
    image: clinic.images?.[0],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

### Step 5: Add clinic pages to sitemap
**File:** `app/sitemap.ts`

Query all verified, non-archived clinics and add them:
```ts
const clinics = await supabase
  .from("clinics")
  .select("id, updated_at")
  .eq("verified", true)
  .eq("is_archived", false)

const clinicUrls = clinics.map((c) => ({
  url: `${BASE_URL}/clinic/${c.id}`,
  lastModified: c.updated_at,
  priority: 0.7,
}))
```

## Files to modify

| File | Change |
|------|--------|
| `app/clinic/[clinicId]/page.tsx` | Remove "use client", add `generateMetadata`, fetch server-side |
| `components/clinic/profile/clinic-profile-content.tsx` | Accept `clinic` prop, remove self-fetch |
| `components/clinic/profile/clinic-jsonld.tsx` | **New** — LocalBusiness structured data |
| `lib/clinics/queries.ts` | **New** — server-side clinic query |
| `app/sitemap.ts` | Add clinic pages |

## Key risks

- The 900-line `ClinicProfileContent` has many interactive features — refactoring to accept props must preserve all existing behavior (chat, tabs, booking, preview mode)
- `useSearchParams` is still needed for `matchId`, `leadId`, `preview`, `reply` query params — this stays client-side
- The component fetches additional data (providers, lead info) based on query params — those secondary fetches stay client-side

## Testing checklist

- [ ] Clinic profile page still renders correctly with all tabs
- [ ] Chat widget works
- [ ] Date picker / booking flow works
- [ ] Preview mode (`?preview=true`) works
- [ ] Match context (`?matchId=...&leadId=...`) works
- [ ] View page source shows clinic name, description in HTML (not just spinner)
- [ ] Open Graph tags appear in `<head>`
- [ ] Google Rich Results Test passes for LocalBusiness schema
- [ ] Sitemap includes clinic URLs
