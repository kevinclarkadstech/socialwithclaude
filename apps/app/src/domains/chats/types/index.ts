import type { ChatMessageView } from '@myapp/shared/domains';

/** A message as shown: from the server, or one of yours still sending or that failed to. */
export type ShownChatMessage = ChatMessageView & { status: 'sent' | 'sending' | 'failed' };
