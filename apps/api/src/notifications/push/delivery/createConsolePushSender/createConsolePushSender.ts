import type { AppLogger } from "@myapp/shared/observability";
import type { PushSender } from "../types";

/** For local development: logs each push instead of sending it (with only the end of its token). */
export function createConsolePushSender({ logger }: { logger: AppLogger }): PushSender {
    return {
        async send(messages) {
            for (const { token, title, body, path, collapseId, badge } of messages) {
                logger.info("Push (not sent: PUSH_PROVIDER is console)", { token: `…${token.slice(-8)}`, title, body, path, collapseId, badge });
            }
            return { invalidTokens: [], failed: 0 };
        },
    };
}
