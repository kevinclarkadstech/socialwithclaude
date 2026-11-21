import { chatPushContent, describeNotification, pushSettingFor, type PushMessage } from "@myapp/shared/domains";
import type { AppLogger } from "@myapp/shared/observability";
import { claimChatPushes, claimNotificationPushes, deletePushTokens, getPushTokens } from "../../../../data-access";
import type { PushSender } from "../../push/delivery/types";

/**
 * A push that's waited longer than this isn't sent (it's still in the bell
 * and the chat list). Pushes go out when they're due; one this late means
 * its wake-up was lost (on Workers, a queue message), and it's picked up by
 * the next round, whenever that is.
 */
export const pushMaxAgeSeconds = 60 * 60;

/** What a delivery round did. */
export interface PushDeliverySummary {
    // Notifications and chats taken this round (pushed, or skipped as turned off or no longer visible).
    notifications: number;
    chats: number;
    // Pushes sent to devices, and ones that failed.
    sent: number;
    failed: number;
    // Dead tokens deleted.
    removedTokens: number;
}

/**
 * One round of push delivery: takes the notifications whose time has come
 * (each once, see claimNotificationPushes) and the chats with new messages
 * to tell people about (claimChatPushes), turns them into pushes to every
 * device each person is signed in on, sends them, and deletes tokens
 * Firebase says are dead. A notification is pushed only if the person still
 * has its kind turned on (see pushSettingFor); its wording is the bell's
 * (describeNotification). A chat's push replaces the last one for that chat.
 * Anything that's waited more than `maxAgeSeconds` (pushMaxAgeSeconds) is
 * taken but not sent.
 */
export async function deliverPushes({ sender, logger, chatDelaySeconds, maxAgeSeconds = pushMaxAgeSeconds, limit = 200 }: {
    sender: PushSender;
    logger: AppLogger;
    chatDelaySeconds: number;
    maxAgeSeconds?: number;
    limit?: number;
}): Promise<PushDeliverySummary> {
    const notifications = await claimNotificationPushes({ limit, maxAgeSeconds });
    const chats = await claimChatPushes({ delaySeconds: chatDelaySeconds, maxAgeSeconds, limit });

    const pending: (Omit<PushMessage, "token"> & { userId: string })[] = [];
    for (const { userId, notification, settings, unreadCount } of notifications) {
        const setting = pushSettingFor(notification.type);
        if (setting && !settings[setting]) {
            continue;
        }
        const { title, message, target } = describeNotification(notification);
        pending.push({ userId, title, body: message, path: target, collapseId: null, badge: unreadCount });
    }
    for (const chat of chats) {
        const { title, body } = chatPushContent(chat);
        pending.push({ userId: chat.userId, title, body, path: `/chats/${chat.chatId}`, collapseId: `chat-${chat.chatId}`, badge: chat.badge });
    }

    const tokens = await getPushTokens({ userIds: [...new Set(pending.map((push) => push.userId))] });
    const messages: PushMessage[] = pending.flatMap(({ userId, ...push }) => (tokens.get(userId) ?? []).map((token) => ({ ...push, token })));
    const { invalidTokens, failed } = messages.length > 0 ? await sender.send(messages) : { invalidTokens: [], failed: 0 };
    await deletePushTokens({ tokens: invalidTokens });

    const summary = {
        notifications: notifications.length,
        chats: chats.length,
        sent: messages.length - failed - invalidTokens.length,
        failed,
        removedTokens: invalidTokens.length,
    };
    if (messages.length > 0) {
        logger.info("Pushes delivered", summary);
    }
    return summary;
}
