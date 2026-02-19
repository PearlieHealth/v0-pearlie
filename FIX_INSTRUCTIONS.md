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

## PHASE 5: Additional Fixes (added after initial 15)

### Fix A1 — Inbox goes stale: no polling for new/updated conversations

**Problem:** The inbox conversation list (`inboxConversations`) is fetched once on page load via `fetchInbox()`. After that, it only re-fetches when the patient sends a first message (creating a new conversation). If a clinic sends the patient a message in a conversation that isn't currently selected, or starts a brand new conversation, the inbox sidebar never updates — no new conversation appears, no preview text changes, no unread badge increments. The patient has to refresh the whole page to see it.

Compare this with the **message polling** (Fix H5) which re-fetches *messages* for the *selected conversation* every 30s. That doesn't help the inbox list itself.

**File:** `app/patient/dashboard/page.tsx`

**Add a new `useEffect` right after the existing H5 polling effect (around line 437 on the fix branch).** This is the inbox equivalent:

```javascript
// Fallback polling: re-fetch inbox conversations every 30s so new conversations
// and updated previews/unread counts appear without a full page refresh.
useEffect(() => {
  const interval = setInterval(() => {
    fetchInbox()
  }, 30000)
  return () => clearInterval(interval)
}, [])
```

**Why this is safe:** `fetchInbox` is already called on mount and after first-message sends. This just calls it periodically. It does NOT auto-select a conversation (the `if (!selectedConvId && conversations?.length > 0)` guard inside `fetchInbox` only fires when no conversation is selected). So it won't interrupt the patient if they're mid-chat. The clinic side is completely unaffected — this is a pure read operation.

**ELI5:** Imagine you're chatting with Clinic A, and Clinic B sends you a message. Without this fix, you'd never know until you refreshed the page. Now the inbox checks for updates every 30 seconds.

---

### Fix A2 — Realtime subscription for inbox updates (better than polling alone)

**Problem:** Fix A1 (polling) gets updates within 30 seconds, but realtime would be instant. The `useConversationUpdates` hook in `hooks/use-chat-channel.ts` already exists and is used by the clinic inbox — but it filters by `clinic_id`, not `lead_id`. The patient side needs a similar subscription filtered by lead.

**File:** `hooks/use-chat-channel.ts`

**Add a new hook at the bottom of the file** (after the existing `useConversationUpdates`):

```typescript
// ─────────────────────────────────────────────────────────────────
// Patient inbox: listen for conversation changes for this patient's lead.
// Fires when unread counts change, new conversations are created, etc.
// ─────────────────────────────────────────────────────────────────

interface UsePatientConversationUpdatesOptions {
  leadId: string | null
  onUpdate: () => void
  enabled?: boolean
}

export function usePatientConversationUpdates({
  leadId,
  onUpdate,
  enabled = true,
}: UsePatientConversationUpdatesOptions) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!leadId || !enabled) return

    const supabase = createBrowserClient()

    const channel = supabase
      .channel(`patient-convs:${leadId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          onUpdateRef.current()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leadId, enabled])
}
```

**Then in `app/patient/dashboard/page.tsx`,** import and use it.

**Step 1 — Update the import (line 26 on fix branch):**
```javascript
import { useChatChannel, usePatientConversationUpdates, type RealtimeMessage } from "@/hooks/use-chat-channel"
```

**Step 2 — Add the hook call after the existing `useChatChannel` call (around line 428 on fix branch):**
```javascript
// Realtime: re-fetch inbox when any conversation for this patient changes
usePatientConversationUpdates({
  leadId: activeLeadId,
  onUpdate: fetchInbox,
  enabled: !!activeLeadId,
})
```

**Why this is safe:** This creates a new realtime channel `patient-convs:{leadId}` that only listens (read-only). It doesn't conflict with any clinic-side channels (those use `clinic-convs:{clinicId}`). When a conversation updates (clinic sends a message, unread counts change), it triggers `fetchInbox()` which is the same safe read-only function already called on page load. The `fetchInbox` function does NOT auto-select conversations when one is already selected, so it won't interrupt the patient mid-chat.

**Note on Supabase RLS:** The `conversations` table needs to allow patients to receive postgres_changes for their own conversations. If Realtime is restricted by RLS, this subscription may silently fail — in which case the polling from Fix A1 is the safety net. Both fixes should be implemented together.

**ELI5:** Fix A1 checks your inbox every 30 seconds like checking your mailbox. Fix A2 is like having a doorbell — you know instantly when something new arrives. We do both because the doorbell might not always work (wifi issues).

---

### Fix A3 — Mark-as-read is already working (no fix needed — clarification)

**NOT A BUG.** On closer inspection, mark-as-read persistence already works correctly:

- The `GET /api/patient/conversations/{id}/messages` endpoint (which `fetchConvMessages` calls) **automatically persists** read status server-side:
  - Sets `conversations.unread_by_patient = false` and `conversations.unread_count_patient = 0`
  - Batch-updates all clinic messages to `status: "read"` with a `read_at` timestamp
- The local state update in `fetchConvMessages` (`setInboxConversations(...)`) is just mirroring what the server already did

So when a patient opens a conversation in the dashboard, the clinic side correctly sees messages go from "delivered" to "read". No additional fix needed.

The `useChatChannel` hook (already active on the dashboard at line 422) also handles **mark-as-delivered** — when a clinic message arrives via realtime, lines 76-81 and 110-115 of the hook automatically call `/api/chat/mark-delivered`. This works for the currently-selected conversation.

---

## Updated Summary — Implementation Order

| # | Fix | File(s) | Effort | Status |
|---|-----|---------|--------|--------|
| 1 | C3: Remove empty import | dashboard/page.tsx | 1 min | DONE |
| 2 | C1: Mobile clinic switch chat sync | dashboard/page.tsx | 10 min | DONE |
| 3 | C2: Auth check on patient sends | api/chat/send/route.ts | 10 min | DONE |
| 4 | H1: Add sendTyping to dashboard | dashboard/page.tsx | 2 min | DONE |
| 5 | H2: Error feedback on send failure | dashboard/page.tsx | 10 min | DONE |
| 6 | H3: Booking CTA on mobile sticky bar | dashboard/page.tsx | 5 min | DONE |
| 7 | H4: Quick prompts after first message | dashboard/page.tsx | 1 min | DONE |
| 8 | H5: Fallback polling | dashboard/page.tsx | 2 min | DONE |
| 9 | H7: Remove stale useCallback | dashboard/page.tsx | 5 min | DONE |
| 10 | H8: Remove hardcoded reply time | dashboard/page.tsx | 1 min | DONE |
| 11 | M2: Inbox header background | dashboard/page.tsx | 1 min | DONE |
| 12 | M6: Missing hours in appt picker | booking-card.tsx | 5 min | DONE |
| 13 | M7: Price range default | booking-card.tsx | 1 min | DONE |
| 14 | M4: Atomic unread count | api/chat/send/route.ts + migration | 10-20 min | DONE |
| 15 | L7: Fix clinic profile links | messages/page.tsx | 5 min | DONE |
| **16** | **A1: Inbox polling (30s)** | **dashboard/page.tsx** | **2 min** | **TODO** |
| **17** | **A2: Realtime inbox subscription** | **use-chat-channel.ts + dashboard/page.tsx** | **10 min** | **TODO** |

---

---

## PHASE 6: Security & Resilience Fixes (Deep Audit — 2026-02-19)

These findings were discovered by a deep audit of the full patient journey on the current main branch (commit `cc7f26e`). They affect files outside the dashboard and should be implemented on a **new branch from main**.

### Fix S1 — OTP endpoint allows lead hijacking (CRITICAL)

**File:** `app/api/otp/send/route.ts`

**Problem:** The endpoint accepts `{ leadId, email }` from the client. It validates email FORMAT (regex check) but never checks that the submitted email matches the lead's actual stored email. An attacker who knows a victim's `leadId` can call this endpoint with their own email address, receive the OTP, verify it, and take ownership of the victim's lead — seeing their matched clinics, health data, and messaging clinics as the victim.

**Fix:** After fetching the lead from the database (around line 35), add:

```typescript
// Verify the email matches the lead's stored email
if (lead.email.toLowerCase() !== email.toLowerCase()) {
  return NextResponse.json({ error: "Email does not match our records" }, { status: 400 })
}
```

**Why this is safe:** This is a server-side validation check. No client-side or clinic-side impact. The patient-facing OTP form already pre-fills the correct email, so legitimate users will never hit this error.

---

### Fix S2 — Match results API has zero authentication (CRITICAL)

**File:** `app/api/matches/[matchId]/route.ts`

**Problem:** `GET /api/matches/{matchId}` returns full match details — all matched clinics, scores, lead coordinates, treatment preferences — to anyone. No auth check at all. The endpoint jumps straight into database queries. If someone gets a match URL from browser history, a shared link, or server logs, they see everything.

**Design decision:** Match pages are currently shareable by URL. Two options:
- **Option A (recommended):** Keep semi-public but strip sensitive fields (exact coordinates, raw_answers, pain_score) for unauthenticated users. Only show clinic names, addresses, and match percentages.
- **Option B:** Require full authentication (breaks shareable links).

**Fix (Option A):** Add auth check at the top of the handler. If user is authenticated and owns the lead, return full data. If unauthenticated, return stripped data:

```typescript
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ... existing match fetch ...

  // Check ownership
  const isOwner = user && match.leads && (
    match.leads.user_id === user.id ||
    match.leads.email?.toLowerCase() === user.email?.toLowerCase()
  )

  // Strip sensitive fields for non-owners
  if (!isOwner) {
    // Remove lead coordinates, raw answers, personal health data
    delete matchData.lead_latitude
    delete matchData.lead_longitude
    delete matchData.raw_answers
    // Keep clinic info, match percentages (these are the useful shareable parts)
  }
}
```

---

### Fix S3 — `/patient/messages` not protected by middleware (CRITICAL)

**File:** `lib/supabase/middleware.ts`

**Problem:** Middleware only checks `request.nextUrl.pathname.startsWith("/patient/dashboard")`. The `/patient/messages` route has no middleware auth guard. The page itself does a client-side auth check, but there's a gap where the page renders before that redirect fires.

**Fix:** Change the route check (around line 51) from:

```typescript
const isPatientDashboard = request.nextUrl.pathname.startsWith("/patient/dashboard")
if (isPatientDashboard && !user) {
```

to:

```typescript
const isPatientRoute = request.nextUrl.pathname.startsWith("/patient/") &&
  !request.nextUrl.pathname.startsWith("/patient/login")
if (isPatientRoute && !user) {
```

**Why this is safe:** Only adds protection — doesn't change any existing behaviour for authenticated users. The login page is excluded so patients can still reach it.

---

### Fix S4 — `/api/chat/mark-delivered` has no auth (HIGH)

**File:** `app/api/chat/mark-delivered/route.ts`

**Problem:** Accepts `{ messageIds: [...] }` and marks them as "delivered" using the admin client. No authentication whatsoever. Anyone can mark any message as delivered.

**Fix:** Add auth check at the top of the POST handler:

```typescript
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messageIds } = await request.json()
    // ... rest of existing code ...
  }
}
```

**Why this is safe:** The `useChatChannel` hook that calls this endpoint runs in authenticated patient/clinic sessions. Adding auth won't break them. The embedded clinic chat widget calls it too, but that also runs in authenticated contexts.

---

### Fix S5 — In-memory rate limiting doesn't work on Vercel (HIGH)

**File:** `lib/rate-limit.ts`

**Problem:** Rate limiters use a JavaScript `Map`. On Vercel serverless, each invocation can be a fresh process. The Map starts empty. Rate limits are effectively non-existent in production. The file's own comments acknowledge this: "Works per-process — sufficient for single-instance deployments."

**Fix options (pick one):**

**Option A — Supabase-based (no new dependency, works immediately):**
Create a `rate_limits` table and check/increment there:
```sql
-- scripts/20260219_100000_rate_limit_table.sql
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (key, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
```

Then in `lib/rate-limit.ts`, replace the Map with Supabase queries.

**Option B — Vercel KV (fastest, recommended if already using Vercel):**
```bash
npm install @vercel/kv
```
Then use `@vercel/kv` for atomic increment/get with TTL matching the rate limit window.

**Option C — Keep in-memory but with ultra-conservative limits:**
Accept that limits only work within a single warm invocation. Make limits very low (e.g., 2 per window instead of 10) so even fresh processes provide some protection. This is the cheapest option but weakest.

---

### Fix S6 — Promise.all cascade failure in conversations API (MEDIUM)

**File:** `app/api/patient/conversations/route.ts` (around line 50)

**Problem:** Uses `Promise.all()` to enrich conversations with latest message previews. If ANY single conversation's message query fails, the entire inbox API returns 500 — the patient sees an empty inbox instead of partial data.

**Fix:** Change `Promise.all` to `Promise.allSettled`:

```typescript
const results = await Promise.allSettled(
  (conversations || []).map(async (conv) => {
    const { data: latestMessage } = await admin
      .from("messages")
      .select("content, sender_type")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    return {
      ...conv,
      latest_message: latestMessage?.content?.substring(0, 100) || null,
      latest_message_sender: latestMessage?.sender_type || null,
    }
  })
)

const enriched = results
  .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
  .map(r => r.value)
```

**Why this is safe:** Conversations with failed enrichment are simply omitted rather than crashing the whole response. The fallback (showing conversation without preview) is better than showing nothing.

---

### Fix S7 — Admin login has no rate limiting (MEDIUM)

**File:** `middleware.ts` (root) or the admin login page handler

**Problem:** The admin login has no rate limiting on password attempts. An attacker can brute-force the admin password. The admin password is validated via HMAC in middleware, but there's no limit on how many times you can try.

**Fix:** Add rate limiting in the admin login handler. Since the current in-memory rate limiter doesn't work on Vercel (see S5), the simplest approach is to add a delay or use a Supabase-based check:

```typescript
// In the admin login handler, before checking password:
// Option A: Simple progressive delay (doesn't persist across instances but slows attackers)
const failedAttempts = adminLoginAttempts.get(ip) || 0
if (failedAttempts > 5) {
  return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
}
```

If S5 is implemented first (persistent rate limiting), this becomes trivial — just wrap the admin login check with the new rate limiter.

---

### Fix S8 — Messages page silent error handling (LOW)

**File:** `app/patient/messages/page.tsx`

**Problem:** Both `fetchConversations` and `fetchMessagesForConversation` have empty catch blocks. If the API fails, the page shows an empty state with no error message or retry option.

**Fix:** Add an error state:

```typescript
const [fetchError, setFetchError] = useState<string | null>(null)

// In fetchConversations catch:
} catch {
  setFetchError("Couldn't load conversations. Please try again.")
} finally {
  setIsLoading(false)
}
```

Then add a retry button in the UI:
```jsx
{fetchError && (
  <div className="text-center py-8">
    <p className="text-sm text-red-500 mb-3">{fetchError}</p>
    <Button variant="outline" size="sm" onClick={() => { setFetchError(null); fetchConversations() }}>
      Try again
    </Button>
  </div>
)}
```

---

## Full Implementation Order (all phases)

| # | Fix | File(s) | Effort | Status |
|---|-----|---------|--------|--------|
| 1-15 | Dashboard fixes (C1-L7) | dashboard, api, booking-card, messages | — | DONE |
| 16 | A1: Inbox polling | dashboard/page.tsx | 2 min | TODO |
| 17 | A2: Realtime inbox subscription | use-chat-channel.ts + dashboard | 10 min | TODO |
| **18** | **S1: OTP lead email validation** | **api/otp/send/route.ts** | **5 min** | **TODO** |
| **19** | **S3: Protect all /patient/* routes** | **lib/supabase/middleware.ts** | **2 min** | **TODO** |
| **20** | **S2: Auth on match results API** | **api/matches/[matchId]/route.ts** | **15 min** | **TODO** |
| **21** | **S4: Auth on mark-delivered** | **api/chat/mark-delivered/route.ts** | **10 min** | **TODO** |
| **22** | **S6: Promise.allSettled for inbox** | **api/patient/conversations/route.ts** | **5 min** | **TODO** |
| **23** | **S7: Admin login rate limiting** | **middleware.ts** | **10 min** | **TODO** |
| **24** | **S8: Error states on messages page** | **patient/messages/page.tsx** | **10 min** | **TODO** |
| **25** | **S5: Persistent rate limiting** | **lib/rate-limit.ts + migration** | **30 min** | **TODO** |

---

## What NOT to do

1. **Do NOT modify any clinic-side files** (listed above)
2. **Do NOT change the response format of `/api/chat/send`** — the clinic embedded chat relies on it
3. **Do NOT change realtime channel naming** (`chat:{conversationId}`) — both sides subscribe to it
4. **Do NOT change the `messages` or `conversations` table schema** — both dashboards read from them
5. **Do NOT add new database columns without a proper migration** following the timestamp format in `CLAUDE.md`
6. **Do NOT modify the `createClient` / `createAdminClient` imports** — they're shared across the app
