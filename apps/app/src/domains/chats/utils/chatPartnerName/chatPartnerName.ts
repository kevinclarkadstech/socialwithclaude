import type { ChatView } from '@myapp/shared/domains';
import { displayName } from '../../../../utils/formatters/names';

/** Who a chat is with, as shown: their name, or "Account unavailable" while they're banned. */
export function chatPartnerName(otherMember: ChatView['otherMember']): string {
  return otherMember.isBanned ? 'Account unavailable' : displayName(otherMember);
}
