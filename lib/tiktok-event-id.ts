/**
 * Generate a unique event ID for TikTok event deduplication.
 * The same event_id is sent to both the client-side pixel and
 * the server-side Events API so TikTok can deduplicate them.
 */
export function generateTikTokEventId(): string {
  return crypto.randomUUID()
}
