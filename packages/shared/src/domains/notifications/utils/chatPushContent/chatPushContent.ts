import { excerpt } from "../excerpt/excerpt";

/** How much of a chat message a push shows. */
const messageExcerptLength = 140;

/**
 * What a push about a chat says: who it's from, and the latest message, or
 * how many there are when there's more than one unread. A newer push for
 * the same chat replaces this one on the device (see PushMessage.collapseId).
 */
export function chatPushContent({ senderUsername, unreadCount, latestMessage }: {
    senderUsername: string;
    unreadCount: number;
    latestMessage: string;
}): { title: string; body: string } {
    const text = excerpt(latestMessage, messageExcerptLength);
    return unreadCount > 1
        ? { title: `@${senderUsername} · ${unreadCount} new messages`, body: text }
        : { title: `@${senderUsername}`, body: text };
}
