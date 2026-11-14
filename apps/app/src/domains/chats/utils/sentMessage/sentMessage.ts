import type { ChatMessageView } from '@myapp/shared/domains';
import type { ShownChatMessage } from '../../types';

/** A message the server has. */
export function sentMessage(message: ChatMessageView): ShownChatMessage {
  return { ...message, status: 'sent' };
}
