# Email-Reply-Chat Sync — Audit & Implementation Plan

**Date:** 2026-02-27
**Feature:** Reply-by-email syncs back into in-app chat (like Intercom/Zendesk)

---

## Part 1: Current Messaging Audit

### What works well today

| Flow | Status | Details |
|------|--------|---------|
| Patient sends chat → clinic sees instantly | **Working** | Message saved to DB, broadcast via Supabase Realtime channel `chat:{conversationId}`, unread count atomically incremented via `increment_unread` RPC |
| Clinic replies → patient sees instantly | **Working** | Same broadcast mechanism, unread count incremented, bot auto-message injected on first reply |
| Patient sends → clinic gets email | **Working** | Email sent immediately via `sendRegisteredEmail()` with `CHAT_NOTIFICATION_TO_CLINIC` type. No throttling on patient→clinic direction |
| Clinic replies → patient gets email | **Working** | Email sent with 15-minute grouping window, 2-cycle max limit, respects `muted_by_patient` flag |
| Real-time fallback (polling) | **Working** | `useChatChannel` hook polls `/api/chat/messages` every 15s as fallback when Realtime is unavailable |
| Bot auto-responders | **Working** | AI-powered greeting on first patient message, clinic-replied acknowledgment, escalation detection |
| Unread tracking | **Working** | Atomic counting via Postgres `increment_unread` function, resets on read |
| Email dedup/idempotency | **Working** | `email_logs` table with unique idempotency keys prevents duplicate sends |
| Unsubscribe system | **Working** | `email_preferences` table, `List-Unsubscribe` headers, one-click unsubscribe |

### Edge cases reviewed

| Scenario | Status | Notes |
|----------|--------|-------|
| User not OTP verified | **OK** | Patient can send messages without OTP (OTP is for intake form, not chat). Clinic email contains magic link for patient to click back |
| User logged out / different device | **OK** | Polling fallback catches up on messages. Email notifications with magic links provide re-entry |
| Clinic has multiple staff accounts | **OK** | All staff share same `clinic_id`, see same conversations. Notification goes to `notification_email` (single address) |
| Notifications disabled / missing emails | **OK** | Missing email → skipped gracefully. `notification_preferences` on clinics table controls what's sent |
| Message ordering | **OK** | Messages ordered by `created_at` timestamp. Bot messages use `created_at - 1s` trick to appear before clinic reply |
| Duplication | **OK** | Idempotency keys on emails. Message inserts are single-row with UUID PKs |
| Missing messages | **Low risk** | If broadcast fails, polling picks up within 15s |

### Current gaps (relevant to this feature)

1. **No inbound email processing** — emails are one-way (outbound only)
2. **No Reply-To threading** — notification emails don't include reply-to addresses that route back
3. **No "replied via email" label** — `sent_via` field exists in DB (`'chat'`/`'email'`) but isn't shown in patient/clinic UI
4. **Clinic→patient throttling is one-directional** — patient→clinic emails are sent immediately (no grouping). This is fine for now but could be noisy if email replies create high volume
5. **No conversation re-opening** — closed conversations stay closed; no mechanism to re-open via email reply

---

## Part 2: Technical Design

### Architecture Overview

```
Patient/Clinic Chat (in-app)
         │
         ▼
   Chat API Routes ──── broadcast ───▶ Supabase Realtime ───▶ Other party sees it
         │
         ▼
   Email Notification ──── Resend outbound ───▶ Email with Reply-To header
         │                                              │
         │                                              ▼
         │                                    Recipient replies
         │                                              │
         │                                              ▼
         │                                    Resend Inbound Webhook
         │                                              │
         │                                              ▼
         └──────────────── /api/webhooks/inbound-email ◀┘
                                    │
                                    ▼
                           Parse → Validate → Strip quoted text
                                    │
                                    ▼
                           Insert message (sent_via: 'email')
                                    │
                                    ▼
                           Broadcast to Realtime + send notification email
```

### Reply-To Token Design (stateless — no new DB tables)

Each outgoing notification email includes a `Reply-To` header:

```
Reply-To: reply+{token}@reply.pearlie.org
```

**Token format (HMAC-signed, base64url-encoded):**
```
payload = {conversationId}:{senderType}:{participantEmail}:{timestamp}
token   = base64url(payload) + "." + hmac_sha256(payload, EMAIL_REPLY_SECRET)
```

Example:
```
reply+Y29udjoxMjM6cGF0aWVudDpqb2huQGV4YW1wbGUuY29tOjE3MDk4MjM0MDA.a1b2c3d4@reply.pearlie.org
```

**On inbound:**
1. Extract token from `To` or `Reply-To` address
2. Split at `.` → payload + signature
3. Verify HMAC signature (reject if invalid → spoofing attempt)
4. Decode payload → get `conversationId`, expected `senderType`, `participantEmail`
5. Verify `From` email matches `participantEmail` (reject if mismatch)
6. Reject if token timestamp is older than 30 days (stale)

**Why stateless?** No extra DB table needed. Token encodes everything. HMAC prevents forgery.

### Email Template Changes

Both `CHAT_NOTIFICATION_TO_CLINIC` and `CLINIC_REPLY_TO_PATIENT` templates will be enhanced:

**New payload fields:**
- `recentMessages` — array of last 1-3 messages for context
- `replyToAddress` — the thread-specific Reply-To email
- `deepLinkUrl` — existing `inboxUrl`/`viewReplyUrl` (already present)

**New template elements:**
1. "Reply to this email to respond" instruction text
2. Recent message thread (last 1-3 messages with sender labels)
3. Hidden thread marker in HTML body: `<!-- pearlie-thread:{token} -->` (backup if headers stripped)
4. "Open chat in Pearlie" CTA button (existing, just renamed)

**Reply-To header:** Added via `sendRegisteredEmail`'s `replyTo` parameter (already supported!)

### New Files

| File | Purpose |
|------|---------|
| `app/api/webhooks/inbound-email/route.ts` | Resend inbound webhook handler |
| `lib/email-reply-token.ts` | Token generation + verification utilities |
| `lib/email-reply-parser.ts` | Strip quoted text, signatures, HTML from inbound email body |
| `scripts/20260227_190000_add_email_reply_support.sql` | Migration: add inbound processing columns |

### Modified Files

| File | Changes |
|------|---------|
| `lib/email/templates/notification-templates.ts` | Enhance both chat notification templates with thread context + reply instructions |
| `lib/email/registry.ts` | Update payload schemas for new fields |
| `app/api/chat/send/route.ts` | Generate reply-to token, pass recent messages + replyTo to email |
| `app/api/chat/clinic-reply/route.ts` | Same: generate reply-to token, pass recent messages + replyTo to email |
| `components/clinic-chat-widget.tsx` | Show "Replied via email" label on messages where `sent_via === 'email'` |
| `app/patient/dashboard/page.tsx` | Show "Replied via email" label on email-originated messages |
| `components/admin/chat-history-panel.tsx` | Show `sent_via` indicator (already has the field, just not displayed) |

### Database Changes

**Migration: `20260227_190000_add_email_reply_support.sql`**

```sql
-- Add inbound email log table for debugging and idempotency
CREATE TABLE IF NOT EXISTS inbound_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_message_id TEXT UNIQUE,          -- For webhook idempotency
  from_email TEXT NOT NULL,
  to_address TEXT NOT NULL,               -- The reply+token@reply.pearlie.org
  conversation_id UUID REFERENCES conversations(id),
  message_id UUID REFERENCES messages(id), -- The created message (null if rejected)
  status TEXT NOT NULL DEFAULT 'pending',  -- pending/processed/rejected
  rejection_reason TEXT,                   -- Why rejected (spoofing, expired, closed, etc.)
  raw_subject TEXT,
  parsed_body TEXT,                        -- Cleaned body after stripping
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookup by conversation
CREATE INDEX IF NOT EXISTS idx_inbound_email_conversation
  ON inbound_email_log(conversation_id);

-- Index for idempotency check
CREATE INDEX IF NOT EXISTS idx_inbound_email_resend_id
  ON inbound_email_log(resend_message_id);
```

No changes to the `messages` table — `sent_via: 'email'` is already supported.

### Environment Variables (new)

| Variable | Purpose |
|----------|---------|
| `EMAIL_REPLY_SECRET` | HMAC secret for signing reply-to tokens (32+ chars) |
| `RESEND_WEBHOOK_SECRET` | Resend webhook signing secret for verifying inbound webhooks |
| `REPLY_EMAIL_DOMAIN` | `reply.pearlie.org` — the subdomain for inbound replies |

### Webhook Endpoint Design

**`POST /api/webhooks/inbound-email`**

```
1. Verify Resend webhook signature (reject if invalid)
2. Check idempotency (resend_message_id already processed?)
3. Extract token from To address (reply+{token}@reply.pearlie.org)
4. Verify HMAC signature on token
5. Decode token → conversationId, senderType, participantEmail
6. Verify From email matches expected participant
7. Check token age (reject if >30 days)
8. Load conversation from DB
9. If conversation_state = 'closed' → re-open it (set to 'open')
10. Strip quoted text and signatures from email body
11. Insert message with sent_via: 'email'
12. Broadcast via Realtime channel
13. Update unread counts
14. Trigger outbound notification to other party (following existing throttling)
15. Log to inbound_email_log
```

### Email Batching / Throttling

**Already implemented for clinic→patient:** 15-minute window, 2-cycle max, respects mute.

**For email-reply-originated messages:** Follow the exact same throttling logic as regular chat messages. The inbound webhook calls the same notification code paths.

**No additional batching needed** — the existing system already handles this.

### Security Measures

| Threat | Mitigation |
|--------|------------|
| Token forgery | HMAC-SHA256 signature verification |
| Email spoofing | Verify `From` matches token's `participantEmail` |
| Replay attacks | Token timestamp + 30-day expiry |
| Duplicate webhooks | `resend_message_id` uniqueness check in `inbound_email_log` |
| Content injection | HTML sanitize + escape inbound email text before DB insert |
| DKIM/SPF spoofing | Resend validates at provider level before forwarding webhook |
| Stale threads | 30-day token expiry |
| Wrong thread | Token encodes specific conversation ID + participant |

---

## Part 3: DNS Setup Instructions

### For `reply.pearlie.org` subdomain

You need to add these DNS records to your domain registrar:

1. **MX record** (routes email to Resend):
   ```
   reply.pearlie.org  MX  10  inbound-smtp.resend.com
   ```

2. **SPF record** (authorizes Resend to handle email):
   ```
   reply.pearlie.org  TXT  "v=spf1 include:resend.com ~all"
   ```

3. **Configure in Resend Dashboard:**
   - Go to Resend → Domains → Add domain for inbound
   - Add `reply.pearlie.org` as an inbound domain
   - Set webhook URL: `https://pearlie.org/api/webhooks/inbound-email`
   - Copy the webhook signing secret → add as `RESEND_WEBHOOK_SECRET` env var

---

## Part 4: Implementation Checklist

### Phase 1 — Foundation (can be deployed independently)
- [ ] Create `lib/email-reply-token.ts` — token generation + verification
- [ ] Create `lib/email-reply-parser.ts` — email body stripping
- [ ] Run migration `20260227_190000_add_email_reply_support.sql`
- [ ] Add `EMAIL_REPLY_SECRET` to Vercel env vars
- [ ] Set up `reply.pearlie.org` DNS records

### Phase 2 — Outbound (enhance notification emails)
- [ ] Update `CHAT_NOTIFICATION_TO_CLINIC` template — add reply instructions, thread context
- [ ] Update `CLINIC_REPLY_TO_PATIENT` template — add reply instructions, thread context
- [ ] Update `registry.ts` — add new payload fields to schemas
- [ ] Modify `app/api/chat/send/route.ts` — generate Reply-To token, fetch recent messages
- [ ] Modify `app/api/chat/clinic-reply/route.ts` — generate Reply-To token, fetch recent messages

### Phase 3 — Inbound (receive email replies)
- [ ] Create `app/api/webhooks/inbound-email/route.ts`
- [ ] Add `RESEND_WEBHOOK_SECRET` to Vercel env vars
- [ ] Configure Resend inbound webhook in dashboard
- [ ] Test end-to-end: send chat → get email → reply to email → appears in chat

### Phase 4 — UI polish
- [ ] Add "Replied via email" label in `components/clinic-chat-widget.tsx`
- [ ] Add "Replied via email" label in patient dashboard chat
- [ ] Add sent_via display in admin chat history panel

### Test Matrix

| Test | Expected |
|------|----------|
| Send chat message → email received by other party | Email contains reply instructions, recent messages, Reply-To header |
| Reply to email → appears in chat | Message appears with `sent_via: 'email'`, "Replied via email" label |
| Reply to email → other side notified | Notification email sent (following throttling rules) |
| Multiple messages in 15 min → batched email | Only one email per throttle window |
| Spoofed From address → rejected | `inbound_email_log` entry with `rejection_reason: 'sender_mismatch'` |
| Invalid/tampered token → rejected | Webhook returns 400, no message created |
| Wrong thread ID → rejected | HMAC verification fails |
| Expired token (>30 days) → rejected | Logged as expired, polite rejection email sent |
| Duplicate webhook delivery → ignored | Second delivery finds existing `resend_message_id`, skips |
| Reply to closed conversation → re-opens | `conversation_state` set back to `'open'`, message delivered |
| Patient muted notifications → no email for replies | Mute respected on outbound notifications, but inbound still accepted |

---

## Part 5: Plain English Summary (for non-devs)

### How it works today
1. Patient opens Pearlie, types a message in the chat box → clinic sees it instantly on their dashboard
2. Clinic types a reply → patient sees it instantly in their chat
3. Both sides also get an email notification saying "you have a new message" with a link to open Pearlie

### What we're adding
Think of it like how Gmail works with a help desk:

1. **Enhanced notification emails** — Instead of just "you have a message, click here," the email will now show the actual conversation (last few messages) and say **"Just reply to this email to respond"**

2. **Reply-by-email** — When someone gets that email, they can hit Reply in their email app (Gmail, Outlook, etc.), type their response, and send it. That reply **automatically appears in the Pearlie chat** — as if they typed it directly in the app

3. **Both sides stay in sync** — Whether someone replies via the app OR via email, the other person sees it in both places. The chat thread is always complete

4. **Anti-spam** — We won't spam anyone. If there are 5 messages in 15 minutes, they'll get ONE bundled email, not five

5. **Security** — Each email has a unique encrypted code tied to that specific conversation. You can't fake a reply or inject messages into someone else's chat. If someone tries to spoof an email, it gets rejected

### What you need to do
1. **Add DNS records** for `reply.pearlie.org` (I'll provide the exact records)
2. **Add 3 environment variables** in Vercel (I'll provide the values)
3. **Configure Resend** inbound webhook in the dashboard (point it at your API)

Everything else is code changes that I'll implement.
