import type { ChatMessageView } from '@myapp/shared/domains';
import { describe, expect, it } from 'vitest';
import type { ShownChatMessage } from '../../types';
import { mergeNewestMessages } from './mergeNewestMessages';

const creator = { userId: '01JAAAAAAAAAAAAAAAAAAAAAA1', username: 'maya', firstName: null, lastName: null, updatedAt: '2026-11-01T00:00:00.000Z' };
function message(n: number, content = `message ${n}`): ChatMessageView {
  const at = `2026-11-14T10:00:${String(n).padStart(2, '0')}.000Z`;
  return { id: `01JM${String(n).padStart(22, '0')}`, chatId: '01JDDDDDDDDDDDDDDDDDDDDDD1', content, createdBy: creator.userId, updatedBy: creator.userId, createdAt: at, updatedAt: at, creator, viewer: { hasSaved: false } };
}
const shownAs = (status: ShownChatMessage['status']) => (m: ChatMessageView): ShownChatMessage => ({ ...m, status });
const contents = (messages: ShownChatMessage[]) => messages.map((m) => `${m.content}${m.status === 'sent' ? '' : ` (${m.status})`}`);

describe('mergeNewestMessages', () => {
  it('shows a first page oldest first', () => {
    const merged = mergeNewestMessages({ shown: [], newestFirst: [message(3), message(2), message(1)] });
    expect(contents(merged)).toEqual(['message 1', 'message 2', 'message 3']);
  });

  it('adds new messages, applies edits and drops deleted ones', () => {
    const shown = [message(1), message(2), message(3)].map(shownAs('sent'));
    const merged = mergeNewestMessages({ shown, newestFirst: [message(4), message(3, 'edited'), message(1)] });
    expect(contents(merged)).toEqual(['message 1', 'edited', 'message 4']);
  });

  it('keeps earlier messages loaded before the page starts', () => {
    const shown = [message(1), message(2), message(3)].map(shownAs('sent'));
    const merged = mergeNewestMessages({ shown, newestFirst: [message(4), message(3)] });
    expect(contents(merged)).toEqual(['message 1', 'message 2', 'message 3', 'message 4']);
  });

  it('keeps your unsent messages at the end, and takes one the server now has from it', () => {
    const shown = [shownAs('sent')(message(1)), shownAs('sending')(message(5)), shownAs('failed')(message(6))];
    const merged = mergeNewestMessages({ shown, newestFirst: [message(5), message(1)] });
    expect(contents(merged)).toEqual(['message 1', 'message 5', 'message 6 (failed)']);
  });
});
