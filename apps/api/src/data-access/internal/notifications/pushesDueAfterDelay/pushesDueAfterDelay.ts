import { serverConfig } from "../../../../infra/config";
import { pushesDue } from "../pushesDue/pushesDue";

/** Pushes for notifications saved now are due after NOTIFICATION_DELAY_SECONDS (see notificationDeliverAt). */
export async function notificationPushesDue(): Promise<void> {
    await pushesDue({ inSeconds: serverConfig.NOTIFICATION_DELAY_SECONDS });
}

/** A push for a chat message sent now is due after CHAT_PUSH_DELAY_SECONDS (see claimChatPushes). */
export async function chatPushesDue(): Promise<void> {
    await pushesDue({ inSeconds: serverConfig.CHAT_PUSH_DELAY_SECONDS });
}
