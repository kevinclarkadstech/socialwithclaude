import { serverConfig } from "../../../../config";

/**
 * When a notification saved now starts to show: NOTIFICATION_DELAY_SECONDS
 * from now (30 by default), so one undone in the meantime is never seen.
 * Private to these resolvers: everything else goes through the resolvers.
 */
export function notificationDeliverAt(now: Date = new Date()): Date {
    return new Date(now.getTime() + serverConfig.NOTIFICATION_DELAY_SECONDS * 1000);
}
