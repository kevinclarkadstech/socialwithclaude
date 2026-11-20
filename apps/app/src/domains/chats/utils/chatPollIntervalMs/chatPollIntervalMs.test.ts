import { describe, expect, it } from 'vitest';
import { activeChatPollMs, chatPollIntervalMs, quietChatPollMs } from './chatPollIntervalMs';

describe('chatPollIntervalMs', () => {
  it('checks every 8 seconds within a minute of the last new message, then every 30', () => {
    expect(chatPollIntervalMs({ lastActivityAt: 0, now: 5_000 })).toBe(activeChatPollMs);
    expect(chatPollIntervalMs({ lastActivityAt: 0, now: 59_999 })).toBe(activeChatPollMs);
    expect(chatPollIntervalMs({ lastActivityAt: 0, now: 60_000 })).toBe(quietChatPollMs);
    expect(activeChatPollMs).toBe(8_000);
    expect(quietChatPollMs).toBe(30_000);
  });
});
