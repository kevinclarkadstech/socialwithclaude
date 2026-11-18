import type { PushMessage } from "@myapp/shared/domains";

/** What sending a batch of pushes did: tokens to delete (the app's gone from that device), and how many failed otherwise. */
export interface PushSendResult {
    invalidTokens: string[];
    failed: number;
}

/** Delivers push notifications. The only provider-specific part of push. */
export interface PushSender {
    send(messages: PushMessage[]): Promise<PushSendResult>;
}
