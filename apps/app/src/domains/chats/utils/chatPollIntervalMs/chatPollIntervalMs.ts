/** How often an open chat checks for new messages while they're coming. */
export const activeChatPollMs = 8_000;
/** How often once it's gone quiet. */
export const quietChatPollMs = 30_000;
/** How long after the last new message (sent or received) a chat counts as quiet. */
export const chatQuietAfterMs = 60_000;

/**
 * How often an open chat checks for new messages: every 8 seconds while
 * messages are coming, every 30 once nothing's been sent or received for a
 * minute. A new message, either way, makes it quick again.
 */
export function chatPollIntervalMs({ lastActivityAt, now }: { lastActivityAt: number; now: number }): number {
  return now - lastActivityAt < chatQuietAfterMs ? activeChatPollMs : quietChatPollMs;
}
