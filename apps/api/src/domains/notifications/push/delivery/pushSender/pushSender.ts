import { serverConfig } from "../../../../../infra/config";
import { rootLogger } from "../../../../../infra/observability";
import { createConsolePushSender } from "../createConsolePushSender/createConsolePushSender";
import { createFcmPushSender } from "../createFcmPushSender/createFcmPushSender";
import type { PushSender } from "../types";

/** How pushes are delivered, by PUSH_PROVIDER; null when they're off ("none"). */
export const pushSender: PushSender | null = (() => {
    const { PUSH_PROVIDER, FCM_SERVICE_ACCOUNT_JSON } = serverConfig;
    if (PUSH_PROVIDER === "fcm") {
        return createFcmPushSender({ serviceAccountJson: FCM_SERVICE_ACCOUNT_JSON!, logger: rootLogger });
    }
    if (PUSH_PROVIDER === "console") {
        return createConsolePushSender({ logger: rootLogger });
    }
    return null;
})();
