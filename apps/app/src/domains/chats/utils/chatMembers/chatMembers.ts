import type { ChatView } from '@myapp/shared/domains';

/**
 * Who's in a chat, from the chat on screen: what the shared checks need to
 * know the caller is a member. clearedAt is for the messages query, which
 * leaves out what came before it; the API applies that, so null here.
 */
export function chatMembers(chat: Pick<ChatView, 'createdBy' | 'receiverId' | 'otherMember'>) {
  const userIds = [chat.createdBy, chat.receiverId].filter((userId) => userId !== null);
  // Whether the other person is banned (no one can send in the chat until it ends); the API checks it again.
  return userIds.map((userId) => ({ userId, clearedAt: null, isBanned: userId === chat.otherMember.userId && chat.otherMember.isBanned }));
}
