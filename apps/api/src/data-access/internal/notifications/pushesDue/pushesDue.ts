import { serverConfig } from "../../../../config";

type PushesDueListener = (args: { inSeconds: number }) => Promise<void>;

let listener: PushesDueListener | null = null;

/**
 * Sets what's told when pushes become due: on Workers, a delayed message on
 * the push queue, so delivery runs then (nothing runs between requests to
 * look). A long-running server sets none: its loop looks every few seconds.
 * The listener must not throw.
 */
export function setPushesDueListener(newListener: PushesDueListener | null): void {
    listener = newListener;
}

/**
 * Says pushes will be due in `inSeconds`: called by the resolvers that save
 * notifications and chat messages, after their transaction. Private to the
 * resolvers, like notificationDeliverAt.
 */
export async function pushesDue({ inSeconds }: { inSeconds: number }): Promise<void> {
    await listener?.({ inSeconds });
}

/** Pushes for notifications saved now are due after NOTIFICATION_DELAY_SECONDS (see notificationDeliverAt). */
export async function notificationPushesDue(): Promise<void> {
    await pushesDue({ inSeconds: serverConfig.NOTIFICATION_DELAY_SECONDS });
}

/** A push for a chat message sent now is due after CHAT_PUSH_DELAY_SECONDS (see claimChatPushes). */
export async function chatPushesDue(): Promise<void> {
    await pushesDue({ inSeconds: serverConfig.CHAT_PUSH_DELAY_SECONDS });
}
