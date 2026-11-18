import type { ChatView } from '@myapp/shared/domains';
import { displayName } from '../../../../utils/formatters/names';

/** Who a chat is with, as shown: their name, or "Account unavailable" while they're banned or their account is being deleted. */
export function chatPartnerName(otherMember: ChatView['otherMember']): string {
  return otherMember.isUnavailable ? 'Account unavailable' : displayName(otherMember);
}
