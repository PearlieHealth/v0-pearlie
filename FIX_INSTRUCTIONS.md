# Patient Dashboard Fix Instructions

**Target branch:** `claude/fix-messaging-issues-uaA8H`
**Audit source:** `AUDIT_PATIENT_DASHBOARD.md` on `claude/audit-patient-dashboard-Uvt1L`
**Date:** 2026-02-17

---

## READ THIS FIRST — System Context

The patient dashboard interacts with the **clinic side** (inbox, appointments, notifications) via shared database tables and realtime channels. Every fix below has been verified against the clinic-side code to ensure nothing breaks.

### Shared data contracts (DO NOT change these)

- **`conversations` table columns used by clinic:** `id`, `lead_id`, `clinic_id`, `status`, `last_message_at`, `unread_by_clinic`, `unread_count_clinic`, `unread_by_patient`, `unread_count_patient`, `clinic_first_reply_at`, `bot_greeted`, `clinic_typing_at`
- **`messages` table columns used by clinic:** `id`, `conversation_id`, `content`, `sender_type` ("patient"|"clinic"|"bot"), `status` ("sent"|"delivered"|"read"), `created_at`, `sent_via`, `message_type`, `read_at`
- **`lead_clinic_status` table:** `lead_id`, `clinic_id`, `status` (NEW, CONTACTED, etc.)
- **`match_results` table:** `lead_id`, `clinic_id`, `score`, `reasons`, `tier`, `rank`
- **Realtime channel format:** `chat:{conversationId}` — used by both patient and clinic for messages + typing
- **`POST /api/chat/send` response format:** `{ success, message, botMessages, conversationId }` — clinic-reply endpoint returns similar shape
- **`POST /api/chat/clinic-reply` request format:** `{ conversationId, content }` — clinic sends replies here

### Files you'll be editing

1. `app/patient/dashboard/page.tsx` (main dashboard — ~1360 lines)
2. `app/api/chat/send/route.ts` (chat send endpoint — ~496 lines)
3. `components/match/booking-card.tsx` (hero clinic card — ~923 lines)
4. `app/patient/messages/page.tsx` (dedicated messages page — ~767 lines)

### Files you must NOT edit (clinic side — for reference only)

- `app/clinic/inbox/page.tsx`
- `app/clinic/appointments/page.tsx`
- `app/api/chat/clinic-reply/route.ts`
- `hooks/use-clinic-notifications.ts`
- `components/clinic/clinic-shell.tsx`
- `components/clinic/embedded-clinic-chat.tsx`

---

## PHASE 1: Critical Fixes

### Fix C1 — Mobile chat thread doesn't switch when patient selects a different clinic

**Problem:** In `app/patient/dashboard/page.tsx`, `handleSelectClinic` (line 578) only calls `openConversationForClinic` on desktop. On mobile, the patient taps a different clinic, the BookingCard updates, but the chat state (pendingChatClinic or selectedConvId) still points to the previous clinic. If the patient then opens the chat drawer, they message the wrong clinic.

**File:** `app/patient/dashboard/page.tsx`

**Current code (lines 578-585):**
```javascript
function handleSelectClinic(clinicId: string) {
  setSelectedClinicId(clinicId)
  // On desktop, also open the clinic's conversation in the right panel
  if (!isMobile) {
    openConversationForClinic(clinicId)
  }
  window.scrollTo({ top: 0, behavior: "smooth" })
}
```

**Change to:**
```javascript
function handleSelectClinic(clinicId: string) {
  setSelectedClinicId(clinicId)
  // Sync the chat state to the newly selected clinic on ALL devices.
  // On mobile this doesn't open the drawer — it just ensures the
  // pending-chat or selected-conversation matches the selected clinic.
  // On desktop it also reveals the right sidebar.
  openConversationForClinic(clinicId)
  window.scrollTo({ top: 0, behavior: "smooth" })
}
```

**Then update `openConversationForClinic` (lines 549-576) to NOT auto-open the mobile chat drawer when called from `handleSelectClinic`.** The problem is `openConversationForClinic` always opens the mobile drawer (`setMobileChatOpen(true)`). We need it to sync state without opening the drawer when called from clinic switching.

Change `openConversationForClinic` to accept an options parameter:

**Current code (lines 549-576):**
```javascript
function openConversationForClinic(clinicId: string) {
  const conv = inboxConversations.find((c) => c.clinic_id === clinicId)
  if (conv) {
    setSelectedConvId(conv.id)
    setPendingChatClinic(null)
  } else {
    const clinic = allClinics.find((c) => c.id === clinicId)
    if (clinic && activeLeadId) {
      setPendingChatClinic({
        clinicId: clinic.id,
        clinicName: clinic.name,
        leadId: activeLeadId,
      })
      setSelectedConvId(null)
      setMessages([])
    }
  }

  // Mobile: open chat drawer; Desktop: open sidebar inbox
  if (isMobile) {
    setMobileChatOpen(true)
  } else {
    setMobileInboxOpen(true)
  }
}
```

**Change to:**
```javascript
function openConversationForClinic(clinicId: string, { openDrawer = true }: { openDrawer?: boolean } = {}) {
  const conv = inboxConversations.find((c) => c.clinic_id === clinicId)
  if (conv) {
    setSelectedConvId(conv.id)
    setPendingChatClinic(null)
  } else {
    const clinic = allClinics.find((c) => c.id === clinicId)
    if (clinic && activeLeadId) {
      setPendingChatClinic({
        clinicId: clinic.id,
        clinicName: clinic.name,
        leadId: activeLeadId,
      })
      setSelectedConvId(null)
      setMessages([])
    }
  }

  if (openDrawer) {
    // Mobile: open chat drawer; Desktop: open sidebar inbox
    if (isMobile) {
      setMobileChatOpen(true)
    } else {
      setMobileInboxOpen(true)
    }
  }
}
```

**Then update `handleSelectClinic`:**
```javascript
function handleSelectClinic(clinicId: string) {
  setSelectedClinicId(clinicId)
  // Sync chat state to the selected clinic. On mobile, don't auto-open
  // the chat drawer — the patient is just browsing other clinics.
  openConversationForClinic(clinicId, { openDrawer: !isMobile })
  window.scrollTo({ top: 0, behavior: "smooth" })
}
```

**Why this is safe for clinic side:** This only changes client-side state on the patient dashboard. No API calls, no database changes. Clinic side is unaffected.

---

### Fix C2 — Patient sender type not authenticated in `/api/chat/send`

**Problem:** In `app/api/chat/send/route.ts`, when `senderType === "patient"`, the endpoint only checks `lead.is_verified`. It does NOT verify the requesting user owns the lead. Anyone who knows a `leadId` can send messages as that patient.

**File:** `app/api/chat/send/route.ts`

**After the lead fetch (line 89-91), add auth check for patient senders. Insert this block right after the `if (leadError || !lead)` check (after line 91) and BEFORE the `is_verified` check (line 94):**

```javascript
// Authenticate patient senders: verify the requesting user owns this lead
if (senderType === "patient") {
  const supabaseAuth = await createClient()
  const { data: { user: authUser } } = await supabaseAuth.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const ownsLead = (
    (lead.user_id && lead.user_id === authUser.id) ||
    (!lead.user_id && lead.email && lead.email.toLowerCase() === authUser.email?.toLowerCase())
  )

  if (!ownsLead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
}
```

**IMPORTANT:** You need to add `user_id` to the lead select query. Change line 86 from:
```javascript
.select("id, is_verified, first_name, last_name, email, treatment_interest, budget_range, pain_score, has_swelling, has_bleeding, additional_info")
```
to:
```javascript
.select("id, user_id, is_verified, first_name, last_name, email, treatment_interest, budget_range, pain_score, has_swelling, has_bleeding, additional_info")
```

**IMPORTANT:** You also need to import `createClient` from the server auth module. Check the top of the file — the file already imports `createAdminClient` but may not import `createClient`. Add:
```javascript
import { createClient } from "@/lib/supabase/server"
```

**Why this is safe for clinic side:** The clinic-reply endpoint (`/api/chat/clinic-reply`) has its own separate auth check. This change only affects the patient sender path (`senderType === "patient"`). The clinic sender path (`senderType === "clinic"`, lines 54-69) already has its own auth. The `embedded-clinic-chat.tsx` component also sends with `senderType: "patient"` and passes a `leadId` — this is correct because it's the patient using the embedded chat widget, not the clinic. The auth check will work for that case too as long as the patient is logged in, which is already required.

---

### Fix C3 — Remove broken empty import

**File:** `app/patient/dashboard/page.tsx`

**Delete lines 29-31 entirely:**
```javascript
import {
  // Drawer removed — mobile chat uses a plain fixed overlay for iOS keyboard compatibility
} from "@/components/ui/drawer"
```

**Why this is safe:** Nothing from this import is used. Removing it prevents potential build errors.

---

## PHASE 2: High-Impact Conversion Fixes

### Fix H1 — Add typing indicator to dashboard chat composer

**File:** `app/patient/dashboard/page.tsx`

The `useChatChannel` hook (line 423) already returns `sendTyping` — but it's destructured as `{ otherTyping }` only. The hook returns `{ otherTyping, isConnected, sendTyping }`.

**Step 1:** Change line 423 from:
```javascript
const { otherTyping } = useChatChannel({
```
to:
```javascript
const { otherTyping, sendTyping } = useChatChannel({
```

**Step 2:** Add `sendTyping()` call to the desktop composer's onChange (line 1166). Change:
```javascript
onChange={(e) => setNewMessage(e.target.value)}
```
to:
```javascript
onChange={(e) => { setNewMessage(e.target.value); sendTyping() }}
```

**Step 3:** Do the same for the mobile composer (line 1323). Change:
```javascript
onChange={(e) => setNewMessage(e.target.value)}
```
to:
```javascript
onChange={(e) => { setNewMessage(e.target.value); sendTyping() }}
```

**Why this is safe for clinic side:** The clinic inbox already listens for typing broadcasts on the `chat:{conversationId}` channel. This just starts sending them. The `sendTyping` function is already throttled to 1 broadcast per 3 seconds in the hook.

---

### Fix H2 — Show error feedback when message sending fails

**File:** `app/patient/dashboard/page.tsx`

**Step 1:** Add a `chatError` state near the other state declarations (around line 160):
```javascript
const [chatError, setChatError] = useState<string | null>(null)
```

**Step 2:** In `handleSend` (line 433), update the catch block (lines 520-524) from:
```javascript
} catch (err) {
  console.error("Failed to send message:", err)
} finally {
```
to:
```javascript
} catch (err) {
  console.error("Failed to send message:", err)
  setChatError("Failed to send. Please try again.")
} finally {
```

Also handle non-ok responses. After `if (res.ok) {` block ends (around line 519), add an else:
```javascript
else {
  const errData = await res.json().catch(() => ({}))
  if (res.status === 403) {
    setChatError("Please verify your email before sending messages.")
  } else if (res.status === 429) {
    setChatError(errData.error || "Too many messages. Please wait a moment.")
  } else {
    setChatError(errData.error || "Failed to send message.")
  }
}
```

**Step 3:** Clear error when typing. In both composer onChange handlers (desktop line 1166 and mobile line 1323), add `setChatError(null)`:
```javascript
onChange={(e) => { setNewMessage(e.target.value); sendTyping(); setChatError(null) }}
```

**Step 4:** Display the error. Add an error display above both composers.

For the **desktop** composer (before the form at line 1163), add:
```jsx
{chatError && (
  <div className="px-4 py-1.5 flex-shrink-0">
    <p className="text-xs text-red-500">{chatError}</p>
  </div>
)}
```

For the **mobile** composer (before the form at line 1316), add the same block:
```jsx
{chatError && (
  <div className="px-3 py-1.5 flex-shrink-0 bg-white">
    <p className="text-xs text-red-500">{chatError}</p>
  </div>
)}
```

**Also do the same for `handleRequestAppointment`** — the catch block at line 652-654. Change to:
```javascript
} catch (err) {
  console.error("Failed to send appointment request:", err)
  setChatError("Failed to send appointment request. Please try again.")
}
```

**Why this is safe:** Pure client-side UI change. No API or database impact.

---

### Fix H3 — Add booking CTA to mobile sticky bar

**File:** `app/patient/dashboard/page.tsx`

**Current sticky bar code (lines 1340-1355)** only shows "Message clinic". Change the inner content to include an appointment button.

Replace the contents of the sticky bar div (the `<Button>` inside it) with:
```jsx
<div className="flex gap-2">
  <Button
    className="flex-1 h-11 bg-gradient-to-r from-[#907EFF] to-[#ED64A6] text-white border-0 font-semibold text-sm rounded-xl shadow-sm active:scale-[0.98] transition-transform"
    onClick={handleMessageClick}
  >
    <MessageCircle className="w-4 h-4 mr-1.5 flex-shrink-0" />
    Message
  </Button>
  {!appointmentRequestedClinics.has(selectedClinic.id) && (
    <Button
      variant="outline"
      className="flex-1 h-11 rounded-xl text-sm font-medium border-[#907EFF]/30 text-[#907EFF] active:scale-[0.98] transition-transform"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <CalendarCheck className="w-4 h-4 mr-1.5 flex-shrink-0" />
      Book
    </Button>
  )}
</div>
```

**Note:** You need to import `CalendarCheck` from lucide-react. Add it to the import list at line 10-22. It's already imported in `booking-card.tsx` but needs to be added to `page.tsx`:
```javascript
import {
  Heart,
  Loader2,
  MessageCircle,
  LogOut,
  Search,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Send,
  ArrowLeft,
  X,
  CalendarCheck,  // ADD THIS
} from "lucide-react"
```

**Why this is safe:** Pure UI change. The "Book" button scrolls to the top where the full appointment picker lives in the BookingCard. No new API calls.

---

### Fix H4 — Show quick prompts on mobile after first message

**File:** `app/patient/dashboard/page.tsx`

**Current code (line 1301):**
```jsx
{messages.length === 0 && (
```

**Change to:**
```jsx
{messages.length <= 2 && (
```

This shows quick prompts until the patient has sent a couple messages (matching the desktop behaviour where they're always visible). Using `<= 2` instead of removing the condition entirely avoids clutter after a long conversation.

**Why this is safe:** Pure UI change.

---

### Fix H5 — Add fallback polling for dashboard chat

**File:** `app/patient/dashboard/page.tsx`

Add a new `useEffect` after the realtime hook setup (after line 429):

```javascript
// Fallback polling: re-fetch messages every 30s in case Realtime disconnects
useEffect(() => {
  if (!selectedConvId) return
  const interval = setInterval(() => {
    fetchConvMessages(selectedConvId)
  }, 30000)
  return () => clearInterval(interval)
}, [selectedConvId, fetchConvMessages])
```

**Why this is safe:** This is the same pattern used in `app/patient/messages/page.tsx` (lines 110-114). It just re-fetches messages periodically. The `fetchConvMessages` function already handles dedup and marks-as-read correctly.

---

### Fix H7 — Remove stale closure risk in useCallback

**File:** `app/patient/dashboard/page.tsx`

The simplest fix is to remove the `useCallback` wrapper from `handleMessageClick` since it's not passed to a memoized child that needs referential stability — `BookingCard` is not wrapped in `React.memo`.

**Change lines 587-589 from:**
```javascript
const handleMessageClick = useCallback(() => {
  if (selectedClinicId) openConversationForClinic(selectedClinicId)
}, [selectedClinicId, inboxConversations, allClinics, activeLeadId, isMobile])
```

**To a plain function:**
```javascript
function handleMessageClick() {
  if (selectedClinicId) openConversationForClinic(selectedClinicId)
}
```

**Similarly for `handleRequestAppointment`** — it's large so converting from `useCallback` to a plain `async function` is the cleanest approach. Change:
```javascript
const handleRequestAppointment = useCallback(async (message: string) => {
  ...
}, [selectedClinicId, activeLeadId, inboxConversations, allClinics, isMobile])
```
to:
```javascript
async function handleRequestAppointment(message: string) {
  ...
}
```

Remove the closing `}, [selectedClinicId, activeLeadId, inboxConversations, allClinics, isMobile])` and replace with just `}`.

**Why this is safe:** These functions are only passed to `BookingCard` which is not memoized. Removing `useCallback` means they always use current state. No API or database impact.

---

### Fix H8 — Remove hardcoded "Usually replies quickly"

**File:** `app/patient/dashboard/page.tsx`

**Line 1211:**
```jsx
<p className="text-[11px] text-muted-foreground">Usually replies quickly</p>
```

**Change to:**
```jsx
<p className="text-[11px] text-muted-foreground">Online chat</p>
```

**Why this is safe:** Pure text change. No data dependency.

---

## PHASE 3: Medium Priority Fixes

### Fix M2 — Add background to inbox sticky header

**File:** `app/patient/dashboard/page.tsx`

**Line 970:**
```jsx
<div className="px-4 py-3 flex items-center justify-between sticky top-0 z-10">
```

**Change to:**
```jsx
<div className="px-4 py-3 flex items-center justify-between sticky top-0 z-10 bg-white">
```

---

### Fix M4 — Make unread count update atomic

**File:** `app/api/chat/send/route.ts`

**Current code (lines 223-232):**
```javascript
const updateData: Record<string, any> = {
  last_message_at: new Date().toISOString(),
}
if (senderType === "patient") {
  updateData.unread_by_clinic = true
  updateData.unread_count_clinic = ((conversation as any).unread_count_clinic || 0) + 1
} else {
  updateData.unread_by_patient = true
  updateData.unread_count_patient = ((conversation as any).unread_count_patient || 0) + 1
}
```

**Replace with an RPC call or raw SQL.** The cleanest approach without creating a new migration is to use Supabase's `.rpc()`. However, if an RPC doesn't exist yet, the simpler approach is to use the Supabase PostgREST filter approach.

**Actually, the simplest safe fix** that doesn't require a new migration/RPC: just refetch the conversation right before updating to get the latest count. Replace lines 223-241 with:

```javascript
// Re-fetch current conversation state for accurate unread counts
const { data: freshConv } = await supabase
  .from("conversations")
  .select("unread_count_clinic, unread_count_patient")
  .eq("id", conversation.id)
  .single()

const updateData: Record<string, any> = {
  last_message_at: new Date().toISOString(),
}
if (senderType === "patient") {
  updateData.unread_by_clinic = true
  updateData.unread_count_clinic = ((freshConv?.unread_count_clinic) || 0) + 1
} else {
  updateData.unread_by_patient = true
  updateData.unread_count_patient = ((freshConv?.unread_count_patient) || 0) + 1
}

const { error: updateError } = await supabase
  .from("conversations")
  .update(updateData)
  .eq("id", conversation.id)

if (updateError) {
  console.error("[Chat] Failed to update conversation:", updateError)
}
```

**Note:** This is still not truly atomic (still read-then-write), but it reduces the race window significantly. A fully atomic solution would require a Postgres function. If you want to do it properly, create a migration:

```sql
-- scripts/20260217_120000_atomic_unread_increment.sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260217_120000_atomic_unread_increment') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  CREATE OR REPLACE FUNCTION increment_unread(
    p_conversation_id UUID,
    p_sender_type TEXT
  ) RETURNS VOID AS $fn$
  BEGIN
    IF p_sender_type = 'patient' THEN
      UPDATE conversations
      SET unread_by_clinic = true,
          unread_count_clinic = COALESCE(unread_count_clinic, 0) + 1,
          last_message_at = NOW()
      WHERE id = p_conversation_id;
    ELSE
      UPDATE conversations
      SET unread_by_patient = true,
          unread_count_patient = COALESCE(unread_count_patient, 0) + 1,
          last_message_at = NOW()
      WHERE id = p_conversation_id;
    END IF;
  END;
  $fn$ LANGUAGE plpgsql;

  INSERT INTO schema_migrations (id) VALUES ('20260217_120000_atomic_unread_increment');
END $$;
```

Then in `route.ts`, replace the update block with:
```javascript
await supabase.rpc('increment_unread', {
  p_conversation_id: conversation.id,
  p_sender_type: senderType,
})
```

**Choose whichever approach fits your comfort level.** The re-fetch approach is simpler; the RPC approach is correct.

**Why this is safe for clinic side:** The clinic-reply endpoint (`/api/chat/clinic-reply`) has its own separate unread update logic. This change only affects the patient send path. The column names and semantics remain identical.

---

### Fix M6 — Handle missing opening hours in appointment picker

**File:** `components/match/booking-card.tsx`

**In the `getAvailableDates` function (line 201-263),** when neither `opening_hours` nor `available_days` exist, all days show as available. Add a check:

After line 212 (`let isOpen = true`), add:
```javascript
const hasScheduleData = (clinic.opening_hours && Object.keys(clinic.opening_hours).length > 0) ||
  (clinic.available_days && clinic.available_days.length > 0)
```

Then in the `AppointmentPicker` component, when `availableDates.length === 0` is currently handled (line 370-374), also handle the "no schedule data" case. At the start of the day selection step (line 350), add before the grid:

```jsx
{step === "day" && !hasScheduleData && (
  <p className="text-xs text-muted-foreground text-center py-3">
    Opening hours not confirmed — message the clinic to check availability.
  </p>
)}
```

**Actually, the simpler approach:** modify `getAvailableDates` to return empty when no schedule data exists. Add at line 203 (after `const dates: AvailableDate[] = []`):
```javascript
// If no schedule data at all, return empty — don't assume all days are open
const hasScheduleData = (clinic.opening_hours && Object.keys(clinic.opening_hours).length > 0) ||
  (clinic.available_days && clinic.available_days.length > 0)
if (!hasScheduleData) return dates
```

This way the existing "No available days found. Try messaging the clinic directly." message (line 370-374) shows automatically.

---

### Fix M7 — Fix price range default

**File:** `components/match/booking-card.tsx`

**Line 124-129:**
```javascript
function formatPriceRange(range: string): string {
  if (range === "budget") return "Budget-friendly"
  if (range === "mid") return "Mid-range"
  if (range === "premium") return "Premium"
  return range || "Mid-range"
}
```

**Change to:**
```javascript
function formatPriceRange(range: string): string {
  if (range === "budget") return "Budget-friendly"
  if (range === "mid") return "Mid-range"
  if (range === "premium") return "Premium"
  return range || ""
}
```

Then in the template where it's used (line 588-593), the price row already has a `{clinic.price_range && ...}` guard, so an empty string won't show.

---

## PHASE 4: Low Priority / Quick Wins

### Fix L7 — Fix clinic profile link in messages page

**File:** `app/patient/messages/page.tsx`

**Lines 319 and 677-688** link to `/clinic/${selectedConversation.clinic_id}?leadId=...` — this is the clinic's own dashboard, not a public profile.

If clinics have a public profile page at a different route (e.g., `/clinic-profile/${slug}`), update accordingly. If no public profile exists, change the links to just show the clinic name without a link, or point to the correct public URL.

**For now, the safest fix** is to remove the links since they point to a protected route:

**Line 319:** Change:
```jsx
<Link
  href={`/clinic/${selectedConversation.clinic_id}?leadId=${selectedConversation.lead_id}`}
  className="font-semibold text-[#1a1a1a] text-sm truncate block hover:underline"
>
  {selectedConversation.clinics?.name || "Clinic"}
</Link>
```
to:
```jsx
<span className="font-semibold text-[#1a1a1a] text-sm truncate block">
  {selectedConversation.clinics?.name || "Clinic"}
</span>
```

Do the same for the desktop chat header links around lines 677-688.

---

## Summary — Implementation Order

Do these in order. Each one is independently deployable.

| # | Fix | File(s) | Effort |
|---|-----|---------|--------|
| 1 | C3: Remove empty import | dashboard/page.tsx | 1 min |
| 2 | C1: Mobile clinic switch chat sync | dashboard/page.tsx | 10 min |
| 3 | C2: Auth check on patient sends | api/chat/send/route.ts | 10 min |
| 4 | H1: Add sendTyping to dashboard | dashboard/page.tsx | 2 min |
| 5 | H2: Error feedback on send failure | dashboard/page.tsx | 10 min |
| 6 | H3: Booking CTA on mobile sticky bar | dashboard/page.tsx | 5 min |
| 7 | H4: Quick prompts after first message | dashboard/page.tsx | 1 min |
| 8 | H5: Fallback polling | dashboard/page.tsx | 2 min |
| 9 | H7: Remove stale useCallback | dashboard/page.tsx | 5 min |
| 10 | H8: Remove hardcoded reply time | dashboard/page.tsx | 1 min |
| 11 | M2: Inbox header background | dashboard/page.tsx | 1 min |
| 12 | M6: Missing hours in appt picker | booking-card.tsx | 5 min |
| 13 | M7: Price range default | booking-card.tsx | 1 min |
| 14 | M4: Atomic unread count | api/chat/send/route.ts | 10-20 min |
| 15 | L7: Fix clinic profile links | messages/page.tsx | 5 min |

**After implementing, test by running `npm run build` to ensure no compilation errors. Do NOT run `npm run dev` as there's no database available in this environment.**

---

## What NOT to do

1. **Do NOT modify any clinic-side files** (listed above)
2. **Do NOT change the response format of `/api/chat/send`** — the clinic embedded chat relies on it
3. **Do NOT change realtime channel naming** (`chat:{conversationId}`) — both sides subscribe to it
4. **Do NOT change the `messages` or `conversations` table schema** — both dashboards read from them
5. **Do NOT add new database columns without a proper migration** following the timestamp format in `CLAUDE.md`
6. **Do NOT modify the `createClient` / `createAdminClient` imports** — they're shared across the app
